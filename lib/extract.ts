/**
 * Text extraction from resume files (PDF, DOCX, TXT).
 * Downloads from DO Spaces and extracts plain text.
 */

import { getPresignedDownloadUrl } from './storage/presigned';

/**
 * Extract text from a file stored in DO Spaces.
 *
 * @param fileKey - Storage key of the file
 * @param contentType - MIME type of the file
 * @returns Extracted plain text
 */
export async function extractTextFromStorage(
  fileKey: string,
  contentType: string
): Promise<string> {
  // Get a presigned download URL (1 hour expiry)
  const downloadUrl = await getPresignedDownloadUrl(fileKey, 3600);

  // Download the file
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return extractText(buffer, contentType);
}

/**
 * Extract text from a buffer based on content type.
 */
export async function extractText(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  switch (contentType) {
    case 'application/pdf':
      return extractFromPdf(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return extractFromDocx(buffer);

    case 'text/plain':
    case 'text/markdown':
      return buffer.toString('utf-8');

    default:
      // Try as PDF first, then fall back to plain text
      try {
        return await extractFromPdf(buffer);
      } catch {
        return buffer.toString('utf-8');
      }
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
