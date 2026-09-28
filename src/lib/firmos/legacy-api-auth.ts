import type { Sql } from "../db.ts";
import {
  hasPermission,
  type AuthorizationContext,
  type FirmOSPermission,
  type FirmOSResourceType,
  type ProtectedResource,
  type UserId,
} from "./domain.ts";
import { recordAuthorizationDenial, requireAuthorized } from "./errors.ts";
import { resolveAuthorization } from "./resolve-authorization.ts";

/**
 * Phase 7 API bridge. Monthly application tables still have no firm_id;
 * resource.firmId is always the membership-resolved tenant. Client-supplied
 * firmId, permissions, roles, membership status, and scope are ignored.
 */
export async function requireFirmOSAction(
  sql: Sql,
  userId: UserId,
  permission: FirmOSPermission | readonly FirmOSPermission[],
  resource: {
    type: FirmOSResourceType;
    id?: string;
    clientId?: string;
  },
): Promise<AuthorizationContext> {
  const keys = Array.isArray(permission) ? permission : [permission];
  const primary = keys[0];
  if (!primary) {
    throw await recordAuthorizationDenial(sql, {
      reason: "permission_missing",
    });
  }

  const resolved = await resolveAuthorization(sql, { userId });
  if (!resolved.ok) {
    throw await recordAuthorizationDenial(sql, {
      permission: primary,
      reason: resolved.reason,
    });
  }

  const protectedResource: ProtectedResource = {
    type: resource.type,
    firmId: resolved.context.firmId,
    id: resource.id,
    clientId: resource.clientId,
  };

  for (const key of keys) {
    await requireAuthorized(sql, resolved.context, key, protectedResource);
  }
  return resolved.context;
}

export function clientUpdatePermission(isActive: boolean | undefined): FirmOSPermission {
  return isActive === false ? "clients.archive" : "clients.edit";
}

export function paymentSavePermission(paymentId: string | undefined | null): FirmOSPermission {
  return paymentId ? "payments.correct" : "payments.create";
}

export function userAccessPermissions(input: {
  role?: string;
  isActive?: boolean;
}): FirmOSPermission[] {
  const keys: FirmOSPermission[] = [];
  if (input.role !== undefined) keys.push("users.edit");
  if (input.isActive === false) keys.push("users.disable");
  if (keys.length === 0) keys.push("users.edit");
  return keys;
}

export function canViewFinance(context: AuthorizationContext): boolean {
  return hasPermission(context, "finance.view");
}

export function redactPaymentRecords<T extends { amount: number | null; notes?: string }>(
  context: AuthorizationContext,
  payments: T[],
): T[] {
  if (canViewFinance(context)) return payments;
  return payments.map((payment) => ({ ...payment, amount: null, notes: "" }));
}
