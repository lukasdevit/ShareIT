import type { FastifyInstance } from "fastify";
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
}