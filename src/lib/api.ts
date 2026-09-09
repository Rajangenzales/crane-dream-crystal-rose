import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { monthTitle } from "@/lib/catalog";
import { toNumber } from "@/lib/format";
import { newId } from "@/lib/utils";
import { dumpBusiness, restoreBusiness, validateBackupPayload } from "@/lib/backup";
import { provisionActor } from "@/lib/provision";
import {
  addSectionSchema,
  assignClientServiceSchema,
  combinedReportSchema,
  createBackupSchema,
  createClientSchema,
  createEmailUserSchema,
  createServiceSchema,
  duplicatePeriodSchema,
  idOnlySchema,
  includeInactiveSchema,
  parseInput,
  reorderSectionsSchema,
  restoreBackupSchema,
  saveActivitySchema,
  savePaymentSchema,
  unassignClientServiceSchema,
  updateClientSchema,
  updateSectionSchema,
  updateServiceSchema,
  updateSettingsSchema,
  updateUserAccessSchema,
  workspaceQuerySchema,
  yearMonthSchema,
} from "@/lib/validation";
import type {
  Activity,
  AuditRow,
  BackupRow,
  Client,
  ClientListItem,
  ClientReport,
  Dashboard,
  FounderSummary,
  MonthSummary,
  Payment,
  Period,
  Profile,
  Role,
  Section,
  Service,
  Settings,
  UserRow,
  Workspace,
} from "@/lib/types";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type Actor = Profile;

async function audit(
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

async function getSettingsRow(sql: Sql): Promise<Settings> {
  const rows = await sql<{ key: string; value: string }>`select key, value from app_settings`;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    agencyName: map.agency_name ?? "Genzales",
    agencyTagline: map.agency_tagline ?? "Work first. Reports follow.",
    currency: map.currency ?? "INR",
    viewersSeePayments: map.viewers_see_payments !== "false",
  };
}

async function getActor(sql: Sql, userId: string): Promise<Actor> {
  const before = await sql<{ n: number }>`select count(*)::int as n from app_profiles where user_id = ${userId}`;
  const actor = await provisionActor(sql, userId);
  if ((before[0]?.n ?? 0) === 0 && actor.role === "admin" && actor.isActive) {
    await audit(sql, userId, "user.bootstrap_admin", "profile", userId);
  }
  return actor;
}

async function requireActive(sql: Sql, userId: string) {
  const actor = await getActor(sql, userId);
  if (!actor.isActive) throw new ForbiddenError("Your account is waiting for activation.");
  return actor;
}

async function requireAdmin(sql: Sql, userId: string) {
  const actor = await requireActive(sql, userId);
  if (actor.role !== "admin") throw new ForbiddenError("Admin access required.");
  return actor;
}

