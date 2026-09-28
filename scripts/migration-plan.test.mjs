import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  HISTORICAL_DUPLICATE_MIGRATION_FILES,
  WORKSPACE_MIGRATION_BASENAMES,
  assertNoDuplicateMigrationNumbers,
  assertRequiredMigrationPrefixes,
  assertWorkspaceMigrationInventory,
  isMigrationFile,
  migrationName,
  missingRequiredMigrationPrefixes,
  pendingMigrations,
} from "./migration-plan.mjs";

function projectRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

const AUTH_MIGRATION = "0001_auth.sql";

/**
 * The auth-on copy of the Better Auth schema and its source, or null when the
 * app has not turned sign-in on (the shipped state).
 */
function authSchemaCopy(root) {
  const copy = join(root, "migrations", AUTH_MIGRATION);
  const source = join(root, "migrations/auth", AUTH_MIGRATION);
  if (!existsSync(copy) || !existsSync(source)) return null;
  return { copy: readFileSync(copy, "utf8"), source: readFileSync(source, "utf8") };
}

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/auth/0001_auth.sql"), "0001_auth.sql");
  assert.equal(migrationName("0001_auth.sql"), "0001_auth.sql");
});

test("a file already applied from another directory does not re-apply", () => {
  // The auth-on path copies migrations/auth/0001_auth.sql into the globbed
  // directory; a database that already has it must not run it twice.
  assert.deepEqual(pendingMigrations(["/migrations/0001_auth.sql"], ["0001_auth.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped (readdir also yields the auth/ directory)", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});

test("the auth schema source remains in migrations/auth", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  assert.ok(readdirSync(join(migrationsDir, "auth")).includes("0001_auth.sql"));
  const pending = pendingMigrations(readdirSync(migrationsDir), []);
  assert.ok(pending.some((p) => p.name === "0001_auth.sql"));
  assert.ok(pending.some((p) => p.name === "0002_monthly.sql"));
  assert.ok(pending.some((p) => p.name === "0003_bootstrap.sql"));
  assert.equal(
    pending.some((p) => p.name === "auth"),
    false,
  );
});

test("this workspace's auth schema copy is byte-identical to its source", () => {
  // An edited copy diverges silently: basename keying skips it on a database
  // that already ran the original, and applies it on a fresh PGLite preview.
  const pair = authSchemaCopy(projectRoot());
  if (pair === null) return; // sign-in off — nothing has been copied up
  assert.equal(
    pair.copy,
    pair.source,
    "migrations/0001_auth.sql has been edited — it must stay a verbatim copy of migrations/auth/0001_auth.sql",
  );
});

test("the copy check reads both files and catches an edit", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-schema-"));
  mkdirSync(join(root, "migrations/auth"), { recursive: true });
  writeFileSync(join(root, "migrations/auth", AUTH_MIGRATION), "create table t ();\n");
  assert.equal(authSchemaCopy(root), null);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t ();\n");
  const same = authSchemaCopy(root);
  assert.equal(same.copy, same.source);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t (x int);\n");
  const drifted = authSchemaCopy(root);
  assert.notEqual(drifted.copy, drifted.source);
});

test("duplicate migration numbers are rejected", () => {
  assert.doesNotThrow(() =>
    assertNoDuplicateMigrationNumbers(["0001_a.sql", "0002_b.sql", "0003_c.sql"]),
  );
  assert.throws(
    () => assertNoDuplicateMigrationNumbers(["0001_a.sql", "0001_b.sql", "0002_c.sql"]),
    /duplicate migration numbers are not allowed/,
  );
});

test("missing required migrations are detected", () => {
  const incomplete = ["0001_auth.sql", "0002_monthly.sql", "0003_bootstrap.sql"];
  assert.deepEqual(missingRequiredMigrationPrefixes(incomplete), ["0004", "0005", "0006"]);
  assert.throws(
    () => assertRequiredMigrationPrefixes(incomplete),
    /missing required migrations: 0004, 0005, 0006/,
  );
  assert.doesNotThrow(() => assertRequiredMigrationPrefixes(WORKSPACE_MIGRATION_BASENAMES));
});

test("this workspace migration inventory matches production apply order", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  const entries = readdirSync(migrationsDir);
  assertWorkspaceMigrationInventory(entries);
  const pending = pendingMigrations(entries, []);
  assert.deepEqual(
    pending.map((entry) => entry.name),
    [...WORKSPACE_MIGRATION_BASENAMES],
  );
  assert.equal(
    pending.some((entry) => entry.path.includes("auth/") || entry.name === "auth"),
    false,
  );
  for (const name of [
    "0002_firmos_foundation.sql",
    "0004_firmos_membership_integrity.sql",
    "0005_firmos_audit_events.sql",
    "0006_firmos_authorization_planes.sql",
  ]) {
    assert.ok(
      pending.some((entry) => entry.name === name),
      name,
    );
  }
  assert.deepEqual([...HISTORICAL_DUPLICATE_MIGRATION_FILES].sort(), [
    "0002_firmos_foundation.sql",
    "0002_monthly.sql",
  ]);
});

test("accidental migration rename is detected", () => {
  const renamed = WORKSPACE_MIGRATION_BASENAMES.map((name) =>
    name === "0005_firmos_audit_events.sql" ? "0005_firmos_audit_events_renamed.sql" : name,
  );
  assert.throws(() => assertWorkspaceMigrationInventory(renamed), /migration inventory changed/);
  const extra0004 = [...WORKSPACE_MIGRATION_BASENAMES, "0004_unexpected.sql"];
  assert.throws(() => assertWorkspaceMigrationInventory(extra0004), /duplicate migration number 0004/);
});

