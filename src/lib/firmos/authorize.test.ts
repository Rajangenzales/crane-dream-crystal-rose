import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  FIRMOS_PERMISSIONS,
  authorize,
  hasPermission,
  isFirmOSPermission,
  type AuthorizationContext,
  type FirmOSPermission,
  type ProtectedResource,
} from "./domain.ts";

const FIRM_A = "11111111-1111-4111-8111-111111111111";
const FIRM_B = "22222222-2222-4222-8222-222222222222";
const MEMBERSHIP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBERSHIP_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLIENT_1 = "client-1";
const CLIENT_2 = "client-2";

function serverContext(overrides: {
  firmId?: string;
  membershipId?: string;
  permissions?: ReadonlySet<FirmOSPermission>;
  scope?: AuthorizationContext["scope"];
}): AuthorizationContext {
  return {
    userId: "user-1",
    firmId: overrides.firmId ?? FIRM_A,
    membershipId: overrides.membershipId ?? MEMBERSHIP_A,
    membershipStatus: "active",
    roleIds: ["role-1"],
    permissions: overrides.permissions ?? new Set<FirmOSPermission>(["clients.view", "work.view", "firm.view"]),
    firmIsActive: true,
    scope: overrides.scope ?? { kind: "firm" },
  };
}

function resource(
  type: ProtectedResource["type"],
  firmId: string,
  extra: Partial<ProtectedResource> = {},
): ProtectedResource {
  return { type, firmId, ...extra };
}

test("authorize source does not use ownerAuthorizationContext as a shortcut", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/firmos/domain.ts"), "utf8");
  assert.equal(source.includes("ownerAuthorizationContext"), false);
  assert.equal(source.includes("JSON.parse"), false);
});

test("valid permission plus same-firm resource is allowed", () => {
  const context = serverContext({});
  const result = authorize(context, "clients.view", resource("client", FIRM_A, { clientId: CLIENT_1 }));
  assert.deepEqual(result, { ok: true });
});

test("valid permission plus different-firm resource is denied", () => {
  const context = serverContext({});
  const result = authorize(context, "clients.view", resource("client", FIRM_B, { clientId: CLIENT_1 }));
  assert.deepEqual(result, { ok: false, reason: "tenant_mismatch" });
});

test("hasPermission true does not override tenant mismatch", () => {
  const context = serverContext({});
  assert.equal(hasPermission(context, "clients.view"), true);
  const result = authorize(context, "clients.view", resource("client", FIRM_B));
  assert.deepEqual(result, { ok: false, reason: "tenant_mismatch" });
});

test("missing permission is denied even on the same firm", () => {
  const context = serverContext({
    permissions: new Set<FirmOSPermission>(["firm.view"]),
  });
  const result = authorize(context, "clients.view", resource("client", FIRM_A));
  assert.deepEqual(result, { ok: false, reason: "permission_missing" });
});

test("unknown permission keys are denied", () => {
  const context = serverContext({});
  assert.equal(isFirmOSPermission("clients.manage"), false);
  const result = authorize(context, "clients.manage", resource("client", FIRM_A));
  assert.deepEqual(result, { ok: false, reason: "permission_missing" });
});

test("inactive membership context is denied", () => {
  const context = {
    ...serverContext({}),
    membershipStatus: "suspended",
  } as AuthorizationContext;
  const result = authorize(context, "clients.view", resource("client", FIRM_A));
  assert.deepEqual(result, { ok: false, reason: "inactive_context" });
});

test("inactive firm context is denied", () => {
  const context = {
    ...serverContext({}),
    firmIsActive: false,
  } as AuthorizationContext;
  const result = authorize(context, "clients.view", resource("client", FIRM_A));
  assert.deepEqual(result, { ok: false, reason: "inactive_context" });
});

test("firm scope cannot cross the tenant boundary", () => {
  const context = serverContext({ scope: { kind: "firm" } });
  const same = authorize(context, "work.view", resource("work", FIRM_A));
  const cross = authorize(context, "work.view", resource("work", FIRM_B));
  assert.deepEqual(same, { ok: true });
  assert.deepEqual(cross, { ok: false, reason: "tenant_mismatch" });
});

test("assigned_work allows only assignee membership on work resources", () => {
  const context = serverContext({
    scope: { kind: "assigned_work" },
    permissions: new Set<FirmOSPermission>(["work.view", "firm.view"]),
  });
  const assigned = authorize(
    context,
    "work.view",
    resource("work", FIRM_A, { assigneeMembershipIds: [MEMBERSHIP_A] }),
  );
  const otherAssignee = authorize(
    context,
    "work.view",
    resource("work", FIRM_A, { assigneeMembershipIds: [MEMBERSHIP_OTHER] }),
  );
  const noAssignees = authorize(context, "work.view", resource("work", FIRM_A));
  assert.deepEqual(assigned, { ok: true });
  assert.deepEqual(otherAssignee, { ok: false, reason: "scope_mismatch" });
  assert.deepEqual(noAssignees, { ok: false, reason: "scope_mismatch" });
});

