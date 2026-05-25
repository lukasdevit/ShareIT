import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { db } from "./connection.js";
import { dbGet, dbAll, dbRun } from "./helpers.js";
import { getStorage } from "../services/storage/index.js";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "../config/index.js";

/**
 * Creates default admin user if none exists.
 */
export async function seedAdmin(): Promise<void> {
  const row = await dbGet<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`);
  if (row && row.cnt > 0) {
    console.log("Admin user already exists, skipping seed");
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await dbRun(
    `INSERT INTO users (username, password_hash, created_at, is_admin) VALUES (?, ?, ?, 1)`,
    [ADMIN_USERNAME, hash, new Date().toISOString()]
  );
  console.log(`Seeded admin user: ${ADMIN_USERNAME}`);
}

/**
 * Delete files past their expiration date. Returns count of deleted files.
 */
export async function cleanupExpiredFiles(): Promise<number> {
  const rows = await dbAll<{ id: number; path: string; storage_backend: string }>(
    `SELECT id, path, storage_backend FROM files WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`
  );

  let deleted = 0;
  for (const row of rows) {
    // Delete from storage
    try {
      if (row.storage_backend === "local") {
        const localPath = path.isAbsolute(row.path)
          ? row.path
          : path.join(process.cwd(), "uploads", row.path);
        try { fs.unlinkSync(localPath); } catch { /* already gone */ }
      } else {
        try { await getStorage().delete(row.path); } catch { /* already gone */ }
      }
    } catch { /* storage delete failed, still remove DB row */ }

    await dbRun(`DELETE FROM files WHERE id = ?`, [row.id]);
    deleted++;
  }

  if (deleted > 0) console.log(`Cleaned up ${deleted} expired file(s)`);
  return deleted;
}
