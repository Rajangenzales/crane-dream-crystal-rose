import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BACKUP_VERSION,
  BackupValidationError,
  MAX_BACKUP_BYTES,
  buildRestoreInsert,
  quoteIdent,
  validateBackupPayload,
} from "./backup.ts";

test("quotes only safe SQL identifiers", () => {
  assert.equal(quoteIdent("clients"), '"clients"');
  assert.throws(() => quoteIdent('clients"; drop table clients; --'), BackupValidationError);
  assert.throws(() => quoteIdent("id) VALUES (1)"), BackupValidationError);
});

test("rejects unknown tables and column names before any SQL is built", () => {
  assert.throws(() => buildRestoreInsert("pg_shadow", { id: "1" }), BackupValidationError);
  assert.throws(
    () =>
      buildRestoreInsert("clients", {
        id: "cli_1",
        'name") VALUES (1); DROP TABLE clients; --': "x",
      }),
    BackupValidationError,
  );
});

test("builds a parameterized insert from the allow-listed schema only", () => {
  const { text, values } = buildRestoreInsert("clients", {
    id: "cli_1",
    name: "Ada",
    notes: "ok",
  });
  assert.equal(text, 'insert into "clients" ("id", "name", "notes") values ($1, $2, $3)');
  assert.deepEqual(values, ["cli_1", "Ada", "ok"]);
  assert.doesNotMatch(text, /Ada/);
});

test("validateBackupPayload rejects a malicious column name", () => {
  assert.throws(
    () =>
      validateBackupPayload({
        version: BACKUP_VERSION,
        clients: [{ id: "c1", name: "x", "id); delete from clients; --": "1" }],
      }),
    BackupValidationError,
  );
});

test("validateBackupPayload rejects unknown top-level keys and oversized payloads", () => {
  assert.throws(
    () => validateBackupPayload({ version: 99, clients: [] }),
    BackupValidationError,
  );
  assert.throws(
    () => validateBackupPayload({ clients: [], "users; drop": [] }),
    BackupValidationError,
  );
  assert.throws(
    () => validateBackupPayload({ clients: "not-an-array" }),
    BackupValidationError,
  );
  const huge = { clients: [{ id: "c", name: "n".repeat(MAX_BACKUP_BYTES) }] };
  assert.throws(() => validateBackupPayload(huge), BackupValidationError);
});

test("validateBackupPayload accepts a well-formed subset and fills missing tables", () => {
  const parsed = validateBackupPayload({
    version: BACKUP_VERSION,
    clients: [{ id: "cli_1", name: "Lumina" }],
    app_settings: [{ key: "currency", value: "INR" }],
  });
  assert.equal(parsed.version, BACKUP_VERSION);
  assert.equal(parsed.clients.length, 1);
  assert.deepEqual(parsed.activities, []);
  assert.equal(parsed.app_settings[0]?.value, "INR");
});