function mapClient(row: {
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

function mapPayment(row: {
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

async function loadSections(sql: Sql, periodId: string): Promise<Section[]> {
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

async function ensurePeriodInternal(
  sql: Sql,
  clientId: string,
  year: number,
  month: number,
): Promise<Period> {
  const existing = await sql<{
    id: string;
    client_id: string;
    year: number;
    month: number;
    title: string;
    status: string;
  }>`select id, client_id, year, month, title, status from report_periods
     where client_id = ${clientId} and year = ${year} and month = ${month}`;
  if (existing[0]) {
    const row = existing[0];
    return {
      id: row.id,
      clientId: row.client_id,
      year: row.year,
      month: row.month,
      title: row.title || monthTitle(year, month),
      status: row.status,
    };
  }
  const id = newId();
  const title = monthTitle(year, month);
  await sql`insert into report_periods (id, client_id, year, month, title)
    values (${id}, ${clientId}, ${year}, ${month}, ${title})`;
  const assigned = await sql<{ service_id: string; name: string; sort_order: number }>`
    select cs.service_id, sl.name, sl.sort_order
    from client_services cs
    join service_library sl on sl.id = cs.service_id
    where cs.client_id = ${clientId}
    order by sl.sort_order, sl.name`;
  let order = 0;
  for (const svc of assigned) {
    await sql`insert into report_sections (id, period_id, service_id, title, is_manual, sort_order)
      values (${newId()}, ${id}, ${svc.service_id}, ${svc.name}, false, ${order})`;
    order += 10;
  }
  return { id, clientId, year, month, title, status: "active" };
}

async function seedIfEmpty(sql: Sql) {
  const count = await sql<{ n: number }>`select count(*)::int as n from clients`;
  if ((count[0]?.n ?? 0) > 0) return;

  type SeedClient = {
    id: string;
    name: string;
    company: string;
    contact: string;
    email: string;
    phone: string;
    notes: string;
    services: string[];
    activities: Array<{
      service: string;
      date: string;
      title: string;
      description: string;
      quantity: number | null;
      unit: string;
      status: string;
    }>;
    payment: { status: string; amount: number | null; date: string | null; notes: string };
  };

  const year = 2026;
  const month = 9;
  const seeds: SeedClient[] = [
    {
      id: "cli_lumina",
      name: "Lumina Homes",
      company: "Lumina Homes Pvt Ltd",
      contact: "Anjali Menon",
      email: "anjali@luminahomes.in",
      phone: "+91 98470 11220",
      notes: "Premium residential developer. Monthly SEO + ads + creative retainer.",
      services: ["svc_seo", "svc_google_ads", "svc_creative"],
      activities: [
        {
          service: "svc_seo",
          date: "2026-09-02",
          title: "Keyword research refresh",
          description: "Mapped 48 high-intent terms for Thrissur and Kochi landing pages.",
          quantity: 48,
          unit: "Tasks",
          status: "completed",
        },
        {
          service: "svc_seo",
          date: "2026-09-05",
          title: "On-page optimisation",
          description: "Title, H1 and internal linking pass on project pages.",
          quantity: 12,
          unit: "Pages",
          status: "completed",
        },
        {
          service: "svc_seo",
          date: "2026-09-12",
          title: "Content optimisation",
          description: "Rewrote villa brochure copy for search intent.",
          quantity: 4,
          unit: "Articles",
          status: "in_progress",
        },
        {
          service: "svc_google_ads",
          date: "2026-09-03",
          title: "Campaign setup",
          description: "Search + Performance Max for monsoon launch.",
          quantity: 2,
          unit: "Campaigns",
          status: "completed",
        },
        {
          service: "svc_google_ads",
          date: "2026-09-10",
          title: "Bid and query optimisation",
          description: "Negatives added, geo refined to Kerala urban.",
          quantity: 1,
          unit: "Campaigns",
          status: "ongoing",
        },
        {
          service: "svc_creative",
          date: "2026-09-04",
          title: "Social creatives",
          description: "Carousel and story set for Instagram.",
          quantity: 10,
          unit: "Creatives",
          status: "delivered",
        },
        {
          service: "svc_creative",
          date: "2026-09-11",
          title: "Campaign creatives",
          description: "Display banners for Google Ads.",
          quantity: 6,
          unit: "Creatives",
          status: "delivered",
        },
      ],
      payment: { status: "received", amount: 85000, date: "2026-09-06", notes: "September retainer" },
    },
    {
      id: "cli_peppercorn",
      name: "Peppercorn",
      company: "Peppercorn Hospitality",
      contact: "Rahul Nair",
      email: "rahul@peppercorn.cafe",
      phone: "+91 98950 44012",
      notes: "Cafe group. Social, video and content every week.",
      services: ["svc_social", "svc_video", "svc_content"],
      activities: [
        {
          service: "svc_social",
          date: "2026-09-01",
          title: "September content calendar",
          description: "Planned 16 posts across Instagram and Facebook.",
          quantity: 16,
          unit: "Posts",
          status: "completed",
        },
        {
          service: "svc_social",
          date: "2026-09-08",
          title: "Community replies and stories",
          description: "Daily story cadence for Onam week.",
          quantity: 12,
          unit: "Posts",
          status: "ongoing",
        },
        {
          service: "svc_video",
          date: "2026-09-06",
          title: "Reel production",
          description: "Kitchen process reels, colour graded.",
          quantity: 3,
          unit: "Videos",
          status: "delivered",
        },
        {
          service: "svc_content",
          date: "2026-09-09",
          title: "Blog: Onam sadhya at Peppercorn",
          description: "Long-form piece for the website journal.",
          quantity: 1,
          unit: "Articles",
          status: "completed",
        },
      ],
      payment: { status: "pending", amount: 42000, date: null, notes: "Invoice sent 4 Sep" },
    },
    {
      id: "cli_craft",
      name: "Kerala Craft Co",
      company: "Kerala Craft Collective",
      contact: "Meera Joseph",
      email: "meera@keralacraft.co",
      phone: "+91 97440 22881",
      notes: "Handloom and home objects. Site care plus packaging and photography.",
      services: ["svc_website_maint", "svc_packaging", "svc_photo"],
      activities: [
        {
          service: "svc_website_maint",
          date: "2026-09-02",
          title: "Catalogue updates",
          description: "Added 9 new SKUs and inventory badges.",
          quantity: 9,
          unit: "Pages",
          status: "completed",
        },
        {
          service: "svc_website_maint",
          date: "2026-09-14",
          title: "Speed and uptime checks",
          description: "Image compression and backup verification.",
          quantity: 1,
          unit: "Tasks",
          status: "completed",
        },
        {
          service: "svc_packaging",
          date: "2026-09-07",
          title: "Gift box sleeve",
          description: "Diwali sleeve for the brass collection.",
          quantity: 1,
          unit: "Projects",
          status: "in_progress",
        },
        {
          service: "svc_photo",
          date: "2026-09-05",
          title: "Product stills",
          description: "Studio set for bowls and runners.",
          quantity: 24,
          unit: "Tasks",
          status: "delivered",
        },
      ],
      payment: { status: "received", amount: 56000, date: "2026-09-08", notes: "" },
    },
    {
      id: "cli_orbit",
      name: "Orbit Fitness",
      company: "Orbit Fitness Studios",
      contact: "Vivek Sharma",
      email: "vivek@orbit.fit",
      phone: "+91 98100 77331",
      notes: "Two-studio chain. Ads, landing page and motion for membership drive.",
      services: ["svc_meta_ads", "svc_landing", "svc_motion"],
      activities: [
        {
          service: "svc_meta_ads",
          date: "2026-09-03",
          title: "Membership campaign",
          description: "Advantage+ and retargeting stack.",
          quantity: 2,
          unit: "Campaigns",
          status: "ongoing",
        },
        {
          service: "svc_landing",
          date: "2026-09-08",
          title: "Trial landing page",
          description: "Mobile-first page with slot booking.",
          quantity: 1,
          unit: "Pages",
          status: "completed",
        },
        {
          service: "svc_motion",
          date: "2026-09-11",
          title: "Promo motion bumpers",
          description: "6-second bumpers for Reels and Stories.",
          quantity: 4,
          unit: "Animations",
          status: "in_progress",
        },
      ],
      payment: { status: "not_applicable", amount: null, date: null, notes: "In-house brand, no invoice this month" },
    },
  ];

  for (const c of seeds) {
    await sql`insert into clients (id, name, company_name, contact_person, email, phone, notes)
      values (${c.id}, ${c.name}, ${c.company}, ${c.contact}, ${c.email}, ${c.phone}, ${c.notes})`;
    for (const sid of c.services) {
      await sql`insert into client_services (id, client_id, service_id)
        values (${newId()}, ${c.id}, ${sid}) on conflict (client_id, service_id) do nothing`;
    }
    const period = await ensurePeriodInternal(sql, c.id, year, month);
    const sections = await sql<{ id: string; service_id: string | null }>`
      select id, service_id from report_sections where period_id = ${period.id}`;
    const sectionByService = new Map(sections.map((s) => [s.service_id, s.id]));
    let sort = 0;
    for (const a of c.activities) {
      const sectionId = sectionByService.get(a.service);
      if (!sectionId) continue;
      await sql`insert into activities (
        id, section_id, activity_date, title, description, quantity, unit, status, notes, sort_order
      ) values (
        ${newId()}, ${sectionId}, ${a.date}, ${a.title}, ${a.description}, ${a.quantity},
        ${a.unit}, ${a.status}, ${""}, ${sort}
      )`;
      sort += 10;
    }
    await sql`insert into payments (id, client_id, period_id, year, month, status, amount, payment_date, notes)
      values (${newId()}, ${c.id}, ${period.id}, ${year}, ${month}, ${c.payment.status}, ${c.payment.amount}, ${c.payment.date}, ${c.payment.notes})`;
  }
}

function canSeePayments(actor: Actor, settings: Settings) {
  return actor.role === "admin" || settings.viewersSeePayments;
}

function redactPayments<T extends { payments?: Payment[]; paymentAmount?: number | null; paymentStatus?: string }>(
  actor: Actor,
  settings: Settings,
  value: T,
): T {
  if (canSeePayments(actor, settings)) return value;
  if (value.payments) {
    return {
      ...value,
      payments: value.payments.map((p) => ({ ...p, amount: null, notes: "" })),
    };
  }
  return { ...value, paymentAmount: null };
}

export const getSessionWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await getActor(sql, context.userId);
    if (profile.role === "admin" && profile.isActive) await seedIfEmpty(sql);
    const settings = await getSettingsRow(sql);
    return { profile, settings };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(updateSettingsSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const pairs: Array<[string, string]> = [
      ["agency_name", data.agencyName.trim() || "Genzales"],
      ["agency_tagline", data.agencyTagline.trim()],
      ["currency", data.currency.trim() || "INR"],
      ["viewers_see_payments", data.viewersSeePayments ? "true" : "false"],
    ];
    for (const [k, v] of pairs) {
      await sql`insert into app_settings (key, value) values (${k}, ${v})
        on conflict (key) do update set value = excluded.value`;
    }
    await audit(sql, actor.userId, "settings.update", "settings", "", data.agencyName);
    return getSettingsRow(sql);
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(includeInactiveSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireActive(sql, context.userId);
    const rows = await sql<{
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
      service_count: number;
      service_names: string | null;
    }>`
      select c.*,
        count(cs.id)::int as service_count,
        string_agg(sl.name, ', ' order by sl.sort_order) as service_names
      from clients c
      left join client_services cs on cs.client_id = c.id
      left join service_library sl on sl.id = cs.service_id
      where (${data.includeInactive ?? false} or c.is_active = true)
      group by c.id
      order by c.is_active desc, c.name`;
    return rows.map((r) => ({
      ...mapClient(r),
      serviceCount: r.service_count,
      serviceNames: r.service_names ? r.service_names.split(", ") : [],
    })) satisfies ClientListItem[];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(createClientSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Client name is required.");
    const id = newId();
    await sql`insert into clients (id, name, company_name, contact_person, email, phone, notes)
      values (${id}, ${name}, ${data.companyName?.trim() ?? ""}, ${data.contactPerson?.trim() ?? ""},
              ${data.email?.trim() ?? ""}, ${data.phone?.trim() ?? ""}, ${data.notes?.trim() ?? ""})`;
    await audit(sql, actor.userId, "client.create", "client", id, name);
    const rows = await sql<Parameters<typeof mapClient>[0]>`select * from clients where id = ${id}`;
    return mapClient(rows[0]!);
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(updateClientSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Client name is required.");
    await sql`update clients set
      name = ${name},
      company_name = ${data.companyName?.trim() ?? ""},
      contact_person = ${data.contactPerson?.trim() ?? ""},
      email = ${data.email?.trim() ?? ""},
      phone = ${data.phone?.trim() ?? ""},
      notes = ${data.notes?.trim() ?? ""},
      is_active = ${data.isActive ?? true},
      updated_at = now()
      where id = ${data.id}`;
    await audit(sql, actor.userId, data.isActive === false ? "client.archive" : "client.update", "client", data.id, name);
    const rows = await sql<Parameters<typeof mapClient>[0]>`select * from clients where id = ${data.id}`;
    return mapClient(rows[0]!);
  });

export const listServices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(includeInactiveSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireActive(sql, context.userId);
    const rows = await sql<{
      id: string;
      name: string;
      is_active: boolean;
      is_global: boolean;
      sort_order: number;
    }>`select id, name, is_active, is_global, sort_order from service_library
       where (${data.includeInactive ?? true} or is_active = true)
       order by sort_order, name`;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      isActive: r.is_active,
      isGlobal: r.is_global,
      sortOrder: r.sort_order,
    })) satisfies Service[];
  });

export const createService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(createServiceSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Service name is required.");
    const dup = await sql<{ id: string }>`select id from service_library where lower(name) = ${name.toLowerCase()}`;
    if (dup[0]) throw new Error("A service with that name already exists.");
    const max = await sql<{ m: number | null }>`select max(sort_order) as m from service_library`;
    const id = newId();
    await sql`insert into service_library (id, name, is_global, sort_order)
      values (${id}, ${name}, ${data.isGlobal ?? true}, ${(max[0]?.m ?? 0) + 10})`;
    await audit(sql, actor.userId, "service.create", "service", id, name);
    return { id, name, isActive: true, isGlobal: data.isGlobal ?? true, sortOrder: (max[0]?.m ?? 0) + 10 } satisfies Service;
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(updateServiceSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const name = data.name.trim();
    await sql`update service_library set name = ${name}, is_active = ${data.isActive}, updated_at = now() where id = ${data.id}`;
    await audit(sql, actor.userId, data.isActive ? "service.update" : "service.deactivate", "service", data.id, name);
    return { ok: true };
  });

export const assignClientService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(assignClientServiceSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    let serviceId = data.serviceId;
    if (!serviceId) {
      const name = data.customName?.trim();
      if (!name) throw new Error("Choose a service or enter a custom name.");
      const existing = await sql<{ id: string }>`select id from service_library where lower(name) = ${name.toLowerCase()}`;
      if (existing[0]) serviceId = existing[0].id;
      else {
        serviceId = newId();
        const max = await sql<{ m: number | null }>`select max(sort_order) as m from service_library`;
        await sql`insert into service_library (id, name, is_global, sort_order)
          values (${serviceId}, ${name}, ${data.promote ?? false}, ${(max[0]?.m ?? 0) + 10})`;
      }
    }
    await sql`insert into client_services (id, client_id, service_id)
      values (${newId()}, ${data.clientId}, ${serviceId})
      on conflict (client_id, service_id) do nothing`;
    await audit(sql, actor.userId, "client_service.assign", "client", data.clientId, serviceId);
    return { ok: true, serviceId };
  });

export const unassignClientService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(unassignClientServiceSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    await sql`delete from client_services where client_id = ${data.clientId} and service_id = ${data.serviceId}`;
    await audit(sql, actor.userId, "client_service.remove", "client", data.clientId, data.serviceId);
    return { ok: true };
  });

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(workspaceQuerySchema))
  .handler(async ({ context, data }): Promise<Workspace> => {
    const sql = await getSql();
    const actor = await requireActive(sql, context.userId);
    const settings = await getSettingsRow(sql);
    const clients = await sql<Parameters<typeof mapClient>[0]>`select * from clients where id = ${data.clientId}`;
    if (!clients[0]) throw new Error("Client not found.");
    const period = await ensurePeriodInternal(sql, data.clientId, data.year, data.month);
    const sections = await loadSections(sql, period.id);
    const assigned = await sql<{ service_id: string }>`select service_id from client_services where client_id = ${data.clientId}`;
    const services = await sql<{
      id: string;
      name: string;
      is_active: boolean;
      is_global: boolean;
      sort_order: number;
    }>`select id, name, is_active, is_global, sort_order from service_library order by sort_order, name`;
    const payments = await sql<{
      id: string;
      client_id: string;
      period_id: string | null;
      year: number;
      month: number;
      status: string;
      amount: string | number | null;
      payment_date: string | null;
      notes: string;
    }>`select * from payments where client_id = ${data.clientId} and year = ${data.year} and month = ${data.month}
       order by created_at`;
    const ws: Workspace = {
      client: mapClient(clients[0]),
      period,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.is_active,
        isGlobal: s.is_global,
        sortOrder: s.sort_order,
      })),
      assignedServiceIds: assigned.map((a) => a.service_id),
      sections,
      payments: payments.map(mapPayment),
    };
    if (!canSeePayments(actor, settings)) {
      ws.payments = ws.payments.map((p) => ({ ...p, amount: null, notes: "" }));
    }
    return ws;
  });

