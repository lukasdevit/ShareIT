import { getStorageBackend, getStoragePrefix } from '../../config/index.js';
import { LocalStorage } from './local.js';
import { B2Storage } from './b2/index.js';
import type { StorageProvider } from './types.js';

export type { StorageProvider } from './types.js';

// ── Provider registry (add new backends here) ──

const PROVIDERS: Record<string, () => StorageProvider> = {
  local: () => new LocalStorage(),
  b2: () => new B2Storage(),
  // s3: () => new S3Storage(),  // future
};

// ── Singleton ──

let _storage: StorageProvider;

export async function getStorage(): Promise<StorageProvider> {
  if (!_storage) {
    const backend = await getStorageBackend();
    const factory = PROVIDERS[backend];
    if (!factory) throw new Error(`Unknown storage backend: ${backend}`);
    _storage = factory();
    console.warn(`Storage: ${backend}`);
  }
  return _storage;
}

// ── Helper ──

export async function buildStorageKey(userId: number, filename: string): Promise<string> {
  const prefix = await getStoragePrefix();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const base = `share/${userId}/${yyyy}/${mm}/${dd}/${filename}`;
  return prefix ? `${prefix.replace(/\/$/, '')}/${base}` : base;
}
