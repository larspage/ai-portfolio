/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantRepository } from './repository';
import { analysisCache } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class CacheRepository extends TenantRepository {
  protected table = analysisCache;
  protected tenantIdColumn = analysisCache.tenant_id;

  /**
   * Find a cache entry by its key within the current tenant scope.
   */
  async findByKey(cacheKey: string) {
    const { db } = await this.getDb();
    const result = await db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.cache_key, cacheKey),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Upsert a cache entry — insert or update if exists.
   */
  async upsert(cacheKey: string, fileHash: string, content: any) {
    const existing = await this.findByKey(cacheKey);
    if (existing) {
      return this.update(existing.id, {
        file_hash: fileHash,
        content,
        created_at: new Date().toISOString(),
      } as any);
    }
    return this.create({
      cache_key: cacheKey,
      file_hash: fileHash,
      content,
    } as any);
  }

  /**
   * Clear all cache entries for the current tenant.
   */
  async clearAll() {
    const { db } = await this.getDb();
    await db
      .delete(this.table)
      .where(eq(this.tenantIdColumn, this.getTenantId()));
  }

  /**
   * Clear expired cache entries.
   */
  async clearExpired() {
    const { db } = await this.getDb();
    await db
      .delete(this.table)
      .where(
        and(
          eq(this.tenantIdColumn, this.getTenantId()),
          // expires_at is not null and is in the past
        )
      );
  }
}
