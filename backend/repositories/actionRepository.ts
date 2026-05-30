import { dbAll, dbGet, dbRun } from '../db/index.js';

export interface ActionRow {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  description: string;
  undo_data: string | null;
  undone: number;
}

/** Insert a new admin action log entry. Returns the new row ID. */
export async function insertAction(
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

/** List recent admin actions (most recent first, limited to 100). */
export async function listRecentActions(): Promise<ActionRow[]> {
  return dbAll<ActionRow>(
    `SELECT * FROM admin_actions ORDER BY id DESC LIMIT 100`
  );
}

/** Find a single action by ID that has not been undone. */
export async function findActionById(id: number): Promise<ActionRow | undefined> {
  return dbGet<ActionRow>(
    `SELECT * FROM admin_actions WHERE id = ? AND undone = 0`,
    [id]
  );
}

/** Mark an action as undone. */
export async function markActionUndone(id: number): Promise<void> {
  await dbRun(`UPDATE admin_actions SET undone = 1 WHERE id = ?`, [id]);
}

/** Delete all actions that have already been undone. */
export async function deleteUndoneActions(): Promise<number> {
  const result = await dbRun(`DELETE FROM admin_actions WHERE undone = 1`);
  return result.changes;
}
