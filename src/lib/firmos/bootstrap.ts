import type { AuthorizationContext } from "./domain";

export const DEFAULT_FIRM_ROLES = [
  { name: "Owner", description: "Full control of the firm and its configuration.", permissions: ["firm.view", "firm.manage", "members.view", "members.manage", "roles.view", "roles.manage", "clients.view", "clients.manage", "services.view", "services.manage", "work.view", "work.manage", "work.assign", "finance.view", "finance.manage", "finance.correct", "reports.view", "reports.generate", "reports.export", "backup.manage", "audit.view"] },
  { name: "Manager", description: "Operational management without firm ownership controls.", permissions: ["firm.view", "members.view", "clients.view", "clients.manage", "services.view", "services.manage", "work.view", "work.manage", "work.assign", "finance.view", "finance.manage", "reports.view", "reports.generate", "reports.export"] },
  { name: "Member", description: "Standard team access to permitted operational work.", permissions: ["firm.view", "clients.view", "services.view", "work.view"] },
  { name: "Viewer", description: "Read-only access to permitted operational information.", permissions: ["firm.view", "clients.view", "services.view", "work.view", "reports.view"] },
] as const;

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
  roleId: string,
): AuthorizationContext {
  return {
    firmId,
    userId,
    membershipId,
    roleIds: [roleId],
    permissionKeys: DEFAULT_FIRM_ROLES[0].permissions,
  };
}
