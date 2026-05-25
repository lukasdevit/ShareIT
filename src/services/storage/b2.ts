import { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APP_KEY, B2_BUCKET } from "../../config/index.js";
import type { StorageProvider } from "./types.js";

export class B2Storage implements StorageProvider {
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
    const upload = new Upload({
      client: this.s3,
      params: { Bucket: B2_BUCKET, Key: key, Body: stream as Readable },
    });

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
    } catch { /* already gone */ }

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
