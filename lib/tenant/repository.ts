/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPooledTenantDb } from '@/lib/db';
import { TenantContext } from './context';
import { eq, and, sql } from 'drizzle-orm';
import { AnyPgTable } from 'drizzle-orm/pg-core';

/**
 * Base repository providing tenant-scoped CRUD operations.
 *
 * Every query is automatically filtered by tenant_id from AsyncLocalStorage.
 * Cross-tenant access returns null → caller maps to 404.
 */
export abstract class TenantRepository {
  protected abstract table: AnyPgTable;
  protected abstract tenantIdColumn: any;

  protected getTenantId(): string {
    return TenantContext.requireTenantId();
  }

  protected async getDb() {
    return getPooledTenantDb(this.getTenantId());
  }

  /**
   * Find by ID, scoped to current tenant. Returns null if not found (404).
   */
  async findById(id: string) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).id, id),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Find all records for current tenant.
   */
  async findAll(options?: { limit?: number; offset?: number }) {
    const { db } = await this.getDb();
    let query: any = (db as any)
      .select()
      .from(this.table)
      .where(eq(this.tenantIdColumn, this.getTenantId()));

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    return query;
  }

  /**
   * Create a new record with tenant_id set automatically.
   */
  async create(data: any) {
    const { db } = await this.getDb();
    const insertData = { ...data, tenant_id: this.getTenantId() };
    const result = await (db as any).insert(this.table).values(insertData).returning();
    return result[0];
  }

  /**
   * Update record scoped to current tenant. Returns null on cross-tenant.
   */
  async update(id: string, data: any) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .update(this.table)
      .set(data)
      .where(
        and(
          eq((this.table as any).id, id),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .returning();
    return result[0] ?? null;
  }

  /**
   * Delete record scoped to current tenant. Returns null on cross-tenant.
   */
  async delete(id: string) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .delete(this.table)
      .where(
        and(
          eq((this.table as any).id, id),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .returning();
    return result[0] ?? null;
  }

  /**
   * Count records for current tenant.
   */
  async count() {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select({ count: sql<number>`count(*)` })
      .from(this.table)
      .where(eq(this.tenantIdColumn, this.getTenantId()));
    return Number(result[0]?.count ?? 0);
  }
}
