import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { newId } from "@/lib/utils";
import {
  DEFAULT_FIRM_ROLES,
  validateFirmBootstrapInput,
  type FirmBootstrapInput,
  type FirmBootstrapResult,
} from "./bootstrap";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const bootstrapFirm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context, data }: { context: { userId: string }; data: FirmBootstrapInput }) => {
    const input = {
      ...data,
      firmName: data.firmName.trim(),
      legalName: data.legalName?.trim() || undefined,
      slug: slugify(data.slug),
      timezone: data.timezone?.trim() || "Asia/Kolkata",
      currencyCode: data.currencyCode?.trim().toUpperCase() || "INR",
      ownerUserId: context.userId,
    };

    validateFirmBootstrapInput(input);

    const sql = await getSql();

    return sql.transaction(async (tx): Promise<FirmBootstrapResult> => {
      const existing = await tx<{ id: string }>`select id from firms where slug = ${input.slug} limit 1`;
      if (existing.length) throw new Error("A firm with this slug already exists.");

      const firmId = newId();
      await tx`
        insert into firms (id, name, legal_name, slug, timezone, currency_code)
        values (${firmId}, ${input.firmName}, ${input.legalName ?? null}, ${input.slug}, ${input.timezone}, ${input.currencyCode})
      `;

      const roleIds = new Map<string, string>();
      for (const role of DEFAULT_FIRM_ROLES) {
        const roleId = newId();
        roleIds.set(role.name, roleId);
        await tx`
          insert into roles (id, firm_id, name, description, is_system)
          values (${roleId}, ${firmId}, ${role.name}, ${role.description}, true)
        `;

        for (const permissionKey of role.permissions) {
          const permissionRows = await tx<{ id: string }>`
            select id from permissions where key = ${permissionKey} limit 1
          `;
          const permissionId = permissionRows[0]?.id;
          if (!permissionId) throw new Error(`Unknown FirmOS permission: ${permissionKey}`);
          await tx`
            insert into role_permissions (role_id, permission_id)
            values (${roleId}, ${permissionId})
          `;
        }
      }

      const ownerMembershipId = newId();
      await tx`
        insert into firm_memberships (id, firm_id, user_id, status, display_name, joined_at)
        values (${ownerMembershipId}, ${firmId}, ${context.userId}, 'active', ${input.ownerDisplayName?.trim() || null}, now())
      `;

      const ownerRoleId = roleIds.get("Owner");
      if (!ownerRoleId) throw new Error("Owner role was not created.");
      await tx`
        insert into membership_roles (membership_id, role_id)
        values (${ownerMembershipId}, ${ownerRoleId})
      `;

      await tx`
        insert into audit_logs (id, user_id, action, entity_type, entity_id, detail)
        values (${newId()}, ${context.userId}, 'firm.bootstrap', 'firm', ${firmId}, ${`Firm created: ${input.firmName}`})
      `;

      return { firmId, ownerMembershipId, ownerRoleName: "Owner" };
    });
  });
