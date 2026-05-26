import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { nanoid } from "nanoid";
import { dbGet, dbRun } from "../db/index.js";
import { ALLOWED_MIME_TYPES, BASE_URL, B2_ENABLED } from "../config/index.js";
import { scanFile } from "./scanService.js";
import { getStorage, buildStorageKey } from "./storage/index.js";
import { formatBytes } from "../utils/index.js";

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
  userId?: number,
  expiresInDays?: number
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
      throw Object.assign(
        new Error(`Storage quota exceeded. You've used ${formatBytes(quota.used)} of ${formatBytes(quota.limit)}.`),
        { statusCode: 413 }
      );
    }
  }

  // Virus scan
  const scanResult = await scanFile(tmpPath);
  if (!scanResult.clean) {
    fs.unlinkSync(tmpPath);
    throw Object.assign(
      new Error("This file could not be uploaded because it may contain malware."),
      { statusCode: 422 }
    );
  }

  // Upload to storage
  try {
    const readStream = fs.createReadStream(tmpPath);
    await storage.save(storageKey, readStream);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* */ }
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const backend = B2_ENABLED ? 'b2' : 'local';

  try {
    await dbRun(
      `INSERT INTO files (filename, original_name, path, size, mime_type, user_id, created_at, expires_at, storage_backend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [filename, originalName, storageKey, stats.size, mimeType, userId ?? null, new Date().toISOString(), expiresAt, backend]
    );
    return storageKey;
  } catch (err) {
    storage.delete(storageKey).catch(() => {});
    throw err;
  }
}

export function validateFile(mimeType: string, _originalName: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `File type "${mimeType}" is not allowed`;
  }
  return null;
}

/* ── Shared upload handler (used by /upload and /sharex/upload) ── */

export async function handleUpload(
  file: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
  userId: number,
  expiresInDays?: number
): Promise<{ url: string }> {
  const originalName = sanitizeFilename(file.filename);

  const validationError = validateFile(file.mimetype, originalName);
  if (validationError) {
    throw Object.assign(new Error(validationError), { statusCode: 415 });
  }

  const id = nanoid(10);
  const ext = path.extname(file.filename);
  const filename = `${id}${ext}`;

  await saveFile(file.file, filename, originalName, file.mimetype, userId, expiresInDays);

  return { url: `${BASE_URL}/file/${filename}` };
}

async function getUserQuota(userId: number): Promise<{ used: number; limit: number }> {
  const row = await dbGet<{ used: number; limit: number }>(
    `SELECT u.storage_limit AS "limit", COALESCE(SUM(f.size), 0) AS used
     FROM users u LEFT JOIN files f ON f.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  return row ?? { used: 0, limit: 0 };
}

