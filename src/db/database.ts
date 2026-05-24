import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "database.db");

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
    created_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    storage_limit INTEGER NOT NULL DEFAULT 10737418240,
    is_admin INTEGER NOT NULL DEFAULT 0
  )
`);

// Add storage_limit column for existing databases that may not have it
db.run(`ALTER TABLE users ADD COLUMN storage_limit INTEGER NOT NULL DEFAULT 10737418240`, (err) => {
  if (err && !err.message.includes("duplicate column")) {
    // Column already exists or other expected error — ignore
  }
});

// Add is_admin column for existing databases that may not have it
db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`, (err) => {
  if (err && !err.message.includes("duplicate column")) {
    // Column already exists or other expected error — ignore
  }
});

export function closeDb(): void {
  db.close();
  // Clean up test database files
  if (process.env.DB_PATH) {
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + "-wal"); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + "-shm"); } catch { /* ignore */ }
  }
}