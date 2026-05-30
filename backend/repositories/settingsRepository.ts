import { dbAll, dbGet, dbRun } from '../db/index.js';

/** Get all settings as a key-value map. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const overrides: Record<string, string> = {};
  const rows = await dbAll<{ key: string; value: string }>(
    `SELECT key, value FROM settings`
  );
  for (const r of rows) {
    overrides[r.key] = r.value;
  }
  return overrides;
}

/** Get a single setting value by key. Returns undefined if not set. */
export async function getSetting(key: string): Promise<string | undefined> {
  const row = await dbGet<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    [key]
  );
  return row?.value;
}

/** Upsert a setting (insert or update). */
export async function upsertSetting(key: string, value: string): Promise<void> {
  await dbRun(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

/** Delete a setting by key. */
export async function deleteSetting(key: string): Promise<void> {
  await dbRun(`DELETE FROM settings WHERE key = ?`, [key]);
}
