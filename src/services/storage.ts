import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { UPLOAD_DIR, B2_ENABLED, B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_PREFIX } from "../config/index.js";

/* ── Interface ── */

export interface StorageProvider {
  /** Save stream at key, return size in bytes */
  save(key: string, stream: NodeJS.ReadableStream): Promise<number>;
  /** Stream file back */
  createReadStream(key: string): Promise<NodeJS.ReadableStream>;
  /** Get file size */
  size(key: string): Promise<number>;
  /** Delete file */
  delete(key: string): Promise<void>;
  /** Does file exist? */
  exists(key: string): Promise<boolean>;
}

/* ── Local filesystem ── */

class LocalStorage implements StorageProvider {
  private resolve(key: string) {
    // Handle legacy absolute paths
    if (path.isAbsolute(key) && key.startsWith(UPLOAD_DIR)) return key;
    return path.join(UPLOAD_DIR, key);
  }

  async save(key: string, stream: NodeJS.ReadableStream): Promise<number> {
    const filepath = this.resolve(key);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await pipeline(stream, fs.createWriteStream(filepath));
    return fs.statSync(filepath).size;
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const filepath = this.resolve(key);
    return fs.createReadStream(filepath);
  }

  async size(key: string): Promise<number> {
    return fs.statSync(this.resolve(key)).size;
  }

  async delete(key: string): Promise<void> {
    try { fs.unlinkSync(this.resolve(key)); } catch { /* gone */ }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolve(key));
  }
}

/* ── Backblaze B2 (S3-compatible) ── */

class B2Storage implements StorageProvider {
  private s3: S3Client;

  constructor() {
    const endpoint = B2_ENDPOINT.startsWith("http") ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;
    this.s3 = new S3Client({
      endpoint,
      region: B2_REGION,
      credentials: {
        accessKeyId: B2_KEY_ID!,
        secretAccessKey: B2_APP_KEY!,
      },
      forcePathStyle: true,
    });
  }

  async save(key: string, stream: NodeJS.ReadableStream): Promise<number> {
    // Use multipart upload — streams directly, no memory buffering
    const upload = new Upload({
      client: this.s3,
      params: { Bucket: B2_BUCKET, Key: key, Body: stream as Readable },
    });
    // Track bytes as they upload for quota enforcement
    let uploadedBytes = 0;
    upload.on("httpUploadProgress", (progress) => {
      if (progress.loaded) uploadedBytes = progress.loaded;
    });
    await upload.done();
    return uploadedBytes;
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const { Body } = await this.s3.send(new GetObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
    }));
    // Body is a Readable stream in v3
    return Body as NodeJS.ReadableStream;
  }

  async size(key: string): Promise<number> {
    const { ContentLength } = await this.s3.send(new HeadObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
    }));
    return ContentLength ?? 0;
  }

  async delete(key: string): Promise<void> {
    let versionId: string | undefined;
    try {
      const head = await this.s3.send(new HeadObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
      }));
      if (head.VersionId && head.VersionId !== "null") {
        versionId = head.VersionId;
      }
    } catch { /* gone already */ }

    await this.s3.send(new DeleteObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ...(versionId ? { VersionId: versionId } : {}),
    }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.size(key);
      return true;
    } catch {
      return false;
    }
  }
}

/* ── Singleton ── */

let _storage: StorageProvider;

export function getStorage(): StorageProvider {
  if (!_storage) {
    _storage = B2_ENABLED ? new B2Storage() : new LocalStorage();
    console.log(`Storage: ${B2_ENABLED ? "Backblaze B2" : "local filesystem"}`);
  }
  return _storage;
}

/* ── Helpers ── */

export function buildStorageKey(userId: number, filename: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const base = `${userId}/${yyyy}/${mm}/${dd}/${filename}`;
  return B2_PREFIX ? `${B2_PREFIX.replace(/\/$/, "")}/${base}` : base;
}
