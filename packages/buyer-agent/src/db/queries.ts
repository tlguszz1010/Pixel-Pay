import { getDb } from "./schema";

// ── Settings ────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}

// ── Purchases ───────────────────────────────────────────

export interface Purchase {
  id: number;
  image_id: string;
  prompt: string | null;
  price: string;
  purchased_at: string;
  filename: string | null;
}

export function addPurchase(data: {
  image_id: string;
  prompt?: string;
  price?: string;
  filename?: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO purchases (image_id, prompt, price, filename) VALUES (?, ?, ?, ?)"
    )
    .run(data.image_id, data.prompt ?? null, data.price ?? "0.01", data.filename ?? null);
}

export function getPurchases(limit = 50): Purchase[] {
  return getDb()
    .prepare("SELECT * FROM purchases ORDER BY purchased_at DESC LIMIT ?")
    .all(limit) as Purchase[];
}

export function getTotalSpent(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM purchases")
    .get() as { cnt: number };
  return row.cnt * 0.01;
}

export function getPurchaseCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM purchases")
    .get() as { cnt: number };
  return row.cnt;
}

// ── Logs ────────────────────────────────────────────────

export function addLog(
  type: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  getDb()
    .prepare("INSERT INTO logs (type, message, metadata) VALUES (?, ?, ?)")
    .run(type, message, metadata ? JSON.stringify(metadata) : null);
}

export function getLogs(limit = 100): Array<{
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
}> {
  return getDb()
    .prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?")
    .all(limit) as any[];
}
