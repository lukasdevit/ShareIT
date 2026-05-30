import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { dbAll, dbGet, dbRun } from '../../db/index.js';
import { UPLOAD_DIR, getStorageBackend } from '../../config/index.js';
import { recordAction } from './actions.js';
import { B2Storage } from '../../services/storage/b2/index.js';
import { deleteFromStorage } from '../../utils/index.js';

interface CheckRow {
  id: number;
  check_id: string;
  created_at: string;
  total_issues: number;
  missing_files: number;
  orphaned_files: number;
  size_mismatches: number;
}

function getAllDiskFiles(
  dir: string,
  baseDir: string,
  files: Map<string, string>
): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllDiskFiles(full, baseDir, files);
    } else {
      files.set(path.relative(baseDir, full), full);
    }
  }
}

function resolvePath(p: string): string {
  return p.startsWith(UPLOAD_DIR) ? path.relative(UPLOAD_DIR, p) : p;
}

function cleanEmptyDirs(absPath: string): void {
  let dir = path.dirname(absPath);
  while (dir !== UPLOAD_DIR && dir !== path.join(UPLOAD_DIR, 'share')) {
    try {
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      else break;
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

/** Extract user ID from a share path like "share/2/2026/05/28/file.txt" → 2 */
function extractUserIdFromPath(diskPath: string): number | null {
  const parts = diskPath.replace(/^share[\\/]/, '').split(path.sep);
  const first = parts[0];
  if (first && /^\d+$/.test(first)) return parseInt(first, 10);
  return null;
}

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'text/xml',
    '.js': 'application/javascript',
    '.ts': 'text/typescript',
    '.zip': 'application/zip',
    '.gz': 'application/gzip',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
  };
  return map[ext] || 'application/octet-stream';
}

async function resolveIssue(
  checkId: string,
  issueId: number,
  action: string,
  username?: string
): Promise<void> {
  const issue = await dbGet<{
    type: string;
    file_id: number | null;
    disk_path: string | null;
    resolved: number;
  }>(
    `SELECT type, file_id, disk_path, resolved FROM integrity_issues WHERE check_id = ? AND id = ?`,
    [checkId, issueId]
  );
  if (!issue)
    throw Object.assign(new Error('Issue not found'), { statusCode: 404 });
  if (issue.resolved)
    throw Object.assign(new Error('Already resolved'), { statusCode: 409 });

  if (action === 'delete-db' && issue.file_id) {
    // Save row data for undo before deleting
    const row = await dbGet<Record<string, unknown>>(
      `SELECT * FROM files WHERE id = ?`,
      [issue.file_id]
    );
    await dbRun(`DELETE FROM files WHERE id = ?`, [issue.file_id]);
    if (username && row) {
      await recordAction(
        username,
        'delete-db',
        `Deleted file row #${issue.file_id}`,
        row as Record<string, unknown>
      );
    }
  } else if (action === 'delete-file' && issue.disk_path) {
    await deleteFromStorage(issue.disk_path);

    // Clean up empty local dirs if the path was local
    const absPath = path.join(UPLOAD_DIR, issue.disk_path);
    if (fs.existsSync(absPath)) {
      cleanEmptyDirs(absPath);
    }
    if (username) {
      await recordAction(
        username,
        'delete-file',
        `Deleted file: ${issue.disk_path}`,
        { diskPath: issue.disk_path }
      );
    }
  }

  await dbRun(
    `UPDATE integrity_issues SET resolved = 1, action_taken = ? WHERE id = ?`,
    [action, issueId]
  );
}

export async function adminIntegrityRoutes(app: FastifyInstance) {
  // List saved checks
  app.get('/admin/storage/integrity', async (_request, reply) => {
    const checks = await dbAll<CheckRow>(
      `SELECT * FROM integrity_checks ORDER BY created_at DESC LIMIT 20`
    );
    return reply.send({ checks });
  });

  // Start new check
  app.post(
    '/admin/storage/integrity',
    {
      schema: {
        body: {
          type: 'object' as const,
          properties: {
            userId: { type: 'number' },
            username: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body || {}) as {
        userId?: number;
        username?: string;
      };
      let userId = body.userId;

      // Resolve username to userId
      if (body.username && !userId) {
        const user = await dbGet<{ id: number }>(
          `SELECT id FROM users WHERE username = ?`,
          [body.username]
        );
        if (user) userId = user.id;
      }

      // Scope DB query by userId if provided — include storage_backend
      const dbQuery = userId
        ? `SELECT id, filename, original_name, path, size, user_id, storage_backend FROM files WHERE user_id = ?`
        : `SELECT id, filename, original_name, path, size, user_id, storage_backend FROM files`;
      const dbFiles = await dbAll<{
        id: number;
        filename: string;
        original_name: string;
        path: string;
        size: number;
        user_id: number | null;
        storage_backend: string;
      }>(dbQuery, userId ? [userId] : []);

      // Split files by storage backend
      const localDbFiles = dbFiles.filter((f) => f.storage_backend !== 'b2');
      const b2DbFiles = dbFiles.filter((f) => f.storage_backend === 'b2');

      const dbByPath = new Map<string, (typeof dbFiles)[0]>();
      for (const f of localDbFiles) dbByPath.set(resolvePath(f.path), f);

      // Scope disk scan to user's directory if userId provided
      const diskFiles = new Map<string, string>();
      const scanDir = userId
        ? path.join(UPLOAD_DIR, 'share', String(userId))
        : path.join(UPLOAD_DIR, 'share');
      if (fs.existsSync(scanDir))
        getAllDiskFiles(scanDir, UPLOAD_DIR, diskFiles);

      const insertRows: (string | number | null)[][] = [];

      // ── Check local files against disk ──
      for (const [relPath, dbFile] of dbByPath) {
        const absPath = path.join(UPLOAD_DIR, relPath);
        if (!fs.existsSync(absPath)) {
          insertRows.push([
            'missing-file',
            dbFile.id,
            dbFile.filename,
            dbFile.original_name,
            dbFile.user_id,
            null,
            dbFile.size,
            null,
          ]);
        } else {
          const diskSize = fs.statSync(absPath).size;
          if (diskSize !== dbFile.size) {
            insertRows.push([
              'size-mismatch',
              dbFile.id,
              dbFile.filename,
              dbFile.original_name,
              dbFile.user_id,
              relPath,
              dbFile.size,
              diskSize,
            ]);
          }
        }
      }

      // ── Check B2 files against B2 storage ──
      if ((await getStorageBackend()) === 'b2' && b2DbFiles.length > 0) {
        const b2 = new B2Storage();
        for (const dbFile of b2DbFiles) {
          const key = dbFile.path;
          try {
            const b2Size = await b2.size(key);
            if (b2Size !== dbFile.size) {
              insertRows.push([
                'size-mismatch',
                dbFile.id,
                dbFile.filename,
                dbFile.original_name,
                dbFile.user_id,
                key,
                dbFile.size,
                b2Size,
              ]);
            }
          } catch {
            insertRows.push([
              'missing-file',
              dbFile.id,
              dbFile.filename,
              dbFile.original_name,
              dbFile.user_id,
              null,
              dbFile.size,
              null,
            ]);
          }
        }
      }

      for (const [relPath] of diskFiles) {
        if (!dbByPath.has(relPath)) {
          insertRows.push([
            'orphaned-file',
            null,
            null,
            null,
            null,
            relPath,
            null,
            null,
          ]);
        }
      }

      const checkId = `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const missingFiles = insertRows.filter(
        (r) => r[0] === 'missing-file'
      ).length;
      const orphanedFiles = insertRows.filter(
        (r) => r[0] === 'orphaned-file'
      ).length;
      const sizeMismatches = insertRows.filter(
        (r) => r[0] === 'size-mismatch'
      ).length;

      await dbRun(
        `INSERT INTO integrity_checks (check_id, created_at, total_issues, missing_files, orphaned_files, size_mismatches)
       VALUES (?, ?, ?, ?, ?, ?)`,
        [
          checkId,
          now,
          insertRows.length,
          missingFiles,
          orphanedFiles,
          sizeMismatches,
        ]
      );

      for (const row of insertRows) {
        await dbRun(
          `INSERT INTO integrity_issues (check_id, type, file_id, filename, original_name, user_id, disk_path, db_size, disk_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [checkId, ...row]
        );
      }

      return reply.send({
        checkId,
        total: insertRows.length,
        summary: { missingFiles, orphanedFiles, sizeMismatches },
      });
    }
  );

  // Get paginated issues with filters
  app.get('/admin/storage/integrity/:checkId', async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    const { offset, limit, type, userId, username } = request.query as {
      offset?: string;
      limit?: string;
      type?: string;
      userId?: string;
      username?: string;
    };

    const check = await dbGet<CheckRow>(
      `SELECT * FROM integrity_checks WHERE check_id = ?`,
      [checkId]
    );
    if (!check) return reply.code(404).send({ error: 'Check not found' });

    const start = parseInt(offset || '0', 10) || 0;
    const count = Math.min(parseInt(limit || '50', 10) || 50, 200);

    const conditions: string[] = ['check_id = ?'];
    const params: (string | number)[] = [checkId];

    if (
      type &&
      ['missing-file', 'orphaned-file', 'size-mismatch'].includes(type)
    ) {
      conditions.push('type = ?');
      params.push(type);
    }

    // Resolve userId from username if provided
    let resolvedUserId: number | null = null;
    if (username) {
      const user = await dbGet<{ id: number }>(
        `SELECT id FROM users WHERE username = ?`,
        [username]
      );
      if (user) resolvedUserId = user.id;
      else resolvedUserId = -1; // no match → empty results
    } else if (userId && !isNaN(parseInt(userId, 10))) {
      resolvedUserId = parseInt(userId, 10);
    }

    if (resolvedUserId !== null) {
      conditions.push('user_id = ?');
      params.push(resolvedUserId);
    }

    const where = conditions.join(' AND ');

    const [totalRow, issues, unresolvedRow] = await Promise.all([
      dbGet<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM integrity_issues WHERE ${where}`,
        params
      ),
      dbAll<Record<string, unknown>>(
        `SELECT id, type, file_id AS fileId, filename, original_name AS originalName,
                user_id AS userId, disk_path AS diskPath, db_size AS dbSize,
                disk_size AS diskSize, resolved
         FROM integrity_issues WHERE ${where}
         ORDER BY resolved ASC, id ASC LIMIT ? OFFSET ?`,
        [...params, count, start]
      ),
      dbGet<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM integrity_issues WHERE ${where} AND resolved = 0`,
        params
      ),
    ]);

    const normalized = issues.map((i) => ({ ...i, resolved: !!i.resolved }));

    return reply.send({
      issues: normalized,
      offset: start,
      limit: count,
      total: totalRow?.cnt ?? 0,
      unresolved: unresolvedRow?.cnt ?? 0,
    });
  });

  // Resolve single
  app.post(
    '/admin/storage/integrity/:checkId/resolve',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['issueId', 'action'],
          properties: {
            issueId: { type: 'number' },
            action: {
              type: 'string',
              enum: ['delete-db', 'delete-file', 'skip'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { checkId } = request.params as { checkId: string };
      const { issueId, action } = request.body as {
        issueId: number;
        action: string;
      };
      await resolveIssue(checkId, issueId, action, request.user?.username);
      return reply.send({ ok: true, issueId });
    }
  );

  // Resolve bulk
  app.post(
    '/admin/storage/integrity/:checkId/resolve-bulk',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['issueIds', 'action'],
          properties: {
            issueIds: { type: 'array', items: { type: 'number' } },
            action: {
              type: 'string',
              enum: ['delete-db', 'delete-file', 'skip'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { checkId } = request.params as { checkId: string };
      const { issueIds, action } = request.body as {
        issueIds: number[];
        action: string;
      };
      let resolved = 0;
      for (const id of issueIds) {
        try {
          await resolveIssue(checkId, id, action, request.user?.username);
          resolved++;
        } catch {
          /* skip */
        }
      }
      return reply.send({ ok: true, resolved });
    }
  );

  // Import orphaned files into DB
  app.post(
    '/admin/storage/integrity/:checkId/import',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['issueIds'],
          properties: {
            issueIds: { type: 'array', items: { type: 'number' } },
            userId: { type: 'number' },
            originalName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { checkId } = request.params as { checkId: string };
      const { issueIds, userId, originalName } = request.body as {
        issueIds: number[];
        userId?: number;
        originalName?: string;
      };
      const imported: { issueId: number; fileId: number }[] = [];

      for (const issueId of issueIds) {
        const issue = await dbGet<{ disk_path: string; resolved: number }>(
          `SELECT disk_path, resolved FROM integrity_issues WHERE check_id = ? AND id = ? AND type = 'orphaned-file'`,
          [checkId, issueId]
        );
        if (!issue || issue.resolved) continue;

        const absPath = path.join(UPLOAD_DIR, issue.disk_path);
        if (!fs.existsSync(absPath)) continue;

        const stat = fs.statSync(absPath);
        const diskName = path.basename(issue.disk_path);
        const ext = path.extname(diskName);
        const base = path
          .basename(diskName, ext)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 40);
        const filename = `${base}-${Date.now().toString(36)}${ext}`;
        const now = new Date().toISOString();

        // Extract userId from path: share/{userId}/...
        const resolvedUserId = userId ?? extractUserIdFromPath(issue.disk_path);
        // Use provided original name, fall back to disk basename
        const nameForDb = originalName || diskName;

        const result = await dbRun(
          `INSERT INTO files (filename, original_name, path, size, mime_type, user_id, created_at, is_public, storage_backend)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'local')`,
          [
            filename,
            nameForDb,
            absPath,
            stat.size,
            getMimeType(diskName),
            resolvedUserId ?? null,
            now,
          ]
        );
        await dbRun(
          `UPDATE integrity_issues SET resolved = 1, action_taken = 'imported' WHERE id = ?`,
          [issueId]
        );
        imported.push({ issueId, fileId: result.lastID });
        if (request.user?.username) {
          await recordAction(
            request.user!.username,
            'import',
            `Imported orphaned file: ${diskName} (new ID #${result.lastID})`,
            {
              fileId: result.lastID,
              filename,
              originalName: nameForDb,
            }
          );
        }
      }

      return reply.send({ ok: true, imported });
    }
  );

  // Preview an orphaned file by disk path
  app.get('/admin/file-preview', async (request, reply) => {
    const { path: filePath } = request.query as { path?: string };
    if (!filePath)
      return reply.code(400).send({ error: 'Missing path parameter' });

    const absPath = path.join(UPLOAD_DIR, filePath);
    // Prevent traversal
    if (!absPath.startsWith(UPLOAD_DIR))
      return reply.code(403).send({ error: 'Forbidden' });
    if (!fs.existsSync(absPath))
      return reply.code(404).send({ error: 'File not found' });

    const mime = getMimeType(filePath);
    const stat = fs.statSync(absPath);

    reply.header('Content-Type', mime);
    reply.header('Content-Length', stat.size);
    reply.header('Cache-Control', 'no-cache');
    return reply.send(fs.createReadStream(absPath));
  });

  // Migrate files from one user to another (disk + DB)
  app.post(
    '/admin/storage/migrate',
    {
      schema: {
        body: {
          type: 'object' as const,
          required: ['paths', 'toUserId'],
          properties: {
            paths: { type: 'array', items: { type: 'string' } },
            toUserId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { paths, toUserId } = request.body as {
        paths: string[];
        toUserId: number;
      };
      const migrated: string[] = [];
      const errors: string[] = [];

      for (const relPath of paths) {
        try {
          const absSrc = path.join(UPLOAD_DIR, relPath);
          if (!fs.existsSync(absSrc)) {
            errors.push(`${relPath}: file not found`);
            continue;
          }

          const fromUserId = extractUserIdFromPath(relPath);
          if (fromUserId === null) {
            errors.push(`${relPath}: could not determine source user`);
            continue;
          }
          if (fromUserId === toUserId) {
            errors.push(`${relPath}: already belongs to user ${toUserId}`);
            continue;
          }

          // Build destination path: swap the user ID in the path
          const parts = relPath.split(path.sep);
          parts[0] = String(toUserId); // replace "share/{oldUserId}" with "share/{newUserId}"
          const destRel = parts.join(path.sep);
          const absDest = path.join(UPLOAD_DIR, destRel);

          // Ensure destination directory exists
          const destDir = path.dirname(absDest);
          if (!fs.existsSync(destDir))
            fs.mkdirSync(destDir, { recursive: true });

          // Move file
          fs.renameSync(absSrc, absDest);

          // Update any DB entry pointing to this path
          await dbRun(`UPDATE files SET path = ?, user_id = ? WHERE path = ?`, [
            absDest,
            toUserId,
            absSrc,
          ]);

          migrated.push(`${relPath} → ${destRel}`);
          if (request.user?.username) {
            await recordAction(
              request.user!.username,
              'migrate',
              `Migrated file: ${relPath} → user #${toUserId}`,
              {
                fromPath: absSrc,
                toPath: absDest,
                fromUserId,
              }
            );
          }
        } catch (err) {
          errors.push(`${relPath}: ${(err as Error).message}`);
        }
      }

      return reply.send({ ok: errors.length === 0, migrated, errors });
    }
  );

  // Delete a saved check
  app.delete('/admin/storage/integrity/:checkId', async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    await dbRun(`DELETE FROM integrity_issues WHERE check_id = ?`, [checkId]);
    await dbRun(`DELETE FROM integrity_checks WHERE check_id = ?`, [checkId]);
    return reply.send({ ok: true });
  });
}
