import type { FastifyInstance } from "fastify";
import { requireAuth } from "./auth.js";
import { handleUpload } from "../services/fileService.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/upload", { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No file was uploaded" });
    try {
      return reply.send(await handleUpload(file, request.user!.id));
    } catch (err: any) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });
}
