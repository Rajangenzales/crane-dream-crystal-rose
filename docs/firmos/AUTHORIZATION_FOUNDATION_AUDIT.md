# FirmOS Authorization Foundation Audit

Status: Findings only — no implementation changes in this review.  
Scope: documented authorization model versus the current FirmOS foundation files.  
Date: 2026-09-25

## Scope

Compared:

- `docs/firmos/API_PERMISSION_SPECIFICATION.md`
- `docs/firmos/DOMAIN_MODEL.md`
- `docs/firmos/DATABASE_SPECIFICATION.md`

Against:

- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap.ts`
- `src/lib/firmos/bootstrap-server.ts`
- `migrations/0002_firmos_foundation.sql`

Related files inspected only to confirm current behavior (not treated as in-scope implementation of FirmOS RBAC):

- `migrations/0002_monthly.sql` (`audit_logs`)
- `migrations/0001_auth.sql` (Better Auth `"user"`)
- `src/lib/api.ts` (`requireActive` / `requireAdmin`)
- `src/lib/db-test-utils.ts`
- `docs/firmos/SYSTEM_ARCHITECTURE.md` and `docs/firmos/APPLICATION_DOMAIN_AUDIT.md` (for documented target chain / earlier permission sketches)

No application code was modified.

## Severity scale

| Severity | Meaning |
|---|---|
| Critical | Documented authorization decision cannot be made correctly with the current contracts. |
| High | Structural mismatch that will produce wrong access control or tenant leakage if this foundation is used as-is. |
| Medium | Naming, schema, or role-model drift that will block a faithful later implementation. |
| Low | Granularity or documentation polish; behavior is directionally similar. |

## Summary

The foundation introduces first-class firms, memberships, roles, and a global permission catalog. That is the right *shape* of RBAC. It does **not** yet implement the documented authorization model.

The documented chain is:

```text
User → Membership → Firm → Role → Permission → Scope → Resource
```

The implemented chain is:

```text
Authenticated userId
  → firm_memberships (status not checked by helpers)
  → membership_roles
  → firm-scoped roles
  → global permission keys
  → AuthorizationContext.permissions Set
  → hasPermission(context, key)
```

There is no `Scope`, the permission vocabulary does not match the spec, default governance is `Owner` rather than `Admin`, audit writes go to the legacy unscoped `audit_logs` table rather than tenant-owned `audit_events`, and `AuthorizationContext` itself is internally inconsistent between `domain.ts` and `bootstrap.ts`. Existing server routes still use `admin` / `viewer` gates.

---

## Findings

### AUTH-01 — `AuthorizationContext` contracts disagree and omit documented fields

**Severity:** Critical

**Affected files:**

- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap.ts`

**Current behavior:**

`domain.ts` defines:

```ts
export interface AuthorizationContext {
  userId: UserId;
  firmId: FirmId;
  membershipId: MembershipId;
  permissions: ReadonlySet<FirmOSPermission>;
}
```

`bootstrap.ts` `ownerAuthorizationContext()` is annotated as returning `AuthorizationContext` but returns a different object:

- `roleIds: RoleId[]`
- `permissionKeys: readonly string[]` (Owner role list)

It does not populate `permissions`. The helper is unused by `bootstrap-server.ts`. `hasPermission` / `requirePermission` only inspect `context.permissions`.

The context also has no membership status, no role ids (in the domain type), no resource scope, and no firm-active flag.

**Documented expected behavior:**

API spec: `User → Membership → Firm → Role → Permission → Scope → Resource`.

System architecture (supporting): every protected request resolves current user, firm membership, role/permission **and resource scope**.

Tenant IDs are identifiers, not proof of authorization (`DOMAIN_MODEL.md`, `DATABASE_SPECIFICATION.md`). A context that only stores `firmId` + a permission set, with no verified membership status or scope, is not sufficient.

**Proposed change:**

1. Make one canonical `AuthorizationContext` type and use it everywhere.
2. Include at least: `userId`, `firmId`, `membershipId`, `membershipStatus`, resolved `roleIds`, resolved `permissions` (`ReadonlySet<FirmOSPermission>`), and a `scope` object (see AUTH-06).
3. `ownerAuthorizationContext` must construct a real `Set` of permissions, not `permissionKeys`.
4. Add a server-side resolver: authenticated `userId` + selected firm → active membership → roles → permissions → context. Never accept client-supplied permission sets or firm ids as authority.

