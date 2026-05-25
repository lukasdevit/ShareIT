import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { db, dbGet, dbRun } from "../db/database.js";
import { requireAuth } from "./auth.js";
import { getStorage } from "../services/storage.js";
import { UPLOAD_DIR } from "../config/index.js";

export async function filesRoutes(app: FastifyInstance) {
  // Serve file by filename (public)
  app.get("/file/:filename", async (request, reply) => {
    const { filename } = request.params as { filename: string };

    if (filename.includes("..") || filename.includes("/")) {
      return reply.code(400).send({ error: "Invalid filename" });
    }

    try {
      const file = await dbGet<{ path: string; size: number; mime_type: string }>(
        `SELECT path, size, mime_type FROM files WHERE filename = ?`,
        [filename]
      );

      if (!file) {
        return reply.code(404).send({ error: "File not found" });
      }

      const stream = await resolveReadStream(file.path);
      reply.header("Content-Type", file.mime_type);
      reply.header("Content-Length", file.size);
      reply.header("Cache-Control", "public, max-age=31536000");
      reply.header("Access-Control-Allow-Origin", "*");
      return reply.send(stream);
    } catch (err) {
      if (!reply.sent) {
        return reply.code(404).send({ error: "File missing from storage" });
      }
    }
  });

  app.get("/files", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    const query = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50", 10) || 50));
    const offset = (page - 1) * limit;

    return new Promise((resolve) => {
      db.get(
        `SELECT COUNT(*) AS total FROM files WHERE user_id = ?`,
        [userId],
        (err, row: { total: number } | undefined) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }
          const total = row?.total ?? 0;
          db.all(
            `SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset],
            (err2, files) => {
              if (err2) {
                reply.code(500).send({ error: err2.message });
              } else {
                reply.send({ files, total, page, totalPages: Math.ceil(total / limit) });
              }
              resolve(undefined);
            }
          );
        }
      );
    });
  });

  app.delete("/file/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id;

    try {
      const file = await dbGet<{ path: string; user_id: number | null }>(
        `SELECT path, user_id FROM files WHERE id = ?`,
        [id]
      );

      if (!file) return reply.code(404).send({ error: "File not found" });
      if (file.user_id !== userId) return reply.code(403).send({ error: "Not your file" });

      try {
        await deleteFromStorage(file.path);
      } catch (err) {
        console.error("Storage delete failed:", (err as Error).message);
        // Still delete the DB row — B2 may have retention delay
      }

      await dbRun(`DELETE FROM files WHERE id = ?`, [id]);
      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
}

async function resolveReadStream(storageKey: string): Promise<NodeJS.ReadableStream> {
  if (path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)) {
    if (!fs.existsSync(storageKey)) throw new Error("Missing");
    return fs.createReadStream(storageKey);
  }
  const storage = getStorage();
  if (!(await storage.exists(storageKey))) throw new Error("Missing");
  return storage.createReadStream(storageKey);
}

async function deleteFromStorage(storageKey: string): Promise<void> {
  if (path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)) {
    try { fs.unlinkSync(storageKey); } catch { /* */ }
    return;
  }
  await getStorage().delete(storageKey);
}
