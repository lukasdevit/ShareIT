import path from 'path';

import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { requireAuth } from '../../middleware/index.js';
import { getS3Client } from '../../services/storage/s3-client.js';
import { sanitizeFilename, validateFile } from '../../services/fileService.js';
import { B2_BUCKET } from '../../config/index.js';
import { dbRun } from '../../db/index.js';

const PRESIGN_EXPIRY_SECONDS = 3600; // 1 hour per part URL

export async function s3UploadRoutes(app: FastifyInstance) {
  /**
   * POST /upload/s3/multipart
   * Initiate a multipart upload. Returns uploadId and key.
   */
  app.post(
    '/upload/s3/multipart',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = request.body as {
        filename: string;
        mimeType: string;
        expiresInDays?: number;
      };

      if (!body.filename || !body.mimeType) {
        return reply.code(400).send({ error: 'filename and mimeType required' });
      }

      const originalName = sanitizeFilename(body.filename);
      const validationError = validateFile(body.mimeType, originalName);
      if (validationError) {
        return reply.code(415).send({ error: validationError });
      }

      const id = nanoid(10);
      const ext = path.extname(originalName);
      const key = `share/${request.user!.id}/${id}${ext}`;

      const s3 = getS3Client();
      const createCmd = new CreateMultipartUploadCommand({
        Bucket: B2_BUCKET,
        Key: key,
        ContentType: body.mimeType,
      });

      const { UploadId } = await s3.send(createCmd);

      return reply.send({
        data: {
          uploadId: UploadId,
          key,
          filename: `${id}${ext}`,
        },
      });
    }
  );

  /**
   * GET /upload/s3/multipart/:key/:uploadId/:partNumber
   * Returns a presigned URL for uploading a single part.
   */
  app.get(
    '/upload/s3/multipart/:key/:uploadId/:partNumber',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { key, uploadId, partNumber } = request.params as {
        key: string;
        uploadId: string;
        partNumber: string;
      };

      const s3 = getS3Client();
      const cmd = new UploadPartCommand({
        Bucket: B2_BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: parseInt(partNumber, 10),
      });

      const url = await getSignedUrl(s3, cmd, {
        expiresIn: PRESIGN_EXPIRY_SECONDS,
      });

      return reply.send({ data: { url } });
    }
  );

  /**
   * POST /upload/s3/multipart/:key/:uploadId/complete
   * Complete the multipart upload and create the DB record.
   */
  app.post(
    '/upload/s3/multipart/:key/:uploadId/complete',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { key, uploadId } = request.params as {
        key: string;
        uploadId: string;
      };

      const body = request.body as {
        parts: { PartNumber: number; ETag: string }[];
        originalName: string;
        mimeType: string;
        size: number;
        expiresInDays?: number;
      };

      if (!body.parts || !Array.isArray(body.parts)) {
        return reply.code(400).send({ error: 'parts array required' });
      }

      const s3 = getS3Client();
      const cmd = new CompleteMultipartUploadCommand({
        Bucket: B2_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: body.parts.map((p) => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
          })),
        },
      });

      try {
        await s3.send(cmd);
      } catch (err) {
        return reply.code(500).send({
          error: `Failed to complete upload: ${(err as Error).message}`,
        });
      }

      // Create DB record
      const filename = path.basename(key);
      const expiresAt = body.expiresInDays
        ? new Date(
            Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

      await dbRun(
        `INSERT INTO files (filename, original_name, path, size, mime_type, user_id, created_at, expires_at, storage_backend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          filename,
          sanitizeFilename(body.originalName || filename),
          key,
          body.size || 0,
          body.mimeType || 'application/octet-stream',
          request.user!.id,
          new Date().toISOString(),
          expiresAt,
          'b2',
        ]
      );

      return reply.send({
        data: {
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/file/${filename}`,
          key,
        },
      });
    }
  );

  /**
   * DELETE /upload/s3/multipart/:key/:uploadId
   * Abort an in-progress multipart upload.
   */
  app.delete(
    '/upload/s3/multipart/:key/:uploadId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { key, uploadId } = request.params as {
        key: string;
        uploadId: string;
      };

      const s3 = getS3Client();
      const cmd = new AbortMultipartUploadCommand({
        Bucket: B2_BUCKET,
        Key: key,
        UploadId: uploadId,
      });

      await s3.send(cmd);
      return reply.send({ data: { aborted: true } });
    }
  );
}
