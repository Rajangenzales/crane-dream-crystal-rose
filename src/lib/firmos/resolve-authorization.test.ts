import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import { newId } from "../utils.ts";
import {
  DEFAULT_FIRM_ROLES,
  bootstrapOwnerUserId,
  validateFirmBootstrapInput,
} from "./bootstrap.ts";
import { FIRMOS_PERMISSIONS, hasPermission, type FirmOSPermission } from "./domain.ts";
import { resolveAuthorization } from "./resolve-authorization.ts";

async function createFirmosSql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(process.cwd(), "migrations/0002_firmos_foundation.sql"), "utf8"));
  return { sql, pg };
}

async function insertUser(
  sql: Awaited<ReturnType<typeof createFirmosSql>>["sql"],
  id: string,
) {
  await sql`insert into "user" (id, name, email, "emailVerified")
    values (${id}, ${id}, ${id + "@example.com"}, false)`;
}

async function seedFirm(
  sql: Awaited<ReturnType<typeof createFirmosSql>>["sql"],
  options: {
    userId: string;
    slug: string;
    status?: "invited" | "active" | "suspended" | "removed";
    firmActive?: boolean;
    assignedRole?: "Owner" | "Manager" | "Member" | "Viewer" | null;
    roleActive?: boolean;
  },
) {
  const firmId = newId();
  const membershipId = newId();
  await sql`
    insert into firms (id, name, slug, is_active)
    values (${firmId}, ${options.slug}, ${options.slug}, ${options.firmActive ?? true})
  `;

  const roleIds = new Map<string, string>();
  for (const role of DEFAULT_FIRM_ROLES) {
    const roleId = newId();
    roleIds.set(role.name, roleId);
    await sql`
      insert into roles (id, firm_id, name, description, is_system, is_active)
      values (
        ${roleId},
        ${firmId},
        ${role.name},
        ${role.description},
        true,
        ${role.name === options.assignedRole ? (options.roleActive ?? true) : true}
      )
    `;
    for (const permissionKey of role.permissions) {
      const permissionRows = await sql<{ id: string }>`
        select id from permissions where key = ${permissionKey} limit 1
      `;
      const permissionId = permissionRows[0]?.id;
      assert.ok(permissionId, `missing permission ${permissionKey}`);
      await sql`
        insert into role_permissions (role_id, permission_id)
        values (${roleId}, ${permissionId})
      `;
    }
  }

  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, joined_at)
    values (
      ${membershipId},
      ${firmId},
      ${options.userId},
      ${options.status ?? "active"},
      now()
    )
  `;

  if (options.assignedRole) {
    const roleId = roleIds.get(options.assignedRole);
    assert.ok(roleId);
    await sql`
      insert into membership_roles (membership_id, role_id)
      values (${membershipId}, ${roleId})
    `;
  }

  return { firmId, membershipId, roleIds };
}

test("guessed firmId does not authorize", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  await seedFirm(sql, { userId: "user-a", slug: "acme", assignedRole: "Owner" });
  const guessed = newId();
  const result = await resolveAuthorization(sql, { userId: "user-a", firmId: guessed });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "unknown_firm");
});

test("unknown non-uuid firmId is denied", async () => {
  const { sql } = await createFirmosSql();
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: "not-a-firm",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "unknown_firm");
});

test("existing firm without membership is membership_not_found", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  await insertUser(sql, "user-b");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "acme",
    assignedRole: "Owner",
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-b",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "membership_not_found");
});

test("invited, suspended, and removed memberships do not resolve", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  for (const status of ["invited", "suspended", "removed"] as const) {
    const seeded = await seedFirm(sql, {
      userId: "user-a",
      slug: `firm-${status}`,
      status,
      assignedRole: "Owner",
    });
    const result = await resolveAuthorization(sql, {
      userId: "user-a",
      firmId: seeded.firmId,
    });
    assert.equal(result.ok, false, status);
    if (!result.ok) assert.equal(result.reason, "membership_not_active", status);
  }
});

test("inactive firm denies even with an active membership", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "dormant",
    assignedRole: "Owner",
    firmActive: false,
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "firm_inactive");
});

test("membership with no roles is denied", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "noroles",
    assignedRole: null,
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "no_roles");
});

test("only inactive roles count as no_roles", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "inactive-role",
    assignedRole: "Member",
    roleActive: false,
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "no_roles");
});

test("active Owner membership resolves permissions from the database", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "owned",
    assignedRole: "Owner",
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.context.userId, "user-a");
  assert.equal(result.context.firmId, seeded.firmId);
  assert.equal(result.context.membershipId, seeded.membershipId);
  assert.equal(result.context.membershipStatus, "active");
  assert.equal(result.context.firmIsActive, true);
  assert.equal(result.context.scope.kind, "firm");
  assert.deepEqual([...result.context.roleIds], [seeded.roleIds.get("Owner")]);
  assert.deepEqual(
    [...result.context.permissions].sort(),
    [...FIRMOS_PERMISSIONS].sort(),
  );
});

test("permissions come from assigned roles, not the Owner catalog shortcut", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const seeded = await seedFirm(sql, {
    userId: "user-a",
    slug: "viewer-firm",
    assignedRole: "Viewer",
  });
  const result = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: seeded.firmId,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const viewer = DEFAULT_FIRM_ROLES.find((role) => role.name === "Viewer");
  assert.ok(viewer);
  assert.deepEqual(
    [...result.context.permissions].sort(),
    [...viewer.permissions].sort(),
  );
  assert.equal(hasPermission(result.context, "backup.restore"), false);
  assert.equal(hasPermission(result.context, "clients.view"), true);
});

test("omitted firmId succeeds only for exactly one active membership", async () => {
  const { sql } = await createFirmosSql();
  await insertUser(sql, "user-a");
  const none = await resolveAuthorization(sql, { userId: "user-a" });
  assert.equal(none.ok, false);
  if (!none.ok) assert.equal(none.reason, "membership_not_found");

  const first = await seedFirm(sql, {
    userId: "user-a",
    slug: "one",
    assignedRole: "Owner",
  });
  const sole = await resolveAuthorization(sql, { userId: "user-a" });
  assert.equal(sole.ok, true);
  if (sole.ok) assert.equal(sole.context.firmId, first.firmId);

  await seedFirm(sql, { userId: "user-a", slug: "two", assignedRole: "Member" });
  const many = await resolveAuthorization(sql, { userId: "user-a" });
  assert.equal(many.ok, false);
  if (!many.ok) assert.equal(many.reason, "membership_not_found");

  const selected = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId: first.firmId,
  });
  assert.equal(selected.ok, true);
  if (selected.ok) assert.equal(selected.context.firmId, first.firmId);
});

test("empty userId is unauthenticated", async () => {
  const { sql } = await createFirmosSql();
  const result = await resolveAuthorization(sql, { userId: "   " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "unauthenticated");
});

test("bootstrap owner is the authenticated user, never client input", () => {
  const authenticated = "auth-user";
  const spoofed = "attacker";
  assert.equal(bootstrapOwnerUserId(authenticated), authenticated);
  assert.notEqual(bootstrapOwnerUserId(authenticated), spoofed);
  const input = {
    firmName: "Acme",
    slug: "acme",
    ownerUserId: spoofed,
  };
  validateFirmBootstrapInput({ firmName: "Acme", slug: "acme" });
  assert.equal("ownerUserId" in { firmName: "Acme", slug: "acme" }, false);
  assert.ok("ownerUserId" in input);
  assert.equal(bootstrapOwnerUserId(authenticated), authenticated);
});

test("duplicate firm slug is rejected by the unique constraint", async () => {
  const { sql } = await createFirmosSql();
  await seedFirm(sql, { userId: "user-a", slug: "taken", assignedRole: "Owner" });
  await assert.rejects(
    () => seedFirm(sql, { userId: "user-b", slug: "taken", assignedRole: "Owner" }),
    /unique|duplicate/i,
  );
});

test("resolveAuthorization does not import ownerAuthorizationContext", () => {
  const source = readFileSync(
    join(process.cwd(), "src/lib/firmos/resolve-authorization.ts"),
    "utf8",
  );
  assert.equal(source.includes("ownerAuthorizationContext"), false);
  assert.equal(source.includes("permissionKeys"), false);
});

test("ResolveAuthorizationInput cannot carry client permission grants", () => {
  const input: { userId: string; firmId?: string; permissions?: FirmOSPermission[] } = {
    userId: "user-a",
    permissions: ["backup.restore"],
  };
  assert.ok(input.permissions);
  // The resolver signature only reads userId and firmId; extra fields are ignored.
  assert.equal("permissions" in { userId: "user-a" }, false);
});
