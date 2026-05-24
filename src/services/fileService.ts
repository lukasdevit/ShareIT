import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { db } from "../db/database.js";
import { UPLOAD_DIR } from "../config/index.js";

export async function saveFile(
  fileStream: NodeJS.ReadableStream,
  filename: string,
  originalName: string,
  mimeType: string
): Promise<string> {
  const filepath = path.join(UPLOAD_DIR, filename);

  await pipeline(fileStream, fs.createWriteStream(filepath));

  const stats = fs.statSync(filepath);

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