export const addSection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(addSectionSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const title = data.title.trim();
    if (!title) throw new Error("Section title is required.");
    const max = await sql<{ m: number | null }>`select max(sort_order) as m from report_sections where period_id = ${data.periodId}`;
    const id = newId();
    await sql`insert into report_sections (id, period_id, service_id, title, is_manual, sort_order)
      values (${id}, ${data.periodId}, ${data.serviceId ?? null}, ${title}, ${!data.serviceId}, ${(max[0]?.m ?? 0) + 10})`;
    await audit(sql, actor.userId, "section.create", "section", id, title);
    return { id };
  });

export const updateSection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(updateSectionSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    await sql`update report_sections set title = ${data.title.trim()}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(idOnlySchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    await sql`delete from report_sections where id = ${data.id}`;
    await audit(sql, actor.userId, "section.delete", "section", data.id);
    return { ok: true };
  });

export const reorderSections = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(reorderSectionsSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    let order = 0;
    for (const id of data.ids) {
      await sql`update report_sections set sort_order = ${order} where id = ${id}`;
      order += 10;
    }
    return { ok: true };
  });

export const saveActivity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(saveActivitySchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const title = data.title.trim();
    if (!title) throw new Error("Activity title is required.");
    const date = data.activityDate || null;
    const qty = data.quantity ?? null;
    const unit = data.unit?.trim() ?? "";
    if (data.id) {
      await sql`update activities set
        activity_date = ${date}, title = ${title}, description = ${data.description?.trim() ?? ""},
        quantity = ${qty}, unit = ${unit}, status = ${data.status}, notes = ${data.notes?.trim() ?? ""},
        updated_at = now()
        where id = ${data.id}`;
      await audit(sql, actor.userId, "activity.update", "activity", data.id, title);
      return { id: data.id };
    }
    const max = await sql<{ m: number | null }>`select max(sort_order) as m from activities where section_id = ${data.sectionId}`;
    const id = newId();
    await sql`insert into activities (id, section_id, activity_date, title, description, quantity, unit, status, notes, sort_order)
      values (${id}, ${data.sectionId}, ${date}, ${title}, ${data.description?.trim() ?? ""}, ${qty}, ${unit}, ${data.status}, ${data.notes?.trim() ?? ""}, ${(max[0]?.m ?? 0) + 10})`;
    await audit(sql, actor.userId, "activity.create", "activity", id, title);
    return { id };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(idOnlySchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    await sql`delete from activities where id = ${data.id}`;
    await audit(sql, actor.userId, "activity.delete", "activity", data.id);
    return { ok: true };
  });

export const duplicatePeriod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(duplicatePeriodSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const from = await sql<{ id: string }>`
      select id from report_periods
      where client_id = ${data.clientId} and year = ${data.fromYear} and month = ${data.fromMonth}`;
    const dest = await ensurePeriodInternal(sql, data.clientId, data.toYear, data.toMonth);
    if (from[0] && from[0].id !== dest.id) {
      const destCount = await sql<{ n: number }>`select count(*)::int as n from report_sections where period_id = ${dest.id}`;
      if ((destCount[0]?.n ?? 0) === 0) {
        const src = await sql<{ service_id: string | null; title: string; is_manual: boolean; sort_order: number }>`
          select service_id, title, is_manual, sort_order from report_sections
          where period_id = ${from[0].id} order by sort_order`;
        for (const s of src) {
          await sql`insert into report_sections (id, period_id, service_id, title, is_manual, sort_order)
            values (${newId()}, ${dest.id}, ${s.service_id}, ${s.title}, ${s.is_manual}, ${s.sort_order})`;
        }
      }
    }
    await audit(sql, actor.userId, "period.duplicate", "period", dest.id, monthTitle(data.toYear, data.toMonth));
    return dest;
  });

export const savePayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(savePaymentSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    if (data.id) {
      await sql`update payments set
        status = ${data.status}, amount = ${data.amount ?? null},
        payment_date = ${data.paymentDate || null}, notes = ${data.notes?.trim() ?? ""},
        updated_at = now()
        where id = ${data.id}`;
      await audit(sql, actor.userId, "payment.update", "payment", data.id);
      return { id: data.id };
    }
    const id = newId();
    await sql`insert into payments (id, client_id, period_id, year, month, status, amount, payment_date, notes)
      values (${id}, ${data.clientId}, ${data.periodId ?? null}, ${data.year}, ${data.month}, ${data.status}, ${data.amount ?? null}, ${data.paymentDate || null}, ${data.notes?.trim() ?? ""})`;
    await audit(sql, actor.userId, "payment.create", "payment", id);
    return { id };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(idOnlySchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    await sql`delete from payments where id = ${data.id}`;
    await audit(sql, actor.userId, "payment.delete", "payment", data.id);
    return { ok: true };
  });

export const listPayments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(yearMonthSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireActive(sql, context.userId);
    const settings = await getSettingsRow(sql);
    const rows = await sql<{
      id: string;
      client_id: string;
      period_id: string | null;
      year: number;
      month: number;
      status: string;
      amount: string | number | null;
      payment_date: string | null;
      notes: string;
      client_name: string;
    }>`select p.*, c.name as client_name
       from payments p
       join clients c on c.id = p.client_id
       where p.year = ${data.year} and p.month = ${data.month}
       order by c.name`;
    const mapped = rows.map(mapPayment);
    if (!canSeePayments(actor, settings)) {
      return mapped.map((p) => ({ ...p, amount: null, notes: "" }));
    }
    return mapped;
  });

function summariseWork(sections: Section[]) {
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

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(yearMonthSchema))
  .handler(async ({ context, data }): Promise<Dashboard> => {
    const sql = await getSql();
    const actor = await requireActive(sql, context.userId);
    if (actor.role === "admin") await seedIfEmpty(sql);
    const settings = await getSettingsRow(sql);
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
        select id from report_periods where client_id = ${c.id} and year = ${data.year} and month = ${data.month}`;
      const sections = period[0] ? await loadSections(sql, period[0].id) : [];
      const summary = summariseWork(sections);
      const pay = await sql<{ status: string; amount: string | number | null }>`
        select status, amount from payments where client_id = ${c.id} and year = ${data.year} and month = ${data.month}`;
      const received = pay.filter((p) => p.status === "received").reduce((s, p) => s + (toNumber(p.amount) ?? 0), 0);
      const pending = pay.filter((p) => p.status === "pending").reduce((s, p) => s + (toNumber(p.amount) ?? 0), 0);
      paymentsReceived += received;
      paymentsPending += pending;
      totalActivities += summary.total;
      completedActivities += summary.completed;
      pendingActivities += summary.total - summary.completed;
      if (summary.total > 0) clientsThisMonth += 1;
      const payStatus = pay[0]?.status ?? "—";
      rows.push({
        client: mapClient(c),
        activityCount: summary.total,
        completedCount: summary.completed,
        workSummary: summary.bits.join(" · ") || "No work recorded",
        paymentStatus: canSeePayments(actor, settings) ? payStatus : "—",
        paymentAmount: canSeePayments(actor, settings) ? received || pending || null : null,
      });
    }
    return {
      year: data.year,
      month: data.month,
      activeClients: clients.length,
      clientsThisMonth,
      totalActivities,
      completedActivities,
      pendingActivities,
      paymentsReceived: canSeePayments(actor, settings) ? paymentsReceived : 0,
      paymentsPending: canSeePayments(actor, settings) ? paymentsPending : 0,
      clientRows: rows,
    };
  });

