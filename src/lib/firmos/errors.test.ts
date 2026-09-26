import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import {
  FirmOSAuthorizationError,
  FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE,
  publicAuthorizationPayload,
  recordAuthorizationDenial,
  requireAuthorized,
} from "./errors.ts";
import type { AuthorizationContext, FirmOSPermission } from "./domain.ts";
import { authorize } from "./domain.ts";

const MIGRATIONS = join(process.cwd(), "migrations");

async function createErrorSql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0005_firmos_audit_events.sql"), "utf8"));
  return { sql, pg };
}

function memberContext(firmId: string): AuthorizationContext {
  return {
    userId: "user-1",
    firmId,
    membershipId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    membershipStatus: "active",
    roleIds: ["role-1"],
    permissions: new Set<FirmOSPermission>(["firm.view", "clients.view"]),
    firmIsActive: true,
    scope: { kind: "firm" },
  };
}

test("errors source does not use ownerAuthorizationContext", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/firmos/errors.ts"), "utf8");
  assert.equal(source.includes("ownerAuthorizationContext"), false);
  assert.equal(source.includes("JSON.parse"), false);
});

test("authorization errors expose a referenceId and a sanitized public message", () => {
  const error = new FirmOSAuthorizationError({
    denyReason: "permission_missing",
    internalDetail: "reason=permission_missing permission=backup.restore",
  });
  assert.ok(error.referenceId);
  assert.equal(error.publicMessage, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
  assert.equal(error.message, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
  assert.equal(error.publicMessage.includes("backup.restore"), false);
  assert.equal(error.message.includes("backup.restore"), false);
  assert.equal(error.internalDetail.includes("backup.restore"), true);

  const payload = publicAuthorizationPayload(error);
  assert.equal(payload.referenceId, error.referenceId);
  assert.equal(JSON.stringify(payload).includes("backup.restore"), false);
  assert.equal(JSON.stringify(error.toJSON()).includes("backup.restore"), false);
  assert.equal(JSON.stringify(error).includes("backup.restore"), false);
  assert.equal(JSON.stringify(error).includes("permission_missing"), false);
});

test("failed authorization writes error_events keyed by referenceId", async () => {
  const { sql } = await createErrorSql();
  const firmId = "11111111-1111-4111-8111-111111111111";
  await sql`
    insert into firms (id, name, slug)
    values (${firmId}, 'acme', 'acme-err')
  `;
  const context = memberContext(firmId);
  const error = await recordAuthorizationDenial(sql, {
    context,
    permission: "backup.restore",
    reason: "permission_missing",
  });

  const rows = await sql<{
    reference_id: string;
    sanitized_message: string;
    internal_detail: string;
    firm_id: string;
  }>`
    select reference_id, sanitized_message, internal_detail, firm_id
    from error_events
    where reference_id = ${error.referenceId}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.sanitized_message, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
  assert.equal(rows[0]?.sanitized_message.includes("backup.restore"), false);
  assert.equal(rows[0]?.internal_detail.includes("backup.restore"), true);
  assert.equal(rows[0]?.firm_id, firmId);
});

test("requireAuthorized preserves Phase 4 deny reasons without leaking keys", async () => {
  const { sql } = await createErrorSql();
  const firmA = "11111111-1111-4111-8111-111111111111";
  const firmB = "22222222-2222-4222-8222-222222222222";
  await sql`insert into firms (id, name, slug) values (${firmA}, 'a', 'firm-a-err')`;
  await sql`insert into firms (id, name, slug) values (${firmB}, 'b', 'firm-b-err')`;
  const context = memberContext(firmA);

  assert.deepEqual(authorize(context, "clients.view", { type: "client", firmId: firmA }), {
    ok: true,
  });

  await assert.rejects(
    () =>
      requireAuthorized(sql, context, "backup.restore", {
        type: "backup",
        firmId: firmA,
      }),
    (error: unknown) => {
      assert.ok(error instanceof FirmOSAuthorizationError);
      assert.equal(error.denyReason, "permission_missing");
      assert.equal(error.publicMessage.includes("backup.restore"), false);
      const clientBody = publicAuthorizationPayload(error);
      assert.equal("denyReason" in clientBody, false);
      assert.equal(JSON.stringify(clientBody).includes("backup.restore"), false);
      return true;
    },
  );

  await assert.rejects(
    () =>
      requireAuthorized(sql, context, "clients.view", {
        type: "client",
        firmId: firmB,
      }),
    (error: unknown) => {
      assert.ok(error instanceof FirmOSAuthorizationError);
      assert.equal(error.denyReason, "tenant_mismatch");
      assert.equal(error.publicMessage, FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
      return true;
    },
  );
});
