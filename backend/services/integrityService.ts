import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, getStorageBackend } from '../config/index.js';
import { B2Storage } from './storage/b2/index.js';
import { deleteFromStorage } from '../utils/index.js';
import { recordAction } from './actionLogService.js';
import {
  insertCheck,
  insertIssues,
  findIssue,
  resolveIssue as markIssueResolved,
  getFilesForScan,
  getFileRow,
  deleteFileRow,
  findOrphanedIssue,
} from '../repositories/integrityRepository.js';
import { insertFile, updateFilePathAndUser } from '../repositories/fileRepository.js';

// ── Disk scanning helpers ──

export function getAllDiskFiles(
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

export function resolvePath(p: string): string {
  return p.startsWith(UPLOAD_DIR) ? path.relative(UPLOAD_DIR, p) : p;
}

export function extractUserIdFromPath(diskPath: string): number | null {
  const parts = diskPath.replace(/^share[\\/]/, '').split(path.sep);
  const first = parts[0];
  if (first && /^\d+$/.test(first)) return parseInt(first, 10);
  return null;
}

export function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.json': 'application/json', '.txt': 'text/plain',
    '.csv': 'text/csv', '.md': 'text/markdown', '.html': 'text/html',
    '.css': 'text/css', '.xml': 'text/xml', '.js': 'application/javascript',
    '.ts': 'text/typescript', '.zip': 'application/zip', '.gz': 'application/gzip',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  };
  return map[ext] || 'application/octet-stream';
}

function cleanEmptyDirs(absPath: string): void {
  let dir = path.dirname(absPath);
  while (dir !== UPLOAD_DIR && dir !== path.join(UPLOAD_DIR, 'share')) {
    try {
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      else break;
    } catch { break; }
    dir = path.dirname(dir);
  }
}

// ── Integrity check logic ──

export async function runIntegrityCheck(
  userId?: number
): Promise<{ checkId: string; total: number; summary: { missingFiles: number; orphanedFiles: number; sizeMismatches: number } }> {
  const dbFiles = await getFilesForScan(userId);

  const localDbFiles = dbFiles.filter((f) => f.storage_backend !== 'b2');
  const b2DbFiles = dbFiles.filter((f) => f.storage_backend === 'b2');

  const dbByPath = new Map<string, (typeof dbFiles)[0]>();
  for (const f of localDbFiles) dbByPath.set(resolvePath(f.path), f);

  const diskFiles = new Map<string, string>();
  const scanDir = userId
    ? path.join(UPLOAD_DIR, 'share', String(userId))
    : path.join(UPLOAD_DIR, 'share');
  if (fs.existsSync(scanDir)) getAllDiskFiles(scanDir, UPLOAD_DIR, diskFiles);

  const insertRows: (string | number | null)[][] = [];

  // Check local files against disk
  for (const [relPath, dbFile] of dbByPath) {
    const absPath = path.join(UPLOAD_DIR, relPath);
    if (!fs.existsSync(absPath)) {
      insertRows.push(['missing-file', dbFile.id, dbFile.filename, dbFile.original_name, dbFile.user_id, null, dbFile.size, null]);
    } else {
      const diskSize = fs.statSync(absPath).size;
      if (diskSize !== dbFile.size) {
        insertRows.push(['size-mismatch', dbFile.id, dbFile.filename, dbFile.original_name, dbFile.user_id, relPath, dbFile.size, diskSize]);
      }
    }
  }

  // Check B2 files
  if ((await getStorageBackend()) === 'b2' && b2DbFiles.length > 0) {
    const b2 = new B2Storage();
    for (const dbFile of b2DbFiles) {
      try {
        const b2Size = await b2.size(dbFile.path);
        if (b2Size !== dbFile.size) {
          insertRows.push(['size-mismatch', dbFile.id, dbFile.filename, dbFile.original_name, dbFile.user_id, dbFile.path, dbFile.size, b2Size]);
        }
      } catch {
        insertRows.push(['missing-file', dbFile.id, dbFile.filename, dbFile.original_name, dbFile.user_id, null, dbFile.size, null]);
      }
    }
  }

  // Find orphaned files on disk
  for (const [relPath] of diskFiles) {
    if (!dbByPath.has(relPath)) {
      insertRows.push(['orphaned-file', null, null, null, null, relPath, null, null]);
    }
  }

  const checkId = `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const missingFiles = insertRows.filter((r) => r[0] === 'missing-file').length;
  const orphanedFiles = insertRows.filter((r) => r[0] === 'orphaned-file').length;
  const sizeMismatches = insertRows.filter((r) => r[0] === 'size-mismatch').length;

  await insertCheck({ checkId, totalIssues: insertRows.length, missingFiles, orphanedFiles, sizeMismatches });
  await insertIssues(checkId, insertRows);

  return { checkId, total: insertRows.length, summary: { missingFiles, orphanedFiles, sizeMismatches } };
}

// ── Issue resolution ──

export async function resolveSingleIssue(
  checkId: string,
  issueId: number,
  action: string,
  username?: string
): Promise<void> {
  const issue = await findIssue(checkId, issueId);
  if (!issue) throw Object.assign(new Error('Issue not found'), { statusCode: 404 });
  if (issue.resolved) throw Object.assign(new Error('Already resolved'), { statusCode: 409 });

  if (action === 'delete-db' && issue.file_id) {
    const row = await getFileRow(issue.file_id);
    await deleteFileRow(issue.file_id);
    if (username && row) {
      await recordAction(username, 'delete-db', `Deleted file row #${issue.file_id}`, row as Record<string, unknown>);
    }
  } else if (action === 'delete-file' && issue.disk_path) {
    await deleteFromStorage(issue.disk_path);
    const absPath = path.join(UPLOAD_DIR, issue.disk_path);
    if (fs.existsSync(absPath)) cleanEmptyDirs(absPath);
    if (username) {
      await recordAction(username, 'delete-file', `Deleted file: ${issue.disk_path}`, { diskPath: issue.disk_path });
    }
  }

  await markIssueResolved(issueId, action);
}

