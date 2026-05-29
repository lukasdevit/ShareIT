import { S3Client } from '@aws-sdk/client-s3';
import {
  B2_ENDPOINT,
  B2_REGION,
  B2_KEY_ID,
  B2_APP_KEY,
} from '../../config/index.js';

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const endpoint = B2_ENDPOINT.startsWith('http')
      ? B2_ENDPOINT
      : `https://${B2_ENDPOINT}`;
    _s3Client = new S3Client({
      endpoint,
      region: B2_REGION,
      credentials: {
        accessKeyId: B2_KEY_ID!,
        secretAccessKey: B2_APP_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return _s3Client;
}
