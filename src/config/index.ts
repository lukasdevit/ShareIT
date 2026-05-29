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
export const LOCKOUT_MINUTES = 15;

// ── Storage ──
export const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB

// ── Demo users ──
export const DEMO_STORAGE_LIMIT = 100 * 1024 * 1024; // 100 MB
export const DEMO_CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const DEMO_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// ── File serving ──
export const FILE_CACHE_MAX_AGE = 31536000; // 1 year

// ── Allowed upload MIME types ──
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/css',
  'text/xml',
  'application/xml',
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/x-python',
  'text/x-java',
  'text/x-c',
  'text/x-c++',
  'text/x-shellscript',
  'text/x-yaml',
  'application/x-yaml',
  'application/x-tar',
  'application/zip',
  'application/gzip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/octet-stream',
  'application/x-msdownload',
  'application/x-msdos-program',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
];

// ── Backblaze B2 ──
export const B2_ENABLED = process.env.B2_ENABLED === 'true';
export const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
export const B2_REGION = process.env.B2_REGION || 'us-west-004';
export const B2_KEY_ID = process.env.B2_KEY_ID || '';
export const B2_APP_KEY = process.env.B2_APP_KEY || '';
export const B2_BUCKET = process.env.B2_BUCKET || '';
export const B2_PREFIX = process.env.B2_PREFIX || 'Share/uploads/';

// ── Database ──
export const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), 'database.db');

// ── DB Backups ──
export const BACKUP_SCHEDULE_HOURS =
  parseInt(process.env.BACKUP_SCHEDULE_HOURS || '6', 10) || 6;
export const BACKUP_RETRY_MAX = 3;
export const BACKUP_RETRY_BASE_MS = 1000;
