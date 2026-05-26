import type { FastifyInstance, FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";
import { db, dbGet, dbRun } from "../db/index.js";
import { requireAuth, getTokenFromHeader, verifyToken } from "../middleware/index.js";
import { getStorage } from "../services/storage/index.js";
import { deleteFromStorage } from "../utils/index.js";
import { UPLOAD_DIR } from "../config/index.js";

const FILE_SERVE_RATE = 300;       // requests per window
const FILE_LIST_RATE = 120;        // requests per window
const FILE_RATE_WINDOW_MS = 60_000;

export async function filesRoutes(app: FastifyInstance) {
  // Serve file by filename (public) — rate limited to prevent abuse
  app.get("/file/:filename", { config: { rateLimit: { max: FILE_SERVE_RATE, timeWindow: FILE_RATE_WINDOW_MS } } }, async (request, reply) => {
    const { filename } = request.params as { filename: string };

    if (filename.includes("..") || filename.includes("/")) {
      return reply.code(400).send({ error: "Invalid filename" });
    }

    try {
      const file = await dbGet<{ path: string; size: number; mime_type: string; is_public: number; user_id: number; storage_backend: string }>(
        `SELECT path, size, mime_type, is_public, user_id, storage_backend FROM files WHERE filename = ?`,
        [filename]
      );

      if (!file) {
        return reply.code(404).send({ error: "File not found" });
      }

      // If not public, require auth + ownership
      if (!file.is_public) {
        const token = getTokenFromHeader(request as FastifyRequest);
        const payload = token ? verifyToken(token) : null;
        if (!payload || payload.id !== file.user_id) {
          return reply.code(403).send({ error: "This file is private" });
        }
      }

      const stream = await resolveReadStream(file.path, file.storage_backend);
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

  app.get("/files", { preHandler: [requireAuth], config: { rateLimit: { max: FILE_LIST_RATE, timeWindow: FILE_RATE_WINDOW_MS } } }, async (request, reply) => {
    const userId = request.user?.id;
    const query = request.query as { page?: string; limit?: string; search?: string };
    const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50", 10) || 50));
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || "";
    const type = (query as {type?: string}).type;
    const typeClause = type === "image"
      ? `AND mime_type LIKE 'image/%'`
      : type === "file"
        ? `AND mime_type NOT LIKE 'image/%'`
        : "";

    // Use two separate complete queries to avoid dynamic SQL construction
    const countSQL = search
      ? `SELECT COUNT(*) AS total FROM files WHERE user_id = ? ${typeClause} AND (original_name LIKE ? OR filename LIKE ?)`
      : `SELECT COUNT(*) AS total FROM files WHERE user_id = ? ${typeClause}`;
    const listSQL = search
      ? `SELECT * FROM files WHERE user_id = ? ${typeClause} AND (original_name LIKE ? OR filename LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`
      : `SELECT * FROM files WHERE user_id = ? ${typeClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const searchParam = search ? `%${search}%` : null;

    return new Promise((resolve) => {
      const countParams = searchParam ? [userId, searchParam, searchParam] : [userId];
      db.get(countSQL, countParams,
        (err, row: { total: number } | undefined) => {
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }
          const total = row?.total ?? 0;
          const listParams = searchParam
            ? [userId, searchParam, searchParam, limit, offset]
            : [userId, limit, offset];
          db.all(listSQL,
            listParams,
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

  app.patch("/file/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id;
    const { is_public } = request.body as { is_public?: boolean };

    if (is_public === undefined) return reply.code(400).send({ error: "is_public required" });

    const file = await dbGet<{ user_id: number | null }>(
      `SELECT user_id FROM files WHERE id = ?`, [id]
    );
    if (!file) return reply.code(404).send({ error: "File not found" });
    if (file.user_id !== userId) return reply.code(403).send({ error: "Not your file" });

    await dbRun(`UPDATE files SET is_public = ? WHERE id = ?`, [is_public ? 1 : 0, id]);
    return reply.send({ ok: true, is_public });
  });

  app.delete("/file/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id;

    try {
      const file = await dbGet<{ path: string; user_id: number | null; storage_backend: string }>(
        `SELECT path, user_id, storage_backend FROM files WHERE id = ?`,
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

async function resolveReadStream(storageKey: string, backend: string): Promise<NodeJS.ReadableStream> {
  if (backend === "local") {
    const localPath = path.isAbsolute(storageKey) && storageKey.startsWith(UPLOAD_DIR)
      ? storageKey
      : path.join(UPLOAD_DIR, storageKey);
    if (!fs.existsSync(localPath)) throw new Error("Missing");
    return fs.createReadStream(localPath);
  }
  const storage = getStorage();
  if (!(await storage.exists(storageKey))) throw new Error("Missing");
  return storage.createReadStream(storageKey);
}
