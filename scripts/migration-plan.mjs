// @ts-check
/**
 * Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
 * (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
 *
 * Applied files are keyed by BASENAME, so the same file applies once no matter
 * which directory it is globbed from. That is what makes the auth schema safe to
 * copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
 * a database that already has `0001_auth.sql` will not re-run it.
 *
 * Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
 * out of scope for both until it is copied up.
 */

/**
 * Frozen apply order for this workspace (basename `localeCompare`).
 *
 * Phase 8 numbering audit: `0002_firmos_foundation.sql` collides with
 * `0002_monthly.sql`. It is **not** renamed to `0004_firmos_foundation.sql`
 * because `0004`–`0006` are already shipped basenames that may exist in
 * `_migrations`. Lexical apply order is foundation, then monthly, then
 * bootstrap, then integrity / audit / planes.
 *
 * @type {readonly string[]}
 */
export const WORKSPACE_MIGRATION_BASENAMES = Object.freeze([
  "0001_auth.sql",
  "0002_firmos_foundation.sql",
  "0002_monthly.sql",
  "0003_bootstrap.sql",
  "0004_firmos_membership_integrity.sql",
  "0005_firmos_audit_events.sql",
  "0006_firmos_authorization_planes.sql",
]);

/** @type {readonly string[]} */
export const REQUIRED_MIGRATION_PREFIXES = Object.freeze([
  "0001",
  "0002",
  "0003",
  "0004",
  "0005",
  "0006",
]);

export const HISTORICAL_DUPLICATE_MIGRATION_PREFIX = "0002";

/** @type {readonly string[]} */
export const HISTORICAL_DUPLICATE_MIGRATION_FILES = Object.freeze([
  "0002_firmos_foundation.sql",
  "0002_monthly.sql",
]);

/**
 * The `_migrations` key for a migration path (or bare filename).
 * @param {string} path
 * @returns {string}
 */
export function migrationName(path) {
  return path.split("/").pop() ?? path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isMigrationFile(path) {
  return path.endsWith(".sql");
}

/**
 * Leading numeric prefix (`0002_monthly.sql` → `0002`).
 * @param {string} name
 * @returns {string | null}
 */
export function migrationNumberPrefix(name) {
  const match = String(name).match(/^(\d+)/);
  return match ? match[1] : null;
}

/**
 * Migrations in `paths` that are not yet in `applied`, in apply order.
 * Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
 * @param {Iterable<string>} paths
 * @param {Iterable<string>} applied
 * @returns {Array<{ name: string, path: string }>}
 */
export function pendingMigrations(paths, applied) {
  const done = new Set(applied);
  return [...paths]
    .filter(isMigrationFile)
    .map((path) => ({ name: migrationName(path), path }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(({ name }) => !done.has(name));
}

/**
 * @param {Iterable<string>} names
 * @returns {Array<[string, string[]]>}
 */
export function duplicateMigrationPrefixes(names) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const path of names) {
    if (!isMigrationFile(path)) continue;
    const name = migrationName(path);
    const prefix = migrationNumberPrefix(name);
    if (!prefix) continue;
    const list = groups.get(prefix) ?? [];
    list.push(name);
    groups.set(prefix, list);
  }
  return [...groups.entries()].filter(([, files]) => files.length > 1);
}

/**
 * Reject any duplicate numeric prefix. Used for new/synthetic inventories.
 * The live workspace is checked with `assertWorkspaceMigrationInventory`,
 * which pins the historical `0002` collision to exact filenames.
 * @param {Iterable<string>} names
 */
export function assertNoDuplicateMigrationNumbers(names) {
  const dupes = duplicateMigrationPrefixes(names);
  if (dupes.length === 0) return;
  const detail = dupes
    .map(([prefix, files]) => `${prefix}: ${[...new Set(files)].join(", ")}`)
    .join("; ");
  throw new Error(`duplicate migration numbers are not allowed: ${detail}`);
}

/**
 * @param {Iterable<string>} names
 * @param {readonly string[]} [requiredPrefixes]
 * @returns {string[]}
 */
export function missingRequiredMigrationPrefixes(
  names,
  requiredPrefixes = REQUIRED_MIGRATION_PREFIXES,
) {
  const present = new Set();
  for (const path of names) {
    if (!isMigrationFile(path)) continue;
    const prefix = migrationNumberPrefix(migrationName(path));
    if (prefix) present.add(prefix);
  }
  return requiredPrefixes.filter((prefix) => !present.has(prefix));
}

/**
 * @param {Iterable<string>} names
 * @param {readonly string[]} [requiredPrefixes]
 */
export function assertRequiredMigrationPrefixes(
  names,
  requiredPrefixes = REQUIRED_MIGRATION_PREFIXES,
) {
  const missing = missingRequiredMigrationPrefixes(names, requiredPrefixes);
  if (missing.length === 0) return;
  throw new Error(`missing required migrations: ${missing.join(", ")}`);
}

/**
 * Live `migrations/` inventory must match the frozen chain. Accidental
 * add/rename/delete fails here rather than silently changing apply order.
 * @param {Iterable<string>} names
 */
export function assertWorkspaceMigrationInventory(names) {
  const actual = pendingMigrations(names, []).map((entry) => entry.name);
  assertRequiredMigrationPrefixes(actual);

  const dupes = duplicateMigrationPrefixes(actual);
  let sawHistorical = false;
  for (const [prefix, files] of dupes) {
    if (prefix !== HISTORICAL_DUPLICATE_MIGRATION_PREFIX) {
      throw new Error(`duplicate migration number ${prefix}: ${files.join(", ")}`);
    }
    sawHistorical = true;
    const sorted = [...files].sort();
    const historical = [...HISTORICAL_DUPLICATE_MIGRATION_FILES].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(historical)) {
      throw new Error(
        `historical 0002 collision must remain exactly ${historical.join(", ")}; found ${sorted.join(", ")}`,
      );
    }
  }
  if (!sawHistorical) {
    throw new Error(
      "expected historical 0002 filename collision is missing — do not silently rename applied files",
    );
  }

  const expected = [...WORKSPACE_MIGRATION_BASENAMES];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `migration inventory changed (rename/add/delete detected).\nexpected: ${expected.join(", ")}\nactual: ${actual.join(", ")}`,
    );
  }
}
