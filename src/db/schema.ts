import { db } from './connection.js';
import { DEFAULT_STORAGE_LIMIT } from '../config/index.js';

/**
 * Run all schema migrations — CREATE TABLE IF NOT EXISTS is idempotent.
 * Wrapped in serialize() so ALTER TABLE never runs before CREATE TABLE.
 */
export function runMigrations(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ignoreDuplicate = (err: Error | null) => {
      if (err && !err.message.includes('duplicate column')) {
        console.warn(`Migration warning: ${err.message}`);
      }
    };

    db.serialize(() => {
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

      db.run(
        `ALTER TABLE files ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1`,
        ignoreDuplicate
      );
      db.run(`ALTER TABLE files ADD COLUMN expires_at TEXT`, ignoreDuplicate);
      db.run(
        `ALTER TABLE files ADD COLUMN storage_backend TEXT NOT NULL DEFAULT 'local'`,
        ignoreDuplicate
      );

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
      db.run(
        `ALTER TABLE users ADD COLUMN storage_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STORAGE_LIMIT}`,
        ignoreDuplicate
      );
      db.run(
        `ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`,
        ignoreDuplicate
      );
      db.run(
        `ALTER TABLE users ADD COLUMN failed_logins INTEGER NOT NULL DEFAULT 0`,
        ignoreDuplicate
      );
      db.run(`ALTER TABLE users ADD COLUMN locked_until TEXT`, ignoreDuplicate);
      db.run(
        `ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0`,
        ignoreDuplicate
      );

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

      // ── integrity_checks table ──
      db.run(`
      CREATE TABLE IF NOT EXISTS integrity_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        total_issues INTEGER NOT NULL DEFAULT 0,
        missing_files INTEGER NOT NULL DEFAULT 0,
        orphaned_files INTEGER NOT NULL DEFAULT 0,
        size_mismatches INTEGER NOT NULL DEFAULT 0
      )
    `);

      // ── integrity_issues table ──
      db.run(`
      CREATE TABLE IF NOT EXISTS integrity_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_id TEXT NOT NULL,
        type TEXT NOT NULL,
        file_id INTEGER,
        filename TEXT,
        original_name TEXT,
        user_id INTEGER,
        disk_path TEXT,
        db_size INTEGER,
        disk_size INTEGER,
        resolved INTEGER NOT NULL DEFAULT 0,
        action_taken TEXT,
        FOREIGN KEY (check_id) REFERENCES integrity_checks(check_id)
      )
    `);

      // ── admin_actions table (undoable admin operations log) ──
      db.run(
        `
      CREATE TABLE IF NOT EXISTS admin_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        undo_data TEXT,
        undone INTEGER NOT NULL DEFAULT 0
      )
    `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}
