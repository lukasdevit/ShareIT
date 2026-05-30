import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/index.js';
import { handleUpload } from '../../services/fileService.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file was uploaded' });

    const user = request.user!;

    // Demo users: cap expiry
    let expiresInDays: number | undefined;
    if (!user.isDemo) {
      const expiryHeader = request.headers['x-file-expires'] as
        | string
        | undefined;
      const expiryQuery = (request.query as Record<string, string | undefined>)
        ?.expires;
      const raw = expiryHeader || expiryQuery;
      if (raw) {
        const days = parseInt(raw, 10);
        if (!isNaN(days) && days >= 1 && days <= 365) {
          expiresInDays = days;
        }
      }
    }

    const result = await handleUpload(file, user.id, expiresInDays);

    // Warn if file is near Cloudflare's 100 MB limit — the request may
    // be rejected by Cloudflare before reaching the server. Actual upload
    // limits are enforced by per-user storage quota in the service layer.
    const contentLength = parseInt(
      request.headers['content-length'] || '0',
      10
    );
    if (contentLength > 95 * 1024 * 1024) {
      return reply.send({
        ...result,
        warning:
          'Files over 100 MB may be rejected by Cloudflare. ' +
          'For large files, use the web app — it supports chunked upload without size limits.',
      });
    }

    return reply.send(result);
  });
}
