import Fastify from "fastify";
import multipart from "@fastify/multipart";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fs from "fs";
import { PORT, UPLOAD_DIR } from "./config/index.js";
import { uploadRoutes } from "./routes/upload.js";
import { filesRoutes } from "./routes/files.js";
import { sharexRoutes } from "./routes/sharex.js";
import { authRoutes } from "./routes/auth.js";
import { initScanner } from "./services/scanService.js";

const app = Fastify({ logger: true });

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.register(multipart, { limits: { fileSize: 1 * 1024 * 1024 * 1024 } });

app.register(helmet, {
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", "data:", "blob:", "*"],
    },
  },
  xContentTypeOptions: false,
});
app.register(cors, { origin: true, methods: ["GET", "POST", "DELETE", "OPTIONS"] });

app.register(uploadRoutes);
app.register(filesRoutes);
app.register(sharexRoutes);
app.register(authRoutes);

await initScanner();

await app.listen({ port: PORT });
console.log(`Server listening on port ${PORT}`);