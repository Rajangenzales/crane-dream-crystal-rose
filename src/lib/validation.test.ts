import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createClientSchema,
  createEmailUserSchema,
  restoreBackupSchema,
  saveActivitySchema,
  savePaymentSchema,
  yearMonthSchema,
} from "./validation.ts";

test("rejects oversized strings", () => {
  assert.throws(() => createClientSchema.parse({ name: "n".repeat(201) }));
});

test("rejects invalid email on user create", () => {
  assert.throws(() =>
    createEmailUserSchema.parse({
      name: "Ada",
      email: "not-an-email",
      password: "password1",
      role: "viewer",
    }),
  );
});

test("rejects short passwords", () => {
  assert.throws(() =>
    createEmailUserSchema.parse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
      role: "admin",
    }),
  );
});

test("rejects out-of-range months and years", () => {
  assert.throws(() => yearMonthSchema.parse({ year: 1999, month: 1 }));
  assert.throws(() => yearMonthSchema.parse({ year: 2026, month: 13 }));
  assert.deepEqual(yearMonthSchema.parse({ year: 2026, month: 9 }), { year: 2026, month: 9 });
});

test("rejects unknown activity and payment statuses", () => {
  assert.throws(() =>
    saveActivitySchema.parse({
      sectionId: "sec_1",
      title: "Work",
      status: "bogus",
    }),
  );
  assert.throws(() =>
    savePaymentSchema.parse({
      clientId: "cli_1",
      year: 2026,
      month: 9,
      status: "paid-in-cash",
    }),
  );
});

test("accepts a well-formed activity", () => {
  const parsed = saveActivitySchema.parse({
    sectionId: "sec_1",
    title: "Keyword research",
    status: "completed",
    activityDate: "2026-09-02",
    quantity: 4,
    unit: "Tasks",
  });
  assert.equal(parsed.title, "Keyword research");
});

test("restore input requires id or payload", () => {
  assert.throws(() => restoreBackupSchema.parse({}));
  assert.equal(restoreBackupSchema.parse({ id: "bak_1" }).id, "bak_1");
});
