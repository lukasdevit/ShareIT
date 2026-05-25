import type { FastifyInstance } from "fastify";
import { requireAuth, getTokenFromHeader } from "../middleware/index.js";
import { handleUpload } from "../services/fileService.js";
import { BASE_URL } from "../config/index.js";

export async function sharexRoutes(app: FastifyInstance) {
  app.post("/sharex/upload", { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No file was uploaded" });
    try {
      return reply.send(await handleUpload(file, request.user!.id));
    } catch (err: any) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  app.get("/sharex/config", { preHandler: [requireAuth] }, async (request, reply) => {
    const token = getTokenFromHeader(request);
    const username = request.user?.username || "ShareIT";
    const config = {
      Version: "17.0.0",
      Name: `ShareIT - ${username}`,
      DestinationType: "ImageUploader,FileUploader",
      RequestMethod: "POST",
      RequestURL: `${BASE_URL}/sharex/upload`,
      FileFormName: "file",
      Body: "MultipartFormData",
      Headers: { Authorization: `Bearer ${token}` },
      URL: "{json:url}",
    };
    return reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", `attachment; filename="ShareIT-${username}.sxcu"`)
      .send(config);
  });
}
