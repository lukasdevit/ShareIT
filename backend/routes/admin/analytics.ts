import type { FastifyInstance } from 'fastify';
import { countUsers } from '../../repositories/userRepository.js';
import {
  getFileTotals,
  countFilesSince,
  getDailyStats,
  getTopUsers,
  getFileCategories,
} from '../../repositories/analyticsRepository.js';

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  app.get('/admin/analytics', async (_request, reply) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      users,
      fileTotals,
      uploadsToday,
      daily,
      topUsers,
      categories,
    ] = await Promise.all([
      countUsers(),
      getFileTotals(),
      countFilesSince(today),
      getDailyStats(monthAgo),
      getTopUsers(),
      getFileCategories(),
    ]);

    return reply.send({
      users,
      total_files: fileTotals.files,
      total_bytes: fileTotals.bytes,
      uploads_today: uploadsToday,
      daily,
      top_users: topUsers,
      categories,
    });
  });
}
