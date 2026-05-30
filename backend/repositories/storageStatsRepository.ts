import { dbGet } from '../db/index.js';

export interface StorageStatsRow {
  users: number;
  total_bytes: number;
  total_files: number;
}

/** Get aggregate storage stats across all users and files. */
export async function getStorageStats(): Promise<StorageStatsRow> {
  const row = await dbGet<StorageStatsRow>(
    `SELECT COUNT(DISTINCT users.id) AS users,
            COALESCE(SUM(size), 0) AS total_bytes,
            COUNT(files.id) AS total_files
     FROM users LEFT JOIN files ON files.user_id = users.id`
  );
  return {
    users: row?.users ?? 0,
    total_bytes: row?.total_bytes ?? 0,
    total_files: row?.total_files ?? 0,
  };
}
