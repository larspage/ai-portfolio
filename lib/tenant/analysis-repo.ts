/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantRepository } from './repository';
import { analyses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class AnalysisRepository extends TenantRepository {
  protected table = analyses;
  protected tenantIdColumn = analyses.tenant_id;

  /**
   * Find analysis for a specific resume.
   */
  async findByResume(resumeId: string) {
    const { db } = await this.getDb();
    return (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).resume_id, resumeId),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .orderBy((this.table as any).created_at);
  }

  /**
   * Find analyses for a specific user.
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
   * Get the most recent analysis for a resume/section combo.
   */
  async findLatest(resumeId: string, section: string) {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).resume_id, resumeId),
          eq((this.table as any).section, section),
          eq(this.tenantIdColumn, this.getTenantId())
        )
      )
      .orderBy((this.table as any).created_at)
      .limit(1);
    return result[0] ?? null;
  }
}
