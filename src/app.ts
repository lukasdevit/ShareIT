import fs from "fs";

import Fastify from "fastify";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";

import { UPLOAD_DIR, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, LOG_PRETTY, CORS_ORIGIN } from "./config/index.js";
import { uploadRoutes } from "./routes/upload.js";
import { filesRoutes } from "./routes/files.js";
import { sharexRoutes } from "./routes/sharex.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { initScanner } from "./services/scanService.js";
import { startDemoCleanup } from "./services/demoCleanup.js";
import { runMigrations } from "./db/index.js";

const startTime = Date.now();

export interface AppOptions {
  logger?: boolean;
}

export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({
    logger: opts.logger
      ? LOG_PRETTY
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            },
          }
        : true
      : false,
  });

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await app.register(multipart, { limits: { fileSize: 1 * 1024 * 1024 * 1024 } });

  await app.register(rateLimit, { max: RATE_LIMIT_MAX, timeWindow: RATE_LIMIT_WINDOW_MS });

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
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  // Global error handler — catches schema validation + unhandled errors
  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: "Bad Request",
        message: error.message,
      });
    }
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({ error: error.message });
  });

  await app.register(uploadRoutes);
  await app.register(filesRoutes);
  await app.register(sharexRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);

  // Health check
  app.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Run DB schema migrations
  runMigrations();

  // Note: scanner init is skipped in tests automatically (ClamAV not available)
  await initScanner();

  // Start periodic demo user cleanup
  startDemoCleanup(app.log);

  return app;
}
