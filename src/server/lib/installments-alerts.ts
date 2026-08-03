import "server-only";

import webpush from "web-push";
import { getDb } from "../db";
import { cleanMerchantDescription } from "./installments-extractor";
import {
  listPushSubscriptions,
  getVapidKeys,
  deletePushSubscription,
} from "../db/queries/push-subscriptions";

export interface InstallmentAlert {
  id: number;
  workspaceId: number;
  transactionId: number;
  merchantName: string;
  installmentNumber: number;
  installmentTotal: number;
  freedAmount: number;
  isDismissed: boolean;
  createdAt: string;
}

export function getInstallmentAlerts(
  workspaceId: number,
  includeDismissed = false
): InstallmentAlert[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT 
        id, 
        workspace_id as workspaceId, 
        transaction_id as transactionId, 
        merchant_name as merchantName,
        installment_number as installmentNumber, 
        installment_total as installmentTotal, 
        freed_amount as freedAmount, 
        is_dismissed as isDismissed, 
        created_at as createdAt
      FROM installment_alerts
      WHERE workspace_id = ? ${includeDismissed ? "" : "AND is_dismissed = 0"}
      ORDER BY created_at DESC
    `)
    .all(workspaceId) as (Omit<InstallmentAlert, "isDismissed"> & {
    isDismissed: number;
  })[];

  return rows.map((r) => ({
    ...r,
    isDismissed: r.isDismissed === 1,
  }));
}

export function createInstallmentAlert(
  workspaceId: number,
  transactionId: number,
  merchantName: string,
  installmentNumber: number,
  installmentTotal: number,
  freedAmount: number
): number {
  const db = getDb();
  const result = db
    .prepare(`
      INSERT INTO installment_alerts (
        workspace_id, transaction_id, merchant_name, installment_number, installment_total, freed_amount
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      workspaceId,
      transactionId,
      merchantName,
      installmentNumber,
      installmentTotal,
      freedAmount
    );
  return result.lastInsertRowid as number;
}

export function dismissInstallmentAlert(
  workspaceId: number,
  alertId: number
): void {
  const db = getDb();
  db.prepare(`
    UPDATE installment_alerts
    SET is_dismissed = 1
    WHERE workspace_id = ? AND id = ?
  `).run(workspaceId, alertId);
}

export async function detectInstallmentAlerts(workspaceId: number): Promise<void> {
  const db = getDb();

  // Find all transactions where installment_number === installment_total (Last Payment!)
  const lastPaymentRows = db
    .prepare(`
      SELECT 
        t.id, 
        t.description, 
        t.charged_amount, 
        t.installment_number, 
        t.installment_total
      FROM transactions t
      WHERE t.workspace_id = ?
        AND t.type = 'installments'
        AND t.installment_number IS NOT NULL
        AND t.installment_total IS NOT NULL
        AND t.installment_number = t.installment_total
        AND t.installment_total > 1
        AND t.is_excluded = 0
    `)
    .all(workspaceId) as Array<{
    id: number;
    description: string;
    charged_amount: number;
    installment_number: number;
    installment_total: number;
  }>;

  const newAlerts: Array<{
    merchantName: string;
    installmentTotal: number;
    freedAmount: number;
  }> = [];

  for (const row of lastPaymentRows) {
    // Check if alert already exists for this transaction
    const existing = db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM installment_alerts 
        WHERE workspace_id = ? AND transaction_id = ?
      `)
      .get(workspaceId, row.id) as { count: number };

    if (existing.count === 0) {
      const merchantName = cleanMerchantDescription(row.description) || row.description;
      const freedAmount = Math.abs(row.charged_amount);

      createInstallmentAlert(
        workspaceId,
        row.id,
        merchantName,
        row.installment_number,
        row.installment_total,
        freedAmount
      );

      newAlerts.push({
        merchantName,
        installmentTotal: row.installment_total,
        freedAmount,
      });
    }
  }

  // Send Web Push notifications for newly detected last payment alerts
  if (newAlerts.length > 0) {
    try {
      const subs = listPushSubscriptions();
      if (subs.length > 0) {
        const keys = getVapidKeys();
        webpush.setVapidDetails("mailto:support@spent.app", keys.publicKey, keys.privateKey);

        for (const alert of newAlerts) {
          const body = `Final payment of ₪${alert.freedAmount.toFixed(2)} for ${alert.merchantName} (${alert.installmentTotal} of ${alert.installmentTotal}). This budget frees up next month!`;
          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                JSON.stringify({
                  title: "Final Payment Alert / תשלום אחרון",
                  body,
                  data: { url: "/installments" },
                })
              );
            } catch (e: unknown) {
              if (e && typeof e === "object" && "statusCode" in e && (e as { statusCode: number }).statusCode === 410) {
                deletePushSubscription(sub.endpoint);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send installment alert push notifications", err);
    }
  }
}
