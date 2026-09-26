import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import { newId } from "../utils.ts";
import { ADMIN_PERMISSIONS, DEFAULT_FIRM_ROLES } from "./bootstrap.ts";
import { FIRMOS_PERMISSIONS } from "./domain.ts";
import { resolveAuthorization } from "./resolve-authorization.ts";

const MIGRATIONS = join(process.cwd(), "migrations");

async function createIntegritySql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8"));
  return { sql, pg };
}

async function grantRolePermissions(
  sql: Awaited<ReturnType<typeof createIntegritySql>>["sql"],
  roleId: string,
  permissions: readonly string[],
) {
  for (const permissionKey of permissions) {
    const rows = await sql<{ id: string }>`
      select id from permissions where key = ${permissionKey} limit 1
    `;
    const permissionId = rows[0]?.id;
    assert.ok(permissionId, permissionKey);
    await sql`
      insert into role_permissions (role_id, permission_id)
      values (${roleId}, ${permissionId})
    `;
  }
}

async function seedFirmWithRoles(
  sql: Awaited<ReturnType<typeof createIntegritySql>>["sql"],
  slug: string,
) {
  const firmId = newId();
  await sql`
    insert into firms (id, name, slug)
    values (${firmId}, ${slug}, ${slug})
  `;
  const roleIds = new Map<string, string>();
  for (const role of DEFAULT_FIRM_ROLES) {
    const roleId = newId();
    roleIds.set(role.name, roleId);
    await sql`
      insert into roles (id, firm_id, name, description, is_system)
      values (${roleId}, ${firmId}, ${role.name}, ${role.description}, true)
    `;
    await grantRolePermissions(sql, roleId, role.permissions);
  }
  return { firmId, roleIds };
}

test("same-firm membership_roles insert succeeds without supplying firm_id", async () => {
  const { sql } = await createIntegritySql();
  const { firmId, roleIds } = await seedFirmWithRoles(sql, "acme");
  const membershipId = newId();
  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, joined_at)
    values (${membershipId}, ${firmId}, ${"user-a"}, 'active', now())
  `;
  const adminRoleId = roleIds.get("Admin");
  assert.ok(adminRoleId);
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${membershipId}, ${adminRoleId})
  `;
  const rows = await sql<{ firm_id: string }>`
    select firm_id from membership_roles where membership_id = ${membershipId}
  `;
  assert.equal(rows[0]?.firm_id, firmId);

  const resolved = await resolveAuthorization(sql, {
    userId: "user-a",
    firmId,
  });
  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.context.membershipId, membershipId);
    assert.equal(hasAllAdminKeys(resolved.context.permissions), true);
    assert.equal(resolved.context.permissions.has("backup.restore"), false);
  }
});

function hasAllAdminKeys(permissions: ReadonlySet<string>): boolean {
  return ADMIN_PERMISSIONS.every((key) => permissions.has(key));
}

test("cross-firm membership_roles insert fails at the database layer", async () => {
  const { sql } = await createIntegritySql();
  const firmA = await seedFirmWithRoles(sql, "firm-a");
  const firmB = await seedFirmWithRoles(sql, "firm-b");
  const membershipId = newId();
  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, joined_at)
    values (${membershipId}, ${firmA.firmId}, ${"user-a"}, 'active', now())
  `;
  const foreignRoleId = firmB.roleIds.get("Admin");
  assert.ok(foreignRoleId);
  await assert.rejects(
    () =>
      sql`
        insert into membership_roles (membership_id, role_id)
        values (${membershipId}, ${foreignRoleId})
      `,
    /another firm|same firm|foreign key|23514/i,
  );
  const rows = await sql<{ n: string }>`
    select count(*)::text as n from membership_roles where membership_id = ${membershipId}
  `;
  assert.equal(rows[0]?.n, "0");
});

test("bootstrap-style Admin assignment remains valid", async () => {
  const { sql } = await createIntegritySql();
  const { firmId, roleIds } = await seedFirmWithRoles(sql, "boot");
  const membershipId = newId();
  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, display_name, joined_at)
    values (${membershipId}, ${firmId}, ${"owner-user"}, 'active', null, now())
  `;
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${membershipId}, ${roleIds.get("Admin")})
  `;
  const unique = await sql<{ n: string }>`
    select count(*)::text as n from firm_memberships where firm_id = ${firmId} and user_id = ${"owner-user"}
  `;
  assert.equal(unique[0]?.n, "1");
  await assert.rejects(
    () =>
      sql`
        insert into firm_memberships (id, firm_id, user_id, status)
        values (${newId()}, ${firmId}, ${"owner-user"}, 'active')
      `,
    /unique|duplicate/i,
  );
});

test("deleting a firm cascades roles but keeps the global permission catalog", async () => {
  const { sql } = await createIntegritySql();
  const a = await seedFirmWithRoles(sql, "keep");
  const b = await seedFirmWithRoles(sql, "drop");
  const membershipId = newId();
  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, joined_at)
    values (${membershipId}, ${b.firmId}, ${"user-b"}, 'active', now())
  `;
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${membershipId}, ${b.roleIds.get("Admin")})
  `;

  const before = await sql<{ n: string }>`select count(*)::text as n from permissions`;
  await sql`delete from firms where id = ${b.firmId}`;

  const after = await sql<{ n: string }>`select count(*)::text as n from permissions`;
  assert.equal(after[0]?.n, before[0]?.n);
  assert.equal(Number(after[0]?.n), FIRMOS_PERMISSIONS.length);

  const droppedRoles = await sql<{ n: string }>`
    select count(*)::text as n from roles where firm_id = ${b.firmId}
  `;
  assert.equal(droppedRoles[0]?.n, "0");
  const droppedLinks = await sql<{ n: string }>`
    select count(*)::text as n from membership_roles where membership_id = ${membershipId}
  `;
  assert.equal(droppedLinks[0]?.n, "0");

  const kept = await sql<{ name: string }>`
    select name from roles where firm_id = ${a.firmId} and name = 'Admin'
  `;
  assert.equal(kept[0]?.name, "Admin");
});

test("two firms may both have an Admin role", async () => {
  const { sql } = await createIntegritySql();
  const a = await seedFirmWithRoles(sql, "one");
  const b = await seedFirmWithRoles(sql, "two");
  const namesA = await sql<{ name: string }>`
    select name from roles where firm_id = ${a.firmId} and name = 'Admin'
  `;
  const namesB = await sql<{ name: string }>`
    select name from roles where firm_id = ${b.firmId} and name = 'Admin'
  `;
  assert.equal(namesA.length, 1);
  assert.equal(namesB.length, 1);
  assert.notEqual(a.roleIds.get("Admin"), b.roleIds.get("Admin"));
});

test("0004_firmos_membership_integrity.sql is idempotent", async () => {
  const { pg } = await createTestSql();
  const foundation = readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8");
  const integrity = readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8");
  await pg.exec(foundation);
  await pg.exec(integrity);
  await pg.exec(integrity);
});
