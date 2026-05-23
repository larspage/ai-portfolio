import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { TenantContext } from './context';
import { getDb } from '@/lib/db';
import { tenants } from '@/lib/db/schema';

/**
 * Resolve a tenant slug to its UUID from the database.
 * Caches the result for the lifetime of the process to avoid DB calls per request.
 */
const tenantCache = new Map<string, string>();

async function slugToId(slug: string): Promise<string | null> {
  // Check cache first
  if (tenantCache.has(slug)) {
    return tenantCache.get(slug)!;
  }

  try {
    const db = getDb();
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (tenant) {
      tenantCache.set(slug, tenant.id);
      return tenant.id;
    }
    return null;
  } catch {
    // DB not available (e.g., during build)
    return null;
  }
}

/**
 * Wrap an API route handler with tenant context resolution.
 * Reads the x-tenant-slug header set by middleware, resolves it to a UUID,
 * and starts AsyncLocalStorage with the tenant ID.
 */
export function withTenant<
  T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>
>(handler: T): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const slug = request.headers.get('x-tenant-slug');
    let tenantId: string | null = null;

    if (slug) {
      tenantId = await slugToId(slug);
    }

    // Wrap the handler execution in the tenant context
    return TenantContext.run(tenantId, async () => {
      return handler(request, ...args);
    }) as Promise<NextResponse>;
  }) as T;
}

/**
 * Get the tenant ID from the current request context.
 * Throws if no tenant context is active.
 */
export function requireTenantId(): string {
  return TenantContext.requireTenantId();
}

/**
 * For use in getServerSideProps / server components — resolve tenant from headers.
 */
export async function getTenantFromHeaders(headers: Headers): Promise<string | null> {
  const slug = headers.get('x-tenant-slug');
  if (!slug) return null;
  return slugToId(slug);
}
