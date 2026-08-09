import "server-only";

import { getDb } from "../index";
import type { MerchantRule } from "@/lib/types";

interface RawMerchantRuleRow {
  id: number;
  provider: string | null;
  merchant_key: string;
  match_type: "exact" | "contains" | "starts_with";
  action: "exclude" | "normalize";
  normalized_name: string | null;
  created_at: string;
}

function mapRow(row: RawMerchantRuleRow): MerchantRule {
  return {
    id: row.id,
    provider: row.provider,
    merchantKey: row.merchant_key,
    matchType: row.match_type,
    action: row.action,
    normalizedName: row.normalized_name,
    createdAt: row.created_at,
  };
}

export function listMerchantRules(workspaceId: number): MerchantRule[] {
  const rows = getDb()
    .prepare(
      `SELECT id, provider, merchant_key, match_type, action, normalized_name, created_at
       FROM merchant_rules
       WHERE workspace_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(workspaceId) as RawMerchantRuleRow[];
  return rows.map(mapRow);
}

export function addMerchantRule(
  workspaceId: number,
  provider: string | null,
  merchantKey: string,
  matchType: "exact" | "contains" | "starts_with",
  action: "exclude" | "normalize",
  normalizedName: string | null
): void {
  const result = getDb()
    .prepare(
      `INSERT INTO merchant_rules (workspace_id, provider, merchant_key, match_type, action, normalized_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(workspaceId, provider, merchantKey, matchType, action, normalizedName);
  
  // Apply retroactively
  applySingleRuleRetroactively(workspaceId, Number(result.lastInsertRowid));
}

export function applySingleRuleRetroactively(workspaceId: number, ruleId: number) {
  const db = getDb();
  
  const rules = listMerchantRules(workspaceId);
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;

  let condition = "transactions.workspace_id = ?";
  const params: any[] = [workspaceId];

  if (rule.provider) {
    condition += " AND transactions.provider = ?";
    params.push(rule.provider);
  }

  if (rule.matchType === "exact") {
    condition += " AND transactions.description = ?";
    params.push(rule.merchantKey);
  } else if (rule.matchType === "starts_with") {
    condition += " AND transactions.description LIKE ?";
    params.push(`${rule.merchantKey}%`);
  } else if (rule.matchType === "contains") {
    condition += " AND transactions.description LIKE ?";
    params.push(`%${rule.merchantKey}%`);
  }

  if (rule.action === "exclude") {
    db.prepare(`
      UPDATE transactions
      SET is_excluded = 1, updated_at = datetime('now')
      WHERE ${condition} AND is_excluded = 0
    `).run(...params);
  } else if (rule.action === "normalize" && rule.normalizedName) {
    db.prepare(`
      UPDATE transactions
      SET description = ?, updated_at = datetime('now')
      WHERE ${condition} AND description != ?
    `).run(...params, rule.normalizedName, rule.normalizedName);
  }
}

export function deleteMerchantRule(
  workspaceId: number,
  id: number
): boolean {
  const result = getDb()
    .prepare(
      `DELETE FROM merchant_rules WHERE workspace_id = ? AND id = ?`
    )
    .run(workspaceId, id);
  return result.changes > 0;
}

export function deleteMerchantRuleByKey(
  workspaceId: number,
  provider: string,
  merchantKey: string
): boolean {
  const result = getDb()
    .prepare(
      `DELETE FROM merchant_rules
       WHERE workspace_id = ? AND provider = ? AND merchant_key = ?`
    )
    .run(workspaceId, provider, merchantKey);
  return result.changes > 0;
}

/**
 * Applies merchant rules to transactions for a given sync run.
 * Handles both exclusion and normalization based on rule logic.
 */
export function applyMerchantRulesToSyncRun(
  workspaceId: number,
  syncRunId: number
): number {
  const db = getDb();
  let changes = 0;

  // Fetch all rules for the workspace
  const rules = listMerchantRules(workspaceId);
  if (rules.length === 0) return 0;

  db.transaction(() => {
    for (const rule of rules) {
      let condition = "transactions.workspace_id = ? AND transactions.sync_run_id = ?";
      const params: any[] = [workspaceId, syncRunId];

      if (rule.provider) {
        condition += " AND transactions.provider = ?";
        params.push(rule.provider);
      }

      if (rule.matchType === "exact") {
        condition += " AND transactions.description = ?";
        params.push(rule.merchantKey);
      } else if (rule.matchType === "starts_with") {
        condition += " AND transactions.description LIKE ?";
        params.push(`${rule.merchantKey}%`);
      } else if (rule.matchType === "contains") {
        condition += " AND transactions.description LIKE ?";
        params.push(`%${rule.merchantKey}%`);
      }

      if (rule.action === "exclude") {
        const stmt = db.prepare(`
          UPDATE transactions
          SET is_excluded = 1, updated_at = datetime('now')
          WHERE ${condition} AND is_excluded = 0
        `);
        changes += stmt.run(...params).changes;
      } else if (rule.action === "normalize" && rule.normalizedName) {
        // Also ensure we don't apply if it's already normalized exactly
        const stmt = db.prepare(`
          UPDATE transactions
          SET description = ?, updated_at = datetime('now')
          WHERE ${condition} AND description != ?
        `);
        changes += stmt.run(...params, rule.normalizedName, rule.normalizedName).changes;
      }
    }
  })();

  return changes;
}

/**
 * Flips is_excluded for a single transaction. Used by the row "Hide / Show" action.
 */
export function setTransactionExcluded(
  workspaceId: number,
  id: number,
  excluded: boolean
): void {
  getDb()
    .prepare(
      `UPDATE transactions
       SET is_excluded = ?, updated_at = datetime('now')
       WHERE workspace_id = ? AND id = ?`
    )
    .run(excluded ? 1 : 0, workspaceId, id);
}
