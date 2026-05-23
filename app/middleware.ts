import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require tenant context
const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/api/health',
  '/login',
  '/signup',
  '/_next',
  '/favicon.ico',
];

const STATIC_FILE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];

function isPublicPath(pathname: string): boolean {
  // Check static files
  for (const ext of STATIC_FILE_EXTENSIONS) {
    if (pathname.endsWith(ext)) return true;
  }
  // Check public paths
  for (const prefix of PUBLIC_PATHS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
  }
  return false;
}

/**
 * Resolve tenant from:
 * 1. Subdomain: tenant-name.yourapp.com
 * 2. Path prefix: yourapp.com/tenant-name/dashboard
 * 3. Falls back to "default" for backward compatibility
 */
function resolveTenant(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const url = new URL(request.url);

  // Subdomain resolution: tenant-name.yourapp.com
  const parts = host.split('.');
  if (parts.length >= 3) {
    // e.g., "tenant" from "tenant.yourapp.com"
    const subdomain = parts[0];
    // Skip "www" — treat as root
    if (subdomain !== 'www') {
      return subdomain;
    }
  }

  // Path-based resolution: /tenant-name/...
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    const firstSegment = pathParts[0];
    // Skip known route prefixes
    const isRoutePrefix = [
      'api', 'login', 'signup', 'onboarding', 'dashboard',
      '_next', 'favicon.ico',
    ].includes(firstSegment);

    if (!isRoutePrefix) {
      return firstSegment;
    }
  }

  // Default tenant for backward compatibility
  return 'default';
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for public/static paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Resolve tenant
  const tenantSlug = resolveTenant(request);

  // We can't use AsyncLocalStorage directly in middleware because
  // middleware runs on the Edge Runtime. Instead, we pass tenant info
  // via request headers, and the API routes/middleware extracts it.
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    // Skip all static files and internal Next.js paths
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
