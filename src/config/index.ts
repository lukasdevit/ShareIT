import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const PORT = Number(process.env.PORT || 3000);
export const BASE_URL = process.env.BASE_URL || `https://localhost:${PORT}`;
export const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
export const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || [
  // Images
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  // Documents
  "application/pdf", "application/json", "text/plain", "text/csv",
  "text/markdown", "text/html", "text/css", "text/xml", "application/xml",
  // Code
  "text/javascript", "application/javascript", "text/typescript",
  "text/x-python", "text/x-java", "text/x-c", "text/x-c++",
  "text/x-shellscript", "text/x-yaml", "application/x-yaml",
  "application/x-tar", "application/zip", "application/gzip",
  // Archives
  "application/x-7z-compressed", "application/x-rar-compressed",
].join(","))
  .split(",")
  .map((t) => t.trim());

export const RATE_LIMIT = {
  max: Number(process.env.RATE_LIMIT_MAX || 1000),
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), // 1 minute
};

// ── Backblaze B2 (S3-compatible) ──
export const B2_ENABLED = process.env.B2_ENABLED === "true";
export const B2_ENDPOINT = process.env.B2_ENDPOINT || "";
export const B2_REGION = process.env.B2_REGION || "us-west-004";
export const B2_KEY_ID = process.env.B2_KEY_ID || "";
export const B2_APP_KEY = process.env.B2_APP_KEY || "";
export const B2_BUCKET = process.env.B2_BUCKET || "";
export const B2_PREFIX_SHAREX = process.env.B2_PREFIX_SHAREX || "ShareIt/uploads/";