**Tests required:**

- Type-level / unit: `ownerAuthorizationContext` satisfies `AuthorizationContext`.
- Resolver: active membership yields expected permission set; invited/suspended/removed memberships yield no context or explicit denial.
- `hasPermission` / `requirePermission` operate on `permissions`, not a parallel `permissionKeys` field.
- Client-supplied `firmId` without a matching active membership cannot produce a context.

---

### AUTH-02 — Permission vocabulary does not match the specification

**Severity:** High

**Affected files:**

- `docs/firmos/API_PERMISSION_SPECIFICATION.md`
- `src/lib/firmos/domain.ts` (`FIRMOS_PERMISSIONS`)
- `migrations/0002_firmos_foundation.sql` (seeded `permissions.key`)
- `src/lib/firmos/bootstrap.ts` (`DEFAULT_FIRM_ROLES` permission lists)

**Current behavior:**

Implementation uses dotted, plural, coarse keys, for example `clients.view`, `clients.manage`, `finance.correct`, `backup.manage`.

The API spec uses screaming-snake, action-oriented, finer keys, for example `CLIENT_VIEW`, `CLIENT_CREATE`, `CLIENT_EDIT`, `CLIENT_ARCHIVE`.

Permission families compared:

| Spec (API) | Implementation | Match? |
|---|---|---|
| `CLIENT_VIEW` | `clients.view` | Name + style differ |
| `CLIENT_CREATE` / `CLIENT_EDIT` / `CLIENT_ARCHIVE` | `clients.manage` (single key) | Granularity collapsed |
| `SERVICE_VIEW` | `services.view` | Name + style differ |
| `SERVICE_CREATE` / `SERVICE_EDIT` | `services.manage` | Granularity collapsed |
| `WORK_VIEW` | `work.view` | Name + style differ |
| `WORK_CREATE` / `WORK_UPDATE` / `WORK_REVIEW` / `WORK_COMPLETE` | `work.manage` | Granularity collapsed |
| `WORK_ASSIGN` | `work.assign` | Name + style differ; closest 1:1 |
| `FINANCE_VIEW` | `finance.view` | Name + style differ |
| `INVOICE_CREATE` / `PAYMENT_CREATE` | `finance.manage` | Distinct finance actions collapsed |
| `PAYMENT_CORRECT` | `finance.correct` | Spec is payment-specific; impl is generic finance correction |
| `REPORT_VIEW` / `REPORT_GENERATE` | `reports.view` / `reports.generate` | Name + style differ |
| *(not in API spec)* | `reports.export` | Extra |
| `USER_VIEW` / `USER_CREATE` / `USER_EDIT` / `USER_DISABLE` | `members.view` / `members.manage` | Different noun (`USER` vs `members`) and collapsed writes |
| `BACKUP_CREATE` / `BACKUP_RESTORE` | `backup.manage` | Granularity collapsed |
| *(not in API spec)* | `firm.view`, `firm.manage`, `roles.view`, `roles.manage`, `audit.view` | Extra governance keys |

There are now **three** vocabularies in the repo: API spec (`CLIENT_VIEW`), foundation (`clients.view`), and `APPLICATION_DOMAIN_AUDIT.md` sketches (`client.view`, `report.generate`, `user.manage`).

`FIRMOS_PERMISSIONS`, SQL seed, and `DEFAULT_FIRM_ROLES` lists are three copies of the implementation vocabulary. Bootstrap fails at runtime if a role key is missing from `permissions`, but nothing statically ties the TypeScript union to the SQL seed.

**Documented expected behavior:**

API spec: permissions are action-oriented atomic capabilities (`CLIENT_EDIT`, `PAYMENT_CREATE`, …). Domain model: `Permission` is an atomic capability such as `CLIENT_EDIT` or `PAYMENT_CREATE`.

**Proposed change:**

Pick one canonical vocabulary and update **both** the spec and the seed/domain union together. Recommended: keep dotted keys if that is the engineering convention, but restore the spec’s action granularity (`clients.create`, `clients.edit`, `clients.archive`, `work.review`, `work.complete`, `invoices.create`, `payments.create`, `payments.correct`, `users.view`, …) rather than `*.manage` catch-alls. Export the same list once; generate SQL seed and default-role grants from it.

