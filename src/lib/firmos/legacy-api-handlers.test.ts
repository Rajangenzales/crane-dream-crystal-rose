import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  handleDeletePayment,
  handleGetDashboard,
  handleGetWorkspace,
  handleRestoreBackup,
  handleSavePayment,
  handleUpdateUserAccess,
} from "./legacy-api-handlers.ts";
import { BACKUP_VERSION } from "../backup.ts";
import { createTestSql } from "../db-test-utils.ts";
import { newId } from "../utils.ts";
import { executeFirmBootstrap } from "./bootstrap-core.ts";
import { DEFAULT_FIRM_ROLES } from "./bootstrap.ts";
import { FirmOSAuthorizationError } from "./errors.ts";

const MIGRATIONS = join(process.cwd(), "migrations");

async function createHandlerSql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0005_firmos_audit_events.sql"), "utf8"));
  return { sql, pg };
}

async function insertUser(sql: Awaited<ReturnType<typeof createHandlerSql>>["sql"], id: string) {
  await sql`insert into "user" (id, name, email, "emailVerified")
    values (${id}, ${id}, ${id + "@example.com"}, false)`;
}

async function assignNamedRole(
  sql: Awaited<ReturnType<typeof createHandlerSql>>["sql"],
  membershipId: string,
  firmId: string,
  roleName: "Admin" | "Manager" | "Member" | "Viewer",
) {
  const role = await sql<{ id: string }>`
    select id from roles where firm_id = ${firmId} and name = ${roleName} limit 1
  `;
  assert.ok(role[0]?.id);
  await sql`delete from membership_roles where membership_id = ${membershipId}`;
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${membershipId}, ${role[0].id})
  `;
}

async function assignPermissionKeys(
  sql: Awaited<ReturnType<typeof createHandlerSql>>["sql"],
  membershipId: string,
  firmId: string,
  keys: readonly string[],
) {
  const roleId = newId();
  await sql`
    insert into roles (id, firm_id, name, description, is_system)
    values (${roleId}, ${firmId}, ${"EditOnly-" + roleId.slice(0, 8)}, ${"test"}, false)
  `;
  for (const key of keys) {
    const perm = await sql<{ id: string }>`
      select id from permissions where key = ${key} limit 1
    `;
    assert.ok(perm[0]?.id, key);
    await sql`
      insert into role_permissions (role_id, permission_id)
      values (${roleId}, ${perm[0].id})
    `;
  }
  await sql`delete from membership_roles where membership_id = ${membershipId}`;
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${membershipId}, ${roleId})
  `;
}

test("updateUserAccess derives permissions from the supplied mutation", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "admin-u");
  await insertUser(sql, "target-u");
  await executeFirmBootstrap(sql, "admin-u", { firmName: "Users", slug: "users-h7" });
  await sql`
    insert into app_profiles (user_id, role, is_active)
    values ('target-u', 'viewer', true)
  `;

  await assert.rejects(
    () => handleUpdateUserAccess(sql, "admin-u", { userId: "target-u" }),
    /No user access change was supplied/,
  );

  await handleUpdateUserAccess(sql, "admin-u", { userId: "target-u", role: "admin" });
  const afterRole = await sql<{ role: string }>`
    select role from app_profiles where user_id = 'target-u'
  `;
  assert.equal(afterRole[0]?.role, "admin");

  await handleUpdateUserAccess(sql, "admin-u", { userId: "target-u", isActive: false });
  const afterDisable = await sql<{ is_active: boolean }>`
    select is_active from app_profiles where user_id = 'target-u'
  `;
  assert.equal(afterDisable[0]?.is_active === true || afterDisable[0]?.is_active === "t", false);

  await insertUser(sql, "member-u");
  const memberFirm = await executeFirmBootstrap(sql, "member-u", {
    firmName: "MemberUsers",
    slug: "member-users-h7",
  });
  await assignNamedRole(sql, memberFirm.ownerMembershipId, memberFirm.firmId, "Member");
  await assert.rejects(
    () => handleUpdateUserAccess(sql, "member-u", { userId: "target-u", role: "viewer" }),
    FirmOSAuthorizationError,
  );
  await assert.rejects(
    () => handleUpdateUserAccess(sql, "member-u", { userId: "target-u", isActive: true }),
    FirmOSAuthorizationError,
  );
  await assert.rejects(
    () =>
      handleUpdateUserAccess(sql, "member-u", {
        userId: "target-u",
        role: "viewer",
        isActive: true,
      }),
    FirmOSAuthorizationError,
  );
});

