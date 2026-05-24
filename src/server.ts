import Fastify from "fastify";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import fs from "fs";
import { PORT, UPLOAD_DIR } from "./config/index.js";
import { uploadRoutes } from "./routes/upload.js";
import { filesRoutes } from "./routes/files.js";
import { initScanner } from "./services/scanService.js";

const app = Fastify({ logger: true });

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.register(multipart, { limits: { fileSize: 1 * 1024 * 1024 * 1024 } });
app.register(staticPlugin, { root: UPLOAD_DIR, prefix: "/file/" });

app.register(uploadRoutes);
app.register(filesRoutes);

await initScanner();

await app.listen({ port: PORT });
console.log(`Server listening on port ${PORT}`);