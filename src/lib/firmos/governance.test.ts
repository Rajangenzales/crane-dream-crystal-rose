import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import {
  ADMIN_PERMISSIONS,
  DEFAULT_FIRM_ROLES,
  FIRMOS_SYSTEM_ROLE_ADMIN,
  adminAuthorizationContext,
} from "./bootstrap.ts";
import { executeFirmBootstrap } from "./bootstrap-core.ts";
import {
  authorize,
  authorizePlatform,
  authorizeTechnical,
  FIRMOS_PERMISSIONS,
  FIRMOS_PLATFORM_PERMISSIONS,
  FIRMOS_TECHNICAL_PERMISSIONS,
  hasPermission,
  isFirmOSPermission,
  platformAdminAuthority,
  technicalOperatorAuthority,
  type AuthorizationContext,
  type FirmOSPermission,
} from "./domain.ts";
import { resolveAuthorization } from "./resolve-authorization.ts";

const MIGRATIONS = join(process.cwd(), "migrations");

async function createGovernanceSql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0005_firmos_audit_events.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0006_firmos_authorization_planes.sql"), "utf8"));
  return { sql, pg };
}

test("default Firm roles are Admin, Manager, Member, Viewer", () => {
  assert.deepEqual(
    DEFAULT_FIRM_ROLES.map((role) => role.name),
    ["Admin", "Manager", "Member", "Viewer"],
  );
  assert.equal(FIRMOS_SYSTEM_ROLE_ADMIN, "Admin");
  assert.equal(
    DEFAULT_FIRM_ROLES.some((role) => (role.name as string) === "Owner"),
    false,
  );
});

test("Admin does not receive backup.restore or out-of-plane keys", () => {
  const admin = DEFAULT_FIRM_ROLES.find((role) => role.name === "Admin");
  assert.ok(admin);
  assert.deepEqual([...admin.permissions].sort(), [...ADMIN_PERMISSIONS].sort());
  assert.equal(admin.permissions.includes("backup.restore"), false);
  for (const key of [...FIRMOS_PLATFORM_PERMISSIONS, ...FIRMOS_TECHNICAL_PERMISSIONS]) {
    assert.equal(isFirmOSPermission(key), false);
    assert.equal(admin.permissions.includes(key as FirmOSPermission), false);
  }
});

test("Manager, Member, and Viewer grants stay tenant-only", () => {
  for (const role of DEFAULT_FIRM_ROLES) {
    for (const permission of role.permissions) {
      assert.equal(isFirmOSPermission(permission), true, `${role.name}: ${permission}`);
      assert.equal(permission.startsWith("platform."), false);
    }
    assert.equal(role.permissions.includes("backup.restore"), false);
    assert.equal(role.permissions.includes("diagnostics.view" as FirmOSPermission), false);
  }
});

