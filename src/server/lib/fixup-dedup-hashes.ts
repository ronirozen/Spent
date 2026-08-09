import type Database from "better-sqlite3";
import { computeDedupHash } from "./dedup";

export function backfillDedupHashes(db: Database.Database): number {
  try {
    const rows = db.prepare(`
      SELECT id, workspace_id, account_number, date, original_amount, original_currency,
             description, installment_number, installment_total, status, updated_at
      FROM transactions
    `).all() as Array<{
      id: number;
      workspace_id: number;
      account_number: string;
      date: string;
      original_amount: number;
      original_currency: string;
      description: string;
      installment_number: number | null;
      installment_total: number | null;
      status: string;
      updated_at: string;
    }>;

    if (!rows || rows.length === 0) return 0;

    // First group by the new hash
    const grouped = new Map<string, typeof rows>();

    for (const row of rows) {
      const newHash = computeDedupHash({
        accountNumber: row.account_number,
        date: row.date,
        originalAmount: row.original_amount,
        originalCurrency: row.original_currency,
        description: row.description,
        installmentNumber: row.installment_number,
        installmentTotal: row.installment_total,
      });

      const key = `${row.workspace_id}_${newHash}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push({ ...row, _newHash: newHash } as any);
    }

    const updateStmt = db.prepare(`
      UPDATE transactions 
      SET dedup_hash = ?, dedup_sequence = ? 
      WHERE id = ?
    `);

    const deleteStmt = db.prepare(`
      DELETE FROM transactions WHERE id = ?
    `);

    // We must temporarily clear dedup hashes to avoid unique constraint violations during resequencing
    const clearStmt = db.prepare(`
      UPDATE transactions SET dedup_hash = id || '_temp'
    `);

    let processedCount = 0;

    db.transaction(() => {
      // Clear old hashes to avoid conflicts while migrating
      clearStmt.run();

      for (const [key, group] of grouped.entries()) {
        if (group.length === 1) {
          // No duplicates
          const item = group[0];
          updateStmt.run((item as any)._newHash, 0, item.id);
          processedCount++;
          continue;
        }

        // We have a group with the same new hash (possible duplicates)
        // Sort: 'completed' first, then latest updated_at first
        group.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return -1;
          if (b.status === 'completed' && a.status !== 'completed') return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        // The first item is our "winner" (completed and/or newest)
        let seq = 0;
        let hasCompleted = group[0].status === 'completed';

        for (let i = 0; i < group.length; i++) {
          const item = group[i];
          const newHash = (item as any)._newHash;

          if (i === 0) {
            updateStmt.run(newHash, seq, item.id);
            seq++;
            processedCount++;
          } else {
            // For subsequent items:
            // If the winner is 'completed' and this one is 'pending', it's the bug! Delete it.
            if (hasCompleted && item.status === 'pending') {
              deleteStmt.run(item.id);
            } else {
              // Otherwise (e.g. both are completed, or both are pending), it might be a genuine duplicate
              // (e.g. buying two coffees). We keep it and increment sequence.
              updateStmt.run(newHash, seq, item.id);
              seq++;
              processedCount++;
            }
          }
        }
      }
    })();

    return processedCount;
  } catch (err) {
    console.error("Failed to backfill dedup hashes:", err);
    return 0;
  }
}
