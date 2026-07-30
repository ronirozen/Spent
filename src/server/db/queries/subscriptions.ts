import "server-only";
import { getDb } from "../index";

export interface Subscription {
  id: number;
  workspaceId: number;
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly" | "weekly";
  type: "income" | "expense";
  status: "active" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionAlert {
  id: number;
  workspaceId: number;
  subscriptionId: number;
  transactionId: number;
  previousAmount: number;
  newAmount: number;
  isDismissed: boolean;
  createdAt: string;
  
  subscriptionName?: string;
}

export function getSubscriptions(workspaceId: number): Subscription[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, workspace_id as workspaceId, name, amount, currency,
           frequency, type, status, created_at as createdAt, updated_at as updatedAt
    FROM subscriptions
    WHERE workspace_id = ?
    ORDER BY amount DESC
  `).all(workspaceId) as Subscription[];
  return rows;
}

export function createSubscription(
  workspaceId: number,
  data: Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt">
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO subscriptions (workspace_id, name, amount, currency, frequency, type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    workspaceId,
    data.name,
    data.amount,
    data.currency,
    data.frequency,
    data.type,
    data.status
  );
  return result.lastInsertRowid as number;
}

export function updateSubscription(
  workspaceId: number,
  id: number,
  data: Partial<Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt">>
): void {
  const db = getDb();
  const setClauses: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push("updated_at = datetime('now')");
  params.push(workspaceId, id);
  
  db.prepare(`
    UPDATE subscriptions
    SET ${setClauses.join(", ")}
    WHERE workspace_id = ? AND id = ?
  `).run(...params);
}

export function deleteSubscription(workspaceId: number, id: number): void {
  const db = getDb();
  db.prepare(`
    DELETE FROM subscriptions
    WHERE workspace_id = ? AND id = ?
  `).run(workspaceId, id);
}

export function getSubscriptionAlerts(workspaceId: number, includeDismissed = false): SubscriptionAlert[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.id, a.workspace_id as workspaceId, a.subscription_id as subscriptionId,
           a.transaction_id as transactionId, a.previous_amount as previousAmount,
           a.new_amount as newAmount, a.is_dismissed as isDismissed, a.created_at as createdAt,
           s.name as subscriptionName
    FROM subscription_alerts a
    JOIN subscriptions s ON a.subscription_id = s.id
    WHERE a.workspace_id = ? ${includeDismissed ? '' : 'AND a.is_dismissed = 0'}
    ORDER BY a.created_at DESC
  `).all(workspaceId) as (SubscriptionAlert & { isDismissed: number })[];
  
  return rows.map(r => ({
    ...r,
    isDismissed: r.isDismissed === 1
  }));
}

export function dismissAlert(workspaceId: number, alertId: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE subscription_alerts
    SET is_dismissed = 1
    WHERE workspace_id = ? AND id = ?
  `).run(workspaceId, alertId);
}

export function createSubscriptionAlert(
  workspaceId: number,
  subscriptionId: number,
  transactionId: number,
  previousAmount: number,
  newAmount: number
): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO subscription_alerts (workspace_id, subscription_id, transaction_id, previous_amount, new_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(workspaceId, subscriptionId, transactionId, previousAmount, newAmount);
  return result.lastInsertRowid as number;
}

export function linkTransactionToSubscription(
  workspaceId: number,
  transactionId: number,
  subscriptionId: number | null
): void {
  const db = getDb();
  db.prepare(`
    UPDATE transactions
    SET subscription_id = ?
    WHERE workspace_id = ? AND id = ?
  `).run(subscriptionId, workspaceId, transactionId);
}
