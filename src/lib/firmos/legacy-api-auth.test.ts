import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import { newId } from "../utils.ts";
import { executeFirmBootstrap } from "./bootstrap-core.ts";
import { ADMIN_PERMISSIONS, DEFAULT_FIRM_ROLES } from "./bootstrap.ts";
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
  type FirmOSPermission,
} from "./domain.ts";
import { FirmOSAuthorizationError, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE } from "./errors.ts";
import {
  canViewFinance,
  clientUpdatePermission,
  paymentSavePermission,
  redactPaymentRecords,
  requireFirmOSAction,
  userAccessPermissions,
} from "./legacy-api-auth.ts";

async function createPhase7Sql() {
  const { sql, pg } = await createTestSql();
  return { sql, pg };
}

async function insertUser(sql: Awaited<ReturnType<typeof createPhase7Sql>>["sql"], id: string) {
  await sql`insert into "user" (id, name, email, "emailVerified")
    values (${id}, ${id}, ${id + "@example.com"}, false)`;
}

async function assignNamedRole(
  sql: Awaited<ReturnType<typeof createPhase7Sql>>["sql"],
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

test("api.ts no longer uses requireAdmin or requireActive", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/api.ts"), "utf8");
  assert.equal(source.includes("requireAdmin("), false);
  assert.equal(source.includes("requireActive("), false);
  assert.equal(source.includes("canSeePayments"), false);
  assert.equal(source.includes("requireFirmOSAction"), true);
  assert.equal(source.includes("JSON.parse(JSON.stringify"), false);
  const session = source.slice(
    source.indexOf("export const getSessionWorkspace"),
    source.indexOf("export const updateSettings"),
  );
  assert.equal(session.includes("requireFirmOSAction"), false);
  assert.equal(source.includes("getDashboard({"), false);
  assert.equal(source.includes("getWorkspace({"), false);
  assert.equal(source.includes('from "@/lib/firmos/legacy-api-handlers"'), true);
  assert.equal(source.includes("handleUpdateUserAccess(sql, context.userId, data)"), true);
  assert.equal(source.includes("handleSavePayment(sql, context.userId, data)"), true);
  assert.equal(source.includes("handleRestoreBackup(sql, context.userId, data)"), true);
});

test("legacy-api-auth does not deserialize privilege context", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/firmos/legacy-api-auth.ts"), "utf8");
  assert.equal(source.includes("JSON.parse"), false);
  assert.equal(source.includes("isPlatformAdmin"), false);
  assert.equal(source.includes("app_profiles"), false);
  assert.equal(source.includes("requireAdmin"), false);
});

test("client/payment/user mutation pickers stay split", () => {
  assert.equal(clientUpdatePermission(undefined), "clients.edit");
  assert.equal(clientUpdatePermission(true), "clients.edit");
  assert.equal(clientUpdatePermission(false), "clients.archive");
  assert.equal(paymentSavePermission(undefined), "payments.create");
  assert.equal(paymentSavePermission("pay-1"), "payments.correct");
  assert.deepEqual(userAccessPermissions({ role: "viewer" }), ["users.edit"]);
  assert.deepEqual(userAccessPermissions({ isActive: false }), ["users.disable"]);
  assert.deepEqual(userAccessPermissions({ isActive: true }), ["users.disable"]);
  assert.deepEqual(userAccessPermissions({}), []);
  assert.deepEqual(userAccessPermissions({ role: "admin", isActive: false }), [
    "users.edit",
    "users.disable",
  ]);
});

test("unauthenticated and missing membership deny", async () => {
  const { sql } = await createPhase7Sql();
  await assert.rejects(
    () => requireFirmOSAction(sql, "", "clients.view", { type: "client" }),
    FirmOSAuthorizationError,
  );
  await insertUser(sql, "nobody");
  await assert.rejects(
    () => requireFirmOSAction(sql, "nobody", "clients.view", { type: "client" }),
    (error: unknown) => {
      assert.ok(error instanceof FirmOSAuthorizationError);
      assert.equal(error.publicMessage, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
      assert.equal(error.message.includes("clients.view"), false);
      return true;
    },
  );
});

test("inactive membership and inactive firm deny", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "inactive-user");
  const created = await executeFirmBootstrap(sql, "inactive-user", {
    firmName: "Paused",
    slug: "paused-p7",
  });
  await sql`
    update firm_memberships set status = 'suspended' where id = ${created.ownerMembershipId}
  `;
  await assert.rejects(
    () => requireFirmOSAction(sql, "inactive-user", "firm.view", { type: "firm" }),
    FirmOSAuthorizationError,
  );

  await insertUser(sql, "dead-firm-user");
  const firm = await executeFirmBootstrap(sql, "dead-firm-user", {
    firmName: "Dead",
    slug: "dead-p7",
  });
  await sql`update firms set is_active = false where id = ${firm.firmId}`;
  await assert.rejects(
    () => requireFirmOSAction(sql, "dead-firm-user", "firm.view", { type: "firm" }),
    FirmOSAuthorizationError,
  );
});

