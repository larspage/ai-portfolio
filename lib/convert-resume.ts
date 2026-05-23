import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mammoth from 'mammoth';

export type ConvertResult = {
  markdown: string;
  format: 'docx' | 'pdf' | 'md' | 'txt';
};

const SUPPORTED = ['.docx', '.pdf', '.md', '.txt', '.markdown'];

/**
 * Convert an uploaded resume file to markdown text.
 */
export async function convertToMarkdown(filePath: string, originalName: string): Promise<ConvertResult> {
  const ext = path.extname(originalName).toLowerCase();

  if (!SUPPORTED.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Supported: ${SUPPORTED.join(', ')}`);
  }

  switch (ext) {
    case '.docx':
      return convertDocx(filePath);
    case '.pdf':
      return convertPdf(filePath);
    case '.md':
    case '.markdown':
    case '.txt':
      return convertText(filePath, ext);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function convertDocx(filePath: string): Promise<ConvertResult> {
  const buffer = fs.readFileSync(filePath);
  const m = mammoth as unknown as { convertToMarkdown: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await m.convertToMarkdown({ buffer });
  return { markdown: result.value.trim(), format: 'docx' };
}

function convertPdf(filePath: string): ConvertResult {
  const text = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf8' });
  return { markdown: text.trim(), format: 'pdf' };
}

function convertText(filePath: string, ext: string): ConvertResult {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  return { markdown: content, format: ext === '.txt' ? 'txt' : 'md' };
}

/**
 * Detect the format from a filename.
 */
export function detectFormat(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED.includes(ext) ? ext.slice(1) : null;
}
