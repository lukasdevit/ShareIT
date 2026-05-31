import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { DB_PATH } from '../config/index.js';

const dbPath = DB_PATH;

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log(`Connected to SQLite: ${dbPath}`);
  }
});

// Enable WAL mode for better concurrent read/write performance
db.run('PRAGMA journal_mode=WAL');

export function closeDb(): void {
  db.close();
  if (DB_PATH !== path.join(process.cwd(), 'database.db')) {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(dbPath + '-wal');
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(dbPath + '-shm');
    } catch {
      /* ignore */
    }
  }
}
