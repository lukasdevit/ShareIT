import { Readable } from 'stream';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { B2_BUCKET } from '../../config/index.js';
import { getS3Client } from './s3-client.js';
import type { StorageProvider } from './types.js';

export class B2Storage implements StorageProvider {
  private s3 = getS3Client();

  async save(key: string, stream: NodeJS.ReadableStream): Promise<number> {
    const upload = new Upload({
      client: this.s3,
      params: { Bucket: B2_BUCKET, Key: key, Body: stream as Readable },
    });

    let uploadedBytes = 0;
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded) uploadedBytes = progress.loaded;
    });

    await upload.done();
    return uploadedBytes;
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const { Body } = await this.s3.send(
      new GetObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
      })
    );
    return Body as NodeJS.ReadableStream;
  }

  async size(key: string): Promise<number> {
    const { ContentLength } = await this.s3.send(
      new HeadObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
      })
    );
    return ContentLength ?? 0;
  }

  async delete(key: string): Promise<void> {
    let versionId: string | undefined;
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET,
          Key: key,
        })
      );
      if (head.VersionId && head.VersionId !== 'null') {
        versionId = head.VersionId;
      }
    } catch {
      /* already gone */
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: B2_BUCKET,
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
