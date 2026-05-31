import { getStorage } from '../services/storage/index.js';

/**
 * Delete a file from whichever storage backend it lives on.
 * All paths go through the storage abstraction — local, B2, or future backends.
 */
export async function deleteFromStorage(storageKey: string): Promise<void> {
  const storage = await getStorage();
  await storage.delete(storageKey).catch(() => {
    /* already gone — ignore */
  });
}
