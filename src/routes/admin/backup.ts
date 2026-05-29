import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

import { dbAll, backupDatabase } from '../../db/index.js';
import { LocalStorage } from '../../services/storage/local.js';
import { B2Storage } from '../../services/storage/b2.js';
import type { StorageProvider } from '../../services/storage/types.js';
import { B2_ENABLED } from '../../config/index.js';
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
    if (B2_ENABLED) {
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
}
