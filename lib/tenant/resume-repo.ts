/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantRepository } from './repository';
import { resumes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class ResumeRepository extends TenantRepository {
  protected table = resumes;
  protected tenantIdColumn = resumes.tenant_id;

  /**
   * Find all resumes for the current user within the tenant.
   */
  async findByUser(userId: string) {
    const { db } = await this.getDb();
    return (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).user_id, userId),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .orderBy((this.table as any).created_at);
  }

  /**
   * Find the default resume for the current user.
   */
  async findDefault(userId: string) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).user_id, userId),
          eq(this.tenantIdColumn, this.getTenantId()),
          eq((this.table as any).is_default, true)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Set a resume as the default (un-sets all others first).
   */
  async setDefault(id: string, userId: string) {
    const { db } = await this.getDb();
    await (db as any)
      .update(this.table)
      .set({ is_default: false })
      .where(
        and(
          eq((this.table as any).user_id, userId),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      );
    return this.update(id, { is_default: true });
  }

  /**
   * Find a resume by its storage key.
   */
  async findByFileKey(fileKey: string) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).file_key, fileKey),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .limit(1);
    return result[0] ?? null;
  }
}
