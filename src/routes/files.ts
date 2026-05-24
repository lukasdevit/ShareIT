import type { FastifyInstance } from "fastify";
import fs from "fs";
import { db } from "../db/database.js";

export async function filesRoutes(app: FastifyInstance) {
  app.get("/files", async (_request, reply) => {
    return new Promise((resolve) => {
      db.all(`SELECT * FROM files ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
          reply.code(500).send({ error: err.message });
        } else {
          reply.send(rows);
        }
        resolve(undefined);
      });
    });
  });

  app.delete("/file/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    return new Promise((resolve) => {
      db.get(`SELECT path FROM files WHERE id = ?`, [id], (err, row: { path: string } | undefined) => {
        if (err) {
          reply.code(500).send({ error: err.message });
          resolve(undefined);
          return;
        }
        if (!row) {
          reply.code(404).send({ error: "File not found" });
          resolve(undefined);
          return;
        }

        // Delete from disk
        try { fs.unlinkSync(row.path); } catch { /* already gone */ }

        db.run(`DELETE FROM files WHERE id = ?`, [id], (err2) => {
          if (err2) {
            reply.code(500).send({ error: err2.message });
          } else {
            reply.send({ ok: true });
          }
          resolve(undefined);
        });
      });
    });
  });
}