export const getMonthSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(yearMonthSchema))
  .handler(async ({ data }): Promise<MonthSummary> => {
    const dash = await getDashboard({ data });
    const statusCounts: Record<string, number> = {};
    return {
      year: data.year,
      month: data.month,
      clientsServed: dash.clientsThisMonth,
      totalActivities: dash.totalActivities,
      statusCounts,
      paymentsReceived: dash.paymentsReceived,
      paymentsPending: dash.paymentsPending,
      rows: dash.clientRows.map((r) => ({
        client: r.client,
        workDone: r.workSummary,
        totalWork: r.activityCount,
        paymentStatus: r.paymentStatus,
        paymentAmount: r.paymentAmount,
      })),
    };
  });

export const getFounderSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(yearMonthSchema))
  .handler(async ({ context, data }): Promise<FounderSummary> => {
    const sql = await getSql();
    await requireActive(sql, context.userId);
    const dash = await getDashboard({ data });
    const units = new Map<string, number>();
    const services = new Map<string, number>();
    const statusCounts: Record<string, number> = {};
    const noWork: Array<{ id: string; name: string }> = [];
    const outstanding: Array<{ id: string; name: string; amount: number | null }> = [];
    for (const row of dash.clientRows) {
      const period = await sql<{ id: string }>`
        select id from report_periods where client_id = ${row.client.id} and year = ${data.year} and month = ${data.month}`;
      const sections = period[0] ? await loadSections(sql, period[0].id) : [];
      const sum = summariseWork(sections);
      for (const [k, v] of Object.entries(sum.statusCounts)) statusCounts[k] = (statusCounts[k] ?? 0) + v;
      for (const [u, q] of sum.units) units.set(u, (units.get(u) ?? 0) + q);
      for (const s of sections) {
        if (s.activities.length) services.set(s.title, (services.get(s.title) ?? 0) + 1);
      }
      if (row.activityCount === 0) noWork.push({ id: row.client.id, name: row.client.name });
      if (row.paymentStatus === "pending") {
        outstanding.push({ id: row.client.id, name: row.client.name, amount: row.paymentAmount });
      }
    }
    return {
      year: data.year,
      month: data.month,
      clientsServed: dash.clientsThisMonth,
      totalActivities: dash.totalActivities,
      statusCounts,
      paymentsReceived: dash.paymentsReceived,
      paymentsPending: dash.paymentsPending,
      rows: dash.clientRows.map((r) => ({
        client: r.client,
        workDone: r.workSummary,
        totalWork: r.activityCount,
        paymentStatus: r.paymentStatus,
        paymentAmount: r.paymentAmount,
      })),
      activeClients: dash.activeClients,
      clientsWithNoWork: noWork,
      clientsWithOutstanding: outstanding,
      units: [...units.entries()].map(([unit, quantity]) => ({ unit, quantity })),
      services: [...services.entries()].map(([name, sections]) => ({ name, sections })),
    };
  });

