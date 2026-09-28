import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import type { Sql } from "./db.ts";

function toSql(run: <T>(text: string, params: unknown[]) => Promise<T[]>): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

export function migrationsDirectory(): string {
  return join(process.cwd(), "migrations");
}

/**
 * Empty PGLite with the same migration set and order as `scripts/migrate.mjs`
 * / `src/lib/db.ts` (basename `localeCompare`, `_migrations` bookkeeping).
 */
export async function createTestSql(): Promise<{ sql: Sql; pg: PGlite }> {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = migrationsDirectory();
  const entries = readdirSync(dir);
  for (const { name } of pendingMigrations(entries, [])) {
    await pg.exec(readFileSync(join(dir, name), "utf8"));
    await pg.query("insert into _migrations (name) values ($1)", [name]);
  }
  const sql = toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
  sql.transaction = async (fn) =>
    pg.transaction(async (tx) => {
      const txSql = toSql(async <T>(text: string, params: unknown[]) => {
        const result = await tx.query<T>(text, params);
        return result.rows;
      });
      txSql.transaction = (inner) => inner(txSql);
      return fn(txSql);
    });
  return { sql, pg };
}
