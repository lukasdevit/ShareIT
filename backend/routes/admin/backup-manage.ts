import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

import { DB_PATH } from '../../config/index.js';
import { recordAction } from '../../services/actionLogService.js';

const BACKUPS_DIR = path.join(process.cwd(), 'uploads', 'backups');

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR))
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function adminBackupManageRoutes(app: FastifyInstance) {
  // List all backup files with metadata
  app.get('/admin/backup/list', async (_request, reply) => {
    try {
      ensureBackupsDir();
      const files = fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('database-') && f.endsWith('.db'))
        .map((f) => {
          const filepath = path.join(BACKUPS_DIR, f);
          const stat = fs.statSync(filepath);
          return {
            filename: f,
            size: stat.size,
            created: stat.birthtime.toISOString(),
            modified: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));

      return reply.send({ backups: files });
    } catch {
      return reply.send({ backups: [] });
    }
  });

  // Upload a database backup file
  app.post('/admin/backup/upload', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded' });

    const ext = path.extname(file.filename).toLowerCase();
    if (ext !== '.db')
      return reply.code(400).send({ error: 'Only .db files are accepted' });

    ensureBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destName = `database-${timestamp}-uploaded.db`;
    const destPath = path.join(BACKUPS_DIR, destName);

    try {
      const writeStream = fs.createWriteStream(destPath);
      await new Promise<void>((resolve, reject) => {
        file.file.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Validate it's a valid SQLite database
      try {
        execSync(`sqlite3 "${destPath}" "PRAGMA integrity_check;"`, {
          stdio: 'pipe',
          timeout: 5000,
        });
      } catch {
        fs.unlinkSync(destPath);
        return reply
          .code(400)
          .send({ error: 'Uploaded file is not a valid SQLite database' });
      }

      const stat = fs.statSync(destPath);
      if (request.user?.username) {
        await recordAction(
          request.user!.username,
          'backup-upload',
          `Uploaded backup: ${destName}`,
          { filename: destName }
        );
      }
      return reply.send({
        ok: true,
        backup: {
          filename: destName,
          size: stat.size,
          created: stat.birthtime.toISOString(),
        },
      });
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  // Delete a backup file
  app.delete(
    '/admin/backup/delete',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['filename'],
          properties: { filename: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { filename } = request.body as { filename: string };
      // Prevent path traversal
      const safe = path.basename(filename);
      if (
        safe !== filename ||
        !safe.startsWith('database-') ||
        !safe.endsWith('.db')
      ) {
        return reply.code(400).send({ error: 'Invalid backup filename' });
      }
      const filepath = path.join(BACKUPS_DIR, safe);
      if (!fs.existsSync(filepath)) {
        return reply.code(404).send({ error: 'Backup not found' });
      }
      fs.unlinkSync(filepath);
      if (request.user?.username) {
        await recordAction(
          request.user!.username,
          'backup-delete',
          `Deleted backup: ${safe}`,
          { filename: safe }
        );
      }
      return reply.send({ ok: true });
    }
  );

  // Restore a backup (replaces current database)
  app.post(
    '/admin/backup/restore',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['filename', 'confirm'],
          properties: {
            filename: { type: 'string' },
            confirm: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { filename, confirm } = request.body as {
        filename: string;
        confirm: string;
      };

      if (confirm !== 'RESTORE') {
        return reply
          .code(400)
          .send({ error: "Type 'RESTORE' in the confirm field to proceed" });
      }

      const safe = path.basename(filename);
      if (
        safe !== filename ||
        !safe.startsWith('database-') ||
        !safe.endsWith('.db')
      ) {
        return reply.code(400).send({ error: 'Invalid backup filename' });
      }

      const srcPath = path.join(BACKUPS_DIR, safe);
      if (!fs.existsSync(srcPath)) {
        return reply.code(404).send({ error: 'Backup file not found' });
      }

      // Validate the backup is a good SQLite database
      try {
        execSync(`sqlite3 "${srcPath}" "PRAGMA integrity_check;"`, {
          stdio: 'pipe',
          timeout: 10000,
        });
      } catch {
        return reply
          .code(400)
          .send({ error: 'Backup file is corrupted (integrity check failed)' });
      }

      // Create a safety backup of current DB before restoring
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackup = path.join(
        BACKUPS_DIR,
        `database-${timestamp}-pre-restore.db`
      );
      try {
        fs.copyFileSync(DB_PATH, safetyBackup);
      } catch (err) {
        return reply
          .code(500)
          .send({
            error: `Failed to create safety backup: ${(err as Error).message}`,
          });
      }

      // Perform restore using sqlite3 .backup command (transactional)
      try {
        execSync(`sqlite3 "${DB_PATH}" ".restore '${srcPath}'"`, {
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch (err) {
        // Restore safety backup on failure
        try {
          fs.copyFileSync(safetyBackup, DB_PATH);
        } catch {
          /* best effort */
        }
        return reply.code(500).send({
          error: `Restore failed: ${(err as Error).message}. Current database has been preserved.`,
        });
      }

      // Record action (non-blocking)
      if (request.user) {
        recordAction(
          request.user!.username,
          'backup-restore',
          `Restored database from: ${filename}`,
          {
            filename,
            safetyBackup: path.basename(safetyBackup),
          }
        ).catch(() => {});
      }

      return reply.send({
        ok: true,
        restored: filename,
        safety_backup: path.basename(safetyBackup),
        message:
          'Database restored successfully. The server may need a restart for in-memory caches to refresh.',
      });
    }
  );
}
