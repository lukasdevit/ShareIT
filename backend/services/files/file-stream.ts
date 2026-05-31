import { getStorage, resolveProvider } from '../storage/index.js';

/**
 * Resolve the storage provider for the given backend.
 * For local storage, uses getStorage() to respect the admin-configured storage path.
 * For cloud backends (b2, r2), uses resolveProvider() with bucket config.
 */
async function resolveStorage(backend: string) {
  if (backend === 'local') return getStorage();
  return resolveProvider(backend);
}

/**
 * Resolve a readable stream for a file from the appropriate storage backend.
 */
export async function resolveReadStream(
  storageKey: string,
  backend: string
): Promise<NodeJS.ReadableStream> {
  const storage = await resolveStorage(backend);
  if (!(await storage.exists(storageKey))) throw new Error('Missing');
  return storage.createReadStream(storageKey);
}

/**
 * Resolve a ranged readable stream for a file from the appropriate storage backend.
 */
export async function resolveReadStreamRange(
  storageKey: string,
  backend: string,
  start: number,
  end: number
): Promise<NodeJS.ReadableStream> {
  const storage = await resolveStorage(backend);
  if (!(await storage.exists(storageKey))) throw new Error('Missing');
  return storage.createReadStreamRange(storageKey, start, end);
}