test("updateUserAccess requires both permissions when both fields are supplied", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "editor-u");
  await insertUser(sql, "target-edit");
  const firm = await executeFirmBootstrap(sql, "editor-u", {
    firmName: "EditOnly",
    slug: "edit-only-h7",
  });
  await sql`
    insert into app_profiles (user_id, role, is_active)
    values ('target-edit', 'viewer', true)
  `;
  await assignPermissionKeys(sql, firm.ownerMembershipId, firm.firmId, [
    "firm.view",
    "users.edit",
  ]);

  await handleUpdateUserAccess(sql, "editor-u", { userId: "target-edit", role: "admin" });
  const afterRole = await sql<{ role: string; is_active: boolean }>`
    select role, is_active from app_profiles where user_id = 'target-edit'
  `;
  assert.equal(afterRole[0]?.role, "admin");
  assert.equal(afterRole[0]?.is_active === false, false);

  await assert.rejects(
    () => handleUpdateUserAccess(sql, "editor-u", { userId: "target-edit", isActive: false }),
    FirmOSAuthorizationError,
  );
  await assert.rejects(
    () =>
      handleUpdateUserAccess(sql, "editor-u", {
        userId: "target-edit",
        role: "viewer",
        isActive: false,
      }),
    FirmOSAuthorizationError,
  );
  const unchanged = await sql<{ role: string; is_active: boolean }>`
    select role, is_active from app_profiles where user_id = 'target-edit'
  `;
  assert.equal(unchanged[0]?.role, "admin");
  assert.equal(unchanged[0]?.is_active === true || unchanged[0]?.is_active === "t", true);
});

test("savePayment and deletePayment authorize create vs correct at the handler", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "admin-p");
  await executeFirmBootstrap(sql, "admin-p", { firmName: "Pay", slug: "pay-h7" });
  const clientId = newId();
  await sql`insert into clients (id, name) values (${clientId}, 'Acme')`;

  const created = await handleSavePayment(sql, "admin-p", {
    clientId,
    year: 2026,
    month: 9,
    status: "pending",
    amount: 10,
  });
  assert.ok(created.id);

  await handleSavePayment(sql, "admin-p", {
    id: created.id,
    clientId,
    year: 2026,
    month: 9,
    status: "received",
    amount: 12,
  });

  await insertUser(sql, "mgr-p");
  const mgrFirm = await executeFirmBootstrap(sql, "mgr-p", { firmName: "MgrPay", slug: "mgr-pay-h7" });
  await assignNamedRole(sql, mgrFirm.ownerMembershipId, mgrFirm.firmId, "Manager");
  await handleSavePayment(sql, "mgr-p", {
    clientId,
    year: 2026,
    month: 9,
    status: "pending",
    amount: 5,
  });
  await assert.rejects(
    () =>
      handleSavePayment(sql, "mgr-p", {
        id: created.id,
        clientId,
        year: 2026,
        month: 9,
        status: "received",
        amount: 99,
      }),
    FirmOSAuthorizationError,
  );
  const unchanged = await sql<{ amount: string | number | null }>`
    select amount from payments where id = ${created.id}
  `;
  assert.equal(Number(unchanged[0]?.amount), 12);

  await insertUser(sql, "member-p");
  const memberFirm = await executeFirmBootstrap(sql, "member-p", {
    firmName: "MemPay",
    slug: "mem-pay-h7",
  });
  await assignNamedRole(sql, memberFirm.ownerMembershipId, memberFirm.firmId, "Member");
  await assert.rejects(
    () =>
      handleSavePayment(sql, "member-p", {
        clientId,
        year: 2026,
        month: 9,
        status: "pending",
        amount: 1,
      }),
    FirmOSAuthorizationError,
  );
  await assert.rejects(
    () => handleDeletePayment(sql, "member-p", { id: created.id }),
    FirmOSAuthorizationError,
  );
  await handleDeletePayment(sql, "admin-p", { id: created.id });
  const gone = await sql<{ n: number }>`select count(*)::int as n from payments where id = ${created.id}`;
  assert.equal(gone[0]?.n, 0);
});

