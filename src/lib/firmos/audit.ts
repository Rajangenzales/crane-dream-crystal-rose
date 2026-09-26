import type { Sql } from "../db.ts";
import { newId } from "../utils.ts";
import type { AuthorizationContext, FirmId, MembershipId, UserId } from "./domain.ts";
import { requireAuthorized } from "./errors.ts";

export interface AuditEventInput {
  firmId: FirmId;
  userId: UserId;
  membershipId?: MembershipId | null;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
  beforePayload?: unknown;
  afterPayload?: unknown;
  referenceId?: string;
}

export interface FirmOSAuditEvent {
  id: string;
  referenceId: string;
  firmId: FirmId;
  userId: UserId;
  membershipId: MembershipId | null;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
}

/**
 * Insert a tenant-scoped audit event on the caller-provided connection.
 * firmId must be the server-resolved tenant from the same transaction, never
 * untrusted client authorization data. Scope/permission snapshots are not stored
 * as proof of access.
 */
export async function recordAuditEvent(
  sql: Sql,
  input: AuditEventInput,
): Promise<FirmOSAuditEvent> {
  const firmId = input.firmId.trim();
  const userId = input.userId.trim();
  if (!firmId) throw new Error("Audit event requires a server-resolved firm id.");
  if (!userId) throw new Error("Audit event requires an authenticated user id.");

  const id = newId();
  const referenceId = input.referenceId?.trim() || newId();
  const membershipId = input.membershipId?.trim() || null;
  const detail = input.detail ?? "";
  const beforePayload = payloadJson(input.beforePayload);
  const afterPayload = payloadJson(input.afterPayload);

  await sql`
    insert into audit_events (
      id, reference_id, firm_id, user_id, membership_id,
      action, entity_type, entity_id, detail, before_payload, after_payload
    )
    values (
      ${id},
      ${referenceId},
      ${firmId},
      ${userId},
      ${membershipId},
      ${input.action},
      ${input.entityType},
      ${input.entityId},
      ${detail},
      ${beforePayload}::jsonb,
      ${afterPayload}::jsonb
    )
  `;

  return {
    id,
    referenceId,
    firmId,
    userId,
    membershipId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detail,
  };
}

/**
 * List FirmOS audit events for the membership-resolved tenant only.
 * A caller-supplied firm id is ignored; rows are always filtered by context.firmId.
 */
export async function listFirmOSAuditEvents(
  sql: Sql,
  context: AuthorizationContext,
): Promise<FirmOSAuditEvent[]> {
  await requireAuthorized(sql, context, "audit.view", {
    type: "audit_event",
    firmId: context.firmId,
  });

  const rows = await sql<{
    id: string;
    reference_id: string;
    firm_id: string;
    user_id: string;
    membership_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    detail: string;
  }>`
    select id, reference_id, firm_id, user_id, membership_id,
           action, entity_type, entity_id, detail
    from audit_events
    where firm_id = ${context.firmId}
    order by created_at desc
  `;

  return rows.map((row) => ({
    id: row.id,
    referenceId: row.reference_id,
    firmId: row.firm_id,
    userId: row.user_id,
    membershipId: row.membership_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: row.detail,
  }));
}

function payloadJson(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value);
}
