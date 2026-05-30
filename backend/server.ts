import { buildApp } from './app.js';
import { PORT, isB2Enabled, getBackupScheduleHours } from './config/index.js';
import { seedAdmin, cleanupExpiredFiles, backupDatabase } from './db/index.js';
import type { StorageProvider } from './services/storage/types.js';
import { LocalStorage } from './services/storage/local.js';
import { B2Storage } from './services/storage/b2.js';
import { writeLog } from './services/logService.js';

const app = await buildApp({ logger: true });

await app.listen({ port: PORT, host: '0.0.0.0' });

writeLog({
  time: new Date().toISOString(),
  level: 30,
  levelName: 'info',
  msg: `Server listening on port ${PORT}`,
});

await seedAdmin(app.log);

// Run DB backup immediately and every N hours (configurable via admin panel / env)
async function runBackup() {
  const destinations: {
    provider: StorageProvider;
    keyPrefix?: string;
    label?: string;
    keep?: number;
  }[] = [];

  if (await isB2Enabled()) {
    destinations.push({
      provider: new B2Storage(),
      keyPrefix: 'backups/db',
      label: 'b2',
      keep: 7,
    });
  } else {
    destinations.push({
      provider: new LocalStorage(),
      keyPrefix: 'backups',
      label: 'local',
      keep: 7,
    });
  }
  await backupDatabase(app.log, ...destinations);

  // Re-read schedule from DB each cycle so admin panel changes take effect
  const hours = await getBackupScheduleHours();
  setTimeout(runBackup, hours * 60 * 60 * 1000);
}

// Kick off first backup after a short delay to let server finish starting
setTimeout(runBackup, 2000);

writeLog({
  time: new Date().toISOString(),
  level: 30,
  levelName: 'info',
  msg: 'Scheduled backup task initialized',
});

// Clean up expired files every hour
setInterval(
  () => {
    cleanupExpiredFiles(app.log).catch(() => {});
  },
  60 * 60 * 1000
);
cleanupExpiredFiles(app.log).catch(() => {});
