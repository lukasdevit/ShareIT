import fs from 'fs';
import { Writable } from 'stream';
import pino, { type StreamEntry } from 'pino';

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

import {
  UPLOAD_DIR,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  LOG_PRETTY,
  CORS_ORIGIN,
  DEFAULT_STORAGE_LIMIT,
} from './config/index.js';
import { uploadRoutes, multipartUploadRoutes } from './routes/upload/index.js';
import { filesRoutes } from './routes/files.js';
import { sharexRoutes } from './routes/sharex.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { initScanner } from './services/scanService.js';
import { startDemoCleanup } from './services/demoCleanup.js';
import { runMigrations } from './db/index.js';
import { writeLog } from './services/logService.js';

const startTime = Date.now();

export interface AppOptions {
  logger?: boolean;
}

/** Writable stream that pipes pino JSON lines into the admin log ring buffer. */
function createAdminLogStream(): Writable {
  return new Writable({
    write(chunk: unknown, _encoding, callback) {
      try {
        const entry = JSON.parse(
          typeof chunk === 'string' ? chunk : (chunk as Buffer).toString()
        ) as Record<string, unknown>;
        const level = (entry.level as number) ?? 30;
        const LEVEL_LABELS: Record<number, string> = {
          10: 'trace', 20: 'debug', 30: 'info',
          40: 'warn', 50: 'error', 60: 'fatal',
        };
        writeLog({
          time: (entry.time as string) || new Date().toISOString(),
          level,
          levelName: LEVEL_LABELS[level] || 'info',
          msg: (entry.msg as string) || '',
          err: entry.err,
        });
      } catch {
        /* malformed JSON line — skip */
      }
      callback();
    },
  });
}

export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({ logger: opts.logger ? {} : false });

  if (opts.logger) {
    const streams: StreamEntry[] = [
      { stream: createAdminLogStream() },
    ];
    if (LOG_PRETTY) {
      streams.unshift({
        stream: pino.transport({
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        }),
      });
    } else {
      streams.unshift({ stream: process.stdout as any });
    }
    app.log = pino({}, pino.multistream(streams));
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Global ceiling = max per-user quota (10 GB). Actual per-user limits
  // are enforced in saveFile() by checking storage quota at upload time.
  await app.register(multipart, {
    limits: { fileSize: DEFAULT_STORAGE_LIMIT },
  });

  // Accept raw binary body for S3 part-proxy route
  app.addContentTypeParser('*', (_req, payload, done) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => chunks.push(chunk));
    payload.on('end', () => done(null, Buffer.concat(chunks)));
    payload.on('error', (err: Error) => done(err));
  });

  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
  });

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', '*'],
      },
    },
    xContentTypeOptions: false,
  });

  await app.register(cors, {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global error handler — catches schema validation + unhandled errors
  app.setErrorHandler((err, _request, reply) => {
    const error = err as {
      validation?: unknown;
      statusCode?: number;
      message?: string;
    };
    if (error.validation) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      writeLog({
        time: new Date().toISOString(),
        level: 50,
        levelName: 'error',
        msg: error.message ?? 'Unknown error',
        err: error,
      });
    }
    return reply
      .code(statusCode)
      .send({ error: error.message ?? 'Internal server error' });
  });

  // Capture request/response logs for admin log viewer
  app.addHook('onRequest', async (request) => {
    (request as unknown as Record<string, unknown>)._logStart = Date.now();
  });
  app.addHook('onResponse', async (request, reply) => {
    // Don't log the log-viewer polling itself
    if (request.url.startsWith('/admin/logs')) return;

    const start = (request as unknown as Record<string, unknown>)
      ._logStart as number;
    const responseTime = start ? Date.now() - start : undefined;
    writeLog({
      time: new Date().toISOString(),
      level: reply.statusCode >= 400 ? 40 : 30,
      levelName: reply.statusCode >= 400 ? 'warn' : 'info',
      msg: 'request completed',
      reqId: request.id,
      user: request.user?.username,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
    });
  });

  await app.register(uploadRoutes);
  await app.register(multipartUploadRoutes);
  await app.register(filesRoutes);
  await app.register(sharexRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Run DB schema migrations (must complete before any queries)
  await runMigrations();

  // Start periodic demo user cleanup BEFORE scanner init — scanner may hang
  // if ClamAV socket is unreachable, and cleanup must not be blocked.
  startDemoCleanup(app.log);

  // Note: scanner init is skipped in tests automatically (ClamAV not available)
  await initScanner();

  return app;
}
