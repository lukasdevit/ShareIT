import { buildApp } from "./app.js";
import { PORT, B2_ENABLED, BACKUP_SCHEDULE_HOURS } from "./config/index.js";
import { seedAdmin, cleanupExpiredFiles, backupDatabase } from "./db/index.js";
import type { StorageProvider } from "./services/storage/types.js";
import { LocalStorage } from "./services/storage/local.js";
import { B2Storage } from "./services/storage/b2.js";

const app = await buildApp({ logger: true });

await app.listen({ port: PORT, host: "0.0.0.0" });
await seedAdmin(app.log);

// Run DB backup immediately and every N hours (configurable via BACKUP_SCHEDULE_HOURS)
const BACKUP_INTERVAL = BACKUP_SCHEDULE_HOURS * 60 * 60 * 1000;
function runBackup() {
  const destinations: { provider: StorageProvider; keyPrefix?: string; label?: string; keep?: number }[] = [
    { provider: new LocalStorage(), keyPrefix: "backups", label: "local", keep: 7 },
  ];
  if (B2_ENABLED) {
    destinations.push({ provider: new B2Storage(), keyPrefix: "backups/db", label: "b2" });
  }
  backupDatabase(app.log, ...destinations);
}
runBackup();
setInterval(runBackup, BACKUP_INTERVAL);

// Clean up expired files every hour
setInterval(() => { cleanupExpiredFiles(app.log).catch(() => {}); }, 60 * 60 * 1000);
cleanupExpiredFiles(app.log).catch(() => {});

app.log.info(`Server listening on port ${PORT}`);