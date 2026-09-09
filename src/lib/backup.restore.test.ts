import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreBusiness, validateBackupPayload } from "./backup.ts";
import { createTestSql } from "./db-test-utils.ts";

test("a malformed restore row rolls back and leaves existing data", async () => {
  const { sql } = await createTestSql();
  await sql`insert into clients (id, name) values (${"cli_keep"}, ${"Keep Me"})`;
  const before = await sql<{ n: number }>`select count(*)::int as n from clients`;
  assert.equal(before[0]?.n, 1);

  await assert.rejects(
    () =>
      restoreBusiness(sql, {
        clients: [{ name: "Missing primary key" }],
      }),
    (err: Error) => err.message.length > 0,
  );

  const after = await sql<{ id: string; name: string }>`select id, name from clients`;
  assert.equal(after.length, 1);
  assert.equal(after[0]?.id, "cli_keep");
  assert.equal(after[0]?.name, "Keep Me");
});

test("SQL payload in a column name is rejected and never executed", async () => {
  const { sql } = await createTestSql();
  await sql`insert into clients (id, name) values (${"cli_keep"}, ${"Keep Me"})`;
  assert.throws(
    () =>
      validateBackupPayload({
        clients: [
          {
            id: "evil",
            'id") VALUES (1); DELETE FROM clients; --': "x",
          },
        ],
      }),
  );
  const after = await sql<{ n: number }>`select count(*)::int as n from clients`;
  assert.equal(after[0]?.n, 1);
});

test("a valid restore replaces rows atomically", async () => {
  const { sql } = await createTestSql();
  await sql`insert into clients (id, name) values (${"cli_old"}, ${"Old"})`;
  await restoreBusiness(sql, {
    clients: [{ id: "cli_new", name: "New Client" }],
    app_settings: [{ key: "currency", value: "INR" }],
  });
  const clients = await sql<{ id: string; name: string }>`select id, name from clients`;
  assert.equal(clients.length, 1);
  assert.equal(clients[0]?.id, "cli_new");
  const settings = await sql<{ value: string }>`select value from app_settings where key = ${"currency"}`;
  assert.equal(settings[0]?.value, "INR");
});
