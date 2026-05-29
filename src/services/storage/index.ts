import { isB2Enabled, getB2Prefix } from '../../config/index.js';
import { LocalStorage } from './local.js';
import { B2Storage } from './b2.js';
import type { StorageProvider } from './types.js';

export type { StorageProvider } from './types.js';

// ── Singleton ──

let _storage: StorageProvider;

export async function getStorage(): Promise<StorageProvider> {
  if (!_storage) {
    const b2 = await isB2Enabled();
    _storage = b2 ? new B2Storage() : new LocalStorage();
    console.warn(
      `Storage: ${b2 ? 'Backblaze B2' : 'local filesystem'}`
    );
  }
  return _storage;
}

// ── Helper ──

export async function buildStorageKey(userId: number, filename: string): Promise<string> {
  const prefix = (await isB2Enabled()) ? await getB2Prefix() : '';
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const base = `share/${userId}/${yyyy}/${mm}/${dd}/${filename}`;
  return prefix ? `${prefix.replace(/\/$/, '')}/${base}` : base;
}
