import { db } from "../../db/database.js";
import path from "path";
import fs from "fs";
import { getStorage } from "../../services/storage.js";
import { UPLOAD_DIR } from "../../config/index.js";

/** Wrap a sqlite db.run call in a Promise */
export function dbRun(sql: string, params: (string | number | null)[] = []): Promise<{ changes: number; lastID: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: { changes: number; lastID: number }, err: Error | null) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

/** Wrap a sqlite db.get call in a Promise */
export function dbGet<T>(sql: string, params: (string | number | null)[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T | undefined) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/** Wrap a sqlite db.all call in a Promise */
export function dbAll<T>(sql: string, params: (string | number | null)[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/** Extract pagination params from request query */
export function parsePagination(query: Record<string, string | undefined>, defaultLimit = 25) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  const search = query.search?.trim() || "";
  return { page, limit, offset, search };
}

/** Delete a file from whichever storage backend it lives on */
export async function deleteFromStorage(storageKey: string): Promise<void> {
  if (path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)) {
    try { fs.unlinkSync(storageKey); } catch { /* */ }
    return;
  }
  await getStorage().delete(storageKey);
}
