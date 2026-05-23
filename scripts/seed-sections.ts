/**
 * Seed script for section_configs.
 * Creates default section configs for the first tenant (Larry's existing categories).
 *
 * Usage: npx tsx scripts/seed-sections.ts
 *
 * Requires DATABASE_URL env var.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_SECTIONS = [
  {
    name: 'overview',
    label: 'Professional Summary',
    focus_description: null,
    resume_section_key: null,
    sort_order: 0,
  },
  {
    name: 'leadership',
    label: 'Leadership',
    focus_description: 'Team management, mentorship, and strategic initiatives',
    resume_section_key: 'leadership',
    sort_order: 1,
  },
  {
    name: 'architecture',
    label: 'Architecture',
    focus_description: 'System design, scalability, and technical decisions',
    resume_section_key: 'architecture',
    sort_order: 2,
  },
  {
    name: 'development',
    label: 'Development',
    focus_description: 'Technical achievements and project accomplishments',
    resume_section_key: 'development',
    sort_order: 3,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  console.log('Seeding section configs...');

  // Find the first active tenant
  const tenants = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.is_active, true))
    .limit(1);

  if (tenants.length === 0) {
    console.error('No active tenants found. Run scripts/seed.ts first.');
    await client.end();
    process.exit(1);
  }

  const tenant = tenants[0];
  console.log(`  Using tenant: ${tenant.name} (${tenant.slug})`);

  // Check if sections already exist for this tenant
  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.sectionConfigs)
    .where(eq(schema.sectionConfigs.tenant_id, tenant.id));

  if (Number(existingCount[0]?.count ?? 0) > 0) {
    console.log('  Section configs already exist for this tenant. Skipping.');
    await client.end();
    return;
  }

  // Insert sections
  for (const section of DEFAULT_SECTIONS) {
    const [inserted] = await db.insert(schema.sectionConfigs).values({
      tenant_id: tenant.id,
      ...section,
    }).returning();
    console.log(`  ✓ Created section: ${inserted.label} (${inserted.name})`);
  }

  await client.end();
  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
