import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import {
  WORKSPACE_MIGRATION_BASENAMES,
  pendingMigrations,
} from "../../../scripts/migration-plan.mjs";
import {
  createTestSql,
  migrationsDirectory,
} from "../db-test-utils.ts";
import {
  FIRMOS_PERMISSIONS,
  FIRMOS_PLATFORM_PERMISSIONS,
  FIRMOS_TECHNICAL_PERMISSIONS,
} from "./domain.ts";

test("createTestSql applies the frozen FirmOS chain on an empty database", async () => {
  const { sql, pg } = await createTestSql();
  const applied = await sql<{ name: string }>`select name from _migrations order by name`;
  assert.deepEqual(
    applied.map((row) => row.name),
    [...WORKSPACE_MIGRATION_BASENAMES].sort((a, b) => a.localeCompare(b)),
  );

  const pending = pendingMigrations(readdirSync(migrationsDirectory()), applied.map((row) => row.name));
  assert.deepEqual(pending, []);

  const tables = await sql<{ table_name: string }>`
    select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'firms', 'firm_memberships', 'roles', 'permissions', 'role_permissions',
        'membership_roles', 'audit_events', 'error_events', 'clients', 'payments'
      )
    order by table_name
  `;
  assert.deepEqual(
    tables.map((row) => row.table_name),
    [
      "audit_events",
      "clients",
      "error_events",
      "firm_memberships",
      "firms",
      "membership_roles",
      "payments",
      "permissions",
      "role_permissions",
      "roles",
    ],
  );

  const keys = await sql<{ key: string }>`select key from permissions order by key`;
  const present = new Set(keys.map((row) => row.key));
  for (const key of FIRMOS_PERMISSIONS) {
    assert.equal(present.has(key), true, key);
  }
  for (const key of FIRMOS_PLATFORM_PERMISSIONS) {
    assert.equal(present.has(key), true, key);
  }
  for (const key of FIRMOS_TECHNICAL_PERMISSIONS) {
    assert.equal(present.has(key), true, key);
  }

  const second = pendingMigrations(
    readdirSync(migrationsDirectory()),
    (await pg.query<{ name: string }>("select name from _migrations")).rows.map((row) => row.name),
  );
  assert.equal(second.length, 0);
});
