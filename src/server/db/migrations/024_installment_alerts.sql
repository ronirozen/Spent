CREATE TABLE installment_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  installment_number INTEGER NOT NULL,
  installment_total INTEGER NOT NULL,
  freed_amount REAL NOT NULL,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_installment_alerts_workspace ON installment_alerts(workspace_id);
CREATE INDEX idx_installment_alerts_transaction ON installment_alerts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installments ON transactions(workspace_id, type, installment_number, installment_total);
