import fs from 'fs';
import path from 'path';
import { getStorage } from '../services/storage/index.js';
import { UPLOAD_DIR } from '../config/index.js';

/**
 * Delete a file from whichever storage backend it lives on.
 * Handles both legacy absolute paths and relative storage keys.
 */
export async function deleteFromStorage(storageKey: string): Promise<void> {
  // Local filesystem — resolve path
  if (path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)) {
    try {
      fs.unlinkSync(storageKey);
    } catch {
      /* already gone */
    }
    return;
  }
  // Might be a relative path under uploads/
  const localPath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* */
    }
    return;
  }
  // Fall back to storage provider (B2, etc.)
  await getStorage().delete(storageKey);
}
