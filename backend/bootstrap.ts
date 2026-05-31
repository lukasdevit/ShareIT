import type { FastifyInstance } from 'fastify';
import { getBackupScheduleHours, getBackupRetentionDays } from './config/index.js';
import { initSchema, seedAdmin, backupDatabase } from './db/index.js';
import { resolveProvider } from './services/storage/index.js';
import { initLocalPath } from './services/storage/index.js';
import { initScanner } from './utils/scan.js';
import { startCleanupJobs } from './services/cleanup/cleanup-jobs.js';

export async function bootstrap(app: FastifyInstance) {
  await initSchema();
  await seedAdmin(app.log);

  // Populate local storage path cache before any resolveProvider('local') calls
  await initLocalPath();

  startCleanupJobs(app.log);
  await initScanner();

  startBackupJob(app);

  app.log.info('Bootstrap completed');
}

function startBackupJob(app: FastifyInstance) {
  async function runBackup() {
    try {
      const { getStorageBackend } = await import('./config/index.js');
      const backend = await getStorageBackend();

      const destinations = [{
        provider: resolveProvider(backend),
        keyPrefix: 'backups',
        label: backend,
        retentionDays: await getBackupRetentionDays(),
      }];
      await backupDatabase(app.log, ...destinations);
    } catch (err) {
      app.log.error({ err }, 'Scheduled backup failed');
    } finally {
      // Always reschedule — even if backup fails, don't silently die
      const hours = await getBackupScheduleHours();
      setTimeout(runBackup, hours * 60 * 60 * 1000);
    }
  }

  setTimeout(runBackup, 2000);
}
