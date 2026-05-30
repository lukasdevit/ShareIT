import { dbAll, dbRun } from '../../db/index.js';
import { resolveProvider } from '../storage/index.js';
import type { StorageProvider } from '../storage/types.js';

/** Delete files past their expiration date. Returns count of deleted files. */
export async function cleanupExpiredFiles(): Promise<number> {
  const rows = await dbAll<{ id: number; path: string; storage_backend: string }>(
    `SELECT id, path, storage_backend FROM files
     WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`
  );

  let deleted = 0;
  for (const row of rows) {
    try {
      const storage: StorageProvider = resolveProvider(row.storage_backend);
      await storage.delete(row.path);
    } catch { /* already gone */ }

    await dbRun(`DELETE FROM files WHERE id = ?`, [row.id]);
    deleted++;
  }

  return deleted;
}

/** Delete a single demo user and all their files from storage + DB. */
export async function deleteDemoUserData(
  userId: number,
  fileRepo: { findPaths: (id: number) => Promise<{ path: string }[]>; deleteAll: (id: number) => Promise<number> },
  userRepo: { deleteUser: (id: number) => Promise<number> },
  deleteFromStorage: (path: string) => Promise<void>,
): Promise<void> {
  const files = await fileRepo.findPaths(userId);
  for (const f of files) await deleteFromStorage(f.path);
  await fileRepo.deleteAll(userId);
  await userRepo.deleteUser(userId);
}
