import type { FastifyInstance } from 'fastify';
import {
  getLogs,
  clearLogs,
  readLogFile,
  writeLog,
} from '../../services/logService.js';
import { recordAction } from '../../services/actionLogService.js';

export async function adminLogRoutes(app: FastifyInstance) {
  // Get recent log entries
  app.get('/admin/logs', async (request, reply) => {
    const { lines, level } = request.query as {
      lines?: string;
      level?: string;
    };
    const parsedLines = Math.min(
      Math.max(parseInt(lines || '200', 10) || 200, 1),
      2000
    );
    const parsedLevel = Math.min(
      Math.max(parseInt(level || '30', 10) || 30, 10),
      60
    );

    const entries = getLogs(parsedLines, parsedLevel);
    return reply.send({ logs: entries, total: entries.length });
  });

  // Download full log file
  app.get('/admin/logs/download', async (_request, reply) => {
    const content = readLogFile();
    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', 'attachment; filename=shareit-app.log');
    return reply.send(content);
  });

  // Clear logs
  app.delete('/admin/logs', async (request, reply) => {
    clearLogs();
    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'logs-clear',
        'Cleared server logs'
      );
    }
    writeLog({
      time: new Date().toISOString(),
      level: 30,
      levelName: 'info',
      msg: `Logs cleared by admin${request.user ? ` (${request.user.username})` : ''}`,
    });
    return reply.send({ ok: true });
  });
}
