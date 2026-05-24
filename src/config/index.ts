import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const PORT = Number(process.env.PORT || 3000);
export const BASE_URL = process.env.BASE_URL || `https://localhost:${PORT}`;
export const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");