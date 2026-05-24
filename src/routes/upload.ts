import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import path from "path";
import { BASE_URL } from "../config/index.js";
import { saveFile, validateFile, sanitizeFilename } from "../services/fileService.js";
import { requireAuth } from "./auth.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/upload", { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ error: "No file was uploaded" });
    }

    const originalName = sanitizeFilename(file.filename);

    const validationError = validateFile(file.mimetype, originalName);
    if (validationError) {
      return reply.code(415).send({ error: validationError });
    }

    const id = nanoid(10);
    const ext = path.extname(file.filename);
    const filename = `${id}${ext}`;

    await saveFile(file.file, filename, originalName, file.mimetype);

    return reply.send({ url: `${BASE_URL}/file/${filename}` });
  });
}