export const getClientReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(workspaceQuerySchema))
  .handler(async ({ context, data }): Promise<ClientReport> => {
    const sql = await getSql();
    const actor = await requireActive(sql, context.userId);
    const settings = await getSettingsRow(sql);
    const ws = await getWorkspace({ data });
    await sql`insert into report_exports (id, kind, client_id, year, month, generated_by)
      values (${newId()}, ${"client"}, ${data.clientId}, ${data.year}, ${data.month}, ${actor.userId})`;
    return redactPayments(actor, settings, {
      client: ws.client,
      period: ws.period,
      sections: ws.sections,
      payments: ws.payments,
      settings,
    });
  });

export const getCombinedReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parseInput(combinedReportSchema))
  .handler(async ({ context, data }): Promise<{ reports: ClientReport[]; settings: Settings }> => {
    const sql = await getSql();
    const actor = await requireActive(sql, context.userId);
    const settings = await getSettingsRow(sql);
    const reports: ClientReport[] = [];
    for (const clientId of data.clientIds) {
      const ws = await getWorkspace({ data: { clientId, year: data.year, month: data.month } });
      reports.push(
        redactPayments(actor, settings, {
          client: ws.client,
          period: ws.period,
          sections: ws.sections,
          payments: ws.payments,
          settings,
        }),
      );
    }
    await sql`insert into report_exports (id, kind, year, month, client_ids, generated_by)
      values (${newId()}, ${"combined"}, ${data.year}, ${data.month}, ${JSON.stringify(data.clientIds)}, ${actor.userId})`;
    return { reports, settings };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserRow[]> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<{
      user_id: string;
      name: string;
      email: string | null;
      role: Role;
      is_active: boolean;
      created_at: string;
    }>`select p.user_id, coalesce(u.name, 'User') as name, u.email, p.role, p.is_active, p.created_at
       from app_profiles p
       left join "user" u on u.id = p.user_id
       order by p.created_at`;
    return rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  });