test("two active memberships fail closed", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "two-firms");
  await executeFirmBootstrap(sql, "two-firms", { firmName: "One", slug: "one-p7" });
  await executeFirmBootstrap(sql, "two-firms", { firmName: "Two", slug: "two-p7" });
  await assert.rejects(
    () => requireFirmOSAction(sql, "two-firms", "clients.view", { type: "client" }),
    FirmOSAuthorizationError,
  );
});

test("Admin backup.create allowed and backup.restore denied", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "admin-1");
  await executeFirmBootstrap(sql, "admin-1", { firmName: "Acme", slug: "acme-p7" });
  const createCtx = await requireFirmOSAction(sql, "admin-1", "backup.create", { type: "backup" });
  assert.equal(hasPermission(createCtx, "backup.create"), true);
  assert.equal(hasPermission(createCtx, "backup.restore"), false);
  await assert.rejects(
    () => requireFirmOSAction(sql, "admin-1", "backup.restore", { type: "backup" }),
    FirmOSAuthorizationError,
  );
});

test("app_profiles.admin does not bypass missing FirmOS permission", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "legacy-admin");
  await sql`
    insert into app_profiles (user_id, role, is_active)
    values ('legacy-admin', 'admin', true)
  `;
  await assert.rejects(
    () => requireFirmOSAction(sql, "legacy-admin", "firm.manage", { type: "firm" }),
    FirmOSAuthorizationError,
  );

  const memberFirm = await executeFirmBootstrap(sql, "legacy-admin", {
    firmName: "MemberFirm",
    slug: "member-p7",
  });
  await assignNamedRole(sql, memberFirm.ownerMembershipId, memberFirm.firmId, "Member");
  await assert.rejects(
    () => requireFirmOSAction(sql, "legacy-admin", "clients.create", { type: "firm" }),
    FirmOSAuthorizationError,
  );
  const view = await requireFirmOSAction(sql, "legacy-admin", "clients.view", { type: "client" });
  assert.equal(hasPermission(view, "clients.view"), true);
});

test("Member cannot create clients, payments, restore, or list audit", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "member-1");
  const firm = await executeFirmBootstrap(sql, "member-1", {
    firmName: "Ops",
    slug: "ops-p7",
  });
  await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, "Member");
  for (const key of [
    "clients.create",
    "payments.create",
    "backup.restore",
    "audit.view",
    "users.create",
    "reports.generate",
  ] as const) {
    await assert.rejects(
      () => requireFirmOSAction(sql, "member-1", key, { type: "firm" }),
      FirmOSAuthorizationError,
    );
  }
  await requireFirmOSAction(sql, "member-1", "work.view", { type: "firm" });
});

test("default role catalogs remain Phase 6 grants", async () => {
  const { sql } = await createPhase7Sql();
  for (const role of DEFAULT_FIRM_ROLES) {
    await insertUser(sql, `role-${role.name}`);
    const firm = await executeFirmBootstrap(sql, `role-${role.name}`, {
      firmName: role.name,
      slug: `role-${role.name.toLowerCase()}-p7`,
    });
    await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, role.name);
    const ctx = await requireFirmOSAction(sql, `role-${role.name}`, "firm.view", { type: "firm" });
    assert.deepEqual([...ctx.permissions].sort(), [...role.permissions].sort());
  }
  assert.equal(ADMIN_PERMISSIONS.includes("backup.restore"), false);
});

test("finance.view is required and viewers_see_payments is not a grant", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "viewer-1");
  const firm = await executeFirmBootstrap(sql, "viewer-1", {
    firmName: "View",
    slug: "view-p7",
  });
  await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, "Viewer");
  await sql`
    insert into app_settings (key, value) values ('viewers_see_payments', 'true')
    on conflict (key) do update set value = excluded.value
  `;
  await assert.rejects(
    () => requireFirmOSAction(sql, "viewer-1", "finance.view", { type: "firm" }),
    FirmOSAuthorizationError,
  );
  const ctx = await requireFirmOSAction(sql, "viewer-1", "work.view", { type: "firm" });
  assert.equal(canViewFinance(ctx), false);
  const redacted = redactPaymentRecords(ctx, [
    { amount: 99, notes: "secret" },
  ]);
  assert.equal(redacted[0]?.amount, null);
  assert.equal(redacted[0]?.notes, "");
});

