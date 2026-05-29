import type { FastifyInstance } from 'fastify';
import { dbAll, dbGet } from '../../db/index.js';

interface DailyPoint {
  day: string;
  count: number;
  bytes: number;
}
interface TopUser {
  username: string;
  files: number;
  bytes: number;
}
interface Category {
  category: string;
  count: number;
  bytes: number;
}

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  app.get('/admin/analytics', async (_request, reply) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [usersRow, filesRow, todayRow, dailyRows, topRows, catRows] =
      await Promise.all([
        dbGet<{ users: number }>(`SELECT COUNT(*) AS users FROM users`),
        dbGet<{ files: number; bytes: number }>(
          `SELECT COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes FROM files`
        ),
        dbGet<{ today: number }>(
          `SELECT COUNT(*) AS today FROM files WHERE created_at >= ?`,
          [today]
        ),
        dbAll<DailyPoint>(
          `SELECT DATE(created_at) AS day, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE created_at >= ? GROUP BY day ORDER BY day`,
          [monthAgo]
        ),
        dbAll<TopUser>(
          `SELECT u.username, COUNT(f.id) AS files, COALESCE(SUM(f.size), 0) AS bytes FROM users u LEFT JOIN files f ON f.user_id = u.id GROUP BY u.id ORDER BY bytes DESC LIMIT 10`
        ),
        dbAll<Category>(
          `SELECT CASE WHEN mime_type LIKE 'image/%' THEN 'Images' WHEN mime_type LIKE 'video/%' THEN 'Videos' WHEN mime_type LIKE 'text/%' OR mime_type IN ('application/json','application/xml','application/javascript') THEN 'Text / Code' ELSE 'Other' END AS category, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files GROUP BY category ORDER BY bytes DESC`
        ),
      ]);

    return reply.send({
      users: usersRow?.users ?? 0,
      total_files: filesRow?.files ?? 0,
      total_bytes: filesRow?.bytes ?? 0,
      uploads_today: todayRow?.today ?? 0,
      daily: dailyRows,
      top_users: topRows,
      categories: catRows,
    });
  });
}
