import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { db } from "../db/database.js";
import { UPLOAD_DIR } from "../config/index.js";
import { ALLOWED_MIME_TYPES } from "../config/index.js";
import { scanFile } from "./scanService.js";

export function sanitizeFilename(name: string): string {
  // Strip any path traversal — keep only the basename
  let safe = path.basename(name);

  // Remove null bytes (directory traversal attack vector)
  safe = safe.replace(/\0/g, "");

  // Trim whitespace
  safe = safe.trim();

  // Limit length to 255 chars (common filesystem limit)
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }

  // Default fallback if everything got stripped
  return safe || "untitled";
}

export async function saveFile(
  fileStream: NodeJS.ReadableStream,
  filename: string,
  originalName: string,
  mimeType: string,
  userId?: number
): Promise<string> {
  const userDir = userId ? path.join(UPLOAD_DIR, String(userId)) : UPLOAD_DIR;
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const filepath = path.join(userDir, filename);

  await pipeline(fileStream, fs.createWriteStream(filepath));

  const stats = fs.statSync(filepath);

  const scanResult = await scanFile(filepath);
  if (!scanResult.clean) {
    fs.unlinkSync(filepath);
    throw new Error(`Virus detected: ${scanResult.viruses.join(", ")}`);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO files (filename, original_name, path, size, mime_type, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [filename, originalName, filepath, stats.size, mimeType, userId ?? null, new Date().toISOString()],
      (err) => {
        if (err) reject(err);
        else resolve(filepath);
      }
    );
  });
}

export function validateFile(mimeType: string, _originalName: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `File type "${mimeType}" is not allowed`;
  }
  return null; // null = valid
}