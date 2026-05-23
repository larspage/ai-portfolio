/**
 * DB-backed analysis cache — replaces the old filesystem cache (lib/cache.ts).
 *
 * Each cache entry is scoped by tenant_id, so cross-tenant cache leakage is impossible.
 * The old lib/cache.ts filesystem cache is deprecated and should not be used in tenant contexts.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CacheRepository } from './tenant/cache-repo';
import { TenantContext } from './tenant/context';

const cacheRepo = new CacheRepository();

/**
 * Compute a cache key from prompts.
 */
function getCacheKey(systemPrompt: string, userPrompt: string): string {
  return crypto.createHash('sha256').update(systemPrompt + userPrompt).digest('hex');
}

/**
 * Compute a hash of the content files for cache invalidation.
 * Uses resume-data.json and companies.json.
 */
function getContentHash(): string {
  const contentDir = path.join(process.cwd(), 'content');
  const files = ['resume-data.json', 'companies.json', 'resume.md', 'resume-developer.md'];
  const hash = crypto.createHash('sha256');

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      hash.update(content);
    } catch {
      // File may not exist
    }
  }

  return hash.digest('hex');
}

/**
 * Check if we're in a tenant context (for deciding which cache to use).
 */
function hasTenantContext(): boolean {
  return TenantContext.getTenantId() !== null;
}

/**
 * Generate a completion with DB-backed caching.
 * Falls back to the old filesystem cache when no tenant context is available.
 */
export async function withAnalysisCache<T>(
  cacheKey: string,
  generator: () => Promise<T>
): Promise<T> {
  const contentHash = getContentHash();

  if (hasTenantContext()) {
    // Use DB-backed cache (tenant-scoped)
    const existing = await cacheRepo.findByKey(cacheKey);
    if (existing && existing.file_hash === contentHash) {
      return existing.content as T;
    }

    const result = await generator();
    await cacheRepo.upsert(cacheKey, contentHash, result as unknown as Record<string, unknown>);
    return result;
  }

  // Fallback: use old filesystem cache for backward compatibility
  return withLegacyCache(cacheKey, generator, contentHash);
}

/**
 * Legacy filesystem cache — kept for backward compatibility during transition.
 * Will be removed when all users are migrated to multi-tenant.
 */
async function withLegacyCache<T>(
  cacheKey: string,
  generator: () => Promise<T>,
  fileHash: string
): Promise<T> {
  const CACHE_DIR = path.join(process.cwd(), '.cache');
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.json`);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      if (cached.fileHash === fileHash) {
        return cached.content as T;
      }
    } catch { /* ignore cache read errors */ }
  }

  const result = await generator();
  fs.writeFileSync(
    cacheFilePath,
    JSON.stringify({ content: result, fileHash, timestamp: Date.now() })
  );
  return result;
}

export { getCacheKey, getContentHash };
