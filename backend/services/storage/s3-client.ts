import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import {
  getB2Endpoint,
  getB2Region,
  getB2Bucket,
  getB2KeyId,
  getB2AppKey,
} from '../../config/index.js';

let _s3Client: S3Client | null = null;

export async function getS3Client(): Promise<S3Client> {
  if (!_s3Client) {
    const [endpoint, region, keyId, appKey] = await Promise.all([
      getB2Endpoint(), getB2Region(), getB2KeyId(), getB2AppKey()
    ]);
    const url = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
    _s3Client = new S3Client({
      endpoint: url,
      region,
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: appKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return _s3Client;
}

/** Get the bucket name, respecting admin panel override */
let _cachedBucket: string | null = null;
export async function getBucket(): Promise<string> {
  if (!_cachedBucket) _cachedBucket = await getB2Bucket();
  return _cachedBucket;
}

/**
 * Ensure CORS is configured on the B2 bucket so browsers can PUT parts directly
 * via presigned URLs. Runs once at startup, safe to call multiple times.
 */
export async function ensureBucketCors(): Promise<void> {
  try {
    const s3 = await getS3Client();
    const bucket = await getBucket();
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['PUT', 'GET', 'HEAD', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.warn('B2 CORS configuration applied');
  } catch (err) {
    console.warn('Failed to configure B2 CORS:', (err as Error).message);
  }
}