// ── Import orphaned files ──

export async function importOrphanedFiles(
  checkId: string,
  issueIds: number[],
  username?: string,
  userId?: number,
  originalName?: string
): Promise<{ issueId: number; fileId: number }[]> {
  const imported: { issueId: number; fileId: number }[] = [];

  for (const issueId of issueIds) {
    const issue = await findOrphanedIssue(checkId, issueId);
    if (!issue || issue.resolved) continue;

    const absPath = path.join(UPLOAD_DIR, issue.disk_path);
    if (!fs.existsSync(absPath)) continue;

    const stat = fs.statSync(absPath);
    const diskName = path.basename(issue.disk_path);
    const ext = path.extname(diskName);
    const base = path.basename(diskName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const filename = `${base}-${Date.now().toString(36)}${ext}`;
    const resolvedUserId = userId ?? extractUserIdFromPath(issue.disk_path);
    const nameForDb = originalName || diskName;

    const fileId = await insertFile({
      filename,
      originalName: nameForDb,
      storageKey: absPath,
      size: stat.size,
      mimeType: getMimeType(diskName),
      userId: resolvedUserId ?? null,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      backend: 'local',
    });

    await markIssueResolved(issueId, 'imported');
    imported.push({ issueId, fileId });

    if (username) {
      await recordAction(username, 'import', `Imported orphaned file: ${diskName} (new ID #${fileId})`, {
        fileId, filename, originalName: nameForDb,
      });
    }
  }

  return imported;
}

// ── Migration ──

/** Migrate a single file from one user to another on disk + in DB. */
export async function migrateFile(
  relPath: string,
  toUserId: number,
  username?: string
): Promise<string> {
  const absSrc = path.join(UPLOAD_DIR, relPath);
  if (!fs.existsSync(absSrc)) throw new Error('File not found');

  const fromUserId = extractUserIdFromPath(relPath);
  if (fromUserId === null) throw new Error('Could not determine source user');
  if (fromUserId === toUserId) throw new Error('Already belongs to target user');

  const parts = relPath.split(path.sep);
  parts[0] = String(toUserId);
  const destRel = parts.join(path.sep);
  const absDest = path.join(UPLOAD_DIR, destRel);

  const destDir = path.dirname(absDest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  fs.renameSync(absSrc, absDest);
  await updateFilePathAndUser(absSrc, absDest, toUserId);

  if (username) {
    await recordAction(username, 'migrate', `Migrated file: ${relPath} → user #${toUserId}`, {
      fromPath: absSrc, toPath: absDest, fromUserId,
    });
  }

  return `${relPath} → ${destRel}`;
}
