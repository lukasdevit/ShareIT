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
  max: Number(process.env.RATE_LIMIT_MAX || 10),
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), // 1 minute
};