import { dbAll, dbGet, dbRun } from '../db/index.js';

// ── Types ──

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  is_admin: number;
  is_demo: number;
  storage_limit: number;
  failed_logins: number;
  locked_until: string | null;
  created_at: string;
}

export interface UserLoginRow {
  id: number;
  username: string;
  password_hash: string;
  is_admin: number;
  failed_logins: number;
  locked_until: string | null;
}

export interface UserStatsRow {
  id: number;
  username: string;
  created_at: string;
  storage_limit: number;
  is_admin: number;
  used: number | null;
  file_count: number | null;
}

// ── Queries ──

/** Find a user by username (for login). */
export async function findByUsername(username: string): Promise<UserLoginRow | undefined> {
  return dbGet<UserLoginRow>(
    `SELECT id, username, password_hash, is_admin, failed_logins, locked_until
     FROM users WHERE username = ?`,
    [username]
  );
}

/** Find a user by ID. */
export async function findById(id: number): Promise<UserRow | undefined> {
  return dbGet<UserRow>(`SELECT * FROM users WHERE id = ?`, [id]);
}

/** Insert a new user. Returns the new row ID. */
export async function insertUser(params: {
  username: string;
  passwordHash: string;
  storageLimit: number;
  isAdmin?: boolean;
  isDemo?: boolean;
}): Promise<number> {
  const r = await dbRun(
    `INSERT INTO users (username, password_hash, created_at, is_admin, storage_limit, is_demo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.username,
      params.passwordHash,
      new Date().toISOString(),
      params.isAdmin ? 1 : 0,
      params.storageLimit,
      params.isDemo ? 1 : 0,
    ]
  );
  return r.lastID;
}

/** Update a user's password hash. */
export async function updatePassword(id: number, hash: string): Promise<void> {
  await dbRun(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, id]);
}

/** Update failed login counters and lockout. */
export async function updateFailedLogins(
  id: number,
  count: number,
  lockedUntil: string | null
): Promise<void> {
  await dbRun(
    `UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?`,
    [count, lockedUntil, id]
  );
}

/** Reset failed login counters after successful login. */
export async function resetFailedLogins(id: number): Promise<void> {
  await dbRun(
    `UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?`,
    [id]
  );
}

/** Get a user's storage limit. */
export async function getStorageLimit(id: number): Promise<number> {
  const row = await dbGet<{ storage_limit: number }>(
    `SELECT storage_limit FROM users WHERE id = ?`,
    [id]
  );
  return row?.storage_limit ?? 0;
}

/** Count demo users created since a given timestamp (for rate limiting). */
export async function countDemoUsersSince(cutoff: string): Promise<number> {
  const row = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM users WHERE is_demo = 1 AND created_at > ?`,
    [cutoff]
  );
  return row?.cnt ?? 0;
}

/** Delete a user by ID. */
export async function deleteUser(id: number): Promise<number> {
  const r = await dbRun(`DELETE FROM users WHERE id = ?`, [id]);
  return r.changes;
}

/** Delete a demo user by ID (safety: only deletes if is_demo=1). */
export async function deleteDemoUser(id: number): Promise<number> {
  const r = await dbRun(`DELETE FROM users WHERE id = ? AND is_demo = 1`, [id]);
  return r.changes;
}

/** Find stale demo users older than a cutoff. */
export async function findStaleDemoUsers(cutoff: string): Promise<{ id: number }[]> {
  return dbAll<{ id: number }>(
    `SELECT id FROM users WHERE is_demo = 1 AND created_at < ?`,
    [cutoff]
  );
}

/** Count total users. */
export async function countUsers(): Promise<number> {
  const row = await dbGet<{ users: number }>(
    `SELECT COUNT(*) AS users FROM users`
  );
  return row?.users ?? 0;
}

/** Count users with optional username filter. */
export async function countUsersFiltered(search?: string): Promise<number> {
  const filter = search ? `WHERE u.username LIKE ?` : '';
  const params = search ? [`%${search}%`] : [];
  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(*) AS total FROM users u ${filter}`,
    params
  );
  return row?.total ?? 0;
}

/** List users with file stats, paginated, optionally filtered. */
export async function listUsersWithStats(
  limit: number,
  offset: number,
  search?: string
): Promise<UserStatsRow[]> {
  const filter = search ? `WHERE u.username LIKE ?` : '';
  const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
  return dbAll<UserStatsRow>(
    `SELECT u.id, u.username, u.created_at, u.storage_limit, u.is_admin,
            COALESCE(SUM(f.size), 0) AS used, COUNT(f.id) AS file_count
     FROM users u LEFT JOIN files f ON f.user_id = u.id ${filter}
     GROUP BY u.id ORDER BY u.id LIMIT ? OFFSET ?`,
    params
  );
}

/** Update user fields (storage_limit, is_admin, password_hash). */
export async function updateUser(
  id: number,
  updates: { storageLimit?: number; isAdmin?: boolean; passwordHash?: string }
): Promise<number> {
  const sets: string[] = [];
  const values: (number | string)[] = [];

  if (updates.storageLimit !== undefined) {
    sets.push('storage_limit = ?');
    values.push(updates.storageLimit);
  }
  if (updates.isAdmin !== undefined) {
    sets.push('is_admin = ?');
    values.push(updates.isAdmin ? 1 : 0);
  }
  if (updates.passwordHash !== undefined) {
    sets.push('password_hash = ?');
    values.push(updates.passwordHash);
  }

  if (sets.length === 0) return 0;

  values.push(id);
  const r = await dbRun(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
  return r.changes;
}

/** Unlock a user (reset failed_logins and locked_until). */
export async function unlockUser(id: number): Promise<number> {
  const r = await dbRun(
    `UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?`,
    [id]
  );
  return r.changes;
}

/** Find a user ID by username (for integrity lookups, etc.). */
export async function findIdByUsername(username: string): Promise<number | null> {
  const row = await dbGet<{ id: number }>(
    `SELECT id FROM users WHERE username = ?`,
    [username]
  );
  return row?.id ?? null;
}
