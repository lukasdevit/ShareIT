import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { dbAll, dbGet, dbRun } from '../../db/index.js';
import { UPLOAD_DIR } from '../../config/index.js';

interface ActionRow {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  description: string;
  undo_data: string | null;
  undone: number;
}

/**
 * Record an admin action with undo data.
 * Call this from any admin route to enable undo functionality.
 */
export async function recordAction(
  username: string,
  action: string,
  description: string,
  undoData?: Record<string, unknown>
): Promise<number> {
  const r = await dbRun(
    `INSERT INTO admin_actions (timestamp, username, action, description, undo_data)
     VALUES (?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      username,
      action,
      description,
      undoData ? JSON.stringify(undoData) : null,
    ]
  );
  return r.lastID;
}

export async function adminActionsRoutes(app: FastifyInstance) {
  // List recent actions
  app.get('/admin/actions', async (_request, reply) => {
    const rows = await dbAll<ActionRow>(
      `SELECT * FROM admin_actions ORDER BY id DESC LIMIT 100`
    );
    return reply.send({
      actions: rows.map((r) => ({ ...r, undone: !!r.undone })),
    });
  });

  // Undo an action
  app.post('/admin/actions/:id/undo', async (request, reply) => {
    const { id } = request.params as { id: string };
    const action = await dbGet<ActionRow>(
      `SELECT * FROM admin_actions WHERE id = ? AND undone = 0`,
      [parseInt(id, 10)]
    );
    if (!action)
      return reply
        .code(404)
        .send({ error: 'Action not found or already undone' });

    const data = action.undo_data ? JSON.parse(action.undo_data) : null;

    try {
      await performUndo(action.action, data);
      await dbRun(`UPDATE admin_actions SET undone = 1 WHERE id = ?`, [
        action.id,
      ]);
      return reply.send({ ok: true, undone: action.action });
    } catch (err) {
      return reply
        .code(500)
        .send({ error: `Undo failed: ${(err as Error).message}` });
    }
  });

  // Clear all undone actions
  app.delete('/admin/actions', async (_request, reply) => {
    const result = await dbRun(`DELETE FROM admin_actions WHERE undone = 1`);
    return reply.send({ ok: true, deleted: result.changes });
  });
}

async function performUndo(
  action: string,
  data: Record<string, unknown> | null
): Promise<void> {
  if (!data) throw new Error('No undo data available');

  switch (action) {
    case 'delete-db': {
      // Re-insert deleted file row
      await dbRun(
        `INSERT INTO files (id, filename, original_name, path, size, mime_type, user_id, created_at, is_public, storage_backend)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.filename,
          data.original_name,
          data.path,
          data.size,
          data.mime_type,
          data.user_id,
          data.created_at,
          data.is_public,
          data.storage_backend,
        ]
      );
      break;
    }
    case 'db-delete': {
      // Re-insert deleted row into any table
      const { table, row } = data as {
        table: string;
        row: Record<string, unknown>;
      };
      if (!table || !row) throw new Error('Missing table/row data for undo');
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((c) => row[c]);
      await dbRun(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
        values
      );
      break;
    }
    case 'user-create': {
      if (data.userId) {
        await dbRun(`DELETE FROM users WHERE id = ?`, [data.userId]);
      }
      break;
    }
    case 'import': {
      // Delete the imported file row
      if (data.fileId) {
        await dbRun(`DELETE FROM files WHERE id = ?`, [data.fileId]);
      }
      break;
    }
    case 'delete-file': {
      // Can't undo file deletion (file is gone from disk)
      throw new Error(
        'File deletion cannot be undone — file is permanently removed from disk'
      );
    }
    case 'migrate': {
      // Move files back to original location
      if (data.fromPath && data.toPath) {
        const src = String(data.toPath);
        const dest = String(data.fromPath);
        if (!fs.existsSync(src))
          throw new Error('Migrated file no longer exists at destination');
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(src, dest);
        await dbRun(`UPDATE files SET path = ?, user_id = ? WHERE path = ?`, [
          dest,
          data.fromUserId,
          src,
        ]);
      }
      break;
    }
    default:
      throw new Error(`Undo not supported for action: ${action}`);
  }
}
