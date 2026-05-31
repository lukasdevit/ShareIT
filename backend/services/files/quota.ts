import { getTotalUsed, getUsedByUser } from '../../repositories/file-repository.js';
import { getStorageLimit } from '../../repositories/user-repository.js';
import { getTotalStorageLimit } from '../../config/index.js';
import { formatBytes } from '../../utils/index.js';

/**
 * Check both global and per-user storage quota before uploading.
 * Call this BEFORE writing the file to permanent storage.
 */
export async function checkStorageQuota(
  size: number,
  userId?: number
): Promise<void> {
  // Check global app-wide storage limit
  const totalLimit = await getTotalStorageLimit();
  if (totalLimit > 0) {
    const total = await getTotalUsed();
    if (total + size > totalLimit) {
      throw Object.assign(
        new Error('Server storage limit reached. Contact the administrator.'),
        { statusCode: 507 }
      );
    }
  }

  // Check per-user storage quota
  if (userId !== undefined) {
    const quota = await getUserQuota(userId);
    if (quota.used + size > quota.limit) {
      throw Object.assign(
        new Error(
          `Storage quota exceeded. You've used ${formatBytes(quota.used)} of ${formatBytes(quota.limit)}.`
        ),
        { statusCode: 413 }
      );
    }
  }
}

async function getUserQuota(
  userId: number
): Promise<{ used: number; limit: number }> {
  const [used, limit] = await Promise.all([
    getUsedByUser(userId),
    getStorageLimit(userId),
  ]);
  return { used, limit };
}
