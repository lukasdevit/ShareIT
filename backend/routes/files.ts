import fs from 'fs';
import path from 'path';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { dbGet, dbAll, dbRun } from '../db/index.js';
import {
  requireAuth,
  getTokenFromHeader,
  verifyToken,
} from '../middleware/index.js';
import { LocalStorage } from '../services/storage/local.js';
import { B2Storage } from '../services/storage/b2/index.js';
import { deleteFromStorage } from '../utils/index.js';

const FILE_SERVE_RATE = 300; // requests per window
const FILE_LIST_RATE = 120; // requests per window
const FILE_RATE_WINDOW_MS = 60_000;

export async function filesRoutes(app: FastifyInstance) {
  // Serve file by filename (public) — rate limited to prevent abuse
  app.get(
    '/file/:filename',
    {
      config: {
        rateLimit: { max: FILE_SERVE_RATE, timeWindow: FILE_RATE_WINDOW_MS },
      },
    },
    async (request, reply) => {
      const { filename } = request.params as { filename: string };

      if (filename.includes('..') || filename.includes('/')) {
        return reply.code(400).send({ error: 'Invalid filename' });
      }

      try {
        const file = await dbGet<{
          path: string;
          size: number;
          mime_type: string;
          is_public: number;
          user_id: number;
          storage_backend: string;
        }>(
          `SELECT path, size, mime_type, is_public, user_id, storage_backend FROM files WHERE filename = ?`,
          [filename]
        );

        if (!file) {
          return reply.code(404).send({ error: 'File not found' });
        }

        // If not public, require auth + ownership
        if (!file.is_public) {
          const token = getTokenFromHeader(request as FastifyRequest);
          const payload = token ? verifyToken(token) : null;
          if (!payload || payload.id !== file.user_id) {
            return reply.code(403).send({ error: 'This file is private' });
          }
        }

        const stream = await resolveReadStream(file.path, file.storage_backend);
        reply.header('Content-Type', file.mime_type);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Cache-Control', 'public, max-age=31536000');
        reply.header('Access-Control-Allow-Origin', '*');

        // Handle HTTP Range requests (required for video/audio seeking)
        const rangeHeader = request.headers.range;
        if (rangeHeader) {
          const parsed = parseRange(rangeHeader, file.size);
          if (parsed) {
            const { start, end } = parsed;
            const contentLength = end - start + 1;
            const rangeStream = await resolveReadStreamRange(
              file.path,
              file.storage_backend,
              start,
              end
            );
            reply
              .code(206)
              .header('Content-Range', `bytes ${start}-${end}/${file.size}`)
              .header('Content-Length', contentLength);
            return reply.send(rangeStream);
          }
        }

        reply.header('Content-Length', file.size);
        return reply.send(stream);
      } catch (err) {
        if (!reply.sent) {
          return reply.code(404).send({ error: 'File missing from storage' });
        }
      }
    }
  );

  app.get(
    '/files/random',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      const type = (request.query as { type?: string }).type;
      const typeClause =
        type === 'audio' ? `AND mime_type LIKE 'audio/%'`
        : type === 'video' ? `AND mime_type LIKE 'video/%'`
        : type === 'image' ? `AND mime_type LIKE 'image/%'`
        : '';

      const file = await dbGet<{
        id: number; filename: string; original_name: string;
        size: number; mime_type: string; created_at: string;
        is_public: number; expires_at: string | null;
      }>(
        `SELECT * FROM files WHERE user_id = ? ${typeClause} ORDER BY RANDOM() LIMIT 1`,
        [userId]
      );

      if (!file) return reply.code(404).send({ error: 'No files found' });
      return reply.send({ data: file });
    }
  );

  app.get(
    '/files',
    {
      preHandler: [requireAuth],
      config: {
        rateLimit: { max: FILE_LIST_RATE, timeWindow: FILE_RATE_WINDOW_MS },
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      const query = request.query as {
        page?: string;
        limit?: string;
        search?: string;
      };
      const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(query.limit || '50', 10) || 50)
      );
      const offset = (page - 1) * limit;
      const search = query.search?.trim() || '';
      const type = (query as { type?: string }).type;
      const typeClause =
        type === 'image'
          ? `AND mime_type LIKE 'image/%'`
          : type === 'audio'
            ? `AND mime_type LIKE 'audio/%'`
            : type === 'video'
              ? `AND mime_type LIKE 'video/%'`
              : type === 'file'
                ? `AND mime_type NOT LIKE 'image/%' AND mime_type NOT LIKE 'audio/%' AND mime_type NOT LIKE 'video/%'`
                : '';

      // Use two separate complete queries to avoid dynamic SQL construction
      const countSQL = search
        ? `SELECT COUNT(*) AS total FROM files WHERE user_id = ? ${typeClause} AND (original_name LIKE ? OR filename LIKE ?)`
        : `SELECT COUNT(*) AS total FROM files WHERE user_id = ? ${typeClause}`;
      const listSQL = search
        ? `SELECT * FROM files WHERE user_id = ? ${typeClause} AND (original_name LIKE ? OR filename LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`
        : `SELECT * FROM files WHERE user_id = ? ${typeClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const searchParam = search ? `%${search}%` : null;

      try {
        const countParams = searchParam
          ? [userId, searchParam, searchParam]
          : [userId];
        const countRow = await dbGet<{ total: number }>(countSQL, countParams);
        const total = countRow?.total ?? 0;

        const listParams = searchParam
          ? [userId, searchParam, searchParam, limit, offset]
          : [userId, limit, offset];
        const files = await dbAll(listSQL, listParams);

        return reply.send({
          files,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        });
      } catch (err) {
        return reply.code(500).send({ error: (err as Error).message });
      }
    }
  );

  app.patch(
    '/file/:id',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object' as const,
          required: ['is_public'],
          properties: {
            is_public: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user?.id;
      const { is_public } = request.body as { is_public: boolean };

      const file = await dbGet<{ user_id: number | null }>(
        `SELECT user_id FROM files WHERE id = ?`,
        [id]
      );
      if (!file) return reply.code(404).send({ error: 'File not found' });
      if (file.user_id !== userId)
        return reply.code(403).send({ error: 'Not your file' });

      await dbRun(`UPDATE files SET is_public = ? WHERE id = ?`, [
        is_public ? 1 : 0,
        id,
      ]);
      return reply.send({ ok: true, is_public });
    }
  );

  app.delete(
    '/file/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user?.id;

      const file = await dbGet<{
        path: string;
        user_id: number | null;
        storage_backend: string;
      }>(`SELECT path, user_id, storage_backend FROM files WHERE id = ?`, [id]);

      if (!file) return reply.code(404).send({ error: 'File not found' });
      if (file.user_id !== userId)
        return reply.code(403).send({ error: 'Not your file' });

      try {
        await deleteFromStorage(file.path);
      } catch (err) {
        request.log.error({ err }, 'Storage delete failed');
      }

      await dbRun(`DELETE FROM files WHERE id = ?`, [id]);
      return reply.send({ ok: true });
    }
  );
}

async function resolveReadStream(
  storageKey: string,
  backend: string
): Promise<NodeJS.ReadableStream> {
  const storage = backend === 'b2' ? new B2Storage() : new LocalStorage();
  if (!(await storage.exists(storageKey))) throw new Error('Missing');
  return storage.createReadStream(storageKey);
}

async function resolveReadStreamRange(
  storageKey: string,
  backend: string,
  start: number,
  end: number
): Promise<NodeJS.ReadableStream> {
  const storage = backend === 'b2' ? new B2Storage() : new LocalStorage();
  if (!(await storage.exists(storageKey))) throw new Error('Missing');
  return storage.createReadStreamRange(storageKey, start, end);
}

/**
 * Parse an HTTP Range header. Returns `{ start, end }` or `null` if invalid.
 * Handles: `bytes=0-1023`, `bytes=1024-`, `bytes=-512`
 */
function parseRange(
  header: string,
  fileSize: number
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const rawStart = match[1] ?? '';
  const rawEnd = match[2] ?? '';

  let start: number;
  let end: number;

  if (rawStart === '' && rawEnd === '') return null;

  if (rawStart !== '' && rawEnd !== '') {
    start = parseInt(rawStart, 10);
    end = parseInt(rawEnd, 10);
  } else if (rawStart !== '') {
    // bytes=N- → from N to end
    start = parseInt(rawStart, 10);
    end = fileSize - 1;
  } else {
    // bytes=-N → last N bytes
    const suffix = parseInt(rawEnd, 10);
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end >= fileSize ||
    start > end
  ) {
    return null;
  }

  return { start, end };
}
