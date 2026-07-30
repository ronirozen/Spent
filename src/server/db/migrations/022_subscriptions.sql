CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'yearly', 'weekly')),
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  status TEXT NOT NULL CHECK(status IN ('active', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);

CREATE TABLE subscription_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  previous_amount REAL NOT NULL,
  new_amount REAL NOT NULL,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscription_alerts_workspace ON subscription_alerts(workspace_id);
CREATE INDEX idx_subscription_alerts_subscription ON subscription_alerts(subscription_id);

ALTER TABLE transactions ADD COLUMN subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN is_subscription_inferred INTEGER NOT NULL DEFAULT 0;
