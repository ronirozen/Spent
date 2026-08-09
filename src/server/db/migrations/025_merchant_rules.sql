CREATE TABLE merchant_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT,
  merchant_key TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'exact',
  action TEXT NOT NULL DEFAULT 'exclude',
  normalized_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_merchant_rules_lookup ON merchant_rules(workspace_id, provider);

INSERT INTO merchant_rules (workspace_id, provider, merchant_key, match_type, action, created_at)
SELECT workspace_id, provider, merchant_key, 'exact', 'exclude', created_at FROM excluded_merchants;

DROP TABLE excluded_merchants;
