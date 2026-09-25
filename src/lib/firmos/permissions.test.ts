import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_FIRM_ROLES, ownerAuthorizationContext } from "./bootstrap.ts";
import {
  FIRMOS_PERMISSIONS,
  FIRMOS_SPEC_PERMISSION_MAP,
  hasPermission,
  isFirmOSPermission,
  type AuthorizationContext,
  type FirmOSPermission,
} from "./domain.ts";

function permissionSeedKeys(sql: string): string[] {
  const block = sql.match(
    /insert into permissions \(key, description\) values([\s\S]*?)on conflict/i,
  );
  assert.ok(block, "permissions seed insert not found");
  return [...block[1].matchAll(/\('([^']+)',\s*'[^']+'\)/g)].map((match) => match[1]);
}

test("FIRMOS_PERMISSIONS equals the SQL permission seed keys", () => {
  const sql = readFileSync(join(process.cwd(), "migrations/0002_firmos_foundation.sql"), "utf8");
  const seeded = permissionSeedKeys(sql);
  assert.deepEqual(seeded, [...FIRMOS_PERMISSIONS]);
});

test("default role grants only use canonical permission keys", () => {
  for (const role of DEFAULT_FIRM_ROLES) {
    for (const permission of role.permissions) {
      assert.equal(isFirmOSPermission(permission), true, `${role.name}: ${permission}`);
    }
  }
});

test("Owner grants are the full canonical catalog", () => {
  assert.equal(DEFAULT_FIRM_ROLES[0].name, "Owner");
  assert.deepEqual([...DEFAULT_FIRM_ROLES[0].permissions], [...FIRMOS_PERMISSIONS]);
});

test("each original spec name maps to exactly one canonical key", () => {
  const seen = new Set<FirmOSPermission>();
  for (const [specName, key] of Object.entries(FIRMOS_SPEC_PERMISSION_MAP)) {
    assert.equal(isFirmOSPermission(key), true, specName);
    assert.equal(seen.has(key), false, `duplicate mapping for ${key}`);
    seen.add(key);
  }
  assert.equal(Object.keys(FIRMOS_SPEC_PERMISSION_MAP).length, 25);
});

test("ownerAuthorizationContext matches AuthorizationContext", () => {
  const context: AuthorizationContext = ownerAuthorizationContext(
    "firm-1",
    "user-1",
    "membership-1",
    "role-1",
  );
  assert.equal(context.membershipStatus, "active");
  assert.equal(context.firmIsActive, true);
  assert.deepEqual([...context.roleIds], ["role-1"]);
  assert.equal(context.scope.kind, "firm");
  assert.equal("permissionKeys" in context, false);
  assert.ok(context.permissions instanceof Set);
  assert.equal(context.permissions.size, FIRMOS_PERMISSIONS.length);
  for (const permission of FIRMOS_PERMISSIONS) {
    assert.equal(hasPermission(context, permission), true);
  }
});

test("hasPermission reads only context.permissions", () => {
  const context = ownerAuthorizationContext("firm-1", "user-1", "membership-1", "role-1");
  assert.equal(hasPermission(context, "clients.view"), true);
  const empty: AuthorizationContext = {
    ...context,
    permissions: new Set(),
  };
  assert.equal(hasPermission(empty, "clients.view"), false);
});

test("isFirmOSPermission rejects legacy catch-all keys", () => {
  assert.equal(isFirmOSPermission("clients.manage"), false);
  assert.equal(isFirmOSPermission("members.view"), false);
  assert.equal(isFirmOSPermission("backup.manage"), false);
  assert.equal(isFirmOSPermission("finance.correct"), false);
  assert.equal(isFirmOSPermission("clients.edit"), true);
});