test("restoreBackup denies Firm Admin before touching restore internals", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "admin-b");
  await executeFirmBootstrap(sql, "admin-b", { firmName: "Bak", slug: "bak-h7" });
  const clientId = newId();
  await sql`insert into clients (id, name) values (${clientId}, 'Keep')`;
  await assert.rejects(
    () =>
      handleRestoreBackup(sql, "admin-b", {
        payload: { version: BACKUP_VERSION, clients: [] },
      }),
    FirmOSAuthorizationError,
  );
  const kept = await sql<{ n: number }>`select count(*)::int as n from clients where id = ${clientId}`;
  assert.equal(kept[0]?.n, 1);
});

test("getDashboard requires work.view and redacts finance without finance.view", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "viewer-d");
  const firm = await executeFirmBootstrap(sql, "viewer-d", { firmName: "Dash", slug: "dash-h7" });
  await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, "Viewer");
  const clientId = newId();
  await sql`insert into clients (id, name, is_active) values (${clientId}, 'Lumina', true)`;
  await sql`insert into payments (id, client_id, year, month, status, amount)
    values (${newId()}, ${clientId}, 2026, 9, 'received', 85000)`;

  const dash = await handleGetDashboard(sql, "viewer-d", { year: 2026, month: 9 });
  assert.equal(dash.clientRows.length >= 1, true);
  assert.equal(dash.paymentsReceived, 0);
  assert.equal(dash.clientRows.some((row) => row.paymentAmount === 85000), false);

  await insertUser(sql, "admin-d");
  await executeFirmBootstrap(sql, "admin-d", { firmName: "DashAdmin", slug: "dash-admin-h7" });
  const adminDash = await handleGetDashboard(sql, "admin-d", { year: 2026, month: 9 });
  assert.equal(adminDash.paymentsReceived > 0, true);
});

test("getWorkspace requires work.view and redacts payments without finance.view", async () => {
  const { sql } = await createHandlerSql();
  await insertUser(sql, "viewer-w");
  const firm = await executeFirmBootstrap(sql, "viewer-w", { firmName: "Ws", slug: "ws-h7" });
  await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, "Viewer");

  const workspace = await handleGetWorkspace(sql, "viewer-w", async () => ({
    payments: [{ amount: 85000, notes: "secret" }],
  }));
  assert.equal(workspace.payments[0]?.amount, null);
  assert.equal(workspace.payments[0]?.notes, "");

  await insertUser(sql, "admin-w");
  await executeFirmBootstrap(sql, "admin-w", { firmName: "WsAdmin", slug: "ws-admin-h7" });
  const adminWs = await handleGetWorkspace(sql, "admin-w", async () => ({
    payments: [{ amount: 85000, notes: "secret" }],
  }));
  assert.equal(adminWs.payments[0]?.amount, 85000);
  assert.equal(adminWs.payments[0]?.notes, "secret");

  await insertUser(sql, "nobody-w");
  await assert.rejects(
    () =>
      handleGetDashboard(sql, "nobody-w", { year: 2026, month: 9 }),
    FirmOSAuthorizationError,
  );
});

test("handler module still has no requireAdmin gates", () => {
  const source = readFileSync(
    join(process.cwd(), "src/lib/firmos/legacy-api-handlers.ts"),
    "utf8",
  );
  assert.equal(source.includes("requireAdmin"), false);
  assert.equal(source.includes("requireActive"), false);
  assert.equal(DEFAULT_FIRM_ROLES[0]?.name, "Admin");
});
