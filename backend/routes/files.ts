import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  requireAuth,
  getTokenFromHeader,
  verifyToken,
} from '../middleware/index.js';
import { deleteFromStorage, parseRange } from '../utils/index.js';
import {
  findByFilename,
  findRandomByUser,
  countByUser,
  listByUser,
  findOwnershipById,
  togglePublic,
  findForDelete,
  deleteById,
} from '../repositories/fileRepository.js';
import {
  resolveReadStream,
  resolveReadStreamRange,
} from '../services/files/fileStream.js';

const FILE_SERVE_RATE = 300;
const FILE_LIST_RATE = 120;
const FILE_RATE_WINDOW_MS = 60_000;

function buildTypeClause(type?: string): string {
  switch (type) {
    case 'audio':  return `AND mime_type LIKE 'audio/%'`;
    case 'video':  return `AND mime_type LIKE 'video/%'`;
    case 'image':  return `AND mime_type LIKE 'image/%'`;
    case 'file':   return `AND mime_type NOT LIKE 'image/%' AND mime_type NOT LIKE 'audio/%' AND mime_type NOT LIKE 'video/%'`;
    default:       return '';
  }
}

export async function filesRoutes(app: FastifyInstance) {
  // ── Serve file by filename (public) ──
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
        const file = await findByFilename(filename);
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
            const rangeStream = await resolveReadStreamRange(
              file.path,
              file.storage_backend,
              start,
              end
            );
            reply
              .code(206)
              .header('Content-Range', `bytes ${start}-${end}/${file.size}`)
              .header('Content-Length', end - start + 1);
            return reply.send(rangeStream);
          }
        }

        reply.header('Content-Length', file.size);
        return reply.send(stream);
      } catch {
        if (!reply.sent) {
          return reply.code(404).send({ error: 'File missing from storage' });
        }
      }
    }
  );

  // ── Random file ──
  app.get(
    '/files/random',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;
      const typeClause = buildTypeClause((request.query as { type?: string }).type);
      const file = await findRandomByUser(userId, typeClause);
      if (!file) return reply.code(404).send({ error: 'No files found' });
      return reply.send({ data: file });
    }
  );

  // ── List files (paginated) ──
  app.get(
    '/files',
    {
      preHandler: [requireAuth],
      config: {
        rateLimit: { max: FILE_LIST_RATE, timeWindow: FILE_RATE_WINDOW_MS },
      },
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const query = request.query as {
        page?: string;
        limit?: string;
        search?: string;
        type?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10) || 50));
      const offset = (page - 1) * limit;
      const search = query.search?.trim() || undefined;
      const typeClause = buildTypeClause(query.type);

      try {
        const [total, files] = await Promise.all([
          countByUser(userId, typeClause, search),
          listByUser(userId, typeClause, limit, offset, search),
        ]);
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

  // ── Toggle public ──
  app.patch(
    '/file/:id',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object' as const,
          required: ['is_public'],
          properties: { is_public: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      const { is_public } = request.body as { is_public: boolean };

      const file = await findOwnershipById(parseInt(id, 10));
      if (!file) return reply.code(404).send({ error: 'File not found' });
      if (file.user_id !== userId) return reply.code(403).send({ error: 'Not your file' });

      await togglePublic(parseInt(id, 10), is_public);
      return reply.send({ ok: true, is_public });
    }
  );

  // ── Delete file ──
  app.delete(
    '/file/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      const file = await findForDelete(parseInt(id, 10));
      if (!file) return reply.code(404).send({ error: 'File not found' });
      if (file.user_id !== userId) return reply.code(403).send({ error: 'Not your file' });

      try {
        await deleteFromStorage(file.path);
      } catch (err) {
        request.log.error({ err }, 'Storage delete failed');
      }

      await deleteById(parseInt(id, 10));
      return reply.send({ ok: true });
    }
  );
}
