import { insertFile } from '../../repositories/fileRepository.js';
import { getStorageBackend } from '../../config/index.js';
import { getStorage } from '../storage/index.js';

/** Create DB record only — quota checks must be done by the caller. */
export async function finalizeFile(params: {
  filename: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  userId?: number;
  expiresInDays?: number;
}): Promise<string> {
  const { filename, originalName, storageKey, mimeType, size, userId, expiresInDays } = params;

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const backend = await getStorageBackend();

  try {
    await insertFile({
      filename,
      originalName,
      storageKey,
      size,
      mimeType,
      userId: userId ?? null,
      createdAt: new Date().toISOString(),
      expiresAt,
      backend,
    });
    return storageKey;
  } catch (err) {
    // Best-effort cleanup: try to remove the orphaned storage file.
    // If this also fails, log a loud warning so operators can clean up manually.
    const storage = await getStorage();
    try {
      await storage.delete(storageKey);
    } catch (cleanupErr) {
      console.error(
        `[fileService] CRITICAL: orphaned storage file after failed DB insert. ` +
        `storageKey=${storageKey} ` +
        `insertError=${(err as Error).message} ` +
        `cleanupError=${(cleanupErr as Error).message}`
      );
    }
    throw err;
  }
}
