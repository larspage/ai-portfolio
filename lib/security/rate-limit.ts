/**
 * Simple in-memory rate limiter for API routes.
 * For production, replace with Redis-based limiter (ioredis + @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Max requests per window */
  max?: number;
}

const defaults: Required<RateLimitOptions> = {
  windowMs: 60_000,
  max: 20,
};

/**
 * Check if a request is within rate limits.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): { allowed: true } | { allowed: false; retryAfter: number } {
  const { windowMs, max } = { ...defaults, ...options };
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Extract a rate limit key from a request (IP-based).
 */
export function getRateLimitKey(request: { headers: Headers }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  return `rl:${ip}`;
}
