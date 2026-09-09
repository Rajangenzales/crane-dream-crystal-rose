/**
 * Explicit browser security headers for every HTTP response.
 * Kept as a plain object so Vite (dev), Nitro (deploy), and tests share one policy.
 *
 * CSP is intentionally compatible with:
 *  - Grok PWA branding (`https://grok.com/grok-app-builder/extensions.js`)
 *  - Google Fonts used by the document shell
 *  - Better Auth OAuth redirects (Google / X)
 *  - the live-preview iframe on grok.com
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self' https://grok.com https://*.grok.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://grok.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://grok.com https://auth.grok.me https://accounts.google.com https://api.x.com https://twitter.com",
    "frame-src 'self' https://accounts.google.com https://twitter.com https://x.com",
    "worker-src 'self' blob:",
  ].join("; "),
};

export function applySecurityHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!next.has(key)) next.set(key, value);
  }
  return next;
}
