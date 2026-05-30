import bcrypt from 'bcrypt';
import { dbGet, dbRun } from './helpers.js';
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  DEFAULT_STORAGE_LIMIT,
} from '../config/index.js';

interface Logger {
  info: (msg: string) => void;
}

/** Creates default admin user if none exists. */
export async function seedAdmin(log?: Logger): Promise<void> {
  const row = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`
  );
  if (row && row.cnt > 0) {
    log?.info('Admin user already exists, skipping seed');
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await dbRun(
    `INSERT INTO users (username, password_hash, created_at, is_admin, storage_limit) VALUES (?, ?, ?, 1, ?)`,
    [ADMIN_USERNAME, hash, new Date().toISOString(), DEFAULT_STORAGE_LIMIT]
  );
  log?.info(`Seeded admin user: ${ADMIN_USERNAME}`);
}
