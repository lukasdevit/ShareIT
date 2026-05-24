import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const PORT = Number(process.env.PORT || 3000);
export const BASE_URL = process.env.BASE_URL || `https://localhost:${PORT}`;
export const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
export const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,text/plain,application/zip,application/x-tar")
  .split(",")
  .map((t) => t.trim());

export const RATE_LIMIT = {
  max: Number(process.env.RATE_LIMIT_MAX || 10),
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), // 1 minute
};