**Tests required:**

- Every seeded `permissions.key` is a member of `FIRMOS_PERMISSIONS` and vice versa.
- Default-role grants only reference keys in that union.
- Mapping tests from documented API names to stored keys (or a breaking-change checklist if the spec is updated).
- Negative: unknown key cannot be granted at bootstrap.

---

### AUTH-03 — Default governance is Owner / Manager / Member / Viewer, not Admin + explicit grants

**Severity:** Medium

**Affected files:**

- `src/lib/firmos/bootstrap.ts`
- `src/lib/firmos/bootstrap-server.ts`
- `docs/firmos/API_PERMISSION_SPECIFICATION.md`

**Current behavior:**

Bootstrap creates four system roles per firm: `Owner`, `Manager`, `Member`, `Viewer`. Only `Owner` is assigned to the creating user via `membership_roles`.

`Owner` receives every implementation permission, including `backup.manage` and `roles.manage`.

`Manager` receives a large operational set (clients/services/work/finance/reports) without `members.manage`, `roles.manage`, `firm.manage`, `finance.correct`, `backup.manage`, or `audit.view`.

`Member` / `Viewer` receive broad `clients.view` / `services.view` / `work.view` (and Viewer also `reports.view`) with no scope restriction.

There is no Admin role, no Developer/IT role, and no IT-only permission family.

**Documented expected behavior:**

API spec default governance: the firm **Admin** role receives broad firm-management permissions by default. Additional roles receive **only explicitly granted** capabilities. **Developer/IT permissions are separate from normal firm administration.**

PRD / UX (supporting): Admin-controlled governance; `REPORT_GENERATE` defaults to Admin.

**Proposed change:**

- Align the system role name with the spec (`Admin`) or formally amend the spec to `Owner` and document the mapping.
- Keep Owner/Admin as the only role that receives the full default grant set.
- Do not treat `backup.manage` (create **and** restore) as ordinary Admin capability without an explicit product decision versus the Developer/IT boundary.
- Introduce a separate, non-firm-admin permission family for diagnostics / error events / infrastructure, not granted to Owner/Admin by default.

**Tests required:**

- Bootstrap assigns exactly one system role to the creator, and that role’s grants match the documented Admin set.
- Additional seeded roles start with only the documented explicit grants (or empty, if the spec is taken literally).
- No default firm role includes Developer/IT-only capabilities.
- Role names are unique per firm (`unique (firm_id, name)` already exists; assert system-role seed).

---

### AUTH-04 — Tenant identity is modeled, but is not an authorization mechanism and is not fully specified in schema

**Severity:** High

**Affected files:**

- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap-server.ts`
- `migrations/0002_firmos_foundation.sql`
- `docs/firmos/DATABASE_SPECIFICATION.md`
- `docs/firmos/DOMAIN_MODEL.md`
- `docs/firmos/API_PERMISSION_SPECIFICATION.md`

**Current behavior:**

`firms` is a first-class tenant table (`id` UUID, `slug` unique, `is_active`). `AuthorizationContext.firmId` is a string field. `hasPermission` never validates that the user has an active membership in that firm; it only checks the in-memory permission set.

`bootstrapFirm` correctly overwrites `data.ownerUserId` with `context.userId` from `authMiddleware`. The client may still send `ownerUserId`; it is ignored. There is no later API that derives tenant context from membership for ordinary requests — this foundation does not provide that resolver.

Database spec lists a `users` table. Foundation migration does not create `users`. Membership `user_id` is `text not null` with **no foreign key** to Better Auth `"user"("id")`. That matches Better Auth’s text ids (including `'dev-user'`), but it is not the documented `users` aggregate and it cannot enforce referential integrity.

**Documented expected behavior:**

- Tenant identity is part of the data model.
- Raw tenant IDs must never be treated as proof of authorization.
- Tenant context is derived from authenticated membership, not trusted client input.
- Tenant-owned entities must be tenant-scoped through a controlled relationship.

**Proposed change:**

- Keep `firms.id` as the tenant key.
- Document User as Better Auth `"user"` (keep) rather than a second `users` table, or add an explicit FirmOS `users` projection with a real FK.
- Add `firm_memberships.user_id` FK to `"user"("id")` if the identity store is Postgres Better Auth in this deployment.
- Authorization APIs must take authenticated `userId` only; firm selection may be a hint that is then **looked up** against active memberships.
- Inactive firms (`firms.is_active = false`) must not authorize.

**Tests required:**

- Bootstrap owner is always the authenticated user, even if `ownerUserId` is forged in the payload.
- Context resolution fails when `firmId` is guessed and the user has no active membership.
- Inactive firm + otherwise valid membership is denied.
- Duplicate slug rejected (already implemented; keep a test).

---

### AUTH-05 — Membership relationship naming, denormalization, and cross-tenant role assignment

**Severity:** High

**Affected files:**

- `migrations/0002_firmos_foundation.sql`
- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap-server.ts`
- `docs/firmos/DATABASE_SPECIFICATION.md`

