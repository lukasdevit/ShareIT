import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import path from "path";
import { BASE_URL } from "../config/index.js";
import { saveFile, sanitizeFilename, validateFile } from "../services/fileService.js";

export async function sharexRoutes(app: FastifyInstance) {
  // Upload endpoint for ShareX
  app.post("/sharex/upload", async (request, reply) => {
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

  // Config generator for ShareX
  app.get("/sharex/config", async (_request, reply) => {
    const config = {
      Name: "ShareIT",
      DestinationType: "ImageUploader, FileUploader",
      RequestType: "POST",
      RequestURL: `${BASE_URL}/sharex/upload`,
      FileFormName: "file",
      ResponseType: "Text",
      URL: "$json:url$",
      Headers: {},
    };

    return reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", 'attachment; filename="ShareIT.sxcu"')
      .send(config);
  });
}
