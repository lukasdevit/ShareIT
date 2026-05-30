import { resolveProvider } from './storage/index.js';

/**
 * Resolve a readable stream for a file from the appropriate storage backend.
 */
export async function resolveReadStream(
  storageKey: string,
  backend: string
): Promise<NodeJS.ReadableStream> {
  const storage = resolveProvider(backend);
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
  const storage = resolveProvider(backend);
  if (!(await storage.exists(storageKey))) throw new Error('Missing');
  return storage.createReadStreamRange(storageKey, start, end);
}