**Current behavior:**

Database spec table name: `memberships`.  
Implemented table name: `firm_memberships`.

Junction `membership_roles` exists (`membership_id`, `role_id`). Domain `FirmMembership.roleIds` denormalizes role ids onto the membership object; nothing in this slice loads them from SQL.

`membership_roles` does **not** constrain `roles.firm_id` to equal `firm_memberships.firm_id`. A membership in Firm A can be assigned a role row that belongs to Firm B if application code ever inserts that pair.

Status check exists at the table (`invited | active | suspended | removed`) but not in `AuthorizationContext` or `hasPermission`. Bootstrap inserts `status = 'active'` and `joined_at = now()`.

Unique `(firm_id, user_id)` is present — one membership per user per firm.

**Documented expected behavior:**

Membership is the relationship between a User and a Firm. Roles attach through that membership. Tenant-owned records must be tenant-scoped. Database constraints protect integrity.

**Proposed change:**

- Either rename the table to `memberships` or update `DATABASE_SPECIFICATION.md` to `firm_memberships` as the canonical name (prefer one name in SQL, domain, and docs).
- Treat `roleIds` as a resolved view, not a stored column.
- Add a same-tenant integrity constraint (composite FK or trigger/check) so `membership_roles` cannot attach a role from another firm.
- Authorization must require `status = 'active'` (and likely `joined_at is not null` for invited → active).

**Tests required:**

- Cannot insert `membership_roles` joining membership firm ≠ role firm.
- Unique membership per `(firm_id, user_id)`.
- Suspended / removed / invited memberships do not resolve permissions.
- Bootstrap creates exactly one active membership and one `membership_roles` row for Owner/Admin.

---

### AUTH-06 — Scope authorization is specified and unimplemented

**Severity:** Critical

**Affected files:**

