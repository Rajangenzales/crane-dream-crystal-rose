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
 * Canonical tenant permission keys. Action-oriented; not `*.manage` catch-alls.
 * Platform and Technical keys are separate catalogs and are not in this list.
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

export type FirmOSAuthorizationDomain = "tenant" | "platform" | "technical";

/**
 * Frozen Platform Operations catalog. Distinct from tenant keys.
 * Persistent Platform principal storage is deferred (Phase 6 architecture §21).
 */
export const FIRMOS_PLATFORM_PERMISSIONS = [
  "platform.tenant.view",
  "platform.tenant.suspend",
  "platform.system.view",
  "platform.error.view",
  "platform.error.manage",
  "platform.integration.manage",
  "platform.ai.manage",
  "platform.health.view",
] as const;

export type FirmOSPlatformPermission = (typeof FIRMOS_PLATFORM_PERMISSIONS)[number];

/**
 * Frozen Technical Operations catalog. Distinct from tenant and platform keys.
 * Persistent Technical principal storage is deferred (Phase 6 architecture §21).
 */
export const FIRMOS_TECHNICAL_PERMISSIONS = [
  "diagnostics.view",
  "error_events.view",
] as const;

export type FirmOSTechnicalPermission = (typeof FIRMOS_TECHNICAL_PERMISSIONS)[number];

const PLATFORM_PERMISSION_SET: ReadonlySet<string> = new Set(FIRMOS_PLATFORM_PERMISSIONS);
const TECHNICAL_PERMISSION_SET: ReadonlySet<string> = new Set(FIRMOS_TECHNICAL_PERMISSIONS);

export function isPlatformPermission(value: string): value is FirmOSPlatformPermission {
  return PLATFORM_PERMISSION_SET.has(value);
}

export function isTechnicalPermission(value: string): value is FirmOSTechnicalPermission {
  return TECHNICAL_PERMISSION_SET.has(value);
}

export function permissionDomain(value: string): FirmOSAuthorizationDomain | null {
  if (isFirmOSPermission(value)) return "tenant";
  if (isPlatformPermission(value)) return "platform";
  if (isTechnicalPermission(value)) return "technical";
  return null;
}

/**
 * Server-constructed Platform authority snapshot. Never deserialize from the
 * client. Never derive from a Firm membership. Persistent operator identity
 * resolution is deferred.
 */
export interface PlatformAuthorizationContext {
  domain: "platform";
  userId: UserId;
  permissions: ReadonlySet<FirmOSPlatformPermission>;
}

/**
 * Server-constructed Technical authority snapshot. Never deserialize from the
 * client. Never derive from a Firm membership. Persistent operator identity
 * resolution is deferred.
 */
export interface TechnicalAuthorizationContext {
  domain: "technical";
  userId: UserId;
  permissions: ReadonlySet<FirmOSTechnicalPermission>;
}

/**
 * Frozen Platform Admin grant set. Test/server helper only: takes userId, not
 * client-supplied permissions or roles.
 */
export function platformAdminAuthority(userId: UserId): PlatformAuthorizationContext {
  return {
    domain: "platform",
    userId,
    permissions: new Set<FirmOSPlatformPermission>(FIRMOS_PLATFORM_PERMISSIONS),
  };
}

/**
 * Frozen Technical operator grant set. Test/server helper only: takes userId,
 * not client-supplied permissions or roles.
 */
export function technicalOperatorAuthority(userId: UserId): TechnicalAuthorizationContext {
  return {
    domain: "technical",
    userId,
    permissions: new Set<FirmOSTechnicalPermission>(FIRMOS_TECHNICAL_PERMISSIONS),
  };
}

export function authorizePlatform(
  context: PlatformAuthorizationContext,
  permission: string,
): AuthorizeResult {
  if (context.domain !== "platform" || !(context.permissions instanceof Set)) {
    return denyAuthorize("inactive_context");
  }
  if (!isPlatformPermission(permission)) {
    return denyAuthorize("permission_missing");
  }
  if (!context.permissions.has(permission)) {
    return denyAuthorize("permission_missing");
  }
  return { ok: true };
}

