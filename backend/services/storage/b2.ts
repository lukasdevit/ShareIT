import { Readable } from 'stream';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getS3Client, getBucket } from './s3-client.js';
import type { StorageProvider } from './types.js';

export class B2Storage implements StorageProvider {
  private s3Promise: ReturnType<typeof getS3Client> | null = null;

  private async s3() {
    if (!this.s3Promise) this.s3Promise = getS3Client();
    return this.s3Promise;
  }

  async save(key: string, stream: NodeJS.ReadableStream): Promise<number> {
    const [client, bucket] = await Promise.all([this.s3(), getBucket()]);
    const upload = new Upload({
      client,
      params: { Bucket: bucket, Key: key, Body: stream as Readable },
    });

    let uploadedBytes = 0;
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded) uploadedBytes = progress.loaded;
    });

    await upload.done();
    return uploadedBytes;
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const [client, bucket] = await Promise.all([this.s3(), getBucket()]);
    const { Body } = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    return Body as NodeJS.ReadableStream;
  }

  async size(key: string): Promise<number> {
    const [client, bucket] = await Promise.all([this.s3(), getBucket()]);
    const { ContentLength } = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return ContentLength ?? 0;
  }

  async delete(key: string): Promise<void> {
    const [client, bucket] = await Promise.all([this.s3(), getBucket()]);
    let versionId: string | undefined;
    try {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
      if (head.VersionId && head.VersionId !== 'null') {
        versionId = head.VersionId;
      }
    } catch {
      /* already gone */
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(versionId ? { VersionId: versionId } : {}),
      })
    );
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
