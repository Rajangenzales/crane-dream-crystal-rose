import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createTestSql } from "../db-test-utils.ts";
import {
  executeFirmBootstrap,
  insertFirmBootstrapRecords,
} from "./bootstrap-core.ts";
import { listFirmOSAuditEvents, recordAuditEvent } from "./audit.ts";
import { resolveAuthorization } from "./resolve-authorization.ts";

const MIGRATIONS = join(process.cwd(), "migrations");

async function createAuditSql() {
  const { sql, pg } = await createTestSql();
  await pg.exec(readFileSync(join(MIGRATIONS, "0002_firmos_foundation.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0004_firmos_membership_integrity.sql"), "utf8"));
  await pg.exec(readFileSync(join(MIGRATIONS, "0005_firmos_audit_events.sql"), "utf8"));
  return { sql, pg };
}

function firmInput(slug: string, firmName = slug) {
  return {
    firmName,
    slug,
    timezone: "Asia/Kolkata",
    currencyCode: "INR",
  };
}

test("audit source does not use ownerAuthorizationContext or audit_logs", () => {
  const audit = readFileSync(join(process.cwd(), "src/lib/firmos/audit.ts"), "utf8");
  const core = readFileSync(join(process.cwd(), "src/lib/firmos/bootstrap-core.ts"), "utf8");
  const server = readFileSync(join(process.cwd(), "src/lib/firmos/bootstrap-server.ts"), "utf8");
  for (const source of [audit, core, server]) {
    assert.equal(source.includes("ownerAuthorizationContext"), false);
    assert.equal(source.includes("audit_logs"), false);
  }
});

test("successful bootstrap creates a tenant-scoped audit event with firm_id", async () => {
  const { sql } = await createAuditSql();
  const result = await executeFirmBootstrap(sql, "owner-a", firmInput("acme", "Acme LLC"));

  const events = await sql<{
    firm_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    reference_id: string;
    membership_id: string | null;
  }>`
    select firm_id, user_id, action, entity_type, entity_id, reference_id, membership_id
    from audit_events
  `;
  assert.equal(events.length, 1);
  assert.equal(events[0]?.firm_id, result.firmId);
  assert.equal(events[0]?.user_id, "owner-a");
  assert.equal(events[0]?.action, "firm.bootstrap");
  assert.equal(events[0]?.entity_type, "firm");
  assert.equal(events[0]?.entity_id, result.firmId);
  assert.equal(events[0]?.membership_id, result.ownerMembershipId);
  assert.ok(events[0]?.reference_id);

  const logs = await sql<{ n: string }>`select count(*)::text as n from audit_logs`;
  assert.equal(logs[0]?.n, "0");
});

test("bootstrap audit event is written in the same transaction as the firm", async () => {
  const { sql } = await createAuditSql();
  const result = await executeFirmBootstrap(sql, "owner-a", firmInput("same-tx"));
  const joined = await sql<{ firm_id: string; action: string }>`
    select f.id as firm_id, a.action
    from firms f
    inner join audit_events a on a.firm_id = f.id
    where f.id = ${result.firmId}
  `;
  assert.equal(joined.length, 1);
  assert.equal(joined[0]?.action, "firm.bootstrap");
});

test("rollback does not leave an orphan FirmOS audit event", async () => {
  const { sql } = await createAuditSql();
  await assert.rejects(
    () =>
      sql.transaction(async (tx) => {
        await insertFirmBootstrapRecords(tx, "owner-a", firmInput("rolled-back"));
        throw new Error("force rollback");
      }),
    /force rollback/,
  );

  const firms = await sql<{ n: string }>`select count(*)::text as n from firms`;
  const events = await sql<{ n: string }>`select count(*)::text as n from audit_events`;
  assert.equal(firms[0]?.n, "0");
  assert.equal(events[0]?.n, "0");
});

test("cross-firm audit listing cannot see another firm's events", async () => {
  const { sql } = await createAuditSql();
  const firmA = await executeFirmBootstrap(sql, "user-a", firmInput("firm-a"));
  const firmB = await executeFirmBootstrap(sql, "user-b", firmInput("firm-b"));

  const resolvedB = await resolveAuthorization(sql, {
    userId: "user-b",
    firmId: firmB.firmId,
  });
  assert.equal(resolvedB.ok, true);
  if (!resolvedB.ok) return;

  const listed = await listFirmOSAuditEvents(sql, resolvedB.context);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.firmId, firmB.firmId);
  assert.equal(
    listed.some((event) => event.firmId === firmA.firmId),
    false,
  );
});

test("recordAuditEvent refuses an empty firm id", async () => {
  const { sql } = await createAuditSql();
  await assert.rejects(
    () =>
      recordAuditEvent(sql, {
        firmId: "  ",
        userId: "user-a",
        action: "firm.bootstrap",
        entityType: "firm",
        entityId: "x",
      }),
    /firm id/i,
  );
});
