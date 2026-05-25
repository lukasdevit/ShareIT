import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { DB_PATH, DEFAULT_STORAGE_LIMIT, ADMIN_USERNAME, ADMIN_PASSWORD } from "../config/index.js";

const dbPath = DB_PATH;

// Ensure the directory for the db file exists (important for custom paths like /tmp)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log(`Connected to SQLite: ${dbPath}`);
  }
});

// Enable WAL mode for better concurrent read/write performance
db.run("PRAGMA journal_mode=WAL");

db.run(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    user_id INTEGER,
    created_at TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    storage_backend TEXT NOT NULL DEFAULT 'local'
  )
`);

// Add is_public column for existing databases that may not have it
db.run(`ALTER TABLE files ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Add expires_at column for existing databases
db.run(`ALTER TABLE files ADD COLUMN expires_at TEXT`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Add storage_backend column for existing databases
db.run(`ALTER TABLE files ADD COLUMN storage_backend TEXT NOT NULL DEFAULT 'local'`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL,
    storage_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STORAGE_LIMIT},
    is_admin INTEGER NOT NULL DEFAULT 0,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  )
`);

// Add email column for existing databases
db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Add storage_limit column for existing databases that may not have it
db.run(`ALTER TABLE users ADD COLUMN storage_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STORAGE_LIMIT}`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Add is_admin column for existing databases that may not have it
db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Add failed_logins and locked_until columns for existing databases
db.run(`ALTER TABLE users ADD COLUMN failed_logins INTEGER NOT NULL DEFAULT 0`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});
db.run(`ALTER TABLE users ADD COLUMN locked_until TEXT`, (err) => {
  if (err && !err.message.includes("duplicate column")) { /* */ }
});

// Settings key-value store for runtime overrides
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export function closeDb(): void {
  db.close();
  // Clean up test database files
  if (process.env.DB_PATH) {
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + "-wal"); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + "-shm"); } catch { /* ignore */ }
  }
}

/**
 * Delete files past their expiration date. Returns count of deleted files.
 * Call periodically (e.g., via cron or setInterval).
 */
export async function cleanupExpiredFiles(): Promise<number> {
  return new Promise((resolve) => {
    db.all(
      `SELECT id, path, storage_backend FROM files WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
      async (err, rows: { id: number; path: string; storage_backend: string }[]) => {
        if (err) { resolve(0); return; }
        let deleted = 0;
        for (const row of rows) {
          try {
            if (row.storage_backend === "local") {
              const fs = await import("fs");
              const pathMod = await import("path");
              const localPath = pathMod.isAbsolute(row.path) && row.path.startsWith("/")
                ? row.path
                : pathMod.join(process.cwd(), "uploads", row.path);
              try { fs.unlinkSync(localPath); } catch { /* */ }
            } else {
              try { await (await import("../services/storage.js")).getStorage().delete(row.path); } catch { /* */ }
            }
          } catch { /* storage delete failed, still remove DB row */ }

          await new Promise<void>((res) => {
            db.run(`DELETE FROM files WHERE id = ?`, [row.id], () => res());
          });
          deleted++;
        }
        if (deleted > 0) console.log(`Cleaned up ${deleted} expired file(s)`);
        resolve(deleted);
      }
    );
  });
}

export async function seedAdmin(): Promise<void> {
  const username = ADMIN_USERNAME;
  const password = ADMIN_PASSWORD;

  return new Promise((resolve) => {
    db.get(`SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`, (err, row: { cnt: number }) => {
      if (err || (row && row.cnt > 0)) {
        if (row && row.cnt > 0) console.log("Admin user already exists, skipping seed");
        resolve();
        return;
      }

      bcrypt.hash(password, 10).then((hash) => {
        db.run(
          `INSERT INTO users (username, password_hash, created_at, is_admin) VALUES (?, ?, ?, 1)`,
          [username, hash, new Date().toISOString()],
          (err2) => {
            if (err2) {
              console.error("Failed to seed admin user:", err2.message);
            } else {
              console.log(`Seeded admin user: ${username}`);
            }
            resolve();
          }
        );
      });
    });
  });
}

// ── Promisified helpers ──

export function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function dbRun(sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}