test("Admin can view finance; reports keys are not collapsed", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "admin-2");
  await executeFirmBootstrap(sql, "admin-2", { firmName: "Rep", slug: "rep-p7" });
  const ctx = await requireFirmOSAction(sql, "admin-2", "reports.view", { type: "report" });
  assert.equal(hasPermission(ctx, "reports.view"), true);
  assert.equal(hasPermission(ctx, "reports.generate"), true);
  assert.equal(hasPermission(ctx, "reports.export"), true);
  await requireFirmOSAction(sql, "admin-2", "reports.generate", { type: "report" });
  await requireFirmOSAction(sql, "admin-2", "finance.view", { type: "firm" });

  await insertUser(sql, "viewer-2");
  const viewerFirm = await executeFirmBootstrap(sql, "viewer-2", {
    firmName: "RepV",
    slug: "repv-p7",
  });
  await assignNamedRole(sql, viewerFirm.ownerMembershipId, viewerFirm.firmId, "Viewer");
  await requireFirmOSAction(sql, "viewer-2", "reports.view", { type: "report" });
  await assert.rejects(
    () => requireFirmOSAction(sql, "viewer-2", "reports.generate", { type: "report" }),
    FirmOSAuthorizationError,
  );
  await assert.rejects(
    () => requireFirmOSAction(sql, "viewer-2", "reports.export", { type: "report" }),
    FirmOSAuthorizationError,
  );
});

test("user and client permission keys are enforced independently", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "mgr");
  const firm = await executeFirmBootstrap(sql, "mgr", { firmName: "Mgr", slug: "mgr-p7" });
  await assignNamedRole(sql, firm.ownerMembershipId, firm.firmId, "Manager");
  await requireFirmOSAction(sql, "mgr", "clients.view", { type: "client" });
  await requireFirmOSAction(sql, "mgr", "clients.create", { type: "firm" });
  await requireFirmOSAction(sql, "mgr", "clients.edit", { type: "client" });
  await requireFirmOSAction(sql, "mgr", "clients.archive", { type: "client" });
  await requireFirmOSAction(sql, "mgr", "users.view", { type: "firm" });
  for (const key of ["users.create", "users.edit", "users.disable"] as const) {
    await assert.rejects(
      () => requireFirmOSAction(sql, "mgr", key, { type: "firm" }),
      FirmOSAuthorizationError,
    );
  }

  await insertUser(sql, "admin-users");
  await executeFirmBootstrap(sql, "admin-users", { firmName: "Users", slug: "users-p7" });
  await requireFirmOSAction(sql, "admin-users", "users.view", { type: "firm" });
  await requireFirmOSAction(sql, "admin-users", "users.create", { type: "firm" });
  await requireFirmOSAction(sql, "admin-users", "users.edit", { type: "membership" });
  await requireFirmOSAction(sql, "admin-users", "users.disable", { type: "membership" });
});

test("guessed firm id cannot override the resolved tenant", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "guess");
  const mine = await executeFirmBootstrap(sql, "guess", { firmName: "Mine", slug: "mine-p7" });
  const ctx = await requireFirmOSAction(sql, "guess", "clients.view", { type: "client" });
  assert.equal(ctx.firmId, mine.firmId);
  const otherFirmId = newId();
  assert.deepEqual(
    authorize(ctx, "clients.view", { type: "client", firmId: otherFirmId }),
    { ok: false, reason: "tenant_mismatch" },
  );
});

