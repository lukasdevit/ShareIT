import Fastify from "fastify";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fs from "fs";
import { UPLOAD_DIR, RATE_LIMIT } from "./config/index.js";
import { uploadRoutes } from "./routes/upload.js";
import { filesRoutes } from "./routes/files.js";
import { sharexRoutes } from "./routes/sharex.js";
import { authRoutes } from "./routes/auth.js";
import { initScanner } from "./services/scanService.js";

export interface AppOptions {
  logger?: boolean;
}

export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({
    logger: opts.logger
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss" },
          },
        }
      : false,
  });

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await app.register(multipart, { limits: { fileSize: 1 * 1024 * 1024 * 1024 } });

  await app.register(rateLimit, { max: RATE_LIMIT.max, timeWindow: RATE_LIMIT.timeWindow });

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:", "*"],
      },
    },
    xContentTypeOptions: false,
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  });

  await app.register(uploadRoutes);
  await app.register(filesRoutes);
  await app.register(sharexRoutes);
  await app.register(authRoutes);

  // Note: scanner init is skipped in tests automatically (ClamAV not available)
  await initScanner();

  return app;
}
