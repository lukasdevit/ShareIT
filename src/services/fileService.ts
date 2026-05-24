import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { db } from "../db/database.js";
import { UPLOAD_DIR } from "../config/index.js";
import { ALLOWED_MIME_TYPES } from "../config/index.js";
import { scanFile } from "./scanService.js";

export async function saveFile(
  fileStream: NodeJS.ReadableStream,
  filename: string,
  originalName: string,
  mimeType: string
): Promise<string> {
  const filepath = path.join(UPLOAD_DIR, filename);

  await pipeline(fileStream, fs.createWriteStream(filepath));

  const stats = fs.statSync(filepath);

  const scanResult = await scanFile(filepath);
  if (!scanResult.clean) {
    fs.unlinkSync(filepath); // delete the infected file
    throw new Error(`Virus detected: ${scanResult.viruses.join(", ")}`);
  }

  //    console.log("File uploaded:", {
  //    originalName,
  //    storedName: filename,
  //    path: filepath,
  //    size: stats.size,
  //    mimeType,
  //    createdAt: new Date().toISOString(),
  //  });

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO files (filename, original_name, path, size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [filename, originalName, filepath, stats.size, mimeType, new Date().toISOString()],
      (err) => {
        if (err) reject(err);
        else resolve(filepath);
      }
    );
  });
}

export function validateFile(mimeType: string, originalName: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `File type "${mimeType}" is not allowed`;
  }
  return null; // null = valid
}