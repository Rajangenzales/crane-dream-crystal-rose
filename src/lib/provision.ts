import type { Sql } from "./db.ts";
import type { Profile, Role } from "./types.ts";

export type Actor = Profile;

async function loadProfile(
  sql: Sql,
  userId: string,
  user?: { name: string; email: string | null },
): Promise<Actor | null> {
  const existing = await sql<{ user_id: string; role: Role; is_active: boolean }>`
    select user_id, role, is_active from app_profiles where user_id = ${userId}`;
  if (!existing[0]) return null;
  return {
    userId,
    role: existing[0].role,
    isActive: existing[0].is_active,
    name: user?.name ?? "User",
    email: user?.email ?? null,
  };
}

/**
 * First-admin bootstrap is a single unique insert on `app_bootstrap`.
 * The privilege decision is taken from that insert result, then the profile
 * row is written in the same transaction. Callers always re-read the stored
 * profile so a concurrent loser never returns an admin-level decision.
 */
export async function provisionActor(sql: Sql, userId: string): Promise<Actor> {
  const users = await sql<{ id: string; name: string; email: string | null }>`
    select id, name, email from "user" where id = ${userId}`;
  const user = users[0];
  const existing = await loadProfile(sql, userId, user);
  if (existing) return existing;

  let bootstrappedAdmin = false;
  await sql.transaction(async (tx) => {
    const again = await loadProfile(tx, userId, user);
    if (again) return;
    const claimed = await tx<{ first_admin_user_id: string }>`
      insert into app_bootstrap (id, first_admin_user_id)
      values (1, ${userId})
      on conflict (id) do nothing
      returning first_admin_user_id`;
    bootstrappedAdmin = claimed[0]?.first_admin_user_id === userId;
    const role: Role = bootstrappedAdmin ? "admin" : "viewer";
    const isActive = bootstrappedAdmin;
    await tx`insert into app_profiles (user_id, role, is_active)
      values (${userId}, ${role}, ${isActive})
      on conflict (user_id) do nothing`;
  });

  const stored = await loadProfile(sql, userId, user);
  if (!stored) {
    return {
      userId,
      role: "viewer",
      isActive: false,
      name: user?.name ?? "User",
      email: user?.email ?? null,
    };
  }
  return stored;
}
