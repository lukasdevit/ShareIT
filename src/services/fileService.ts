import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { db } from "../db/database.js";
import { ALLOWED_MIME_TYPES } from "../config/index.js";
import { scanFile } from "./scanService.js";
import { getStorage, buildStorageKey } from "./storage.js";

export function sanitizeFilename(name: string): string {
  let safe = path.basename(name);
  safe = safe.replace(/\0/g, "");
  safe = safe.trim();
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }
  return safe || "untitled";
}

export async function saveFile(
  fileStream: NodeJS.ReadableStream,
  filename: string,
  originalName: string,
  mimeType: string,
  userId?: number
): Promise<string> {
  const storage = getStorage();
  const storageKey = userId
    ? buildStorageKey(userId, filename)
    : `anonymous/${filename}`;

  // Stream to temp file first (needed for size check + virus scan)
  const tmpPath = path.join(os.tmpdir(), `shareit-${filename}`);
  await pipeline(fileStream, fs.createWriteStream(tmpPath));
  const stats = fs.statSync(tmpPath);

  // Check storage quota
  if (userId) {
    const quota = await getUserQuota(userId);
    if (quota.used + stats.size > quota.limit) {
      fs.unlinkSync(tmpPath);
      throw new Error(
        `Storage quota exceeded (${formatBytes(quota.used)} used + ${formatBytes(stats.size)} > ${formatBytes(quota.limit)} limit)`
      );
    }
  }

  // Virus scan
  const scanResult = await scanFile(tmpPath);
  if (!scanResult.clean) {
    fs.unlinkSync(tmpPath);
    throw new Error(`Virus detected: ${scanResult.viruses.join(", ")}`);
  }

  // Upload to storage
  try {
    const readStream = fs.createReadStream(tmpPath);
    await storage.save(storageKey, readStream);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* */ }
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO files (filename, original_name, path, size, mime_type, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [filename, originalName, storageKey, stats.size, mimeType, userId ?? null, new Date().toISOString()],
      (err) => {
        if (err) {
          storage.delete(storageKey).catch(() => {});
          reject(err);
        } else {
          resolve(storageKey);
        }
      }
    );
  });
}

export function validateFile(mimeType: string, _originalName: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `File type "${mimeType}" is not allowed`;
  }
  return null;
}

function getUserQuota(userId: number): Promise<{ used: number; limit: number }> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT u.storage_limit AS "limit", COALESCE(SUM(f.size), 0) AS used
       FROM users u LEFT JOIN files f ON f.user_id = u.id
       WHERE u.id = ?`,
      [userId],
      (err, row: { used: number; limit: number } | undefined) => {
        if (err) reject(err);
        else resolve(row ?? { used: 0, limit: 0 });
      }
    );
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
