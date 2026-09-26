import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ADMIN_PERMISSIONS, DEFAULT_FIRM_ROLES, ownerAuthorizationContext } from "./bootstrap.ts";
import {
  FIRMOS_PERMISSIONS,
  FIRMOS_PLATFORM_PERMISSIONS,
  FIRMOS_SPEC_PERMISSION_MAP,
  FIRMOS_TECHNICAL_PERMISSIONS,
  hasPermission,
  isFirmOSPermission,
  isPlatformPermission,
  isTechnicalPermission,
  permissionDomain,
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

test("FIRMOS_PERMISSIONS equals the SQL tenant permission seed keys", () => {
  const sql = readFileSync(join(process.cwd(), "migrations/0002_firmos_foundation.sql"), "utf8");
  const seeded = permissionSeedKeys(sql);
  assert.deepEqual(seeded, [...FIRMOS_PERMISSIONS]);
});

test("0006 seeds only platform and technical catalog keys", () => {
  const sql = readFileSync(
    join(process.cwd(), "migrations/0006_firmos_authorization_planes.sql"),
    "utf8",
  );
  const seeded = permissionSeedKeys(sql);
  assert.deepEqual(seeded, [...FIRMOS_PLATFORM_PERMISSIONS, ...FIRMOS_TECHNICAL_PERMISSIONS]);
});

test("default role grants only use canonical tenant permission keys", () => {
  for (const role of DEFAULT_FIRM_ROLES) {
    for (const permission of role.permissions) {
      assert.equal(isFirmOSPermission(permission), true, `${role.name}: ${permission}`);
    }
  }
});

test("Admin grants are tenant keys minus backup.restore", () => {
  assert.equal(DEFAULT_FIRM_ROLES[0].name, "Admin");
  assert.deepEqual([...DEFAULT_FIRM_ROLES[0].permissions], [...ADMIN_PERMISSIONS]);
  assert.equal(ADMIN_PERMISSIONS.includes("backup.restore"), false);
  assert.equal(FIRMOS_PERMISSIONS.includes("backup.restore"), true);
  for (const key of FIRMOS_PLATFORM_PERMISSIONS) {
    assert.equal(ADMIN_PERMISSIONS.includes(key as FirmOSPermission), false);
  }
  for (const key of FIRMOS_TECHNICAL_PERMISSIONS) {
    assert.equal(ADMIN_PERMISSIONS.includes(key as FirmOSPermission), false);
  }
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
  assert.equal(context.permissions.size, ADMIN_PERMISSIONS.length);
  for (const permission of ADMIN_PERMISSIONS) {
    assert.equal(hasPermission(context, permission), true);
  }
  assert.equal(hasPermission(context, "backup.restore"), false);
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
  assert.equal(isFirmOSPermission("platform.tenant.view"), false);
  assert.equal(isFirmOSPermission("diagnostics.view"), false);
});

test("authorization planes have disjoint catalogs", () => {
  for (const key of FIRMOS_PERMISSIONS) {
    assert.equal(permissionDomain(key), "tenant");
    assert.equal(isPlatformPermission(key), false);
    assert.equal(isTechnicalPermission(key), false);
  }
  for (const key of FIRMOS_PLATFORM_PERMISSIONS) {
    assert.equal(permissionDomain(key), "platform");
    assert.equal(isFirmOSPermission(key), false);
    assert.equal(isTechnicalPermission(key), false);
  }
  for (const key of FIRMOS_TECHNICAL_PERMISSIONS) {
    assert.equal(permissionDomain(key), "technical");
    assert.equal(isFirmOSPermission(key), false);
    assert.equal(isPlatformPermission(key), false);
  }
  assert.equal(permissionDomain("admin.all"), null);
  assert.equal(permissionDomain("system.manage"), null);
});
