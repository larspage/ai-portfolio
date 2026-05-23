/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq, and, sql, asc } from 'drizzle-orm';
import { TenantRepository } from './repository';
import { sectionConfigs } from '@/lib/db/schema';

export interface SectionConfigRow {
  id: string;
  tenant_id: string;
  name: string;
  label: string;
  focus_description: string | null;
  resume_section_key: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSectionInput {
  name: string;
  label: string;
  focus_description?: string | null;
  resume_section_key?: string | null;
  sort_order?: number;
}

export interface UpdateSectionInput {
  name?: string;
  label?: string;
  focus_description?: string | null;
  resume_section_key?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export class SectionConfigRepository extends TenantRepository {
  protected table = sectionConfigs;
  protected tenantIdColumn = sectionConfigs.tenant_id;

  async findByName(name: string): Promise<SectionConfigRow | null> {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select()
      .from(sectionConfigs)
      .where(
        and(
          eq(sectionConfigs.name, name),
          eq(sectionConfigs.tenant_id, this.getTenantId()),
          eq(sectionConfigs.is_active, true)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findAllActive(): Promise<SectionConfigRow[]> {
    const { db } = await this.getDb();
    return (db as any)
      .select()
      .from(sectionConfigs)
      .where(
        and(
          eq(sectionConfigs.tenant_id, this.getTenantId()),
          eq(sectionConfigs.is_active, true)
        )
      )
      .orderBy(asc(sectionConfigs.sort_order));
  }

  async findAllByTenant(): Promise<SectionConfigRow[]> {
    const { db } = await this.getDb();
    return (db as any)
      .select()
      .from(sectionConfigs)
      .where(eq(sectionConfigs.tenant_id, this.getTenantId()))
      .orderBy(asc(sectionConfigs.sort_order));
  }

  async getCount(): Promise<number> {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select({ count: sql<number>`count(*)` })
      .from(sectionConfigs)
      .where(eq(sectionConfigs.tenant_id, this.getTenantId()));
    return Number(result[0]?.count ?? 0);
  }

  async getNextSortOrder(): Promise<number> {
    const { db } = await this.getDb();
    const result = await (db as any)
      .select({ max: sql<number>`coalesce(max(sort_order), -1) + 1` })
      .from(sectionConfigs)
      .where(eq(sectionConfigs.tenant_id, this.getTenantId()));
    return Number(result[0]?.max ?? 0);
  }
}
