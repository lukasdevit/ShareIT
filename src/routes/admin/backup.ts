import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

import { dbAll, dbGet, dbRun, backupDatabase } from '../../db/index.js';
import { LocalStorage } from '../../services/storage/local.js';
import { B2Storage } from '../../services/storage/b2.js';
import type { StorageProvider } from '../../services/storage/types.js';
import { isB2Enabled, clearConfigCache } from '../../config/index.js';
import { recordAction } from './actions.js';

export async function adminBackupRoutes(app: FastifyInstance) {
  // Trigger a backup now
  app.post('/admin/backup/run', async (request, reply) => {
    const destinations: {
      provider: StorageProvider;
      keyPrefix?: string;
      label?: string;
      keep?: number;
    }[] = [
      {
        provider: new LocalStorage(),
        keyPrefix: 'backups',
        label: 'local',
        keep: 7,
      },
    ];
    if (await isB2Enabled()) {
      destinations.push({
        provider: new B2Storage(),
        keyPrefix: 'backups/db',
        label: 'b2',
      });
    }

    const result = await backupDatabase(app.log, ...destinations);
    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'backup-run',
        'Manual backup triggered',
        {
          ok: result.ok,
          results: result.results,
        }
      );
    }
    return reply.send({ ok: result.ok, results: result.results });
  });

  // Download latest local backup
  app.get('/admin/backup/latest', async (_request, reply) => {
    try {
      const storage = new LocalStorage();

      // Find latest backup in the local backups folder
      const files = fs
        .readdirSync(path.join(process.cwd(), 'uploads', 'backups'))
        .filter((f) => f.startsWith('database-') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return reply.code(404).send({ error: 'No backups found' });
      }

      const latest = files[0]!;
      const filepath = path.join(process.cwd(), 'uploads', 'backups', latest);

      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${latest}"`);
      return reply.send(fs.createReadStream(filepath));
    } catch {
      return reply.code(404).send({ error: 'No backups available' });
    }
  });

  // List backup history (last 50 entries)
  app.get('/admin/backup/history', async (_request, reply) => {
    const rows = await dbAll<{
      id: number;
      timestamp: string;
      destination: string;
      status: string;
      size_bytes: number | null;
      error: string | null;
    }>(`SELECT * FROM backup_logs ORDER BY id DESC LIMIT 50`);

    return reply.send({ backups: rows });
  });

  // Get backup schedule config
  app.get('/admin/backup/schedule', async (_request, reply) => {
    const row = await dbGet<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'backup_schedule_hours'`
    );
    const hours = parseInt(row?.value || '6', 10) || 6;
    return reply.send({ backup_schedule_hours: hours });
  });

  // Update backup schedule config
  app.patch('/admin/backup/schedule', async (request, reply) => {
    const { backup_schedule_hours } = request.body as {
      backup_schedule_hours?: number;
    };
    if (
      typeof backup_schedule_hours !== 'number' ||
      backup_schedule_hours < 1 ||
      backup_schedule_hours > 168
    ) {
      return reply
        .code(400)
        .send({ error: 'backup_schedule_hours must be a number between 1 and 168' });
    }
    await dbRun(
      `INSERT INTO settings (key, value) VALUES ('backup_schedule_hours', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(backup_schedule_hours)]
    );
    clearConfigCache();
    if (request.user?.username) {
      await recordAction(
        request.user!.username,
        'backup-schedule',
        `Updated backup schedule to ${backup_schedule_hours}h`,
        { backup_schedule_hours }
      );
    }
    return reply.send({ ok: true, backup_schedule_hours });
  });
}
