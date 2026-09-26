import type { Sql } from "../db.ts";
import { newId } from "../utils.ts";
import { recordAuditEvent } from "./audit.ts";
import {
  DEFAULT_FIRM_ROLES,
  type FirmBootstrapInput,
  type FirmBootstrapResult,
} from "./bootstrap.ts";

/**
 * Create a firm, system roles, owner membership, and a tenant-scoped audit
 * event on the same database connection. Callers that need atomicity pass a
 * transaction client, or use executeFirmBootstrap which opens one.
 */
export async function insertFirmBootstrapRecords(
  sql: Sql,
  ownerUserId: string,
  input: FirmBootstrapInput,
): Promise<FirmBootstrapResult> {
  const existing = await sql<{ id: string }>`select id from firms where slug = ${input.slug} limit 1`;
  if (existing.length) throw new Error("A firm with this slug already exists.");

  const firmId = newId();
  await sql`
    insert into firms (id, name, legal_name, slug, timezone, currency_code)
    values (
      ${firmId},
      ${input.firmName},
      ${input.legalName ?? null},
      ${input.slug},
      ${input.timezone ?? "Asia/Kolkata"},
      ${input.currencyCode ?? "INR"}
    )
  `;

  const roleIds = new Map<string, string>();
  for (const role of DEFAULT_FIRM_ROLES) {
    const roleId = newId();
    roleIds.set(role.name, roleId);
    await sql`
      insert into roles (id, firm_id, name, description, is_system)
      values (${roleId}, ${firmId}, ${role.name}, ${role.description}, true)
    `;

    for (const permissionKey of role.permissions) {
      const permissionRows = await sql<{ id: string }>`
        select id from permissions where key = ${permissionKey} limit 1
      `;
      const permissionId = permissionRows[0]?.id;
      if (!permissionId) throw new Error(`Unknown FirmOS permission: ${permissionKey}`);
      await sql`
        insert into role_permissions (role_id, permission_id)
        values (${roleId}, ${permissionId})
      `;
    }
  }

  const ownerMembershipId = newId();
  await sql`
    insert into firm_memberships (id, firm_id, user_id, status, display_name, joined_at)
    values (${ownerMembershipId}, ${firmId}, ${ownerUserId}, 'active', ${input.ownerDisplayName ?? null}, now())
  `;

  const ownerRoleId = roleIds.get("Owner");
  if (!ownerRoleId) throw new Error("Owner role was not created.");
  await sql`
    insert into membership_roles (membership_id, role_id)
    values (${ownerMembershipId}, ${ownerRoleId})
  `;

  await recordAuditEvent(sql, {
    firmId,
    userId: ownerUserId,
    membershipId: ownerMembershipId,
    action: "firm.bootstrap",
    entityType: "firm",
    entityId: firmId,
    detail: `Firm created: ${input.firmName}`,
  });

  return { firmId, ownerMembershipId, ownerRoleName: "Owner" };
}

export async function executeFirmBootstrap(
  sql: Sql,
  ownerUserId: string,
  input: FirmBootstrapInput,
): Promise<FirmBootstrapResult> {
  return sql.transaction((tx) => insertFirmBootstrapRecords(tx, ownerUserId, input));
}
