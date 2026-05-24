import type { FastifyInstance } from "fastify";
import fs from "fs";
import { db } from "../db/database.js";
import { requireAuth } from "./auth.js";

export async function filesRoutes(app: FastifyInstance) {
  // Serve file by filename (public)
  app.get("/file/:filename", async (request, reply) => {
    const { filename } = request.params as { filename: string };

    // Block path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return reply.code(400).send({ error: "Invalid filename" });
    }

    return new Promise((resolve) => {
      db.get(
        `SELECT path, mime_type FROM files WHERE filename = ?`,
        [filename],
        (err, row: unknown) => {
          const file = row as { path: string; mime_type: string } | undefined;
          if (err || !file) {
            reply.code(err ? 500 : 404).send({ error: err ? err.message : "File not found" });
            resolve(undefined);
            return;
          }
          if (!fs.existsSync(file.path)) {
            reply.code(404).send({ error: "File missing from disk" });
            resolve(undefined);
            return;
          }

          const fileBuffer = fs.readFileSync(file.path);
          reply.header("Content-Type", file.mime_type);
          reply.header("Content-Length", fileBuffer.length);
          reply.header("Cache-Control", "public, max-age=31536000");
          reply.header("Access-Control-Allow-Origin", "*");
          reply.send(fileBuffer);
        }
      );
    });
  });

  app.get("/files", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = (request as any).user?.id;
    return new Promise((resolve) => {
      db.all(
        `SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            reply.code(500).send({ error: err.message });
          } else {
            reply.send(rows);
          }
          resolve(undefined);
        }
      );
    });
  });

  app.delete("/file/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user?.id;

    return new Promise((resolve) => {
      db.get(
        `SELECT path, user_id FROM files WHERE id = ?`,
        [id],
        (err, row: unknown) => {
          const file = row as { path: string; user_id: number | null } | undefined;
          if (err) {
            reply.code(500).send({ error: err.message });
            resolve(undefined);
            return;
          }
          if (!file) {
            reply.code(404).send({ error: "File not found" });
            resolve(undefined);
            return;
          }
          if (file.user_id !== userId) {
            reply.code(403).send({ error: "Not your file" });
            resolve(undefined);
            return;
          }

          try { fs.unlinkSync(file.path); } catch { /* already gone */ }

          db.run(`DELETE FROM files WHERE id = ?`, [id], (err2) => {
            if (err2) {
              reply.code(500).send({ error: err2.message });
            } else {
              reply.send({ ok: true });
            }
            resolve(undefined);
          });
        }
      );
    });
  });
}