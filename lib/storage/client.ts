import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const region = process.env.DO_SPACES_REGION || 'nyc3';
const bucket = process.env.DO_SPACES_BUCKET;

if (!bucket) {
  console.warn('DO_SPACES_BUCKET not configured — file upload will fail');
}

let client: S3Client | null = null;

/**
 * Get or create the S3 client configured for DigitalOcean Spaces.
 * Lazy-initialized singleton.
 */
export function getStorageClient(): S3Client {
  if (!client) {
    const key = process.env.DO_SPACES_KEY;
    const secret = process.env.DO_SPACES_SECRET;

    if (!key || !secret) {
      throw new Error('DO_SPACES_KEY and DO_SPACES_SECRET must be configured');
    }

    client = new S3Client({
      endpoint: `https://${endpoint}`,
      region,
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
      },
      forcePathStyle: false, // DO Spaces uses virtual-hosted-style
    });
  }
  return client;
}

/**
 * Reset the client (useful for testing or config changes).
 */
export function resetStorageClient(): void {
  client = null;
}

/**
 * Get the configured bucket name.
 */
export function getBucket(): string {
  const b = process.env.DO_SPACES_BUCKET;
  if (!b) {
    throw new Error('DO_SPACES_BUCKET is not configured');
  }
  return b;
}

export { S3Client };
