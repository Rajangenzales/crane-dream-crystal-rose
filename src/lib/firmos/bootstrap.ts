import {
  FIRMOS_PERMISSIONS,
  type AuthorizationContext,
  type FirmOSPermission,
  type RoleId,
} from "./domain";

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

export const DEFAULT_FIRM_ROLES: readonly {
  name: "Owner" | "Manager" | "Member" | "Viewer";
  description: string;
  permissions: readonly FirmOSPermission[];
}[] = [
  {
    name: "Owner",
    description: "Full control of the firm and its configuration.",
    permissions: FIRMOS_PERMISSIONS,
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
  ownerUserId: string;
  ownerDisplayName?: string;
}

export interface FirmBootstrapResult {
  firmId: string;
  ownerMembershipId: string;
  ownerRoleName: "Owner";
}

export function validateFirmBootstrapInput(input: FirmBootstrapInput): void {
  if (!input.firmName.trim()) throw new Error("Firm name is required");
  if (!input.slug.trim()) throw new Error("Firm slug is required");
  if (!input.ownerUserId.trim()) throw new Error("Owner user is required");
}

export function ownerAuthorizationContext(
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
    permissions: new Set<FirmOSPermission>(DEFAULT_FIRM_ROLES[0].permissions),
    scope: { kind: "firm" },
  };
}
