import "server-only";

import { getDb } from "@/server/db";
import {
  createSubscription,
  createSubscriptionAlert,
  getSubscriptions,
  linkTransactionToSubscription,
  updateSubscription,
  Subscription
} from "@/server/db/queries/subscriptions";
import { getVapidKeys, listPushSubscriptions, deletePushSubscription } from "@/server/db/queries/push-subscriptions";
import webpush from "web-push";

interface TransactionData {
  id: number;
  date: string;
  amount: number;
  description: string;
  subscriptionId: number | null;
  kind: "expense" | "income" | "transfer";
  type: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

function normalizeMerchantName(name: string): string {
  return name.trim().toUpperCase();
}

function diffDays(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.abs((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
}

const IGNORED_GENERIC_BILLERS = [
  "APPLE.COM/BILL",
  "GOOGLE *",
  "PAYPAL *",
  "BIT",
  "PAYBOX",
  "PAYPLUS",
  "ALIEXPRESS"
];

function isGenericBiller(name: string): boolean {
  const normalized = normalizeMerchantName(name);
  return IGNORED_GENERIC_BILLERS.some(biller => 
    normalized === biller || normalized.startsWith(biller)
  );
}

export async function detectSubscriptions(workspaceId: number): Promise<void> {
  const db = getDb();

  // 1. Fetch transactions from last 6 months
  const rows = db.prepare(`
    SELECT id, date, charged_amount as amount, description, subscription_id as subscriptionId, kind, type, installment_number as installmentNumber, installment_total as installmentTotal
    FROM transactions
    WHERE workspace_id = ? 
      AND status = 'completed' 
      AND is_excluded = 0 
      AND kind IN ('expense', 'income')
      AND date >= date('now', '-6 months')
    ORDER BY date ASC
  `).all(workspaceId) as TransactionData[];

  const existingSubs = getSubscriptions(workspaceId);
  const subMap = new Map<string, Subscription>();
  for (const sub of existingSubs) {
    subMap.set(normalizeMerchantName(sub.name), sub);
  }

  // 2. Group by merchant
  const groups = new Map<string, TransactionData[]>();
  for (const row of rows) {
    const key = normalizeMerchantName(row.description);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const newAlerts: { merchantName: string; previous: number; newAmount: number }[] = [];

  // 3. Analyze each group
  for (const [merchantName, txns] of groups.entries()) {
    if (txns.length < 2) continue;
    if (isGenericBiller(merchantName)) continue;
    
    // Sort chronologically just to be sure
    txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let existingSub = subMap.get(merchantName);

    if (!existingSub) {
      // Attempt to detect if it's a recurring pattern
      let isMonthly = true;
      let totalAmount = 0;

      for (let i = 1; i < txns.length; i++) {
        const days = diffDays(txns[i - 1].date, txns[i].date);
        // Allow some slack for weekends/holidays (25-35 days for monthly)
        if (days < 25 || days > 35) {
          isMonthly = false;
          break;
        }
      }

      if (isMonthly) {
        // Create a new subscription with the most recent transaction's amount
        const latestAmount = Math.abs(txns[txns.length - 1].amount);
        const type = txns[0].amount < 0 ? "expense" : "income";
        
        const newSubId = createSubscription(workspaceId, {
          name: txns[0].description,
          amount: latestAmount,
          currency: "ILS", // We could infer this from the transaction, but default to ILS
          frequency: "monthly",
          type: type,
          status: "active"
        });

        // Re-fetch to populate map
        existingSub = getSubscriptions(workspaceId).find(s => s.id === newSubId);
        if (existingSub) subMap.set(merchantName, existingSub);
      }
    }

    if (existingSub) {
      // Link unlinked transactions and check for alerts
      let previousAmount = existingSub.amount;
      for (const txn of txns) {
        if (!txn.subscriptionId) {
          linkTransactionToSubscription(workspaceId, txn.id, existingSub.id);
        }

        const currentAbsAmount = Math.abs(txn.amount);
        // If this transaction is > 5% higher than the baseline/previous amount, and sub is active
        if (existingSub.status === "active" && currentAbsAmount > previousAmount * 1.05 && existingSub.type === "expense") {
          // Check if an alert already exists for this transaction
          const existingAlertCount = db.prepare(`
            SELECT COUNT(*) as count FROM subscription_alerts 
            WHERE workspace_id = ? AND transaction_id = ?
          `).get(workspaceId, txn.id) as { count: number };
          
          if (existingAlertCount.count === 0) {
            createSubscriptionAlert(workspaceId, existingSub.id, txn.id, previousAmount, currentAbsAmount);
            newAlerts.push({
              merchantName: existingSub.name,
              previous: previousAmount,
              newAmount: currentAbsAmount
            });
          }
        }
        
        // Update baseline to the latest transaction amount
        previousAmount = currentAbsAmount;
        
        // Always keep the subscription's amount synced with the latest transaction
        if (existingSub.amount !== currentAbsAmount) {
          updateSubscription(workspaceId, existingSub.id, { amount: currentAbsAmount });
          existingSub.amount = currentAbsAmount;
        }
        
        // If this is the last installment, cancel the subscription after a month has passed
        if (txn.type === 'installments' && txn.installmentNumber != null && txn.installmentTotal != null) {
          if (txn.installmentNumber === txn.installmentTotal && existingSub.status === "active") {
            const daysSince = diffDays(txn.date, new Date().toISOString());
            if (daysSince > 30) {
              updateSubscription(workspaceId, existingSub.id, { status: "cancelled" });
              existingSub.status = "cancelled";
            }
          }
        }
      }
    }
  }

  // 4. Send Push Notifications for new alerts
  if (newAlerts.length > 0) {
    try {
      const subs = listPushSubscriptions();
      if (subs.length > 0) {
        const keys = getVapidKeys();
        webpush.setVapidDetails("mailto:test@example.com", keys.publicKey, keys.privateKey);

        for (const alert of newAlerts) {
          const body = `${alert.merchantName} increased from ${alert.previous.toFixed(2)} to ${alert.newAmount.toFixed(2)}`;
          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                JSON.stringify({
                  title: "Subscription Price Hike",
                  body,
                  data: { url: "/subscriptions" },
                })
              );
            } catch (e: any) {
              if (e.statusCode === 410) {
                deletePushSubscription(sub.endpoint);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send subscription alert push notifications", err);
    }
  }
}
