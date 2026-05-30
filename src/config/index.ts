import path from 'path';

function envOrCrash(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`${key} is required. Set it in .env`);
  return val;
}

// ── Server ──
export const PORT = 3000;
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
export const LOG_PRETTY = process.env.LOG_PRETTY === 'true';
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
export const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
export const DOMAIN = process.env.DOMAIN || 'localhost';

// ── Auth ──
export const JWT_SECRET = envOrCrash('JWT_SECRET');
export const JWT_EXPIRES_IN = '7d';

// ── Admin seed ──
export const ADMIN_USERNAME = envOrCrash('ADMIN_USERNAME');
export const ADMIN_PASSWORD = envOrCrash('ADMIN_PASSWORD');

// ── Rate limits ──
export const RATE_LIMIT_MAX = 300;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const AUTH_LOGIN_LIMIT = 5;
export const AUTH_REGISTER_LIMIT = 3;
export const AUTH_RATE_WINDOW_MS = 60_000;

// ── Login lockout ──
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 1;

// ── Storage ──
export const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB per user
export async function getTotalStorageLimit(): Promise<number> {
  const db = await loadDbSettings();
  const raw = db['total_storage_limit'] || '0';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; // 0 = unlimited
}

// ── Demo users ──
export const DEMO_STORAGE_LIMIT = 100 * 1024 * 1024; // 100 MB
export const DEMO_CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const DEMO_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
export const DEMO_GLOBAL_RATE_LIMIT = 10; // max demo creations per minute (global)
export const DEMO_IP_RATE_LIMIT = 2; // max demo creations per minute per IP
export const DEMO_RATE_WINDOW_MS = 60_000; // 1 minute

// Lazy-loaded from DB (admin panel overrides)
let _dbSettings: Record<string, string> | null = null;

async function loadDbSettings(): Promise<Record<string, string>> {
  if (_dbSettings) return _dbSettings;
  try {
    const { dbAll } = await import('../db/index.js');
    const rows = await dbAll<{ key: string; value: string }>(
      `SELECT key, value FROM settings`
    );
    _dbSettings = {};
    for (const r of rows) _dbSettings[r.key] = r.value;
  } catch {
    _dbSettings = {};
  }
  return _dbSettings;
}

/** Clear cached DB settings — call after admin config changes */
export function clearConfigCache(): void {
  _dbSettings = null;
}

function dbOrEnv(key: string, envFallback: string, db: Record<string, string>): string {
  return db[key] || envFallback;
}

export async function isB2Enabled(): Promise<boolean> {
  const db = await loadDbSettings();
  return db.backend === 'b2';
}

export async function getB2Endpoint(): Promise<string> {
  return dbOrEnv('b2_endpoint', process.env.B2_ENDPOINT || '	https://s3.eu-central-003.backblazeb2.com', await loadDbSettings());
}
export async function getB2Region(): Promise<string> {
  return dbOrEnv('b2_region', process.env.B2_REGION || 'eu-central-003', await loadDbSettings());
}
export async function getB2Bucket(): Promise<string> {
  return dbOrEnv('b2_bucket', process.env.B2_BUCKET || 'my-bucket-name', await loadDbSettings());
}
export async function getB2Prefix(): Promise<string> {
  return dbOrEnv('b2_prefix', process.env.B2_PREFIX || 'shareit/storage/', await loadDbSettings());
}
export async function getB2KeyId(): Promise<string> {
  return dbOrEnv('b2_key_id', process.env.B2_KEY_ID || 'keyid', await loadDbSettings());
}
export async function getB2AppKey(): Promise<string> {
  return dbOrEnv('b2_app_key', process.env.B2_APP_KEY || 'appkey', await loadDbSettings());
}

// Direct env access for display/fallback
// B2_ENABLED env var is deprecated — use admin panel backend setting instead
export const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
export const B2_REGION = process.env.B2_REGION || 'us-west-004';
export const B2_BUCKET = process.env.B2_BUCKET || '';
export const B2_PREFIX = process.env.B2_PREFIX || 'shareit/storage/';

// ── Database ──
export const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), 'database.db');

// ── DB Backups ──
export async function getBackupScheduleHours(): Promise<number> {
  const db = await loadDbSettings();
  const raw = db['backup_schedule_hours'] || '6';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
}
export const BACKUP_RETRY_MAX = 3;
export const BACKUP_RETRY_BASE_MS = 1000;