test("bootstrap assigns Admin, not Owner, and writes no plane keys on Firm roles", async () => {
  const { sql } = await createGovernanceSql();
  const result = await executeFirmBootstrap(sql, "creator", {
    firmName: "Acme",
    slug: "acme-admin",
  });
  assert.equal(result.ownerRoleName, "Admin");

  const roles = await sql<{ name: string }>`
    select name from roles where firm_id = ${result.firmId} order by name
  `;
  assert.deepEqual(
    roles.map((row) => row.name),
    ["Admin", "Manager", "Member", "Viewer"],
  );

  const assigned = await sql<{ name: string }>`
    select r.name
    from membership_roles mr
    join roles r on r.id = mr.role_id
    where mr.membership_id = ${result.ownerMembershipId}
  `;
  assert.equal(assigned.length, 1);
  assert.equal(assigned[0]?.name, "Admin");

  const grants = await sql<{ key: string }>`
    select p.key
    from role_permissions rp
    join roles r on r.id = rp.role_id
    join permissions p on p.id = rp.permission_id
    where r.firm_id = ${result.firmId}
  `;
  for (const row of grants) {
    assert.equal(isFirmOSPermission(row.key), true, row.key);
    assert.notEqual(row.key, "backup.restore");
  }

  const resolved = await resolveAuthorization(sql, {
    userId: "creator",
    firmId: result.firmId,
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(hasPermission(resolved.context, "backup.restore"), false);
  assert.equal(hasPermission(resolved.context, "firm.manage"), true);
  assert.deepEqual(
    authorize(resolved.context, "platform.tenant.view", {
      type: "firm",
      firmId: result.firmId,
    }),
    { ok: false, reason: "permission_missing" },
  );
  assert.deepEqual(
    authorize(resolved.context, "diagnostics.view", {
      type: "firm",
      firmId: result.firmId,
    }),
    { ok: false, reason: "permission_missing" },
  );
});

test("two firms may each have Admin", async () => {
  const { sql } = await createGovernanceSql();
  const a = await executeFirmBootstrap(sql, "u1", { firmName: "A", slug: "firm-a6" });
  const b = await executeFirmBootstrap(sql, "u2", { firmName: "B", slug: "firm-b6" });
  assert.equal(a.ownerRoleName, "Admin");
  assert.equal(b.ownerRoleName, "Admin");
  assert.notEqual(a.firmId, b.firmId);
});

test("tenant Admin cannot satisfy platform or technical authorization", () => {
  const tenant = adminAuthorizationContext("firm-1", "user-1", "mem-1", "role-1");
  for (const key of FIRMOS_PLATFORM_PERMISSIONS) {
    assert.deepEqual(
      authorize(tenant, key, { type: "firm", firmId: "firm-1" }),
      { ok: false, reason: "permission_missing" },
    );
  }
  for (const key of FIRMOS_TECHNICAL_PERMISSIONS) {
    assert.deepEqual(
      authorize(tenant, key, { type: "firm", firmId: "firm-1" }),
      { ok: false, reason: "permission_missing" },
    );
  }
});

test("platform authority does not imply technical or tenant business access", () => {
  const platform = platformAdminAuthority("operator-1");
  assert.deepEqual(authorizePlatform(platform, "platform.tenant.view"), { ok: true });
  assert.deepEqual(authorizePlatform(platform, "diagnostics.view"), {
    ok: false,
    reason: "permission_missing",
  });
  assert.deepEqual(authorizePlatform(platform, "error_events.view"), {
    ok: false,
    reason: "permission_missing",
  });
  for (const key of ["clients.view", "invoices.create", "payments.correct", "reports.generate"] as const) {
    assert.deepEqual(authorizePlatform(platform, key), {
      ok: false,
      reason: "permission_missing",
    });
  }
  assert.equal("firmId" in platform, false);
  assert.equal("membershipId" in platform, false);
  assert.equal("scope" in platform, false);
});

test("technical authority does not imply platform or tenant business access", () => {
  const technical = technicalOperatorAuthority("it-1");
  assert.deepEqual(authorizeTechnical(technical, "diagnostics.view"), { ok: true });
  assert.deepEqual(authorizeTechnical(technical, "error_events.view"), { ok: true });
  assert.deepEqual(authorizeTechnical(technical, "platform.tenant.view"), {
    ok: false,
    reason: "permission_missing",
  });
  for (const key of ["clients.view", "invoices.create", "payments.correct", "reports.generate"] as const) {
    assert.deepEqual(authorizeTechnical(technical, key), {
      ok: false,
      reason: "permission_missing",
    });
  }
});

test("there is no universal superadmin grant set", () => {
  const tenantKeys = new Set<string>(ADMIN_PERMISSIONS);
  const platformKeys = new Set<string>(FIRMOS_PLATFORM_PERMISSIONS);
  const technicalKeys = new Set<string>(FIRMOS_TECHNICAL_PERMISSIONS);
  const union = new Set([...tenantKeys, ...platformKeys, ...technicalKeys]);
  assert.equal(union.size, tenantKeys.size + platformKeys.size + technicalKeys.size);
  assert.equal(tenantKeys.has("backup.restore"), false);
  assert.equal(platformKeys.has("diagnostics.view"), false);
  assert.equal(technicalKeys.has("platform.tenant.view"), false);
  assert.equal(
    tenantKeys.size === FIRMOS_PERMISSIONS.length &&
      platformKeys.size > 0 &&
      technicalKeys.size > 0,
    false,
  );
});

test("unknown permission strings remain denied on every plane", () => {
  const tenant = adminAuthorizationContext("firm-1", "user-1", "mem-1", "role-1");
  const platform = platformAdminAuthority("operator-1");
  const technical = technicalOperatorAuthority("it-1");
  for (const key of ["admin.all", "system.manage", "everything.manage", "superadmin"]) {
    assert.deepEqual(authorize(tenant, key, { type: "firm", firmId: "firm-1" }), {
      ok: false,
      reason: "permission_missing",
    });
    assert.deepEqual(authorizePlatform(platform, key), {
      ok: false,
      reason: "permission_missing",
    });
    assert.deepEqual(authorizeTechnical(technical, key), {
      ok: false,
      reason: "permission_missing",
    });
  }
});

test("platform and technical helpers do not accept client permission arrays", () => {
  const platformSource = readFileSync(join(process.cwd(), "src/lib/firmos/domain.ts"), "utf8");
  assert.equal(platformSource.includes("request.permissions"), false);
  const platform = platformAdminAuthority("operator-1");
  const spoofed = {
    ...platform,
    permissions: ["clients.view", "platform.tenant.view"],
  } as unknown as ReturnType<typeof platformAdminAuthority>;
  assert.deepEqual(authorizePlatform(spoofed, "platform.tenant.view"), {
    ok: false,
    reason: "inactive_context",
  });
});

test("JSON-deserialized tenant context is still denied", () => {
  const live = adminAuthorizationContext("firm-1", "user-1", "mem-1", "role-1");
  const parsed = JSON.parse(
    JSON.stringify({ ...live, permissions: [...live.permissions] }),
  ) as AuthorizationContext;
  assert.deepEqual(authorize(parsed, "clients.view", { type: "client", firmId: "firm-1" }), {
    ok: false,
    reason: "inactive_context",
  });
});
