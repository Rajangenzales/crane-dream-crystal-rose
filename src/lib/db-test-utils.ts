import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
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

export async function createTestSql(): Promise<{ sql: Sql; pg: PGlite }> {
  const pg = new PGlite();
  await pg.waitReady;
  const root = join(process.cwd());
  for (const name of ["0001_auth.sql", "0002_monthly.sql", "0003_bootstrap.sql"]) {
    await pg.exec(readFileSync(join(root, "migrations", name), "utf8"));
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
