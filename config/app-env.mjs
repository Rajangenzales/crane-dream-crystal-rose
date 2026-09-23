#!/usr/bin/env node
/**
 * Provider-neutral application environment loader.
 *
 * This module deliberately knows nothing about Grok, Replit, Vercel, or any
 * other hosting provider. Browser-exposed configuration is limited to VITE_
 * variables. Explicit process environment values always win.
 *
 * Local development may use `.env` or `.env.local`. Missing files are normal.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const APP_ENV_FILES = [".env", ".env.local"];

const VITE_PREFIX = "VITE_";

/**
 * Parse the small KEY=VALUE subset needed for application environment files.
 * Comments and blank lines are ignored. Quoted values have their surrounding
 * quotes removed. Non-VITE keys are ignored because this layer is only for
 * values that may be exposed to the Vite client bundle.
 */
export function parseEnvFile(text) {
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!key.startsWith(VITE_PREFIX)) continue;

    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

/** Read VITE_ configuration from supported local env files. */
export function readAppEnv(root) {
  const env = {
    // Authentication remains enabled by default, matching the current
    // application behavior while the provider-specific environment is removed.
    VITE_AUTH_ENABLED: "true",
  };

  for (const filename of APP_ENV_FILES) {
    try {
      Object.assign(env, parseEnvFile(readFileSync(join(root, filename), "utf8")));
    } catch {
      // Missing local env files are expected.
    }
  }

  return env;
}

/** Explicit process values always override local configuration. */
export function mergeAppEnv(appEnv, processEnv) {
  return { ...appEnv, ...processEnv };
}
