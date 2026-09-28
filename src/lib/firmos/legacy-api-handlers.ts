import { dumpBusiness, restoreBusiness, validateBackupPayload } from "../backup.ts";
import type { Sql } from "../db.ts";
import { toNumber } from "../format.ts";
import type {
  Activity,
  Client,
  Dashboard,
  Payment,
  Role,
  Section,
} from "../types.ts";
import { newId } from "../utils.ts";
import type { AuthorizationContext } from "./domain.ts";
import {
  canViewFinance,
  paymentSavePermission,
  redactPaymentRecords,
  requireFirmOSAction,
  userAccessPermissions,
} from "./legacy-api-auth.ts";

export async function recordLegacyAudit(
  sql: Sql,
  userId: string,
  action: string,
  entityType = "",
  entityId = "",
  detail = "",
) {
  await sql`insert into audit_logs (id, user_id, action, entity_type, entity_id, detail)
    values (${newId()}, ${userId}, ${action}, ${entityType}, ${entityId}, ${detail})`;
}

export function mapClient(row: {
  id: string;
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Client {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayment(row: {
  id: string;
  client_id: string;
  period_id: string | null;
  year: number;
  month: number;
  status: string;
  amount: string | number | null;
  payment_date: string | null;
  notes: string;
  client_name?: string;
}): Payment {
  return {
    id: row.id,
    clientId: row.client_id,
    periodId: row.period_id,
    year: row.year,
    month: row.month,
    status: row.status,
    amount: toNumber(row.amount),
    paymentDate: row.payment_date,
    notes: row.notes,
    clientName: row.client_name,
  };
}

function mapActivity(row: {
  id: string;
  section_id: string;
  activity_date: string | null;
  title: string;
  description: string;
  quantity: string | number | null;
  unit: string;
  status: string;
  notes: string;
  sort_order: number;
}): Activity {
  return {
    id: row.id,
    sectionId: row.section_id,
    activityDate: row.activity_date,
    title: row.title,
    description: row.description,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    status: row.status,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

export async function loadSections(sql: Sql, periodId: string): Promise<Section[]> {
  const sections = await sql<{
    id: string;
    period_id: string;
    service_id: string | null;
    title: string;
    is_manual: boolean;
    sort_order: number;
  }>`select id, period_id, service_id, title, is_manual, sort_order
     from report_sections where period_id = ${periodId} order by sort_order, title`;
  const activities = await sql<{
    id: string;
    section_id: string;
    activity_date: string | null;
    title: string;
    description: string;
    quantity: string | number | null;
    unit: string;
    status: string;
    notes: string;
    sort_order: number;
  }>`select a.id, a.section_id, a.activity_date, a.title, a.description, a.quantity, a.unit, a.status, a.notes, a.sort_order
     from activities a
     join report_sections s on s.id = a.section_id
     where s.period_id = ${periodId}
     order by a.sort_order, a.activity_date nulls last, a.created_at`;
  const bySection = new Map<string, Activity[]>();
  for (const a of activities) {
    const list = bySection.get(a.section_id) ?? [];
    list.push(mapActivity(a));
    bySection.set(a.section_id, list);
  }
  return sections.map((s) => ({
    id: s.id,
    periodId: s.period_id,
    serviceId: s.service_id,
    title: s.title,
    isManual: s.is_manual,
    sortOrder: s.sort_order,
    activities: bySection.get(s.id) ?? [],
  }));
}

export function summariseWork(sections: Section[]) {
  const bits: string[] = [];
  let total = 0;
  let completed = 0;
  const statusCounts: Record<string, number> = {};
  const units = new Map<string, number>();
  for (const s of sections) {
    total += s.activities.length;
    const qtyBits: string[] = [];
    for (const a of s.activities) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
      if (a.status === "completed" || a.status === "delivered") completed += 1;
      if (a.quantity && a.unit) {
        units.set(a.unit, (units.get(a.unit) ?? 0) + a.quantity);
        qtyBits.push(`${a.quantity} ${a.unit.toLowerCase()}`);
      }
    }
    if (s.activities.length) {
      bits.push(qtyBits.length ? `${s.title} (${qtyBits.join(", ")})` : s.title);
    }
  }
  return { bits, total, completed, statusCounts, units };
}

export async function loadDashboard(sql: Sql, year: number, month: number): Promise<Dashboard> {
  const clients = await sql<Parameters<typeof mapClient>[0]>`
    select * from clients where is_active = true order by name`;
  const rows = [];
  let totalActivities = 0;
  let completedActivities = 0;
  let pendingActivities = 0;
  let paymentsReceived = 0;
  let paymentsPending = 0;
  let clientsThisMonth = 0;
  for (const c of clients) {
    const period = await sql<{ id: string }>`
      select id from report_periods where client_id = ${c.id} and year = ${year} and month = ${month}`;
    const sections = period[0] ? await loadSections(sql, period[0].id) : [];
    const summary = summariseWork(sections);
    const pay = await sql<{ status: string; amount: string | number | null }>`
      select status, amount from payments where client_id = ${c.id} and year = ${year} and month = ${month}`;
    const received = pay.filter((p) => p.status === "received").reduce((s, p) => s + (toNumber(p.amount) ?? 0), 0);
    const pending = pay.filter((p) => p.status === "pending").reduce((s, p) => s + (toNumber(p.amount) ?? 0), 0);
    paymentsReceived += received;
    paymentsPending += pending;
    totalActivities += summary.total;
    completedActivities += summary.completed;
    pendingActivities += summary.total - summary.completed;
    if (summary.total > 0) clientsThisMonth += 1;
    rows.push({
      client: mapClient(c),
      activityCount: summary.total,
      completedCount: summary.completed,
      workSummary: summary.bits.join(" · ") || "No work recorded",
      paymentStatus: pay[0]?.status ?? "—",
      paymentAmount: received || pending || null,
    });
  }
  return {
    year,
    month,
    activeClients: clients.length,
    clientsThisMonth,
    totalActivities,
    completedActivities,
    pendingActivities,
    paymentsReceived,
    paymentsPending,
    clientRows: rows,
  };
}

export function applyDashboardFinance(authz: AuthorizationContext, dash: Dashboard): Dashboard {
  if (canViewFinance(authz)) return dash;
  return {
    ...dash,
    paymentsReceived: 0,
    paymentsPending: 0,
    clientRows: dash.clientRows.map((row) => ({
      ...row,
      paymentStatus: "—",
      paymentAmount: null,
    })),
  };
}

export async function handleSavePayment(
  sql: Sql,
  userId: string,
  data: {
    id?: string;
    clientId: string;
    year: number;
    month: number;
    periodId?: string | null;
    status: string;
    amount?: number | null;
    paymentDate?: string | null;
    notes?: string;
  },
) {
  const actor = await requireFirmOSAction(sql, userId, paymentSavePermission(data.id), {
    type: "payment",
    id: data.id,
    clientId: data.clientId,
  });
  if (data.id) {
    await sql`update payments set
      status = ${data.status}, amount = ${data.amount ?? null},
      payment_date = ${data.paymentDate || null}, notes = ${data.notes?.trim() ?? ""},
      updated_at = now()
      where id = ${data.id}`;
    await recordLegacyAudit(sql, actor.userId, "payment.update", "payment", data.id);
    return { id: data.id };
  }
  const id = newId();
  await sql`insert into payments (id, client_id, period_id, year, month, status, amount, payment_date, notes)
    values (${id}, ${data.clientId}, ${data.periodId ?? null}, ${data.year}, ${data.month}, ${data.status}, ${data.amount ?? null}, ${data.paymentDate || null}, ${data.notes?.trim() ?? ""})`;
  await recordLegacyAudit(sql, actor.userId, "payment.create", "payment", id);
  return { id };
}

export async function handleDeletePayment(sql: Sql, userId: string, data: { id: string }) {
  const actor = await requireFirmOSAction(sql, userId, "payments.correct", {
    type: "payment",
    id: data.id,
  });
  await sql`delete from payments where id = ${data.id}`;
  await recordLegacyAudit(sql, actor.userId, "payment.delete", "payment", data.id);
  return { ok: true as const };
}

export async function handleUpdateUserAccess(
  sql: Sql,
  userId: string,
  data: { userId: string; role?: Role; isActive?: boolean },
) {
  const permissions = userAccessPermissions({ role: data.role, isActive: data.isActive });
  if (permissions.length === 0) {
    throw new Error("No user access change was supplied.");
  }
  const actor = await requireFirmOSAction(sql, userId, permissions, {
    type: "membership",
    id: data.userId,
  });
  if (data.userId === actor.userId && data.isActive === false) {
    throw new Error("You cannot deactivate your own account.");
  }
  if (data.role === "viewer" || data.isActive === false) {
    const admins = await sql<{ n: number }>`
      select count(*)::int as n from app_profiles
      where role = 'admin' and is_active = true and user_id <> ${data.userId}`;
    if ((admins[0]?.n ?? 0) === 0 && data.userId === actor.userId) {
      throw new Error("Keep at least one active admin.");
    }
  }
  if (data.role) {
    await sql`update app_profiles set role = ${data.role}, updated_at = now() where user_id = ${data.userId}`;
  }
  if (data.isActive !== undefined) {
    await sql`update app_profiles set is_active = ${data.isActive}, updated_at = now() where user_id = ${data.userId}`;
  }
  await recordLegacyAudit(
    sql,
    actor.userId,
    "user.update",
    "user",
    data.userId,
    `${data.role ?? ""} ${data.isActive ?? ""}`,
  );
  return { ok: true as const };
}

export async function handleRestoreBackup(
  sql: Sql,
  userId: string,
  data: { id?: string; payload?: unknown },
) {
  const actor = await requireFirmOSAction(sql, userId, "backup.restore", { type: "backup" });
  let payload = data.payload;
  if (payload === undefined && data.id) {
    const rows = await sql<{ payload: string }>`select payload from backups where id = ${data.id}`;
    if (!rows[0]) throw new Error("Backup not found.");
    try {
      payload = JSON.parse(rows[0].payload) as unknown;
    } catch {
      throw new Error("Backup file is not valid JSON.");
    }
  }
  if (payload === undefined) throw new Error("Nothing to restore.");
  validateBackupPayload(payload);
  const safety = await dumpBusiness(sql);
  await sql`insert into backups (id, created_by, note, payload)
    values (${newId()}, ${actor.userId}, ${"Safety copy before restore"}, ${JSON.stringify(safety)})`;
  try {
    await restoreBusiness(sql, payload);
  } catch (err) {
    if (err instanceof Error && err.name === "BackupValidationError") throw err;
    throw new Error("Restore failed. Existing data was left unchanged.");
  }
  await recordLegacyAudit(sql, actor.userId, "backup.restore", "backup", data.id ?? "", "");
  return { ok: true as const };
}

export async function handleGetDashboard(
  sql: Sql,
  userId: string,
  data: { year: number; month: number },
  options?: { afterAuthorize?: (authz: AuthorizationContext) => Promise<void> },
): Promise<Dashboard> {
  const authz = await requireFirmOSAction(sql, userId, "work.view", { type: "firm" });
  await options?.afterAuthorize?.(authz);
  return applyDashboardFinance(authz, await loadDashboard(sql, data.year, data.month));
}

export async function handleGetWorkspace<T extends { payments: Array<{ amount: number | null; notes?: string }> }>(
  sql: Sql,
  userId: string,
  load: () => Promise<T>,
): Promise<T> {
  const authz = await requireFirmOSAction(sql, userId, "work.view", { type: "firm" });
  const workspace = await load();
  return { ...workspace, payments: redactPaymentRecords(authz, workspace.payments) };
}
