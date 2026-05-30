import type { FastifyBaseLogger } from 'fastify';
import { findStaleDemoUsers, deleteUser } from '../repositories/userRepository.js';
import { findFilePathsByUserId, deleteFilesByUserId } from '../repositories/fileRepository.js';
import { deleteFromStorage } from '../utils/index.js';
import { DEMO_CLEANUP_INTERVAL_MS, DEMO_MAX_AGE_MS } from '../config/index.js';

/**
 * Periodic cleanup of stale demo users and their files.
 * Runs every DEMO_CLEANUP_INTERVAL_MS, deletes demo users older than DEMO_MAX_AGE_MS.
 */
export function startDemoCleanup(log: FastifyBaseLogger): void {
  async function cleanup() {
    const cutoff = new Date(Date.now() - DEMO_MAX_AGE_MS).toISOString();

    let users: { id: number }[];
    try {
      users = await findStaleDemoUsers(cutoff);
    } catch (err) {
      log.warn({ err }, 'Failed to query stale demo users');
      return;
    }

    if (users.length === 0) return;

    let cleaned = 0;
    for (const u of users) {
      try {
        const files = await findFilePathsByUserId(u.id);
        for (const f of files) {
          await deleteFromStorage(f.path);
        }
        await deleteFilesByUserId(u.id);
        await deleteUser(u.id);
        cleaned++;
      } catch (err) {
        log.warn({ err, userId: u.id }, 'Failed to clean up demo user');
      }
    }

    if (cleaned > 0) {
      log.info(`Cleaned up ${cleaned} stale demo user(s)`);
    }
  }

  // Run immediately on startup, then on interval
  cleanup();
  setInterval(cleanup, DEMO_CLEANUP_INTERVAL_MS);
}
