/**
 * FirmOS domain primitives shared by server-side authorization code.
 *
 * These contracts intentionally do not depend on Better Auth, a database
 * driver, or a UI framework. That keeps the domain portable across deployment
 * providers and makes future API/AI connectors depend on FirmOS concepts rather
 * than a particular vendor.
 *
 * Permission keys are a global vocabulary. Firms compose them into roles; they
 * are not copied per tenant. UI labels must not be used as authorization
 * decisions.
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
  /** Resolved from membership_roles; not a stored column. */
  roleIds: RoleId[];
}

/**
 * Canonical stored permission keys. Action-oriented; not `*.manage` catch-alls.
 * Developer/IT keys are added in a later phase and are not in this list.
 */
export const FIRMOS_PERMISSIONS = [
  "firm.view",
  "firm.manage",
  "users.view",
  "users.create",
  "users.edit",
  "users.disable",
  "roles.view",
  "roles.manage",
  "clients.view",
  "clients.create",
  "clients.edit",
  "clients.archive",
  "services.view",
  "services.create",
  "services.edit",
  "work.view",
  "work.create",
  "work.update",
  "work.assign",
  "work.review",
  "work.complete",
  "finance.view",
  "invoices.create",
  "payments.create",
  "payments.correct",
  "reports.view",
  "reports.generate",
  "reports.export",
  "backup.create",
  "backup.restore",
  "audit.view",
] as const;

export type FirmOSPermission = (typeof FIRMOS_PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(FIRMOS_PERMISSIONS);

export function isFirmOSPermission(value: string): value is FirmOSPermission {
  return PERMISSION_SET.has(value);
}

/**
 * API specification SCREAMING_SNAKE names → stored keys.
 * Governance-only keys (firm.*, roles.*, reports.export, audit.view) have no
 * original spec name and are omitted here.
 */
export const FIRMOS_SPEC_PERMISSION_MAP = {
  USER_VIEW: "users.view",
  USER_CREATE: "users.create",
  USER_EDIT: "users.edit",
  USER_DISABLE: "users.disable",
  CLIENT_VIEW: "clients.view",
  CLIENT_CREATE: "clients.create",
  CLIENT_EDIT: "clients.edit",
  CLIENT_ARCHIVE: "clients.archive",
  SERVICE_VIEW: "services.view",
  SERVICE_CREATE: "services.create",
  SERVICE_EDIT: "services.edit",
  WORK_VIEW: "work.view",
  WORK_CREATE: "work.create",
  WORK_UPDATE: "work.update",
  WORK_ASSIGN: "work.assign",
  WORK_REVIEW: "work.review",
  WORK_COMPLETE: "work.complete",
  FINANCE_VIEW: "finance.view",
  INVOICE_CREATE: "invoices.create",
  PAYMENT_CREATE: "payments.create",
  PAYMENT_CORRECT: "payments.correct",
  REPORT_VIEW: "reports.view",
  REPORT_GENERATE: "reports.generate",
  BACKUP_CREATE: "backup.create",
  BACKUP_RESTORE: "backup.restore",
} as const satisfies Record<string, FirmOSPermission>;

export type FirmOSSpecPermissionName = keyof typeof FIRMOS_SPEC_PERMISSION_MAP;

export type AuthorizationScopeKind = "firm" | "assigned_work" | "client";

export interface AuthorizationScope {
  kind: AuthorizationScopeKind;
  clientIds?: readonly string[];
}

/**
 * Server-constructed authorization snapshot. Never deserialize this from the
 * client. Build it only via the membership resolver from authenticated identity
 * and stored role assignments.
 */
export interface AuthorizationContext {
  userId: UserId;
  firmId: FirmId;
  membershipId: MembershipId;
  membershipStatus: Extract<MembershipStatus, "active">;
  roleIds: readonly RoleId[];
  permissions: ReadonlySet<FirmOSPermission>;
  firmIsActive: true;
  scope: AuthorizationScope;
}

export type AuthorizationDeniedReason =
  | "unauthenticated"
  | "membership_not_found"
  | "membership_not_active"
  | "firm_inactive"
  | "unknown_firm"
  | "no_roles";

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
    throw new Error("Permission denied");
  }
}
