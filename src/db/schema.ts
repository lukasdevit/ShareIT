import { db } from "./connection.js";
import { DEFAULT_STORAGE_LIMIT } from "../config/index.js";

/**
 * Run all schema migrations — CREATE TABLE IF NOT EXISTS is idempotent.
 * For new columns, ALTER TABLE silently ignores "duplicate column" errors.
 */
export function runMigrations(): void {
  // ── files table ──
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

  // Migrations for older databases
  const ignoreDuplicate = (err: Error | null) => {
    if (err && !err.message.includes("duplicate column")) {
      console.warn(`Migration warning: ${err.message}`);
    }
  };

  db.run(`ALTER TABLE files ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1`, ignoreDuplicate);
  db.run(`ALTER TABLE files ADD COLUMN expires_at TEXT`, ignoreDuplicate);
  db.run(`ALTER TABLE files ADD COLUMN storage_backend TEXT NOT NULL DEFAULT 'local'`, ignoreDuplicate);

  // ── users table ──
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

  db.run(`ALTER TABLE users ADD COLUMN email TEXT`, ignoreDuplicate);
  db.run(`ALTER TABLE users ADD COLUMN storage_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STORAGE_LIMIT}`, ignoreDuplicate);
  db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`, ignoreDuplicate);
  db.run(`ALTER TABLE users ADD COLUMN failed_logins INTEGER NOT NULL DEFAULT 0`, ignoreDuplicate);
  db.run(`ALTER TABLE users ADD COLUMN locked_until TEXT`, ignoreDuplicate);

  // ── settings table ──
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // ── backup_logs table ──
  db.run(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL,
      size_bytes INTEGER,
      error TEXT
    )
  `);
}
