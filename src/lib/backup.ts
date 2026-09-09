import type { Sql } from "./db.ts";

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_500_000;
export const MAX_ROWS_PER_TABLE = 5_000;
export const MAX_CELL_STRING = 8_000;

export const RESTORE_TABLE_ORDER = [
  "service_library",
  "clients",
  "client_services",
  "report_periods",
  "report_sections",
  "activities",
  "payments",
  "report_exports",
  "app_settings",
] as const;

export type RestoreTable = (typeof RESTORE_TABLE_ORDER)[number];

export const TABLE_COLUMNS: Record<RestoreTable, readonly string[]> = {
  clients: [
    "id",
    "name",
    "company_name",
    "contact_person",
    "email",
    "phone",
    "notes",
    "is_active",
    "created_at",
    "updated_at",
  ],
  service_library: ["id", "name", "is_active", "is_global", "sort_order", "created_at", "updated_at"],
  client_services: ["id", "client_id", "service_id", "created_at"],
  report_periods: [
    "id",
    "client_id",
    "year",
    "month",
    "title",
    "status",
    "created_at",
    "updated_at",
  ],
  report_sections: [
    "id",
    "period_id",
    "service_id",
    "title",
    "is_manual",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  activities: [
    "id",
    "section_id",
    "activity_date",
    "title",
    "description",
    "quantity",
    "unit",
    "status",
    "notes",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  payments: [
    "id",
    "client_id",
    "period_id",
    "year",
    "month",
    "status",
    "amount",
    "payment_date",
    "notes",
    "created_at",
    "updated_at",
  ],
  report_exports: [
    "id",
    "kind",
    "client_id",
    "year",
    "month",
    "client_ids",
    "generated_by",
    "created_at",
  ],
  app_settings: ["key", "value"],
};

const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/;
const RESTORE_TABLE_SET = new Set<string>(RESTORE_TABLE_ORDER);
const META_KEYS = new Set(["version"]);

export class BackupValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

export function quoteIdent(name: string): string {
  if (!SAFE_IDENT.test(name)) {
    throw new BackupValidationError("Invalid SQL identifier in backup.");
  }
  return `"${name}"`;
}

export type BackupDump = { version: number } & Record<RestoreTable, Record<string, unknown>[]>;

function asRow(value: unknown, table: string, index: number): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BackupValidationError(`Backup row ${index} in ${table} is not an object.`);
  }
  return value as Record<string, unknown>;
}

export function buildRestoreInsert(
  table: string,
  row: Record<string, unknown>,
): { text: string; values: unknown[] } {
  if (!RESTORE_TABLE_SET.has(table)) {
    throw new BackupValidationError(`Unknown backup table: ${table}`);
  }
  const allowed = TABLE_COLUMNS[table as RestoreTable];
  const allowedSet = new Set(allowed);
  const extras = Object.keys(row).filter((key) => !allowedSet.has(key));
  if (extras.length) {
    throw new BackupValidationError(`Unknown column(s) on ${table}.`);
  }
  const cols = allowed.filter((col) => Object.prototype.hasOwnProperty.call(row, col));
  if (!cols.length) {
    throw new BackupValidationError(`Backup row for ${table} has no columns.`);
  }
  const quotedTable = quoteIdent(table);
  const quotedCols = cols.map((col) => quoteIdent(col)).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  return {
    text: `insert into ${quotedTable} (${quotedCols}) values (${placeholders})`,
    values: cols.map((col) => row[col]),
  };
}

function assertCellBounds(value: unknown, path: string, depth = 0): void {
  if (depth > 4) throw new BackupValidationError(`Backup value too nested at ${path}.`);
  if (typeof value === "string") {
    if (value.length > MAX_CELL_STRING) {
      throw new BackupValidationError(`Backup string too long at ${path}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ROWS_PER_TABLE) {
      throw new BackupValidationError(`Backup array too large at ${path}.`);
    }
    for (let i = 0; i < value.length; i += 1) assertCellBounds(value[i], `${path}[${i}]`, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key.length > 128) throw new BackupValidationError("Backup key too long.");
      assertCellBounds(nested, `${path}.${key}`, depth + 1);
    }
  }
}

export function validateBackupPayload(payload: unknown): BackupDump {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BackupValidationError("Backup payload must be an object.");
  }
  const encoded = JSON.stringify(payload);
  if (encoded.length > MAX_BACKUP_BYTES) {
    throw new BackupValidationError("Backup payload is too large.");
  }
  const raw = payload as Record<string, unknown>;
  if ("version" in raw) {
    if (raw.version !== BACKUP_VERSION) {
      throw new BackupValidationError("Unsupported backup version.");
    }
  }
  for (const key of Object.keys(raw)) {
    if (META_KEYS.has(key)) continue;
    if (!RESTORE_TABLE_SET.has(key)) {
      throw new BackupValidationError("Backup contains an unknown table.");
    }
  }
  const out = { version: BACKUP_VERSION } as BackupDump;
  for (const table of RESTORE_TABLE_ORDER) {
    const rows = raw[table];
    if (rows === undefined) {
      out[table] = [];
      continue;
    }
    if (!Array.isArray(rows)) {
      throw new BackupValidationError(`Backup table ${table} must be an array.`);
    }
    if (rows.length > MAX_ROWS_PER_TABLE) {
      throw new BackupValidationError(`Backup table ${table} has too many rows.`);
    }
    out[table] = rows.map((row, index) => {
      const obj = asRow(row, table, index);
      assertCellBounds(obj, table);
      // Reject unknown keys now so restore never interpolates them.
      buildRestoreInsert(table, obj);
      return obj;
    });
  }
  return out;
}

export async function dumpBusiness(sql: Sql): Promise<BackupDump> {
  const out = { version: BACKUP_VERSION } as BackupDump;
  for (const table of RESTORE_TABLE_ORDER) {
    const cols = TABLE_COLUMNS[table].map((col) => quoteIdent(col)).join(", ");
    out[table] = await sql.query(`select ${cols} from ${quoteIdent(table)}`);
  }
  return out;
}

const DELETE_ORDER = [
  "activities",
  "report_sections",
  "payments",
  "report_exports",
  "client_services",
  "report_periods",
  "clients",
  "service_library",
  "app_settings",
] as const;

export async function restoreBusiness(sql: Sql, payload: unknown): Promise<void> {
  const backup = validateBackupPayload(payload);
  await sql.transaction(async (tx) => {
    for (const table of DELETE_ORDER) {
      await tx.query(`delete from ${quoteIdent(table)}`);
    }
    for (const table of RESTORE_TABLE_ORDER) {
      for (const row of backup[table]) {
        const { text, values } = buildRestoreInsert(table, row);
        await tx.query(text, values);
      }
    }
  });
}
