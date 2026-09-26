import type { Sql } from "../db.ts";
import { newId } from "../utils.ts";
import {
  authorize,
  type AuthorizationContext,
  type AuthorizationDeniedReason,
  type AuthorizeDeniedReason,
  type ProtectedResource,
} from "./domain.ts";

export const FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE =
  "You are not allowed to perform this action.";

export type FirmOSDenyReason = AuthorizationDeniedReason | AuthorizeDeniedReason;

/**
 * Client-safe authorization failure. Public fields are referenceId and
 * publicMessage only. Permission keys and deny reasons stay on non-enumerable
 * internals for server logs.
 */
export class FirmOSAuthorizationError extends Error {
  readonly name = "FirmOSAuthorizationError";
  readonly referenceId: string;
  readonly publicMessage: string;
  declare readonly denyReason: FirmOSDenyReason;
  declare readonly internalDetail: string;

  constructor(input: {
    referenceId?: string;
    denyReason: FirmOSDenyReason;
    internalDetail: string;
  }) {
    super(FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE);
    this.publicMessage = FIRMOS_PUBLIC_AUTHORIZATION_MESSAGE;
    this.referenceId = input.referenceId?.trim() || newId();
    Object.defineProperty(this, "denyReason", {
      value: input.denyReason,
      enumerable: false,
      writable: false,
    });
    Object.defineProperty(this, "internalDetail", {
      value: input.internalDetail,
      enumerable: false,
      writable: false,
    });
  }

  toJSON(): { referenceId: string; publicMessage: string } {
    return {
      referenceId: this.referenceId,
      publicMessage: this.publicMessage,
    };
  }
}

export function publicAuthorizationPayload(error: FirmOSAuthorizationError): {
  message: string;
  referenceId: string;
} {
  return {
    message: error.publicMessage,
    referenceId: error.referenceId,
  };
}

export interface RecordAuthorizationDenialInput {
  context?: Pick<AuthorizationContext, "firmId" | "userId"> | null;
  permission?: string;
  reason: FirmOSDenyReason;
}

export async function recordAuthorizationDenial(
  sql: Sql,
  input: RecordAuthorizationDenialInput,
): Promise<FirmOSAuthorizationError> {
  const error = new FirmOSAuthorizationError({
    denyReason: input.reason,
    internalDetail: formatInternalDetail(input.reason, input.permission),
  });

  const firmId = input.context?.firmId?.trim() || null;
  const userId = input.context?.userId?.trim() || null;

  try {
    await sql`
      insert into error_events (
        id, reference_id, firm_id, user_id, sanitized_message, internal_detail
      )
      values (
        ${newId()},
        ${error.referenceId},
        ${firmId},
        ${userId},
        ${error.publicMessage},
        ${error.internalDetail}
      )
    `;
  } catch {
    // Best-effort persistence; the caller still receives the sanitized error.
  }

  return error;
}

export async function requireAuthorized(
  sql: Sql,
  context: AuthorizationContext,
  permission: string,
  resource: ProtectedResource,
): Promise<void> {
  const result = authorize(context, permission, resource);
  if (result.ok) return;
  throw await recordAuthorizationDenial(sql, {
    context,
    permission,
    reason: result.reason,
  });
}

function formatInternalDetail(reason: FirmOSDenyReason, permission?: string): string {
  const parts = [`reason=${reason}`];
  if (permission) parts.push(`permission=${permission}`);
  return parts.join(" ");
}
