import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/index.js';
import { handleUpload } from '../../services/fileService.js';
import { dbGet } from '../../db/index.js';
import { DEMO_STORAGE_LIMIT } from '../../config/index.js';

// Cloudflare free plan caps uploads at 100 MB — reject slightly below that
// so the backend can return a friendly JSON error instead of an HTML 413.
const CLOUDFLARE_UPLOAD_LIMIT = 95 * 1024 * 1024; // 95 MB

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file was uploaded' });

    // Check Content-Length before processing — gives a clear error for
    // files that are too large for ShareX/Cloudflare but not yet blocked.
    const contentLength = parseInt(
      request.headers['content-length'] || '0',
      10
    );
    if (contentLength > CLOUDFLARE_UPLOAD_LIMIT) {
      return reply.code(413).send({
        error:
          'This file exceeds the 100 MB limit for direct uploads. ' +
          'Please upload it via the web app at ' +
          (process.env.BASE_URL || 'https://not.valid.url.avaible') +
          ' — the web app uses chunked upload without size limits.',
      });
    }

    const user = request.user!;

    // Demo users: enforce 100 MB quota
    if (user.isDemo) {
      const usedRow = await dbGet<{ used: number }>(
        `SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE user_id = ?`,
        [user.id]
      );
      const used = usedRow?.used ?? 0;
      if (used + (file.file?.bytesRead ?? 0) > DEMO_STORAGE_LIMIT) {
        return reply
          .code(413)
          .send({ error: 'Demo storage limit reached (100 MB)' });
      }
    }

    // Demo users: cap expiry at 5 minutes (≈ 0.0035 days, round down to 0 days = no expiry,
    // but we'll use header/query. Actually we just disallow setting expiry for demo users)
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

    return reply.send(await handleUpload(file, user.id, expiresInDays));
  });
}
