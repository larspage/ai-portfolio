import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache');

interface CacheEntry {
  content: string;
  timestamp: number;
  fileHash: string;
}

function ensureCacheDirectory(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getContentFilesHash(): string {
  const contentDir = path.join(process.cwd(), 'content');
  const files = fs.readdirSync(contentDir);
  const fileHashes = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(content + stats.mtimeMs).digest('hex');
    fileHashes.push(hash);
  }

  return crypto.createHash('sha256').update(fileHashes.join('')).digest('hex');
}

function getCacheFilePath(cacheKey: string): string {
  ensureCacheDirectory();
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

export function readCache(cacheKey: string): CacheEntry | null {
  const cacheFilePath = getCacheFilePath(cacheKey);
  
  if (!fs.existsSync(cacheFilePath)) {
    return null;
  }

  try {
    const cacheData = fs.readFileSync(cacheFilePath, 'utf8');
    const entry: CacheEntry = JSON.parse(cacheData);
    
    return entry;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export function writeCache(cacheKey: string, entry: CacheEntry): void {
  const cacheFilePath = getCacheFilePath(cacheKey);
  
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(entry, null, 2));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export async function withCache<T>(
  cacheKey: string,
  generator: () => Promise<T>,
  fileHash?: string
): Promise<T> {
  const contentFilesHash = fileHash || getContentFilesHash();
  
  const cachedEntry = readCache(cacheKey);
  if (cachedEntry && cachedEntry.fileHash === contentFilesHash) {
    console.log('Using cached response from file:', cacheKey);
    return JSON.parse(cachedEntry.content) as T;
  }

  const result = await generator();
  
  writeCache(cacheKey, {
    content: JSON.stringify(result),
    timestamp: Date.now(),
    fileHash: contentFilesHash
  });

  console.log('Cached new response to file:', cacheKey);
  return result;
}

export function clearCache(): void {
  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    files.forEach(file => {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    });
    console.log('Cache cleared');
  }
}