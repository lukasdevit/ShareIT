import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/index.js";
import { handleUpload } from "../services/fileService.js";
import { dbGet } from "../db/index.js";
import { DEMO_STORAGE_LIMIT } from "../config/index.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/upload", { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No file was uploaded" });

    const user = request.user!;

    // Demo users: enforce 100 MB quota
    if (user.isDemo) {
      const usedRow = await dbGet<{ used: number }>(
        `SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE user_id = ?`,
        [user.id]
      );
      const used = usedRow?.used ?? 0;
      if (used + (file.file?.bytesRead ?? 0) > DEMO_STORAGE_LIMIT) {
        return reply.code(413).send({ error: "Demo storage limit reached (100 MB)" });
      }
    }

    // Demo users: cap expiry at 5 minutes (≈ 0.0035 days, round down to 0 days = no expiry,
    // but we'll use header/query. Actually we just disallow setting expiry for demo users)
    let expiresInDays: number | undefined;
    if (!user.isDemo) {
      const expiryHeader = request.headers["x-file-expires"] as string | undefined;
      const expiryQuery = (request.query as Record<string, string | undefined>)?.expires;
      const raw = expiryHeader || expiryQuery;
      if (raw) {
        const days = parseInt(raw, 10);
        if (!isNaN(days) && days >= 1 && days <= 365) {
          expiresInDays = days;
        }
      }
    }

    return reply.send(await handleUpload(file, user.id, expiresInDays));
  });
}
