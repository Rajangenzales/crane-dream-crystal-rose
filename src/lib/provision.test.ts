import assert from "node:assert/strict";
import { test } from "node:test";
import { provisionActor } from "./provision.ts";
import { createTestSql } from "./db-test-utils.ts";

async function insertUser(sql: Awaited<ReturnType<typeof createTestSql>>["sql"], id: string) {
  await sql`insert into "user" (id, name, email, "emailVerified")
    values (${id}, ${id}, ${id + "@example.com"}, false)`;
}

test("the first provisioned user becomes the only admin", async () => {
  const { sql } = await createTestSql();
  await insertUser(sql, "user-a");
  await insertUser(sql, "user-b");
  const first = await provisionActor(sql, "user-a");
  const second = await provisionActor(sql, "user-b");
  assert.equal(first.role, "admin");
  assert.equal(first.isActive, true);
  assert.equal(second.role, "viewer");
  assert.equal(second.isActive, false);
});

test("concurrent first logins produce exactly one admin", async () => {
  const { sql } = await createTestSql();
  await insertUser(sql, "user-a");
  await insertUser(sql, "user-b");
  const [a, b] = await Promise.all([
    provisionActor(sql, "user-a"),
    provisionActor(sql, "user-b"),
  ]);
  const admins = [a, b].filter((p) => p.role === "admin");
  assert.equal(admins.length, 1);
  assert.equal(admins[0]?.isActive, true);
  const viewers = [a, b].filter((p) => p.role === "viewer");
  assert.equal(viewers.length, 1);
  assert.equal(viewers[0]?.isActive, false);
});

test("re-provisioning returns the stored role, not a new decision", async () => {
  const { sql } = await createTestSql();
  await insertUser(sql, "user-a");
  const first = await provisionActor(sql, "user-a");
  const again = await provisionActor(sql, "user-a");
  assert.equal(first.role, "admin");
  assert.equal(again.role, "admin");
});
