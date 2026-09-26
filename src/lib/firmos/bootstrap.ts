import {
  FIRMOS_PERMISSIONS,
  type AuthorizationContext,
  type FirmOSPermission,
  type RoleId,
} from "./domain.ts";

const MANAGER_PERMISSIONS = [
  "firm.view",
  "users.view",
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
  "reports.view",
  "reports.generate",
  "reports.export",
] as const satisfies readonly FirmOSPermission[];

const MEMBER_PERMISSIONS = [
  "firm.view",
  "clients.view",
  "services.view",
  "work.view",
] as const satisfies readonly FirmOSPermission[];

const VIEWER_PERMISSIONS = [
  "firm.view",
  "clients.view",
  "services.view",
  "work.view",
  "reports.view",
] as const satisfies readonly FirmOSPermission[];

export const FIRMOS_SYSTEM_ROLE_ADMIN = "Admin";

/** Tenant Admin grants: all tenant keys except backup.restore. No platform/technical keys. */
export const ADMIN_PERMISSIONS: readonly FirmOSPermission[] = FIRMOS_PERMISSIONS.filter(
  (key) => key !== "backup.restore",
);

export const DEFAULT_FIRM_ROLES: readonly {
  name: "Admin" | "Manager" | "Member" | "Viewer";
  description: string;
  permissions: readonly FirmOSPermission[];
}[] = [
  {
    name: "Admin",
    description: "Tenant administrator for this firm. Not a FirmOS Platform Admin.",
    permissions: ADMIN_PERMISSIONS,
  },
  {
    name: "Manager",
    description: "Operational management without firm ownership controls.",
    permissions: MANAGER_PERMISSIONS,
  },
  {
    name: "Member",
    description: "Standard team access to permitted operational work.",
    permissions: MEMBER_PERMISSIONS,
  },
  {
    name: "Viewer",
    description: "Read-only access to permitted operational information.",
    permissions: VIEWER_PERMISSIONS,
  },
];

export interface FirmBootstrapInput {
  firmName: string;
  legalName?: string;
  slug: string;
  timezone?: string;
  currencyCode?: string;
  ownerDisplayName?: string;
}

export interface FirmBootstrapResult {
  firmId: string;
  ownerMembershipId: string;
  ownerRoleName: "Admin";
}

export function validateFirmBootstrapInput(input: FirmBootstrapInput): void {
  if (!input.firmName.trim()) throw new Error("Firm name is required");
  if (!input.slug.trim()) throw new Error("Firm slug is required");
}

/** Owner identity is always the authenticated user, never a client-supplied id. */
export function bootstrapOwnerUserId(authenticatedUserId: string): string {
  const userId = authenticatedUserId.trim();
  if (!userId) throw new Error("Owner user is required");
  return userId;
}

/**
 * Test/helper snapshot of the tenant Admin grant set. Not a membership resolver.
 * Live authorization must use `resolveAuthorization`.
 */
export function adminAuthorizationContext(
  firmId: string,
  userId: string,
  membershipId: string,
  roleId: RoleId,
): AuthorizationContext {
  return {
    firmId,
    userId,
    membershipId,
    membershipStatus: "active",
    firmIsActive: true,
    roleIds: [roleId],
    permissions: new Set<FirmOSPermission>(ADMIN_PERMISSIONS),
    scope: { kind: "firm" },
  };
}

/** @deprecated Use adminAuthorizationContext. Same Admin grant snapshot. */
export const ownerAuthorizationContext = adminAuthorizationContext;
