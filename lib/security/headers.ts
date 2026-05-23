/**
 * Security headers for Next.js responses.
 * Applied in next.config.mjs via the headers() function.
 */

export type SecurityHeaders = Record<string, string>;

/**
 * Default security headers for all routes.
 */
export function getDefaultSecurityHeaders(): SecurityHeaders {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  };
}

/**
 * Content Security Policy string.
 * Relaxed for Google AdSense and EthicalAds.
 */
export function getCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.ethicalads.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'img-src \'self\' data: blob: https:',
    'font-src \'self\' https://fonts.gstatic.com',
    "connect-src 'self' https://*.openai.com https://api.ethicalads.io",
    'frame-src https://googleads.g.doubleclick.net',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}