export function authorizeTechnical(
  context: TechnicalAuthorizationContext,
  permission: string,
): AuthorizeResult {
  if (context.domain !== "technical" || !(context.permissions instanceof Set)) {
    return denyAuthorize("inactive_context");
  }
  if (!isTechnicalPermission(permission)) {
    return denyAuthorize("permission_missing");
  }
  if (!context.permissions.has(permission)) {
    return denyAuthorize("permission_missing");
  }
  return { ok: true };
}

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

export type FirmOSResourceType =
  | "firm"
  | "membership"
  | "role"
  | "client"
  | "service"
  | "work"
  | "invoice"
  | "payment"
  | "report"
  | "audit_event"
  | "backup";

/**
 * Server-resolved resource identity used by authorize().
 * firmId must come from stored rows, never from untrusted client scope data.
 */
export interface ProtectedResource {
  type: FirmOSResourceType;
  firmId: FirmId;
  id?: string;
  /** When type === "work", membership ids that may access assigned_work scope. */
  assigneeMembershipIds?: readonly MembershipId[];
  clientId?: string;
}

export type AuthorizeDeniedReason =
  | "permission_missing"
  | "tenant_mismatch"
  | "scope_mismatch"
  | "inactive_context";

export type AuthorizeResult =
  | { ok: true }
  | { ok: false; reason: AuthorizeDeniedReason };

const ASSIGNED_WORK_FIRM_GOVERNANCE = new Set<FirmOSPermission>(["firm.view"]);

function denyAuthorize(reason: AuthorizeDeniedReason): AuthorizeResult {
  return { ok: false, reason };
}

function sameFirmId(left: string, right: string): boolean {
  return left.trim() === right.trim() && left.trim().length > 0;
}

function isActiveAuthorizationContext(context: AuthorizationContext): boolean {
  return (
    context.membershipStatus === "active" &&
    context.firmIsActive === true &&
    context.permissions instanceof Set
  );
}

/**
 * V1 resource authorization: tenant match, canonical permission, then scope.
 * Context must be membership-resolved on the server. Do not deserialize
 * AuthorizationContext from the client. Do not treat context.scope as a source
 * of resource.firmId.
 */
export function authorize(
  context: AuthorizationContext,
  permission: string,
  resource: ProtectedResource,
): AuthorizeResult {
  if (!isActiveAuthorizationContext(context)) {
    return denyAuthorize("inactive_context");
  }
  if (!isFirmOSPermission(permission)) {
    return denyAuthorize("permission_missing");
  }
  if (!hasPermission(context, permission)) {
    return denyAuthorize("permission_missing");
  }

  const resourceFirmId = resource.firmId?.trim() ?? "";
  const contextFirmId = context.firmId?.trim() ?? "";
  if (!resourceFirmId || !sameFirmId(resourceFirmId, contextFirmId)) {
    return denyAuthorize("tenant_mismatch");
  }

  const scopeKind = context.scope?.kind;
  if (scopeKind === "firm") {
    return { ok: true };
  }

  if (scopeKind === "assigned_work") {
    if (resource.type === "work") {
      const assignees = resource.assigneeMembershipIds ?? [];
      if (assignees.includes(context.membershipId)) {
        return { ok: true };
      }
      return denyAuthorize("scope_mismatch");
    }
    if (resource.type === "firm" && ASSIGNED_WORK_FIRM_GOVERNANCE.has(permission)) {
      return { ok: true };
    }
    return denyAuthorize("scope_mismatch");
  }

  if (scopeKind === "client") {
    const allowed = context.scope.clientIds ?? [];
    const clientId = resource.clientId?.trim() ?? "";
    if (clientId && allowed.includes(clientId)) {
      return { ok: true };
    }
    return denyAuthorize("scope_mismatch");
  }

  return denyAuthorize("scope_mismatch");
}
