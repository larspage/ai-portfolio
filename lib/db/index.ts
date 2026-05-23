import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// ─── Singleton client (non-tenant-scoped queries) ──────────────────────
// Use for public routes, auth, tenant resolution, health checks.
// RLS policies are bypassed because app.tenant_id is not set on this connection.

const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function createClient() {
  return postgres(connectionString!, { prepare: false });
}

export function getDbClient() {
  if (!globalForDb.client) {
    globalForDb.client = createClient();
  }
  return globalForDb.client;
}

export function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getDbClient(), { schema });
  }
  return globalForDb.db;
}

// ─── Tenant-scoped connection (per-request, sets app.tenant_id) ───────
// Each call creates a new connection with the tenant context set.
// RLS policies filter all queries by this tenant_id.
// The connection should be closed after use to avoid connection leaks.

export async function getTenantDb(tenantId: string) {
  const client = postgres(connectionString!, { prepare: false });
  await client`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  return { client, db: drizzle(client, { schema }) };
}

// ─── Connection pool for tenant-scoped queries ─────────────────────────
// Manages a set of connections tagged by tenant_id.
// Reuses connections for the same tenant within the same request.
// In production, replace with pg-pool for better resource management.

const tenantConnections = new Map<string, postgres.Sql>();

export async function getPooledTenantDb(tenantId: string) {
  // Check for existing connection for this tenant
  let conn = tenantConnections.get(tenantId);
  if (!conn) {
    conn = postgres(connectionString!, {
      prepare: false,
      max: 5,
      idle_timeout: 30,
    });
    await conn`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    tenantConnections.set(tenantId, conn);
  }
  return { client: conn, db: drizzle(conn, { schema }) };
}

export function cleanupTenantConnections() {
  for (const [_tenantId, client] of tenantConnections) { // eslint-disable-line @typescript-eslint/no-unused-vars
    client.end();
  }
  tenantConnections.clear();
}

// ─── RLS utility: set tenant context on any connection ────────────────
export async function setTenantContext(client: postgres.Sql, tenantId: string) {
  await client`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}

export async function clearTenantContext(client: postgres.Sql) {
  await client`SELECT set_config('app.tenant_id', '', true)`;
}

// Re-export schema for convenience
export * from './schema';
