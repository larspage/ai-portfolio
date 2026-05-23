/**
 * Database seed script.
 * Creates the initial default tenant and admin user.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL env var.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';
import crypto from 'crypto';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  console.log('Seeding database...');

  // Check if seed already run
  const existingTenants = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
  if (existingTenants.length > 0) {
    console.log('Database already seeded — found existing tenant. Skipping.');
    await client.end();
    return;
  }

  // Create default tenant
  const [tenant] = await db.insert(schema.tenants).values({
    name: 'Default',
    slug: 'default',
    plan: 'free',
    is_active: true,
  }).returning();

  console.log(`  ✓ Created tenant: ${tenant.name} (${tenant.id})`);

  // Create initial admin user (password set via invite flow)
  const [user] = await db.insert(schema.users).values({
    tenant_id: tenant.id,
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    is_active: true,
  }).returning();

  console.log(`  ✓ Created admin user: ${user.email} (${user.id})`);

  await client.end();
  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
