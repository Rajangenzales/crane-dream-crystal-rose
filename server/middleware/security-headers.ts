/**
 * Apply the application security-header policy to every Nitro response.
 * Lives alongside grok-pwa.ts so the deployed app does not rely on host defaults.
 */
import { applySecurityHeaders } from "../../src/lib/security-headers";

export default async function securityHeadersMiddleware(
  _event: unknown,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers: applySecurityHeaders(result.headers),
  });
}
