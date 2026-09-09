import assert from "node:assert/strict";
import { test } from "node:test";
import { applySecurityHeaders, SECURITY_HEADERS } from "./security-headers.ts";

test("ships a restrictive CSP that still allows Grok branding and fonts", () => {
  const csp = SECURITY_HEADERS["Content-Security-Policy"];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /https:\/\/grok\.com/);
  assert.match(csp, /fonts\.googleapis\.com/);
  assert.match(csp, /fonts\.gstatic\.com/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline https:\/\//);
});

test("defines HSTS, nosniff, referrer and permissions policy", () => {
  assert.equal(SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
  assert.match(SECURITY_HEADERS["Strict-Transport-Security"], /max-age=31536000/);
  assert.equal(SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(SECURITY_HEADERS["Permissions-Policy"], /camera=\(\)/);
});

test("does not force X-Frame-Options DENY so the preview iframe still works", () => {
  assert.equal(SECURITY_HEADERS["X-Frame-Options"], undefined);
  assert.match(SECURITY_HEADERS["Content-Security-Policy"], /frame-ancestors 'self' https:\/\/grok\.com/);
});

test("applySecurityHeaders fills missing keys without overwriting existing ones", () => {
  const headers = new Headers({ "X-Content-Type-Options": "keep-me" });
  const next = applySecurityHeaders(headers);
  assert.equal(next.get("X-Content-Type-Options"), "keep-me");
  assert.ok(next.get("Content-Security-Policy"));
  assert.ok(next.get("Referrer-Policy"));
});
