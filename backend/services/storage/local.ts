import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { DEFAULT_UPLOAD_DIR } from '../../config/index.js';
import type { StorageProvider } from './types.js';

export class LocalStorage implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || DEFAULT_UPLOAD_DIR;
  }

  private resolve(key: string): string {
    if (path.isAbsolute(key) && key.startsWith(this.baseDir)) return key;
    return path.join(this.baseDir, key);
  }

  async save(key: string, stream: NodeJS.ReadableStream): Promise<number> {
    const filepath = this.resolve(key);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await pipeline(stream, fs.createWriteStream(filepath));
    return fs.statSync(filepath).size;
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    return fs.createReadStream(this.resolve(key));
  }

  async createReadStreamRange(
    key: string,
    start?: number,
    end?: number
  ): Promise<NodeJS.ReadableStream> {
    return fs.createReadStream(this.resolve(key), { start, end });
  }

  async size(key: string): Promise<number> {
    return fs.statSync(this.resolve(key)).size;
  }

  async delete(key: string): Promise<void> {
    try {
      fs.unlinkSync(this.resolve(key));
    } catch {
      /* already gone */
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolve(key));
  }
}