test("assigned_work plus client resource is scope_mismatch", () => {
  const context = serverContext({
    scope: { kind: "assigned_work" },
    permissions: new Set<FirmOSPermission>(["clients.view", "firm.view"]),
  });
  const result = authorize(
    context,
    "clients.view",
    resource("client", FIRM_A, { clientId: CLIENT_1 }),
  );
  assert.deepEqual(result, { ok: false, reason: "scope_mismatch" });
});

test("assigned_work may use firm.view against a firm resource and nothing else", () => {
  const context = serverContext({
    scope: { kind: "assigned_work" },
    permissions: new Set<FirmOSPermission>(["firm.view", "firm.manage", "users.view", "backup.create"]),
  });
  assert.deepEqual(authorize(context, "firm.view", resource("firm", FIRM_A)), { ok: true });
  assert.deepEqual(authorize(context, "firm.manage", resource("firm", FIRM_A)), {
    ok: false,
    reason: "scope_mismatch",
  });
  assert.deepEqual(authorize(context, "users.view", resource("firm", FIRM_A)), {
    ok: false,
    reason: "scope_mismatch",
  });
  assert.deepEqual(authorize(context, "backup.create", resource("backup", FIRM_A)), {
    ok: false,
    reason: "scope_mismatch",
  });
});

test("assigned_work still cannot cross tenant boundary even when assigned", () => {
  const context = serverContext({
    scope: { kind: "assigned_work" },
    permissions: new Set<FirmOSPermission>(["work.view"]),
  });
  const result = authorize(
    context,
    "work.view",
    resource("work", FIRM_B, { assigneeMembershipIds: [MEMBERSHIP_A] }),
  );
  assert.deepEqual(result, { ok: false, reason: "tenant_mismatch" });
});

test("client scope allows matching clientId and denies other clients", () => {
  const context = serverContext({
    scope: { kind: "client", clientIds: [CLIENT_1] },
    permissions: new Set<FirmOSPermission>(["clients.view"]),
  });
  const matching = authorize(
    context,
    "clients.view",
    resource("client", FIRM_A, { clientId: CLIENT_1 }),
  );
  const other = authorize(
    context,
    "clients.view",
    resource("client", FIRM_A, { clientId: CLIENT_2 }),
  );
  const missing = authorize(context, "clients.view", resource("client", FIRM_A));
  assert.deepEqual(matching, { ok: true });
  assert.deepEqual(other, { ok: false, reason: "scope_mismatch" });
  assert.deepEqual(missing, { ok: false, reason: "scope_mismatch" });
});

test("client scope cannot cross tenant boundary even with matching clientId", () => {
  const context = serverContext({
    scope: { kind: "client", clientIds: [CLIENT_1] },
    permissions: new Set<FirmOSPermission>(["clients.view"]),
  });
  const result = authorize(
    context,
    "clients.view",
    resource("client", FIRM_B, { clientId: CLIENT_1 }),
  );
  assert.deepEqual(result, { ok: false, reason: "tenant_mismatch" });
});

test("missing or empty resource firmId is tenant_mismatch", () => {
  const context = serverContext({});
  const empty = authorize(context, "clients.view", resource("client", "   "));
  const missing = authorize(context, "clients.view", {
    type: "client",
    firmId: "",
  });
  assert.deepEqual(empty, { ok: false, reason: "tenant_mismatch" });
  assert.deepEqual(missing, { ok: false, reason: "tenant_mismatch" });
});

test("resource firm identity cannot be overridden by caller-provided scope", () => {
  const context = serverContext({
    firmId: FIRM_A,
    scope: { kind: "client", clientIds: [CLIENT_1] },
    permissions: new Set<FirmOSPermission>(["clients.view"]),
  });
  const forged = authorize(context, "clients.view", {
    type: "client",
    firmId: FIRM_B,
    clientId: CLIENT_1,
  });
  assert.deepEqual(forged, { ok: false, reason: "tenant_mismatch" });
});

test("JSON-deserialized AuthorizationContext is not treated as authorized", () => {
  const live = serverContext({});
  const serialized = JSON.stringify({
    ...live,
    permissions: [...live.permissions],
  });
  const parsed = JSON.parse(serialized) as AuthorizationContext;
  assert.equal(parsed.permissions instanceof Set, false);
  const result = authorize(parsed, "clients.view", resource("client", FIRM_A));
  assert.deepEqual(result, { ok: false, reason: "inactive_context" });
});

test("canonical catalog remains the Phase 1 dotted-action vocabulary", () => {
  assert.equal(FIRMOS_PERMISSIONS.includes("clients.view"), true);
  assert.equal(FIRMOS_PERMISSIONS.includes("clients.manage" as FirmOSPermission), false);
});
