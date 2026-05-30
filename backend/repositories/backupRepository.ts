import { dbAll } from '../db/index.js';

export interface BackupLogRow {
  id: number;
  timestamp: string;
  destination: string;
  status: string;
  size_bytes: number | null;
  error: string | null;
}

/** List backup history (last 50 entries, most recent first). */
export async function listBackupHistory(): Promise<BackupLogRow[]> {
  return dbAll<BackupLogRow>(
    `SELECT * FROM backup_logs ORDER BY id DESC LIMIT 50`
  );
}
