import { a as monthTitle } from "./catalog-BTGOZ5oc.mjs";
import { a as toNumber } from "./format-BQrEX9ez.mjs";
import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-CPfEg9sn.mjs";
import { n as newId } from "./utils-DG8erAqy.mjs";
import { r as getSql } from "./db-Dd9Co3xC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BwTcsalX.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var ForbiddenError = class extends Error {
	status = 403;
	constructor(message = "Forbidden") {
		super(message);
		this.name = "ForbiddenError";
	}
};
async function audit(sql, userId, action, entityType = "", entityId = "", detail = "") {
	await sql`insert into audit_logs (id, user_id, action, entity_type, entity_id, detail)
    values (${newId()}, ${userId}, ${action}, ${entityType}, ${entityId}, ${detail})`;
}
async function getSettingsRow(sql) {
	const rows = await sql`select key, value from app_settings`;
	const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	return {
		agencyName: map.agency_name ?? "Genzales",
		agencyTagline: map.agency_tagline ?? "Work first. Reports follow.",
		currency: map.currency ?? "INR",
		viewersSeePayments: map.viewers_see_payments !== "false"
	};
}
async function getActor(sql, userId) {
	const user = (await sql`
    select id, name, email from "user" where id = ${userId}`)[0];
	const existing = await sql`
    select user_id, role, is_active from app_profiles where user_id = ${userId}`;
	if (existing[0]) return {
		userId,
		role: existing[0].role,
		isActive: existing[0].is_active,
		name: user?.name ?? "User",
		email: user?.email ?? null
	};
	const isFirst = ((await sql`select count(*)::int as n from app_profiles`)[0]?.n ?? 0) === 0;
	const role = isFirst ? "admin" : "viewer";
	const isActive = isFirst;
	await sql`insert into app_profiles (user_id, role, is_active)
    values (${userId}, ${role}, ${isActive})
    on conflict (user_id) do nothing`;
	if (isFirst) await audit(sql, userId, "user.bootstrap_admin", "profile", userId);
	return {
		userId,
		role,
		isActive,
		name: user?.name ?? "User",
		email: user?.email ?? null
	};
}
async function requireActive(sql, userId) {
	const actor = await getActor(sql, userId);
	if (!actor.isActive) throw new ForbiddenError("Your account is waiting for activation.");
	return actor;
}
async function requireAdmin(sql, userId) {
	const actor = await requireActive(sql, userId);
	if (actor.role !== "admin") throw new ForbiddenError("Admin access required.");
	return actor;
}
function mapClient(row) {
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
		updatedAt: row.updated_at
	};
}
function mapActivity(row) {
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
		sortOrder: row.sort_order
	};
}
function mapPayment(row) {
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
		clientName: row.client_name
	};
}
async function loadSections(sql, periodId) {
	const sections = await sql`select id, period_id, service_id, title, is_manual, sort_order
     from report_sections where period_id = ${periodId} order by sort_order, title`;
	const activities = await sql`select a.id, a.section_id, a.activity_date, a.title, a.description, a.quantity, a.unit, a.status, a.notes, a.sort_order
     from activities a
     join report_sections s on s.id = a.section_id
     where s.period_id = ${periodId}
     order by a.sort_order, a.activity_date nulls last, a.created_at`;
	const bySection = /* @__PURE__ */ new Map();
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
		activities: bySection.get(s.id) ?? []
	}));
}
async function ensurePeriodInternal(sql, clientId, year, month) {
	const existing = await sql`select id, client_id, year, month, title, status from report_periods
     where client_id = ${clientId} and year = ${year} and month = ${month}`;
	if (existing[0]) {
		const row = existing[0];
		return {
			id: row.id,
			clientId: row.client_id,
			year: row.year,
			month: row.month,
			title: row.title || monthTitle(year, month),
			status: row.status
		};
	}
	const id = newId();
	const title = monthTitle(year, month);
	await sql`insert into report_periods (id, client_id, year, month, title)
    values (${id}, ${clientId}, ${year}, ${month}, ${title})`;
	const assigned = await sql`
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
	return {
		id,
		clientId,
		year,
		month,
		title,
		status: "active"
	};
}
async function seedIfEmpty(sql) {
	if (((await sql`select count(*)::int as n from clients`)[0]?.n ?? 0) > 0) return;
	const year = 2026;
	const month = 9;
	for (const c of [
		{
			id: "cli_lumina",
			name: "Lumina Homes",
			company: "Lumina Homes Pvt Ltd",
			contact: "Anjali Menon",
			email: "anjali@luminahomes.in",
			phone: "+91 98470 11220",
			notes: "Premium residential developer. Monthly SEO + ads + creative retainer.",
			services: [
				"svc_seo",
				"svc_google_ads",
				"svc_creative"
			],
			activities: [
				{
					service: "svc_seo",
					date: "2026-09-02",
					title: "Keyword research refresh",
					description: "Mapped 48 high-intent terms for Thrissur and Kochi landing pages.",
					quantity: 48,
					unit: "Tasks",
					status: "completed"
				},
				{
					service: "svc_seo",
					date: "2026-09-05",
					title: "On-page optimisation",
					description: "Title, H1 and internal linking pass on project pages.",
					quantity: 12,
					unit: "Pages",
					status: "completed"
				},
				{
					service: "svc_seo",
					date: "2026-09-12",
					title: "Content optimisation",
					description: "Rewrote villa brochure copy for search intent.",
					quantity: 4,
					unit: "Articles",
					status: "in_progress"
				},
				{
					service: "svc_google_ads",
					date: "2026-09-03",
					title: "Campaign setup",
					description: "Search + Performance Max for monsoon launch.",
					quantity: 2,
					unit: "Campaigns",
					status: "completed"
				},
				{
					service: "svc_google_ads",
					date: "2026-09-10",
					title: "Bid and query optimisation",
					description: "Negatives added, geo refined to Kerala urban.",
					quantity: 1,
					unit: "Campaigns",
					status: "ongoing"
				},
				{
					service: "svc_creative",
					date: "2026-09-04",
					title: "Social creatives",
					description: "Carousel and story set for Instagram.",
					quantity: 10,
					unit: "Creatives",
					status: "delivered"
				},
				{
					service: "svc_creative",
					date: "2026-09-11",
					title: "Campaign creatives",
					description: "Display banners for Google Ads.",
					quantity: 6,
					unit: "Creatives",
					status: "delivered"
				}
			],
			payment: {
				status: "received",
				amount: 85e3,
				date: "2026-09-06",
				notes: "September retainer"
			}
		},
		{
			id: "cli_peppercorn",
			name: "Peppercorn",
			company: "Peppercorn Hospitality",
			contact: "Rahul Nair",
			email: "rahul@peppercorn.cafe",
			phone: "+91 98950 44012",
			notes: "Cafe group. Social, video and content every week.",
			services: [
				"svc_social",
				"svc_video",
				"svc_content"
			],
			activities: [
				{
					service: "svc_social",
					date: "2026-09-01",
					title: "September content calendar",
					description: "Planned 16 posts across Instagram and Facebook.",
					quantity: 16,
					unit: "Posts",
					status: "completed"
				},
				{
					service: "svc_social",
					date: "2026-09-08",
					title: "Community replies and stories",
					description: "Daily story cadence for Onam week.",
					quantity: 12,
					unit: "Posts",
					status: "ongoing"
				},
				{
					service: "svc_video",
					date: "2026-09-06",
					title: "Reel production",
					description: "Kitchen process reels, colour graded.",
					quantity: 3,
					unit: "Videos",
					status: "delivered"
				},
				{
					service: "svc_content",
					date: "2026-09-09",
					title: "Blog: Onam sadhya at Peppercorn",
					description: "Long-form piece for the website journal.",
					quantity: 1,
					unit: "Articles",
					status: "completed"
				}
			],
			payment: {
				status: "pending",
				amount: 42e3,
				date: null,
				notes: "Invoice sent 4 Sep"
			}
		},
		{
			id: "cli_craft",
			name: "Kerala Craft Co",
			company: "Kerala Craft Collective",
			contact: "Meera Joseph",
			email: "meera@keralacraft.co",
			phone: "+91 97440 22881",
			notes: "Handloom and home objects. Site care plus packaging and photography.",
			services: [
				"svc_website_maint",
				"svc_packaging",
				"svc_photo"
			],
			activities: [
				{
					service: "svc_website_maint",
					date: "2026-09-02",
					title: "Catalogue updates",
					description: "Added 9 new SKUs and inventory badges.",
					quantity: 9,
					unit: "Pages",
					status: "completed"
				},
				{
					service: "svc_website_maint",
					date: "2026-09-14",
					title: "Speed and uptime checks",
					description: "Image compression and backup verification.",
					quantity: 1,
					unit: "Tasks",
					status: "completed"
				},
				{
					service: "svc_packaging",
					date: "2026-09-07",
					title: "Gift box sleeve",
					description: "Diwali sleeve for the brass collection.",
					quantity: 1,
					unit: "Projects",
					status: "in_progress"
				},
				{
					service: "svc_photo",
					date: "2026-09-05",
					title: "Product stills",
					description: "Studio set for bowls and runners.",
					quantity: 24,
					unit: "Tasks",
					status: "delivered"
				}
			],
			payment: {
				status: "received",
				amount: 56e3,
				date: "2026-09-08",
				notes: ""
			}
		},
		{
			id: "cli_orbit",
			name: "Orbit Fitness",
			company: "Orbit Fitness Studios",
			contact: "Vivek Sharma",
			email: "vivek@orbit.fit",
			phone: "+91 98100 77331",
			notes: "Two-studio chain. Ads, landing page and motion for membership drive.",
			services: [
				"svc_meta_ads",
				"svc_landing",
				"svc_motion"
			],
			activities: [
				{
					service: "svc_meta_ads",
					date: "2026-09-03",
					title: "Membership campaign",
					description: "Advantage+ and retargeting stack.",
					quantity: 2,
					unit: "Campaigns",
					status: "ongoing"
				},
				{
					service: "svc_landing",
					date: "2026-09-08",
					title: "Trial landing page",
					description: "Mobile-first page with slot booking.",
					quantity: 1,
					unit: "Pages",
					status: "completed"
				},
				{
					service: "svc_motion",
					date: "2026-09-11",
					title: "Promo motion bumpers",
					description: "6-second bumpers for Reels and Stories.",
					quantity: 4,
					unit: "Animations",
					status: "in_progress"
				}
			],
			payment: {
				status: "not_applicable",
				amount: null,
				date: null,
				notes: "In-house brand, no invoice this month"
			}
		}
	]) {
		await sql`insert into clients (id, name, company_name, contact_person, email, phone, notes)
      values (${c.id}, ${c.name}, ${c.company}, ${c.contact}, ${c.email}, ${c.phone}, ${c.notes})`;
		for (const sid of c.services) await sql`insert into client_services (id, client_id, service_id)
        values (${newId()}, ${c.id}, ${sid}) on conflict (client_id, service_id) do nothing`;
		const period = await ensurePeriodInternal(sql, c.id, year, month);
		const sections = await sql`
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
function canSeePayments(actor, settings) {
	return actor.role === "admin" || settings.viewersSeePayments;
}
function redactPayments(actor, settings, value) {
	if (canSeePayments(actor, settings)) return value;
	if (value.payments) return {
		...value,
		payments: value.payments.map((p) => ({
			...p,
			amount: null,
			notes: ""
		}))
	};
	return {
		...value,
		paymentAmount: null
	};
}
var getSessionWorkspace_createServerFn_handler = createServerRpc({
	id: "3b6094447d441454318dc09e7abfc36c0309e02b60a73a7a3604861c2ac64bf2",
	name: "getSessionWorkspace",
	filename: "src/lib/api.ts"
}, (opts) => getSessionWorkspace.__executeServer(opts));
var getSessionWorkspace = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getSessionWorkspace_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const profile = await getActor(sql, context.userId);
	if (profile.role === "admin" && profile.isActive) await seedIfEmpty(sql);
	return {
		profile,
		settings: await getSettingsRow(sql)
	};
});
var updateSettings_createServerFn_handler = createServerRpc({
	id: "473443b0129b25e1479f36f6527e528533429f640b8a104863697172c5d392df",
	name: "updateSettings",
	filename: "src/lib/api.ts"
}, (opts) => updateSettings.__executeServer(opts));
var updateSettings = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateSettings_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const pairs = [
		["agency_name", data.agencyName.trim() || "Genzales"],
		["agency_tagline", data.agencyTagline.trim()],
		["currency", data.currency.trim() || "INR"],
		["viewers_see_payments", data.viewersSeePayments ? "true" : "false"]
	];
	for (const [k, v] of pairs) await sql`insert into app_settings (key, value) values (${k}, ${v})
        on conflict (key) do update set value = excluded.value`;
	await audit(sql, actor.userId, "settings.update", "settings", "", data.agencyName);
	return getSettingsRow(sql);
});
var listClients_createServerFn_handler = createServerRpc({
	id: "ff88e4208d74c8d6e8f24c59d7a770c05fc331196e753cb0b233f3829c8ecf31",
	name: "listClients",
	filename: "src/lib/api.ts"
}, (opts) => listClients.__executeServer(opts));
var listClients = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(listClients_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireActive(sql, context.userId);
	return (await sql`
      select c.*,
        count(cs.id)::int as service_count,
        string_agg(sl.name, ', ' order by sl.sort_order) as service_names
      from clients c
      left join client_services cs on cs.client_id = c.id
      left join service_library sl on sl.id = cs.service_id
      where (${data.includeInactive ?? false} or c.is_active = true)
      group by c.id
      order by c.is_active desc, c.name`).map((r) => ({
		...mapClient(r),
		serviceCount: r.service_count,
		serviceNames: r.service_names ? r.service_names.split(", ") : []
	}));
});
var createClient_createServerFn_handler = createServerRpc({
	id: "7eb023852fe655719f65fceab286b3c33f755b7831756abde5380ff497030630",
	name: "createClient",
	filename: "src/lib/api.ts"
}, (opts) => createClient.__executeServer(opts));
var createClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createClient_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const name = data.name.trim();
	if (!name) throw new Error("Client name is required.");
	const id = newId();
	await sql`insert into clients (id, name, company_name, contact_person, email, phone, notes)
      values (${id}, ${name}, ${data.companyName?.trim() ?? ""}, ${data.contactPerson?.trim() ?? ""},
              ${data.email?.trim() ?? ""}, ${data.phone?.trim() ?? ""}, ${data.notes?.trim() ?? ""})`;
	await audit(sql, actor.userId, "client.create", "client", id, name);
	return mapClient((await sql`select * from clients where id = ${id}`)[0]);
});
var updateClient_createServerFn_handler = createServerRpc({
	id: "16d0652b21505f905a250f189c1787acc46803261cac180f2ebe88af0c53e09f",
	name: "updateClient",
	filename: "src/lib/api.ts"
}, (opts) => updateClient.__executeServer(opts));
var updateClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateClient_createServerFn_handler, async ({ context, data }) => {
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
	return mapClient((await sql`select * from clients where id = ${data.id}`)[0]);
});
var listServices_createServerFn_handler = createServerRpc({
	id: "de04add81d5e177df4a1aba62cf47b1e9b203b8a0ca452334191daf476fc402c",
	name: "listServices",
	filename: "src/lib/api.ts"
}, (opts) => listServices.__executeServer(opts));
var listServices = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(listServices_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireActive(sql, context.userId);
	return (await sql`select id, name, is_active, is_global, sort_order from service_library
       where (${data.includeInactive ?? true} or is_active = true)
       order by sort_order, name`).map((r) => ({
		id: r.id,
		name: r.name,
		isActive: r.is_active,
		isGlobal: r.is_global,
		sortOrder: r.sort_order
	}));
});
var createService_createServerFn_handler = createServerRpc({
	id: "07c09506ca21f4d474d40fd1cbb928fc3f26f010dd4b7dfa5ea42fdd80798f70",
	name: "createService",
	filename: "src/lib/api.ts"
}, (opts) => createService.__executeServer(opts));
var createService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createService_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const name = data.name.trim();
	if (!name) throw new Error("Service name is required.");
	if ((await sql`select id from service_library where lower(name) = ${name.toLowerCase()}`)[0]) throw new Error("A service with that name already exists.");
	const max = await sql`select max(sort_order) as m from service_library`;
	const id = newId();
	await sql`insert into service_library (id, name, is_global, sort_order)
      values (${id}, ${name}, ${data.isGlobal ?? true}, ${(max[0]?.m ?? 0) + 10})`;
	await audit(sql, actor.userId, "service.create", "service", id, name);
	return {
		id,
		name,
		isActive: true,
		isGlobal: data.isGlobal ?? true,
		sortOrder: (max[0]?.m ?? 0) + 10
	};
});
var updateService_createServerFn_handler = createServerRpc({
	id: "93409329e23c3189b7c423e9cdcf512c317c76a4e19d2fa424acd315ec1668b4",
	name: "updateService",
	filename: "src/lib/api.ts"
}, (opts) => updateService.__executeServer(opts));
var updateService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateService_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const name = data.name.trim();
	await sql`update service_library set name = ${name}, is_active = ${data.isActive}, updated_at = now() where id = ${data.id}`;
	await audit(sql, actor.userId, data.isActive ? "service.update" : "service.deactivate", "service", data.id, name);
	return { ok: true };
});
var assignClientService_createServerFn_handler = createServerRpc({
	id: "1793c654c1be3019c42468a8a5a5628baf00352e7a0d9a1547664b5169d8a502",
	name: "assignClientService",
	filename: "src/lib/api.ts"
}, (opts) => assignClientService.__executeServer(opts));
var assignClientService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(assignClientService_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	let serviceId = data.serviceId;
	if (!serviceId) {
		const name = data.customName?.trim();
		if (!name) throw new Error("Choose a service or enter a custom name.");
		const existing = await sql`select id from service_library where lower(name) = ${name.toLowerCase()}`;
		if (existing[0]) serviceId = existing[0].id;
		else {
			serviceId = newId();
			const max = await sql`select max(sort_order) as m from service_library`;
			await sql`insert into service_library (id, name, is_global, sort_order)
          values (${serviceId}, ${name}, ${data.promote ?? false}, ${(max[0]?.m ?? 0) + 10})`;
		}
	}
	await sql`insert into client_services (id, client_id, service_id)
      values (${newId()}, ${data.clientId}, ${serviceId})
      on conflict (client_id, service_id) do nothing`;
	await audit(sql, actor.userId, "client_service.assign", "client", data.clientId, serviceId);
	return {
		ok: true,
		serviceId
	};
});
var unassignClientService_createServerFn_handler = createServerRpc({
	id: "e4f42a03f32e561b5fd34a797d36546cb59880f7589292b9f737cea21eaad241",
	name: "unassignClientService",
	filename: "src/lib/api.ts"
}, (opts) => unassignClientService.__executeServer(opts));
var unassignClientService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(unassignClientService_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	await sql`delete from client_services where client_id = ${data.clientId} and service_id = ${data.serviceId}`;
	await audit(sql, actor.userId, "client_service.remove", "client", data.clientId, data.serviceId);
	return { ok: true };
});
var getWorkspace_createServerFn_handler = createServerRpc({
	id: "b915ed762966c094997df0b3cc570b03e9b9cda27d5eaee53d8288d22f1ae2f8",
	name: "getWorkspace",
	filename: "src/lib/api.ts"
}, (opts) => getWorkspace.__executeServer(opts));
var getWorkspace = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getWorkspace_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireActive(sql, context.userId);
	const settings = await getSettingsRow(sql);
	const clients = await sql`select * from clients where id = ${data.clientId}`;
	if (!clients[0]) throw new Error("Client not found.");
	const period = await ensurePeriodInternal(sql, data.clientId, data.year, data.month);
	const sections = await loadSections(sql, period.id);
	const assigned = await sql`select service_id from client_services where client_id = ${data.clientId}`;
	const services = await sql`select id, name, is_active, is_global, sort_order from service_library order by sort_order, name`;
	const payments = await sql`select * from payments where client_id = ${data.clientId} and year = ${data.year} and month = ${data.month}
       order by created_at`;
	const ws = {
		client: mapClient(clients[0]),
		period,
		services: services.map((s) => ({
			id: s.id,
			name: s.name,
			isActive: s.is_active,
			isGlobal: s.is_global,
			sortOrder: s.sort_order
		})),
		assignedServiceIds: assigned.map((a) => a.service_id),
		sections,
		payments: payments.map(mapPayment)
	};
	if (!canSeePayments(actor, settings)) ws.payments = ws.payments.map((p) => ({
		...p,
		amount: null,
		notes: ""
	}));
	return ws;
});
var addSection_createServerFn_handler = createServerRpc({
	id: "a911e1c183c25d5eef91cc3390d3c16978f08f269f4865cc6577a4ca5b468c9d",
	name: "addSection",
	filename: "src/lib/api.ts"
}, (opts) => addSection.__executeServer(opts));
var addSection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(addSection_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const title = data.title.trim();
	if (!title) throw new Error("Section title is required.");
	const max = await sql`select max(sort_order) as m from report_sections where period_id = ${data.periodId}`;
	const id = newId();
	await sql`insert into report_sections (id, period_id, service_id, title, is_manual, sort_order)
      values (${id}, ${data.periodId}, ${data.serviceId ?? null}, ${title}, ${!data.serviceId}, ${(max[0]?.m ?? 0) + 10})`;
	await audit(sql, actor.userId, "section.create", "section", id, title);
	return { id };
});
var updateSection_createServerFn_handler = createServerRpc({
	id: "77e53bf358bbfd22054333624d87498ce1fc4adf4a895338b848f00629f09807",
	name: "updateSection",
	filename: "src/lib/api.ts"
}, (opts) => updateSection.__executeServer(opts));
var updateSection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateSection_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	await sql`update report_sections set title = ${data.title.trim()}, updated_at = now() where id = ${data.id}`;
	return { ok: true };
});
var deleteSection_createServerFn_handler = createServerRpc({
	id: "6a098af7c56807c80da5169958340a1b714b716607a9d0f119627e03805aad3b",
	name: "deleteSection",
	filename: "src/lib/api.ts"
}, (opts) => deleteSection.__executeServer(opts));
var deleteSection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(deleteSection_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	await sql`delete from report_sections where id = ${data.id}`;
	await audit(sql, actor.userId, "section.delete", "section", data.id);
	return { ok: true };
});
var reorderSections_createServerFn_handler = createServerRpc({
	id: "7c7e6e4954bde0d9b79508008c250cb7b8898a6b66a0988405cac6e2c5c059ee",
	name: "reorderSections",
	filename: "src/lib/api.ts"
}, (opts) => reorderSections.__executeServer(opts));
var reorderSections = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(reorderSections_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	let order = 0;
	for (const id of data.ids) {
		await sql`update report_sections set sort_order = ${order} where id = ${id}`;
		order += 10;
	}
	return { ok: true };
});
var saveActivity_createServerFn_handler = createServerRpc({
	id: "c1bd80c824da6c24f9f625b552149323549daa859145c25630413cd602a6f94e",
	name: "saveActivity",
	filename: "src/lib/api.ts"
}, (opts) => saveActivity.__executeServer(opts));
var saveActivity = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(saveActivity_createServerFn_handler, async ({ context, data }) => {
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
	const max = await sql`select max(sort_order) as m from activities where section_id = ${data.sectionId}`;
	const id = newId();
	await sql`insert into activities (id, section_id, activity_date, title, description, quantity, unit, status, notes, sort_order)
      values (${id}, ${data.sectionId}, ${date}, ${title}, ${data.description?.trim() ?? ""}, ${qty}, ${unit}, ${data.status}, ${data.notes?.trim() ?? ""}, ${(max[0]?.m ?? 0) + 10})`;
	await audit(sql, actor.userId, "activity.create", "activity", id, title);
	return { id };
});
var deleteActivity_createServerFn_handler = createServerRpc({
	id: "ce10f73be66628bdacacd879b3b008acbd5e67962d75832a53a53daad2041e9c",
	name: "deleteActivity",
	filename: "src/lib/api.ts"
}, (opts) => deleteActivity.__executeServer(opts));
var deleteActivity = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(deleteActivity_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	await sql`delete from activities where id = ${data.id}`;
	await audit(sql, actor.userId, "activity.delete", "activity", data.id);
	return { ok: true };
});
var duplicatePeriod_createServerFn_handler = createServerRpc({
	id: "8e4685c5fbb4d590d200480ace0d3428b01e9ae23a6115ff5c67c172bcbd04f1",
	name: "duplicatePeriod",
	filename: "src/lib/api.ts"
}, (opts) => duplicatePeriod.__executeServer(opts));
var duplicatePeriod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(duplicatePeriod_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const from = await sql`
      select id from report_periods
      where client_id = ${data.clientId} and year = ${data.fromYear} and month = ${data.fromMonth}`;
	const dest = await ensurePeriodInternal(sql, data.clientId, data.toYear, data.toMonth);
	if (from[0] && from[0].id !== dest.id) {
		if (((await sql`select count(*)::int as n from report_sections where period_id = ${dest.id}`)[0]?.n ?? 0) === 0) {
			const src = await sql`
          select service_id, title, is_manual, sort_order from report_sections
          where period_id = ${from[0].id} order by sort_order`;
			for (const s of src) await sql`insert into report_sections (id, period_id, service_id, title, is_manual, sort_order)
            values (${newId()}, ${dest.id}, ${s.service_id}, ${s.title}, ${s.is_manual}, ${s.sort_order})`;
		}
	}
	await audit(sql, actor.userId, "period.duplicate", "period", dest.id, monthTitle(data.toYear, data.toMonth));
	return dest;
});
var savePayment_createServerFn_handler = createServerRpc({
	id: "ec8c38bc0065a9bc378f32bddcf1a1b2d48dda30d4eb5e5376df02f70ce6103d",
	name: "savePayment",
	filename: "src/lib/api.ts"
}, (opts) => savePayment.__executeServer(opts));
var savePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(savePayment_createServerFn_handler, async ({ context, data }) => {
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
var deletePayment_createServerFn_handler = createServerRpc({
	id: "0e4a60d9a55dc6cebbeab18829f3e59f40949e078844257b216af163f66c0adf",
	name: "deletePayment",
	filename: "src/lib/api.ts"
}, (opts) => deletePayment.__executeServer(opts));
var deletePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(deletePayment_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	await sql`delete from payments where id = ${data.id}`;
	await audit(sql, actor.userId, "payment.delete", "payment", data.id);
	return { ok: true };
});
var listPayments_createServerFn_handler = createServerRpc({
	id: "f8a427d0818f7251ab479407dcd311bfc23ea014bd14b7d7effd41fc9690f147",
	name: "listPayments",
	filename: "src/lib/api.ts"
}, (opts) => listPayments.__executeServer(opts));
var listPayments = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(listPayments_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireActive(sql, context.userId);
	const settings = await getSettingsRow(sql);
	const mapped = (await sql`select p.*, c.name as client_name
       from payments p
       join clients c on c.id = p.client_id
       where p.year = ${data.year} and p.month = ${data.month}
       order by c.name`).map(mapPayment);
	if (!canSeePayments(actor, settings)) return mapped.map((p) => ({
		...p,
		amount: null,
		notes: ""
	}));
	return mapped;
});
function summariseWork(sections) {
	const bits = [];
	let total = 0;
	let completed = 0;
	const statusCounts = {};
	const units = /* @__PURE__ */ new Map();
	for (const s of sections) {
		total += s.activities.length;
		const qtyBits = [];
		for (const a of s.activities) {
			statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
			if (a.status === "completed" || a.status === "delivered") completed += 1;
			if (a.quantity && a.unit) {
				units.set(a.unit, (units.get(a.unit) ?? 0) + a.quantity);
				qtyBits.push(`${a.quantity} ${a.unit.toLowerCase()}`);
			}
		}
		if (s.activities.length) bits.push(qtyBits.length ? `${s.title} (${qtyBits.join(", ")})` : s.title);
	}
	return {
		bits,
		total,
		completed,
		statusCounts,
		units
	};
}
var getDashboard_createServerFn_handler = createServerRpc({
	id: "9702758c6fd0cb855b9213cc5e565c91c6cccffe5c6a276226117b92c405025e",
	name: "getDashboard",
	filename: "src/lib/api.ts"
}, (opts) => getDashboard.__executeServer(opts));
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getDashboard_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireActive(sql, context.userId);
	if (actor.role === "admin") await seedIfEmpty(sql);
	const settings = await getSettingsRow(sql);
	const clients = await sql`
      select * from clients where is_active = true order by name`;
	const rows = [];
	let totalActivities = 0;
	let completedActivities = 0;
	let pendingActivities = 0;
	let paymentsReceived = 0;
	let paymentsPending = 0;
	let clientsThisMonth = 0;
	for (const c of clients) {
		const period = await sql`
        select id from report_periods where client_id = ${c.id} and year = ${data.year} and month = ${data.month}`;
		const summary = summariseWork(period[0] ? await loadSections(sql, period[0].id) : []);
		const pay = await sql`
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
			paymentStatus: payStatus,
			paymentAmount: canSeePayments(actor, settings) ? received || pending || null : null
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
		clientRows: rows
	};
});
var getMonthSummary_createServerFn_handler = createServerRpc({
	id: "28d9c4a370d0655a7d38499b4e092f60f3b15f2c5c57fa12ef101bd55e6b3ae6",
	name: "getMonthSummary",
	filename: "src/lib/api.ts"
}, (opts) => getMonthSummary.__executeServer(opts));
var getMonthSummary = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getMonthSummary_createServerFn_handler, async ({ context, data }) => {
	const dash = await getDashboard({ data });
	return {
		year: data.year,
		month: data.month,
		clientsServed: dash.clientsThisMonth,
		totalActivities: dash.totalActivities,
		statusCounts: {},
		paymentsReceived: dash.paymentsReceived,
		paymentsPending: dash.paymentsPending,
		rows: dash.clientRows.map((r) => ({
			client: r.client,
			workDone: r.workSummary,
			totalWork: r.activityCount,
			paymentStatus: r.paymentStatus,
			paymentAmount: r.paymentAmount
		}))
	};
});
var getFounderSummary_createServerFn_handler = createServerRpc({
	id: "972672b6a58e1f1278065b967050f05ba177e87d4fbdf63fe11de373db77cd56",
	name: "getFounderSummary",
	filename: "src/lib/api.ts"
}, (opts) => getFounderSummary.__executeServer(opts));
var getFounderSummary = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getFounderSummary_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireActive(sql, context.userId);
	const dash = await getDashboard({ data });
	const units = /* @__PURE__ */ new Map();
	const services = /* @__PURE__ */ new Map();
	const statusCounts = {};
	const noWork = [];
	const outstanding = [];
	for (const row of dash.clientRows) {
		const period = await sql`
        select id from report_periods where client_id = ${row.client.id} and year = ${data.year} and month = ${data.month}`;
		const sections = period[0] ? await loadSections(sql, period[0].id) : [];
		const sum = summariseWork(sections);
		for (const [k, v] of Object.entries(sum.statusCounts)) statusCounts[k] = (statusCounts[k] ?? 0) + v;
		for (const [u, q] of sum.units) units.set(u, (units.get(u) ?? 0) + q);
		for (const s of sections) if (s.activities.length) services.set(s.title, (services.get(s.title) ?? 0) + 1);
		if (row.activityCount === 0) noWork.push({
			id: row.client.id,
			name: row.client.name
		});
		if (row.paymentStatus === "pending") outstanding.push({
			id: row.client.id,
			name: row.client.name,
			amount: row.paymentAmount
		});
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
			paymentAmount: r.paymentAmount
		})),
		activeClients: dash.activeClients,
		clientsWithNoWork: noWork,
		clientsWithOutstanding: outstanding,
		units: [...units.entries()].map(([unit, quantity]) => ({
			unit,
			quantity
		})),
		services: [...services.entries()].map(([name, sections]) => ({
			name,
			sections
		}))
	};
});
var getClientReport_createServerFn_handler = createServerRpc({
	id: "79db7cbf96b9ffec7b5a5808592a660747b3c85878b489d43e56b33774587d0b",
	name: "getClientReport",
	filename: "src/lib/api.ts"
}, (opts) => getClientReport.__executeServer(opts));
var getClientReport = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getClientReport_createServerFn_handler, async ({ context, data }) => {
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
		settings
	});
});
var getCombinedReport_createServerFn_handler = createServerRpc({
	id: "bb7cdb89ff5ffa19ae1a6d0326b84af49c0675950088e26b3064c5c630b32437",
	name: "getCombinedReport",
	filename: "src/lib/api.ts"
}, (opts) => getCombinedReport.__executeServer(opts));
var getCombinedReport = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(getCombinedReport_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireActive(sql, context.userId);
	const settings = await getSettingsRow(sql);
	const reports = [];
	for (const clientId of data.clientIds) {
		const ws = await getWorkspace({ data: {
			clientId,
			year: data.year,
			month: data.month
		} });
		reports.push(redactPayments(actor, settings, {
			client: ws.client,
			period: ws.period,
			sections: ws.sections,
			payments: ws.payments,
			settings
		}));
	}
	await sql`insert into report_exports (id, kind, year, month, client_ids, generated_by)
      values (${newId()}, ${"combined"}, ${data.year}, ${data.month}, ${JSON.stringify(data.clientIds)}, ${actor.userId})`;
	return {
		reports,
		settings
	};
});
var listUsers_createServerFn_handler = createServerRpc({
	id: "aef34a5aece07e29a255ceb1fea6e97fc1287de66911f39a73e869157bbe6734",
	name: "listUsers",
	filename: "src/lib/api.ts"
}, (opts) => listUsers.__executeServer(opts));
var listUsers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listUsers_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	return (await sql`select p.user_id, coalesce(u.name, 'User') as name, u.email, p.role, p.is_active, p.created_at
       from app_profiles p
       left join "user" u on u.id = p.user_id
       order by p.created_at`).map((r) => ({
		userId: r.user_id,
		name: r.name,
		email: r.email,
		role: r.role,
		isActive: r.is_active,
		createdAt: r.created_at
	}));
});
var updateUserAccess_createServerFn_handler = createServerRpc({
	id: "8edb9d36713a0114967a4e80892d32868cc6f1323f4b75d3efa10e606acac74d",
	name: "updateUserAccess",
	filename: "src/lib/api.ts"
}, (opts) => updateUserAccess.__executeServer(opts));
var updateUserAccess = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(updateUserAccess_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	if (data.userId === actor.userId && data.isActive === false) throw new Error("You cannot deactivate your own account.");
	if (data.role === "viewer" || data.isActive === false) {
		if (((await sql`
        select count(*)::int as n from app_profiles
        where role = 'admin' and is_active = true and user_id <> ${data.userId}`)[0]?.n ?? 0) === 0 && data.userId === actor.userId) throw new Error("Keep at least one active admin.");
	}
	if (data.role) await sql`update app_profiles set role = ${data.role}, updated_at = now() where user_id = ${data.userId}`;
	if (data.isActive !== void 0) await sql`update app_profiles set is_active = ${data.isActive}, updated_at = now() where user_id = ${data.userId}`;
	await audit(sql, actor.userId, "user.update", "user", data.userId, `${data.role ?? ""} ${data.isActive ?? ""}`);
	return { ok: true };
});
var createEmailUser_createServerFn_handler = createServerRpc({
	id: "9afc6b069f16c50d79a5a02259e78884bf6de2d6090edf1194ecc613d4fa7eb2",
	name: "createEmailUser",
	filename: "src/lib/api.ts"
}, (opts) => createEmailUser.__executeServer(opts));
var createEmailUser = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createEmailUser_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const email = data.email.trim().toLowerCase();
	const name = data.name.trim();
	if (!email || !name) throw new Error("Name and email are required.");
	if (data.password.length < 8) throw new Error("Password must be at least 8 characters.");
	const { auth } = await import("./server-I_U6azPy.mjs").then((n) => n.r);
	const userId = (await auth.api.signUpEmail({ body: {
		email,
		password: data.password,
		name
	} })).user?.id;
	if (!userId) throw new Error("Could not create the user.");
	await sql`insert into app_profiles (user_id, role, is_active)
      values (${userId}, ${data.role}, true)
      on conflict (user_id) do update set role = excluded.role, is_active = true, updated_at = now()`;
	await audit(sql, actor.userId, "user.create", "user", userId, email);
	return { userId };
});
var listAudit_createServerFn_handler = createServerRpc({
	id: "110e50625f84053be0eeffeec0506aaf0c27a45fa23d14010fc0a8294fb82d72",
	name: "listAudit",
	filename: "src/lib/api.ts"
}, (opts) => listAudit.__executeServer(opts));
var listAudit = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listAudit_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	return (await sql`select id, user_id, action, entity_type, entity_id, detail, created_at
       from audit_logs order by created_at desc limit 80`).map((r) => ({
		id: r.id,
		userId: r.user_id,
		action: r.action,
		entityType: r.entity_type,
		entityId: r.entity_id,
		detail: r.detail,
		createdAt: r.created_at
	}));
});
var createBackup_createServerFn_handler = createServerRpc({
	id: "4277d8104e9cedac6635f483ca81d1a14d52740a076eab43aa898388fc821d6b",
	name: "createBackup",
	filename: "src/lib/api.ts"
}, (opts) => createBackup.__executeServer(opts));
var createBackup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(createBackup_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const payload = await dumpBusiness(sql);
	const id = newId();
	const payloadJson = JSON.stringify(payload);
	await sql`insert into backups (id, created_by, note, payload)
      values (${id}, ${actor.userId}, ${data.note?.trim() ?? "Manual backup"}, ${payloadJson})`;
	await audit(sql, actor.userId, "backup.create", "backup", id);
	return {
		id,
		payloadJson
	};
});
var listBackups_createServerFn_handler = createServerRpc({
	id: "b9b985750b888838acf66106710f8e0f42dec2b38285dd99a4966d1fffb8b984",
	name: "listBackups",
	filename: "src/lib/api.ts"
}, (opts) => listBackups.__executeServer(opts));
var listBackups = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listBackups_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	return (await sql`
      select id, created_by, note, created_at from backups order by created_at desc limit 30`).map((r) => ({
		id: r.id,
		createdBy: r.created_by,
		note: r.note,
		createdAt: r.created_at
	}));
});
var restoreBackup_createServerFn_handler = createServerRpc({
	id: "3829e6808fc391be3e09e4737397e197c743f951b6cbee5a8bfd1032868c6747",
	name: "restoreBackup",
	filename: "src/lib/api.ts"
}, (opts) => restoreBackup.__executeServer(opts));
var restoreBackup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(restoreBackup_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const actor = await requireAdmin(sql, context.userId);
	const safety = await dumpBusiness(sql);
	await sql`insert into backups (id, created_by, note, payload)
      values (${newId()}, ${actor.userId}, ${"Safety copy before restore"}, ${JSON.stringify(safety)})`;
	let payload = data.payload;
	if (!payload && data.id) {
		const rows = await sql`select payload from backups where id = ${data.id}`;
		if (!rows[0]) throw new Error("Backup not found.");
		payload = JSON.parse(rows[0].payload);
	}
	if (!payload) throw new Error("Nothing to restore.");
	await restoreBusiness(sql, payload);
	await audit(sql, actor.userId, "backup.restore", "backup", data.id ?? "", "");
	return { ok: true };
});
async function dumpBusiness(sql) {
	const tables = [
		"clients",
		"service_library",
		"client_services",
		"report_periods",
		"report_sections",
		"activities",
		"payments",
		"report_exports",
		"app_settings"
	];
	const out = {};
	for (const t of tables) out[t] = await sql.query(`select * from ${t}`);
	return out;
}
async function restoreBusiness(sql, payload) {
	await sql.query("delete from activities");
	await sql.query("delete from report_sections");
	await sql.query("delete from payments");
	await sql.query("delete from report_exports");
	await sql.query("delete from client_services");
	await sql.query("delete from report_periods");
	await sql.query("delete from clients");
	await sql.query("delete from service_library");
	await sql.query("delete from app_settings");
	for (const table of [
		"service_library",
		"clients",
		"client_services",
		"report_periods",
		"report_sections",
		"activities",
		"payments",
		"report_exports",
		"app_settings"
	]) {
		const rows = payload[table] ?? [];
		for (const row of rows) {
			const obj = row;
			const keys = Object.keys(obj);
			if (!keys.length) continue;
			const cols = keys.map((k) => `"${k}"`).join(", ");
			const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
			const values = keys.map((k) => obj[k]);
			await sql.query(`insert into ${table} (${cols}) values (${placeholders})`, values);
		}
	}
}
//#endregion
export { addSection_createServerFn_handler, assignClientService_createServerFn_handler, createBackup_createServerFn_handler, createClient_createServerFn_handler, createEmailUser_createServerFn_handler, createService_createServerFn_handler, deleteActivity_createServerFn_handler, deletePayment_createServerFn_handler, deleteSection_createServerFn_handler, duplicatePeriod_createServerFn_handler, getClientReport_createServerFn_handler, getCombinedReport_createServerFn_handler, getDashboard_createServerFn_handler, getFounderSummary_createServerFn_handler, getMonthSummary_createServerFn_handler, getSessionWorkspace_createServerFn_handler, getWorkspace_createServerFn_handler, listAudit_createServerFn_handler, listBackups_createServerFn_handler, listClients_createServerFn_handler, listPayments_createServerFn_handler, listServices_createServerFn_handler, listUsers_createServerFn_handler, reorderSections_createServerFn_handler, restoreBackup_createServerFn_handler, saveActivity_createServerFn_handler, savePayment_createServerFn_handler, unassignClientService_createServerFn_handler, updateClient_createServerFn_handler, updateSection_createServerFn_handler, updateService_createServerFn_handler, updateSettings_createServerFn_handler, updateUserAccess_createServerFn_handler };
