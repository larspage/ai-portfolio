import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageClient, getBucket } from './client';

const DEFAULT_UPLOAD_EXPIRY = 900; // 15 minutes
const DEFAULT_DOWNLOAD_EXPIRY = 3600; // 1 hour

/**
 * Generate a presigned URL for uploading a file to DO Spaces.
 * The URL is time-limited (default 15 min) and allows PUT requests.
 *
 * @param key - Storage key (e.g., `tenants/{tenantId}/resumes/{uuid}.pdf`)
 * @param contentType - MIME type of the file being uploaded
 * @param expiresIn - Seconds until URL expiry
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = DEFAULT_UPLOAD_EXPIRY
): Promise<string> {
  const client = getStorageClient();
  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for reading/downloading a file from DO Spaces.
 * The URL is time-limited (default 1 hour).
 *
 * @param key - Storage key to read
 * @param expiresIn - Seconds until URL expiry
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = DEFAULT_DOWNLOAD_EXPIRY
): Promise<string> {
  const client = getStorageClient();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete an object from DO Spaces.
 *
 * @param key - Storage key to delete
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getStorageClient();
  const bucket = getBucket();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Build a tenant-scoped storage key.
 * Ensures all files for a tenant are stored under their prefix.
 *
 * @param tenantId - UUID of the tenant
 * @param type - Document type (e.g., 'resumes', 'logos')
 * @param filename - Original filename or UUID-based name
 */
export function buildTenantKey(tenantId: string, type: string, filename: string): string {
  return `tenants/${tenantId}/${type}/${filename}`;
}
