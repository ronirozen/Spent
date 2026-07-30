import "server-only";
import { getDb } from "../index";
import webpush from "web-push";
import { getGlobalSetting, setGlobalSetting } from "./settings";

export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export function savePushSubscription(sub: webpush.PushSubscription) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth
  `);
  stmt.run(sub.endpoint, sub.keys.p256dh, sub.keys.auth);
}

export function deletePushSubscription(endpoint: string) {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`);
  stmt.run(endpoint);
}

export function listPushSubscriptions(): PushSubscriptionRow[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM push_subscriptions`);
  return stmt.all() as PushSubscriptionRow[];
}

export function getVapidKeys(): { publicKey: string; privateKey: string } {
  let publicKey = getGlobalSetting("vapid_public_key");
  let privateKey = getGlobalSetting("vapid_private_key");

  if (!publicKey || !privateKey) {
    const vapidKeys = webpush.generateVAPIDKeys();
    setGlobalSetting("vapid_public_key", vapidKeys.publicKey);
    setGlobalSetting("vapid_private_key", vapidKeys.privateKey);
    publicKey = vapidKeys.publicKey;
    privateKey = vapidKeys.privateKey;
  }

  return { publicKey, privateKey };
}
