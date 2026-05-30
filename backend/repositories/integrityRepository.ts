import { dbAll, dbGet, dbRun } from '../db/index.js';

// ── Types ──

export interface CheckRow {
  id: number;
  check_id: string;
  created_at: string;
  total_issues: number;
  missing_files: number;
  orphaned_files: number;
  size_mismatches: number;
}

export interface IssueRow {
  id: number;
  type: string;
  file_id: number | null;
  disk_path: string | null;
  resolved: number;
}

export interface IssueDetailRow {
  id: number;
  type: string;
  fileId: number;
  filename: string;
  originalName: string;
  userId: number;
  diskPath: string;
  dbSize: number;
  diskSize: number;
  resolved: number;
}

export interface IntegrityFileRow {
  id: number;
  filename: string;
  original_name: string;
  path: string;
  size: number;
  user_id: number | null;
  storage_backend: string;
}

// ── Checks ──

/** List recent integrity checks (last 20). */
export async function listChecks(): Promise<CheckRow[]> {
  return dbAll<CheckRow>(
    `SELECT * FROM integrity_checks ORDER BY created_at DESC LIMIT 20`
  );
}

/** Find a check by check_id. */
export async function findCheck(checkId: string): Promise<CheckRow | undefined> {
  return dbGet<CheckRow>(
    `SELECT * FROM integrity_checks WHERE check_id = ?`,
    [checkId]
  );
}

/** Insert a new integrity check. */
export async function insertCheck(params: {
  checkId: string;
  totalIssues: number;
  missingFiles: number;
  orphanedFiles: number;
  sizeMismatches: number;
}): Promise<void> {
  await dbRun(
    `INSERT INTO integrity_checks (check_id, created_at, total_issues, missing_files, orphaned_files, size_mismatches)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.checkId,
      new Date().toISOString(),
      params.totalIssues,
      params.missingFiles,
      params.orphanedFiles,
      params.sizeMismatches,
    ]
  );
}

/** Delete a check and all its issues. */
export async function deleteCheck(checkId: string): Promise<void> {
  await dbRun(`DELETE FROM integrity_issues WHERE check_id = ?`, [checkId]);
  await dbRun(`DELETE FROM integrity_checks WHERE check_id = ?`, [checkId]);
}

// ── Issues ──

/** Insert a batch of integrity issues. */
export async function insertIssues(
  checkId: string,
  rows: (string | number | null)[][]
): Promise<void> {
  for (const row of rows) {
    await dbRun(
      `INSERT INTO integrity_issues (check_id, type, file_id, filename, original_name, user_id, disk_path, db_size, disk_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [checkId, ...row]
    );
  }
}

/** Find a single unresolved issue. */
export async function findIssue(
  checkId: string,
  issueId: number
): Promise<IssueRow | undefined> {
  return dbGet<IssueRow>(
    `SELECT type, file_id, disk_path, resolved FROM integrity_issues
     WHERE check_id = ? AND id = ?`,
    [checkId, issueId]
  );
}

/** Count issues matching conditions. */
export async function countIssues(
  where: string,
  params: (string | number)[]
): Promise<number> {
  const row = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM integrity_issues WHERE ${where}`,
    params
  );
  return row?.cnt ?? 0;
}

/** List paginated issues with filters. */
export async function listIssues(
  where: string,
  params: (string | number)[],
  limit: number,
  offset: number
): Promise<IssueDetailRow[]> {
  return dbAll<IssueDetailRow>(
    `SELECT id, type, file_id AS fileId, filename, original_name AS originalName,
            user_id AS userId, disk_path AS diskPath, db_size AS dbSize,
            disk_size AS diskSize, resolved
     FROM integrity_issues WHERE ${where}
     ORDER BY resolved ASC, id ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

/** Find an orphaned file issue (for import). */
export async function findOrphanedIssue(
  checkId: string,
  issueId: number
): Promise<{ disk_path: string; resolved: number } | undefined> {
  return dbGet<{ disk_path: string; resolved: number }>(
    `SELECT disk_path, resolved FROM integrity_issues
     WHERE check_id = ? AND id = ? AND type = 'orphaned-file'`,
    [checkId, issueId]
  );
}

/** Mark an issue as resolved. */
export async function resolveIssue(
  issueId: number,
  action: string
): Promise<void> {
  await dbRun(
    `UPDATE integrity_issues SET resolved = 1, action_taken = ? WHERE id = ?`,
    [action, issueId]
  );
}

// ── File queries used by integrity ──

/** Get all files from DB, optionally scoped to a user. */
export async function getFilesForScan(userId?: number): Promise<IntegrityFileRow[]> {
  const query = userId
    ? `SELECT id, filename, original_name, path, size, user_id, storage_backend FROM files WHERE user_id = ?`
    : `SELECT id, filename, original_name, path, size, user_id, storage_backend FROM files`;
  return dbAll<IntegrityFileRow>(query, userId ? [userId] : []);
}

/** Get a full file row by ID (for undo data before deletion). */
export async function getFileRow(id: number): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(`SELECT * FROM files WHERE id = ?`, [id]);
}

/** Delete a file row by ID (used in integrity resolution). */
export async function deleteFileRow(id: number): Promise<void> {
  await dbRun(`DELETE FROM files WHERE id = ?`, [id]);
}