export const updateUserAccess = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(updateUserAccessSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
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
    await audit(sql, actor.userId, "user.update", "user", data.userId, `${data.role ?? ""} ${data.isActive ?? ""}`);
    return { ok: true };
  });

export const createEmailUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(createEmailUserSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    if (!email || !name) throw new Error("Name and email are required.");
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters.");
    const { auth } = await import("@/lib/auth/server");
    const result = await auth.api.signUpEmail({
      body: { email, password: data.password, name },
    });
    const userId = result.user?.id;
    if (!userId) throw new Error("Could not create the user.");
    await sql`insert into app_profiles (user_id, role, is_active)
      values (${userId}, ${data.role}, true)
      on conflict (user_id) do update set role = excluded.role, is_active = true, updated_at = now()`;
    await audit(sql, actor.userId, "user.create", "user", userId, email);
    return { userId };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<{
      id: string;
      user_id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      detail: string;
      created_at: string;
    }>`select id, user_id, action, entity_type, entity_id, detail, created_at
       from audit_logs order by created_at desc limit 80`;
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      detail: r.detail,
      createdAt: r.created_at,
    }));
  });

export const createBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(createBackupSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
    const payload = await dumpBusiness(sql);
    const id = newId();
    const payloadJson = JSON.stringify(payload);
    await sql`insert into backups (id, created_by, note, payload)
      values (${id}, ${actor.userId}, ${data.note?.trim() ?? "Manual backup"}, ${payloadJson})`;
    await audit(sql, actor.userId, "backup.create", "backup", id);
    return { id, payloadJson };
  });

export const listBackups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BackupRow[]> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<{ id: string; created_by: string; note: string; created_at: string }>`
      select id, created_by, note, created_at from backups order by created_at desc limit 30`;
    return rows.map((r) => ({
      id: r.id,
      createdBy: r.created_by,
      note: r.note,
      createdAt: r.created_at,
    }));
  });

export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(restoreBackupSchema))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await requireAdmin(sql, context.userId);
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
    await audit(sql, actor.userId, "backup.restore", "backup", data.id ?? "", "");
    return { ok: true };
  });


