/**
 * FirmOS domain primitives shared by server-side authorization code.
 *
 * These contracts intentionally do not depend on Better Auth, a database
 * driver, or a UI framework. That keeps the domain portable across deployment
 * providers and makes future API/AI connectors depend on FirmOS concepts rather
 * than a particular vendor.
 */

export type FirmId = string;
export type MembershipId = string;
export type RoleId = string;
export type PermissionId = string;
export type UserId = string;

export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export interface FirmIdentity {
  id: FirmId;
  name: string;
  legalName: string | null;
  slug: string;
  timezone: string;
  currencyCode: string;
  isActive: boolean;
}

export interface FirmMembership {
  id: MembershipId;
  firmId: FirmId;
  userId: UserId;
  status: MembershipStatus;
  displayName: string | null;
  roleIds: RoleId[];
}

/**
 * Permission keys are stable API/domain contracts. UI labels must not be used
 * as authorization decisions.
 */
export const FIRMOS_PERMISSIONS = [
  "firm.view",
  "firm.manage",
  "members.view",
  "members.manage",
  "roles.view",
  "roles.manage",
  "clients.view",
  "clients.manage",
  "services.view",
  "services.manage",
  "work.view",
  "work.manage",
  "work.assign",
  "finance.view",
  "finance.manage",
  "finance.correct",
  "reports.view",
  "reports.generate",
  "reports.export",
  "backup.manage",
  "audit.view",
] as const;

export type FirmOSPermission = (typeof FIRMOS_PERMISSIONS)[number];

export interface AuthorizationContext {
  userId: UserId;
  firmId: FirmId;
  membershipId: MembershipId;
  permissions: ReadonlySet<FirmOSPermission>;
}

export function hasPermission(
  context: AuthorizationContext,
  permission: FirmOSPermission,
): boolean {
  return context.permissions.has(permission);
}

export function requirePermission(
  context: AuthorizationContext,
  permission: FirmOSPermission,
): void {
  if (!hasPermission(context, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
