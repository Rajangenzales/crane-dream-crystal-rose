import type { Sql } from "../db.ts";
import {
  isFirmOSPermission,
  type AuthorizationContext,
  type AuthorizationDeniedReason,
  type FirmId,
  type FirmOSPermission,
  type MembershipId,
  type RoleId,
  type UserId,
} from "./domain.ts";

export interface ResolveAuthorizationInput {
  userId: UserId;
  /** Optional tenant hint. Never treated as proof of authorization. */
  firmId?: FirmId;
}

export type ResolveAuthorizationResult =
  | { ok: true; context: AuthorizationContext }
  | { ok: false; reason: AuthorizationDeniedReason };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deny(reason: AuthorizationDeniedReason): ResolveAuthorizationResult {
  return { ok: false, reason };
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

interface MembershipRow {
  id: string;
  firm_id: string;
  user_id: string;
  status: string;
  firm_is_active: boolean;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

/**
 * Resolve AuthorizationContext from the authenticated user and stored
 * membership/role/permission rows. Do not pass client-supplied permissions,
 * roles, membership status, or scope.
 */
export async function resolveAuthorization(
  sql: Sql,
  input: ResolveAuthorizationInput,
): Promise<ResolveAuthorizationResult> {
  const userId = input.userId.trim();
  if (!userId) return deny("unauthenticated");

  const firmHint = input.firmId?.trim();
  if (firmHint) {
    return resolveForFirm(sql, userId, firmHint);
  }
  return resolveSoleActiveMembership(sql, userId);
}

async function resolveForFirm(
  sql: Sql,
  userId: UserId,
  firmId: FirmId,
): Promise<ResolveAuthorizationResult> {
  if (!isUuid(firmId)) return deny("unknown_firm");

  const firms = await sql<{ id: string; is_active: boolean }>`
    select id, is_active from firms where id = ${firmId} limit 1
  `;
  const firm = firms[0];
  if (!firm) return deny("unknown_firm");

  const memberships = await sql<MembershipRow>`
    select m.id, m.firm_id, m.user_id, m.status, f.is_active as firm_is_active
    from firm_memberships m
    join firms f on f.id = m.firm_id
    where m.user_id = ${userId} and m.firm_id = ${firmId}
    limit 1
  `;
  const membership = memberships[0];
  if (!membership) return deny("membership_not_found");
  if (membership.status !== "active") return deny("membership_not_active");
  if (!asBoolean(firm.is_active) || !asBoolean(membership.firm_is_active)) {
    return deny("firm_inactive");
  }

  return attachRolesAndPermissions(sql, {
    userId,
    firmId: membership.firm_id,
    membershipId: membership.id,
  });
}

async function resolveSoleActiveMembership(
  sql: Sql,
  userId: UserId,
): Promise<ResolveAuthorizationResult> {
  const memberships = await sql<MembershipRow>`
    select m.id, m.firm_id, m.user_id, m.status, f.is_active as firm_is_active
    from firm_memberships m
    join firms f on f.id = m.firm_id
    where m.user_id = ${userId}
      and m.status = 'active'
      and f.is_active = true
  `;
  if (memberships.length !== 1) return deny("membership_not_found");
  const membership = memberships[0];
  if (!membership) return deny("membership_not_found");

  return attachRolesAndPermissions(sql, {
    userId,
    firmId: membership.firm_id,
    membershipId: membership.id,
  });
}

async function attachRolesAndPermissions(
  sql: Sql,
  ids: { userId: UserId; firmId: FirmId; membershipId: MembershipId },
): Promise<ResolveAuthorizationResult> {
  const roleRows = await sql<{ id: string }>`
    select r.id
    from membership_roles mr
    inner join roles r on r.id = mr.role_id
    where mr.membership_id = ${ids.membershipId}
      and r.firm_id = ${ids.firmId}
      and r.is_active = true
  `;
  const roleIds = roleRows.map((row) => row.id as RoleId);
  if (roleIds.length === 0) return deny("no_roles");

  const permissionRows = await sql<{ key: string }>`
    select distinct p.key
    from membership_roles mr
    inner join roles r on r.id = mr.role_id
    inner join role_permissions rp on rp.role_id = r.id
    inner join permissions p on p.id = rp.permission_id
    where mr.membership_id = ${ids.membershipId}
      and r.firm_id = ${ids.firmId}
      and r.is_active = true
  `;

  const permissions = new Set<FirmOSPermission>();
  for (const row of permissionRows) {
    if (isFirmOSPermission(row.key)) permissions.add(row.key);
  }

  const context: AuthorizationContext = {
    userId: ids.userId,
    firmId: ids.firmId,
    membershipId: ids.membershipId,
    membershipStatus: "active",
    firmIsActive: true,
    roleIds,
    permissions,
    scope: { kind: "firm" },
  };
  return { ok: true, context };
}