test("services, work, and payments keys are enforced independently", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "member-svc");
  const memberFirm = await executeFirmBootstrap(sql, "member-svc", {
    firmName: "Svc",
    slug: "svc-p7",
  });
  await assignNamedRole(sql, memberFirm.ownerMembershipId, memberFirm.firmId, "Member");
  await requireFirmOSAction(sql, "member-svc", "services.view", { type: "firm" });
  await requireFirmOSAction(sql, "member-svc", "clients.view", { type: "client" });
  await requireFirmOSAction(sql, "member-svc", "work.view", { type: "firm" });
  for (const key of [
    "services.create",
    "services.edit",
    "work.update",
    "payments.create",
    "payments.correct",
    "finance.view",
    "clients.archive",
    "clients.create",
  ] as const) {
    await assert.rejects(
      () => requireFirmOSAction(sql, "member-svc", key, { type: "firm" }),
      FirmOSAuthorizationError,
    );
  }

  await insertUser(sql, "mgr-pay");
  const mgrFirm = await executeFirmBootstrap(sql, "mgr-pay", {
    firmName: "Pay",
    slug: "pay-p7",
  });
  await assignNamedRole(sql, mgrFirm.ownerMembershipId, mgrFirm.firmId, "Manager");
  await requireFirmOSAction(sql, "mgr-pay", "services.create", { type: "firm" });
  await requireFirmOSAction(sql, "mgr-pay", "services.edit", { type: "service" });
  await requireFirmOSAction(sql, "mgr-pay", "work.update", { type: "firm" });
  await requireFirmOSAction(sql, "mgr-pay", "payments.create", { type: "payment" });
  await requireFirmOSAction(sql, "mgr-pay", "finance.view", { type: "firm" });
  await assert.rejects(
    () => requireFirmOSAction(sql, "mgr-pay", "payments.correct", { type: "payment" }),
    FirmOSAuthorizationError,
  );

  await insertUser(sql, "admin-pay");
  await executeFirmBootstrap(sql, "admin-pay", { firmName: "AdminPay", slug: "admin-pay-p7" });
  await requireFirmOSAction(sql, "admin-pay", "payments.create", { type: "payment" });
  await requireFirmOSAction(sql, "admin-pay", "payments.correct", { type: "payment" });
  await requireFirmOSAction(sql, "admin-pay", "finance.view", { type: "firm" });
  await requireFirmOSAction(sql, "admin-pay", "audit.view", { type: "audit_event" });
});

test("Firm membership cannot satisfy Platform or Technical authorization", async () => {
  const { sql } = await createPhase7Sql();
  await insertUser(sql, "admin-plane");
  await executeFirmBootstrap(sql, "admin-plane", { firmName: "Plane", slug: "plane-p7" });
  const ctx = await requireFirmOSAction(sql, "admin-plane", "firm.manage", { type: "firm" });
  for (const key of [...FIRMOS_PLATFORM_PERMISSIONS, ...FIRMOS_TECHNICAL_PERMISSIONS]) {
    assert.equal(isFirmOSPermission(key), false);
    assert.equal([...ctx.permissions].includes(key as FirmOSPermission), false);
    assert.deepEqual(authorize(ctx, key, { type: "firm", firmId: ctx.firmId }), {
      ok: false,
      reason: "permission_missing",
    });
  }
  const platform = platformAdminAuthority("operator-1");
  const technical = technicalOperatorAuthority("it-1");
  assert.deepEqual(authorizePlatform(platform, "clients.view"), {
    ok: false,
    reason: "permission_missing",
  });
  assert.deepEqual(authorizeTechnical(technical, "finance.view"), {
    ok: false,
    reason: "permission_missing",
  });
  assert.deepEqual(authorizePlatform(platform, "diagnostics.view"), {
    ok: false,
    reason: "permission_missing",
  });
  assert.deepEqual(authorizeTechnical(technical, "platform.tenant.view"), {
    ok: false,
    reason: "permission_missing",
  });
});

test("requireFirmOSAction ignores client firmId and privilege fields", async () => {
  const helper = readFileSync(join(process.cwd(), "src/lib/firmos/legacy-api-auth.ts"), "utf8");
  assert.equal(helper.includes("resolveAuthorization(sql, { userId })"), true);
  assert.equal(helper.includes("firmId: resolved.context.firmId"), true);
  assert.equal(helper.includes("input.firmId"), false);
  assert.equal(helper.includes("request.permissions"), false);

  const { sql } = await createPhase7Sql();
  await insertUser(sql, "hint");
  const created = await executeFirmBootstrap(sql, "hint", { firmName: "Hint", slug: "hint-p7" });
  const ctx = await requireFirmOSAction(sql, "hint", "clients.view", {
    type: "client",
    id: "client-from-request",
  });
  assert.equal(ctx.firmId, created.firmId);
  assert.deepEqual(
    authorize(ctx, "clients.view", {
      type: "client",
      firmId: newId(),
      id: "client-from-request",
    }),
    { ok: false, reason: "tenant_mismatch" },
  );
});

test("unknown permissions deny and catalogs stay frozen", () => {
  assert.equal(FIRMOS_PERMISSIONS.includes("users.manage" as FirmOSPermission), false);
  assert.equal(clientUpdatePermission(false) === "clients.edit", false);
});