- `docs/firmos/API_PERMISSION_SPECIFICATION.md`
- `docs/firmos/DOMAIN_MODEL.md`
- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap.ts`
- `migrations/0002_firmos_foundation.sql`

**Current behavior:**

No `Scope` type, table, or field exists. Permission descriptions hint at scope (`work.view`: “View assigned or permitted work”; `finance.view`: “View permitted financial records”) but `hasPermission` is a boolean key lookup.

`Member` is granted `work.view` with no assignment relationship in this schema (work tables are not in `0002_firmos_foundation.sql`).

Database spec does not list a `scopes` table either — the API/domain docs require scope, the database spec does not define it. That is a spec gap as well as an implementation gap.

**Documented expected behavior:**

API spec: “Permissions are action-oriented. **Scope determines where an allowed action applies.**” Chain ends at `Scope → Resource`. Domain: tenant-owned entities must be tenant-scoped through a controlled relationship. Work items have responsible member / reviewer / approver.

**Proposed change:**

Define scope as a first-class authorization input, even if V1 scopes are limited, for example:

- `firm` — all resources in the tenant
- `assigned_work` — work items where the membership is assignee/reviewer
- `client` — optional client-id allow-list (if product needs it)

`hasPermission(context, permission)` is not enough. Add `authorize(context, permission, resource)` that checks permission **and** that the resource’s `firm_id` matches context **and** any narrower scope rule. Do not encode “assigned only” as a comment on `work.view`.

If V1 deliberately has only firm-wide scope, the API spec must say so; the current spec does not.

**Tests required:**

- Same permission, different resources: allowed in-scope, denied out-of-scope (other firm; unassigned work).
- Tenant mismatch is denied even when the permission set contains the key.
- Document the V1 scope matrix and assert each cell.

---

### AUTH-07 — Audit model is the legacy unscoped `audit_logs` table, not FirmOS audit events

**Severity:** High

**Affected files:**

- `src/lib/firmos/bootstrap-server.ts`
- `migrations/0002_monthly.sql` (`audit_logs`)
- `migrations/0002_firmos_foundation.sql` (does not create audit tables)
- `docs/firmos/DATABASE_SPECIFICATION.md`
- `docs/firmos/DOMAIN_MODEL.md`
- `docs/firmos/API_PERMISSION_SPECIFICATION.md`

**Current behavior:**

Foundation bootstrap writes:

```sql
insert into audit_logs (id, user_id, action, entity_type, entity_id, detail)
```

`audit_logs` (monthly schema) columns: `id text`, `user_id`, `action`, `entity_type`, `entity_id`, `detail`, `created_at`. **No `firm_id`, no `membership_id`, no before/after payload, no correlation / error reference id.**

Database spec requires `audit_events` and `error_events`. Domain: Audit Event is tenant-owned; Error Event is a sanitized diagnostic with an internal reference ID. API: financial mutations preserve audit information; user-facing errors are sanitized and receive a reference ID.

`requirePermission` throws `new Error("Permission denied: ${permission}")` — it leaks the permission key and has no reference ID.

`error_events` is not created. `audit.view` exists as a permission with no tenant-scoped audit query API in this slice.

**Documented expected behavior:**

Audit events are a core tenant-owned entity. Financial corrections require permission **and** an audit trail. Errors returned to users are sanitized and receive a reference ID.

**Proposed change:**

- Introduce `audit_events` (tenant-scoped: `firm_id`, actor `user_id` / `membership_id`, action, entity type/id, payload/before-after, created_at).
- Introduce `error_events` with internal reference IDs; map authorization failures to sanitized client errors.
- Stop using `audit_logs` for FirmOS foundation actions, or migrate `audit_logs` into `audit_events` with `firm_id`.
- Bootstrap, role changes, membership changes, and later finance corrections must write tenant-scoped audit rows in the same transaction as the mutation.

**Tests required:**

- Bootstrap inserts an `audit_events` row with the new `firm_id` and authenticated `user_id`.
- Audit rows are not queryable across firms even with `audit.view` in another tenant.
- Permission denial returns a sanitized message plus reference id; the permission key is not required in the client message.
- Finance correction path (when added) cannot update balances without an audit row in the same transaction.

---

### AUTH-08 — No server-side enforcement path; existing APIs remain admin/viewer

**Severity:** High

**Affected files:**

- `src/lib/firmos/domain.ts` (`hasPermission` / `requirePermission` only)
- `src/lib/firmos/bootstrap-server.ts`
- `src/lib/api.ts` (current production gates; out of foundation files but proves the gap)

**Current behavior:**

The only FirmOS server function in this slice is `bootstrapFirm`. It authenticates the user and writes RBAC rows. It does not return or persist an `AuthorizationContext`. Subsequent application APIs still use `requireActive()` / `requireAdmin()` against `app_profiles.role` (`admin` | `viewer`).

**Documented expected behavior:**

Authentication is required for protected endpoints. Authorization is enforced server-side for every protected action. Tenant context comes from membership.

**Proposed change:**

After fixing AUTH-01/04/06, add shared middleware/helpers used by every tenant-owned server function. Do not leave `requireAdmin` as the FirmOS authorization model. Bootstrap may remain a special case (no firm exists yet).

**Tests required:**

- Protected FirmOS actions without a context fail closed.
- A Member context cannot call a Manager-only mutation.
- Regression: monthly `admin`/`viewer` gates are either explicitly legacy-bridged or replaced; they must not silently coexist as a bypass.

---

### AUTH-09 — Permission catalog is global; roles are firm-scoped (docs imply both live under Firm)

**Severity:** Low

**Affected files:**

- `migrations/0002_firmos_foundation.sql`
- `docs/firmos/DOMAIN_MODEL.md`
- `docs/firmos/DATABASE_SPECIFICATION.md`

**Current behavior:**

`permissions` is a global catalog (`key` unique). `roles` are per-firm (`firm_id`, unique `(firm_id, name)`). `role_permissions` links them. This is a sound RBAC catalog pattern.

Domain diagram places “Roles / Permissions” under Firm, which can be read as tenant-owned permission rows.

**Documented expected behavior:**

Permission is an atomic capability. Roles are named collections of permissions belonging to a firm. The database spec lists both `permissions` and `roles` without saying whether permissions are global.

**Proposed change:**

Document that permission *keys* are a global vocabulary and that firms only compose roles. Do not create per-firm copies of `CLIENT_EDIT` unless the product requires custom permissions.

**Tests required:**

- Seeding permissions is idempotent (`on conflict (key) do nothing` already).
- Two firms can both have a role named `Admin` with different grant sets.
- Deleting a firm cascades roles and `role_permissions` without deleting the global permission catalog.

---

### AUTH-10 — Foundation migration is not in the test DB harness; no authorization tests exist

**Severity:** Medium

**Affected files:**

- `migrations/0002_firmos_foundation.sql`
- `src/lib/db-test-utils.ts` (applies `0001_auth.sql`, `0002_monthly.sql`, `0003_bootstrap.sql` only)
- No `src/lib/firmos/*.test.ts`

**Current behavior:**

There are two `0002_*.sql` files. The migrator applies all `migrations/*.sql` by basename, so production/preview *can* apply the foundation file. Unit tests that use `createTestSql()` never apply it. Bootstrap and permission helpers are untested.

**Documented expected behavior:**

Schema changes are delivered through versioned migrations. Each phase must leave the application in a testable state (`MIGRATION_IMPLEMENTATION_PLAN.md`).

**Proposed change:**

Renumber the foundation migration to the next free prefix (`0004_…`) to avoid `0002` collisions and ordering ambiguity. Include it in `createTestSql()`. Add focused tests listed under each finding above.

**Tests required:**

- Migration applies after `0003_bootstrap.sql` on a clean database.
- Test harness schema includes `firms`, `firm_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`.

---

## Focus-area matrix

| Area | Spec | Implementation | Verdict |
|---|---|---|---|
| AuthorizationContext | User + membership + firm + roles + permissions + **scope** | `userId`, `firmId`, `membershipId`, `permissions` Set; bootstrap helper uses different fields | **Fail** (AUTH-01, AUTH-06) |
| Permission vocabulary | `CLIENT_VIEW`, `PAYMENT_CREATE`, … | `clients.view`, `finance.manage`, … plus extras | **Fail** (AUTH-02) |
| Role assignment | Default **Admin**; other roles explicit-only; IT separate | System roles Owner/Manager/Member/Viewer; only Owner assigned; Owner includes backup | **Partial** (AUTH-03) |
| Tenant identity | Membership-derived; IDs are not authorization | `firms` exist; `hasPermission` trusts context; no `users` table; no FK | **Partial** (AUTH-04) |
| Membership | `memberships` User↔Firm; roles via membership | `firm_memberships` + `membership_roles`; no same-firm constraint; status unused by helpers | **Partial** (AUTH-05) |
| Scope authorization | Scope determines where an action applies | Not modeled | **Fail** (AUTH-06) |
| Audit model | Tenant-owned `audit_events` + `error_events` + reference IDs | Legacy `audit_logs` insert; no tenant column | **Fail** (AUTH-07) |

---

## Recommended fix order (do not implement in this audit)

1. Freeze a single permission vocabulary and `AuthorizationContext` (AUTH-01, AUTH-02).
2. Add membership-derived context resolution with active-status and same-firm role integrity (AUTH-04, AUTH-05).
3. Define V1 scope rules and `authorize(context, permission, resource)` (AUTH-06).
4. Replace bootstrap audit writes with tenant-scoped `audit_events` (AUTH-07).
5. Align default role naming with Admin vs Owner and split IT permissions (AUTH-03).
6. Wire server functions to the new helpers; keep `requireAdmin` only as a documented legacy bridge (AUTH-08).
7. Renumber/include the foundation migration in tests (AUTH-10).

---

## Out of scope for this audit

- UI screens and UX copy.
- Rewriting `src/lib/api.ts` monthly-report authorization (noted only as evidence that FirmOS RBAC is not yet the enforcement path).
- Finance/work table design beyond what it implies for permissions, scope, and audit.
- Implementing any of the proposed changes.
