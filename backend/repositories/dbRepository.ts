import { dbAll, dbGet, dbRun } from '../db/index.js';

/** Allowed table names — prevents injection via table name parameter */
const ALLOWED_TABLES = new Set(['users', 'files', 'settings', 'backup_logs']);

export function isValidTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

/** List all non-system tables with schema info and row counts. */
export async function listTables(): Promise<{
  name: string;
  columns: { name: string; type: string; notnull: number; pk: number }[];
  rowCount: number;
}[]> {
  const tables = await dbAll<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  if (tables.length === 0) return [];

  const results = await Promise.all(
    tables.map(async (table) => {
      const cols = await dbAll<{
        name: string; type: string; notnull: number; pk: number;
      }>(`PRAGMA table_info(${table.name})`);
      const count = await dbGet<{ count: number }>(
        `SELECT COUNT(*) AS count FROM "${table.name}"`
      );
      return {
        name: table.name,
        columns: cols.map((c) => ({ name: c.name, type: c.type, notnull: c.notnull, pk: c.pk })),
        rowCount: count?.count ?? 0,
      };
    })
  );
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/** Browse rows from a table (limited to 100). */
export async function browseTable(name: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}> {
  const rows = await dbAll<Record<string, unknown>>(
    `SELECT * FROM "${name}" LIMIT 100`
  );
  const firstRow = rows[0];
  const columns = firstRow ? Object.keys(firstRow) : [];
  return { columns, rows, rowCount: rows.length };
}

/** Check if a user is admin by a given column/value. */
export async function isAdminUser(pkColumn: string, pkValue: unknown): Promise<boolean> {
  const user = await dbGet<{ is_admin: number }>(
    `SELECT is_admin FROM users WHERE "${pkColumn}" = ?`,
    [pkValue]
  );
  return user?.is_admin === 1;
}

/** Count admin users. */
export async function countAdmins(): Promise<number> {
  const row = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM users WHERE is_admin = 1`
  );
  return row?.cnt ?? 0;
}

/** Find a row by PK in any table. */
export async function findRow(
  table: string,
  pkColumn: string,
  pkValue: unknown
): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT * FROM "${table}" WHERE "${pkColumn}" = ?`,
    [pkValue]
  );
}

/** Delete a row by PK. */
export async function deleteRow(
  table: string,
  pkColumn: string,
  pkValue: unknown
): Promise<number> {
  const result = await dbRun(
    `DELETE FROM "${table}" WHERE "${pkColumn}" = ?`,
    [pkValue]
  );
  return result.changes;
}

/** Re-insert a full row into any table (used by undo). */
export async function reInsertRow(
  table: string,
  row: Record<string, unknown>
): Promise<void> {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  await dbRun(
    `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
    columns.map((c) => row[c])
  );
}
