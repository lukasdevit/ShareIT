import type { FastifyBaseLogger } from 'fastify';
import { cleanupExpiredFiles } from './cleanup-service.js';
import { findStaleDemoUsers, deleteUser } from '../../repositories/user-repository.js';
import { findFilePathsByUserId, deleteFilesByUserId } from '../../repositories/file-repository.js';
import { deleteFromStorage } from '../../utils/index.js';
import { DEMO_CLEANUP_INTERVAL_MS, DEMO_MAX_AGE_MS } from '../../config/index.js';

/** Start all periodic cleanup jobs (expired files + stale demo accounts). */
export function startCleanupJobs(log: FastifyBaseLogger) {
  async function demoCleanup() {
    const cutoff = new Date(Date.now() - DEMO_MAX_AGE_MS).toISOString();

    let users: { id: number }[];
    try {
      users = await findStaleDemoUsers(cutoff);
    } catch (err) {
      log.warn({ err }, 'Failed to query stale demo users');
      return;
    }

    let cleaned = 0;
    for (const u of users) {
      try {
        const files = await findFilePathsByUserId(u.id);
        for (const f of files) await deleteFromStorage(f.path);
        await deleteFilesByUserId(u.id);
        await deleteUser(u.id);
        cleaned++;
      } catch (err) {
        log.warn({ err, userId: u.id }, 'Demo cleanup failed');
      }
    }
    if (cleaned > 0) log.info(`Cleaned up ${cleaned} stale demo user(s)`);
  }

  // Run once at startup
  cleanupExpiredFiles().catch(() => {});
  demoCleanup().catch(() => {});

  // Then on interval
  setInterval(() => {
    cleanupExpiredFiles().catch(() => {});
    demoCleanup().catch(() => {});
  }, DEMO_CLEANUP_INTERVAL_MS);
}
