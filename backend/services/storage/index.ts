// Side-effect imports: each provider self-registers via registerProvider()
import './b2/index.js';
import './r2/index.js';

import { getStorageBackend, getStoragePath } from '../../config/index.js';
import { LocalStorage } from './local.js';
import { registerProvider, resolveProvider, allSettingKeys, allProviders } from './providers.js';
import type { StorageProvider } from './types.js';
import type { S3Client } from '@aws-sdk/client-s3';

export type { StorageProvider } from './types.js';

// Local storage is always available
registerProvider('local', () => new LocalStorage(), [], '💻 Local filesystem');

/** All admin-configurable setting keys, aggregated from every registered provider. */
export const STORAGE_SETTING_KEYS = allSettingKeys();

export { resolveProvider, allProviders };

let _storage: StorageProvider;

export async function getStorage(): Promise<StorageProvider> {
  if (!_storage) {
    const [backend, configuredPath] = await Promise.all([
      getStorageBackend(),
      getStoragePath(),
    ]);
    _storage = configuredPath && backend === 'local'
      ? new LocalStorage(configuredPath)
      : resolveProvider(backend);
    console.warn(`Storage: ${backend}`);
  }
  return _storage;
}

export async function buildStorageKey(userId: number, filename: string): Promise<string> {
  const prefix = await getStoragePath();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const base = `share/${userId}/${yyyy}/${mm}/${dd}/${filename}`;
  return prefix ? `${prefix.replace(/\/$/, '')}/${base}` : base;
}

/** Resolve the S3 client for the currently configured cloud backend (B2 or R2). */
export async function getCurrentS3Client(): Promise<{ client: S3Client; bucket: string }> {
  const backend = await getStorageBackend();
  if (backend === 'b2') {
    const { getS3Client, getBucket } = await import('./b2/client.js');
    return { client: await getS3Client(), bucket: await getBucket() };
  }
  if (backend === 'r2') {
    const { getS3Client, getBucket } = await import('./r2/client.js');
    return { client: await getS3Client(), bucket: await getBucket() };
  }
  throw new Error(`S3 multipart upload not supported for backend: ${backend}`);
}
