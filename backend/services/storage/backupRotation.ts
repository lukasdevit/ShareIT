import type { StorageProvider } from './types.js';

/** Delete backups older than `retentionDays` on a given storage provider. */
export async function rotateBackups(
  provider: StorageProvider,
  keyPrefix: string,
  retentionDays: number,
  log?: { info: (msg: string) => void },
): Promise<void> {
  const prefix = keyPrefix.replace(/\/$/, '');

  try {
    if (!provider.listKeys) return;

    const keys = await provider.listKeys(prefix);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    for (const key of keys) {
      if (!key.startsWith(`${prefix}/database-`) || !key.endsWith('.db')) continue;

      const match = /database-(.+)\.db$/.exec(key);
      if (!match) continue;

      const ts = new Date(match[1]!.replace(/-/g, ':').replace('T', ' ').replace('Z', '')).getTime();
      if (!Number.isFinite(ts)) continue;

      if (ts < cutoff) {
        await provider.delete(key);
        log?.info(`Rotated old backup: ${key}`);
      }
    }
  } catch {
    // Rotation is best-effort; silently skip unsupported providers
  }
}
