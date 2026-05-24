import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import path from "path";
import { BASE_URL } from "../config/index.js";
import { saveFile, sanitizeFilename, validateFile } from "../services/fileService.js";
import { requireAuth, getTokenFromHeader } from "./auth.js";

export async function sharexRoutes(app: FastifyInstance) {
  // Upload endpoint for ShareX (accepts token via Authorization header)
  app.post("/sharex/upload", { preHandler: [requireAuth] }, async (request, reply) => {
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

    const userId = (request as any).user?.id;
    await saveFile(file.file, filename, originalName, file.mimetype, userId);

    return reply.send({ url: `${BASE_URL}/file/${filename}` });
  });

  // Config generator — per-user, embeds token in headers
  app.get("/sharex/config", { preHandler: [requireAuth] }, async (request, reply) => {
    const token = getTokenFromHeader(request);
    const username = (request as any).user?.username || "ShareIT";

    const config = {
      Version: "17.0.0",
      Name: `ShareIT - ${username}`,
      DestinationType: "ImageUploader,FileUploader",
      RequestMethod: "POST",
      RequestURL: `${BASE_URL}/sharex/upload`,
      FileFormName: "file",
      Body: "MultipartFormData",
      Headers: {
        Authorization: `Bearer ${token}`,
      },
      URL: "{json:url}",
    };

    return reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", `attachment; filename="ShareIT-${username}.sxcu"`)
      .send(config);
  });
}
