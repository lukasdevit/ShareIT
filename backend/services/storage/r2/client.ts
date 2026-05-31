import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';
import { getStorageSetting } from '../../../config/index.js';

/** Admin-configurable setting keys for this provider (prefixed). */
export const R2_SETTING_KEYS = ['r2_endpoint', 'r2_region', 'r2_bucket', 'r2_access_key', 'r2_secret_key'] as const;

// R2 defaults — only used when no DB/env override
const DEFAULTS = {
  endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'my-bucket-name',
} as const;

let _s3Client: S3Client | null = null;

export async function getS3Client(): Promise<S3Client> {
  if (!_s3Client) {
    const [endpoint, region, accessKey, secretKey] = await Promise.all([
      getStorageSetting('endpoint'),
      getStorageSetting('region'),
      getStorageSetting('access_key'),
      getStorageSetting('secret_key'),
    ]);

    if (!accessKey || !secretKey) {
      throw new Error('R2 credentials not configured — access_key and secret_key required');
    }

    const resolvedEndpoint = endpoint || DEFAULTS.endpoint;
    const url = resolvedEndpoint.startsWith('http')
      ? resolvedEndpoint
      : `https://${resolvedEndpoint}`;

    const config: S3ClientConfig = {
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
      requestHandler: new NodeHttpHandler({
        httpsAgent: new https.Agent({ minVersion: 'TLSv1.2' }),
      }),
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };
    config.region = region || DEFAULTS.region;
    config.endpoint = url;

    _s3Client = new S3Client(config);
  }
  return _s3Client;
}

/** Get the bucket name, respecting admin panel override */
let _cachedBucket: string | null = null;

export async function getBucket(): Promise<string> {
  if (_cachedBucket) return _cachedBucket;
  const bucket = await getStorageSetting('bucket');
  _cachedBucket = bucket || DEFAULTS.bucket;
  return _cachedBucket;
}

/** Clear cached client + bucket — used when admin updates settings */
export function clearR2Cache(): void {
  _s3Client?.destroy();
  _s3Client = null;
  _cachedBucket = null;
}
