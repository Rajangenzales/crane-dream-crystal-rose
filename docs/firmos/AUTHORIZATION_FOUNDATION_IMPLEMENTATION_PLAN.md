# FirmOS Authorization Foundation Implementation Plan

Status: Plan only — do not implement in this change.  
Source: `docs/firmos/AUTHORIZATION_FOUNDATION_AUDIT.md`  
Date: 2026-09-25

## Purpose

Turn the audit findings into **eight separate, reviewable PRs**. Each phase must leave the repository buildable and test-gated. Do not combine phases. Do not merge this plan into application behavior.

This plan does **not** redesign clients, work items, invoices, reports UI, backup payload format, Better Auth, or monthly-report tables. Those stay on the existing Preserve → Isolate → Refactor path in `MIGRATION_IMPLEMENTATION_PLAN.md`.

## Global rules (every phase)

- Fail closed. Missing membership, inactive firm, unknown permission, or missing resource `firmId` is deny.
- Tenant IDs in request bodies are hints at most; they are never proof of authorization.
- Permission keys are the only authorization vocabulary. UI labels and `app_profiles.role` are not.
- Permission catalog rows are **global**. Roles are **per-firm**. Do not copy permission rows per tenant (AUTH-09).
- Do not edit `migrations/0001_auth.sql` or `migrations/auth/0001_auth.sql`.
- Do not edit `migrations/0002_monthly.sql` or `migrations/0003_bootstrap.sql`.
- Do not change UI routes, PWA/branding, backup payload internals, or monthly domain columns unless a later numbered phase explicitly lists that file.
- New schema goes in **new** versioned files after `0003_bootstrap.sql`, except in-place edits to `migrations/0002_firmos_foundation.sql` while it remains an unreleased foundation file (see Phase 8).
- Each PR includes only the tests listed for that phase plus whatever is required to keep existing tests green.

## Dependency graph

```text
Phase 1  vocabulary + AuthorizationContext
   │
   ▼
Phase 2  membership resolver
   │
   ├────────────► Phase 3  same-firm integrity
   │
   ▼
Phase 4  V1 scope + authorize()
   │
   ├────────────► Phase 5  audit_events / error_events
   │
   ▼
Phase 6  Admin / Owner / Developer-IT  (may start after Phase 1; must land before Phase 7)
   │
   ▼
Phase 7  migrate existing server function gates
   │
   ▼
Phase 8  migration numbering + comprehensive tests
```

Phase 6 may be developed in parallel with Phases 2–5 after Phase 1, but it must merge before Phase 7 so gates map to the final role/permission names.

Phase 8 may **accumulate** tests from earlier PRs; it does not replace per-phase tests.

---

## Canonical permission vocabulary (frozen in Phase 1)

Store keys as dotted, action-oriented strings. Map from `API_PERMISSION_SPECIFICATION.md` SCREAMING_SNAKE names 1:1. Do not keep `*.manage` catch-alls.

| Spec name | Canonical key |
|---|---|
| *(governance, not in original list)* | `firm.view` |
| *(governance)* | `firm.manage` |
| `USER_VIEW` | `users.view` |
| `USER_CREATE` | `users.create` |
| `USER_EDIT` | `users.edit` |
| `USER_DISABLE` | `users.disable` |
| *(governance)* | `roles.view` |
| *(governance)* | `roles.manage` |
| `CLIENT_VIEW` | `clients.view` |
| `CLIENT_CREATE` | `clients.create` |
| `CLIENT_EDIT` | `clients.edit` |
| `CLIENT_ARCHIVE` | `clients.archive` |
| `SERVICE_VIEW` | `services.view` |
| `SERVICE_CREATE` | `services.create` |
| `SERVICE_EDIT` | `services.edit` |
| `WORK_VIEW` | `work.view` |
| `WORK_CREATE` | `work.create` |
| `WORK_UPDATE` | `work.update` |
| `WORK_ASSIGN` | `work.assign` |
| `WORK_REVIEW` | `work.review` |
| `WORK_COMPLETE` | `work.complete` |
| `FINANCE_VIEW` | `finance.view` |
| `INVOICE_CREATE` | `invoices.create` |
| `PAYMENT_CREATE` | `payments.create` |
| `PAYMENT_CORRECT` | `payments.correct` |
| `REPORT_VIEW` | `reports.view` |
| `REPORT_GENERATE` | `reports.generate` |
| *(keep; document as spec additive)* | `reports.export` |
| `BACKUP_CREATE` | `backup.create` |
| `BACKUP_RESTORE` | `backup.restore` |
| *(governance)* | `audit.view` |

Phase 6 **adds** Developer/IT keys (not granted to firm Admin):

- `diagnostics.view`
- `error_events.view`

Single source of truth: `FIRMOS_PERMISSIONS` in `src/lib/firmos/domain.ts`. SQL seed and default-role grants must be derived from that list (shared module or test-enforced equality). No third vocabulary in `APPLICATION_DOMAIN_AUDIT.md` during Phase 1 — only a one-line pointer if that file is edited at all (prefer not to edit it until Phase 8 docs pass).

---

## Phase 1 — Canonical permission vocabulary and `AuthorizationContext`

**Audit:** AUTH-01, AUTH-02, AUTH-09 (docs only)

**Dependencies:** none

### Files to change

- `src/lib/firmos/domain.ts`
- `src/lib/firmos/bootstrap.ts`
- `migrations/0002_firmos_foundation.sql` (permission seed + descriptions only)
- `docs/firmos/API_PERMISSION_SPECIFICATION.md` (record canonical keys beside SCREAMING_SNAKE names)
- `docs/firmos/DOMAIN_MODEL.md` (one sentence: permission **keys** are global; firms compose roles)
- `docs/firmos/DATABASE_SPECIFICATION.md` (same catalog vs role distinction)
- `src/lib/firmos/permissions.test.ts` (**new**)

### Database migrations

- In-place update of the `insert into permissions` seed in `0002_firmos_foundation.sql`.
- No new numbered migration in this phase.
- If any environment has already applied `0002_firmos_foundation.sql`, stop and use an additive `0004_firmos_permissions.sql` instead of editing the applied file. Confirm via `_migrations` before editing.

### Interfaces / types to introduce

```ts
export const FIRMOS_PERMISSIONS = [ /* frozen table above, without IT keys */ ] as const;
export type FirmOSPermission = (typeof FIRMOS_PERMISSIONS)[number];

export type AuthorizationScopeKind = "firm" | "assigned_work" | "client";

export interface AuthorizationScope {
  kind: AuthorizationScopeKind;
  clientIds?: readonly string[];
}

export interface AuthorizationContext {
  userId: UserId;
  firmId: FirmId;
  membershipId: MembershipId;
  membershipStatus: Extract<MembershipStatus, "active">;
  roleIds: readonly RoleId[];
  permissions: ReadonlySet<FirmOSPermission>;
  firmIsActive: true;
  scope: AuthorizationScope;
}

export function isFirmOSPermission(value: string): value is FirmOSPermission;
export function hasPermission(context: AuthorizationContext, permission: FirmOSPermission): boolean;
```

- Remove `permissionKeys` from all types.
- `ownerAuthorizationContext(...)` must return a real `AuthorizationContext`: `membershipStatus: "active"`, `firmIsActive: true`, `permissions: new Set(...)`, `scope: { kind: "firm" }`.
- `DEFAULT_FIRM_ROLES` permission arrays must be typed as `readonly FirmOSPermission[]`. **Do not** rename Owner → Admin in this phase (Phase 6). Expand current `*.manage` grants into the corresponding atomic keys so bootstrap still seeds a coherent Owner/Manager/Member/Viewer set.
- Delete or stop exporting a broken return shape. `requirePermission` may remain a thin domain helper; **do not** add reference IDs here (Phase 5).

### Security invariants

- Unknown strings are not permissions (`isFirmOSPermission` is the gate for SQL grants).
- `hasPermission` reads only `context.permissions`.
- Context objects are constructed by FirmOS code, never deserialized from the client.
- Phase 1 still does not authorize requests; it only makes the contract compilable.

### Tests required

- `FIRMOS_PERMISSIONS` equals the SQL seed keys (parse `0002_firmos_foundation.sql` or a shared exported list).
- Every `DEFAULT_FIRM_ROLES[].permissions` entry is in `FIRMOS_PERMISSIONS`.
- `ownerAuthorizationContext` satisfies `AuthorizationContext` (no excess `permissionKeys`).
- `hasPermission` true/false for present/absent keys.
- Mapping table: each original spec name listed above maps to exactly one canonical key.

### Files that must NOT be changed

- `src/lib/firmos/bootstrap-server.ts` (except if a renamed key would make bootstrap throw `Unknown FirmOS permission` — then **only** the permission key strings in inserts, no control-flow changes)
  - Preferred: keep bootstrap-server looping `role.permissions` so it picks up Phase 1 automatically; then **do not edit** `bootstrap-server.ts`.
- `src/lib/api.ts`
- `src/lib/db-test-utils.ts`
- All `src/routes/**`
- `src/lib/backup.ts`, backup tests
- `migrations/0001_auth.sql`, `0002_monthly.sql`, `0003_bootstrap.sql`

---

## Phase 2 — Authenticated-user → active-membership → role → permission resolver

**Audit:** AUTH-04, AUTH-05 (status checks), AUTH-08 (resolver only, not API migration)

**Dependencies:** Phase 1

### Files to change

- `src/lib/firmos/resolve-authorization.ts` (**new**, server-safe; may import `getSql`)
- `src/lib/firmos/resolve-authorization.test.ts` (**new**)
- `src/lib/firmos/bootstrap.ts` — remove `ownerUserId` from the **public** bootstrap input (keep display name / firm fields). Resolver and bootstrap owner always come from `authMiddleware` `context.userId`.
- `src/lib/firmos/bootstrap-server.ts` — delete any use of client-supplied `ownerUserId`; keep overwrite behavior; do not yet switch audit table (Phase 5).
- `src/lib/firmos/domain.ts` — export `AuthorizationDenied` reason union used by the resolver (no HTTP/UI).
- `docs/firmos/API_PERMISSION_SPECIFICATION.md` — one paragraph: tenant context is resolved from membership, not request `firmId` trust.

### Database migrations

- None. Do not add `users` table. Do not add FKs (Phase 3).

### Interfaces / types to introduce

```ts
export type AuthorizationDeniedReason =
  | "unauthenticated"
  | "membership_not_found"
  | "membership_not_active"
  | "firm_inactive"
  | "no_roles";

export type ResolveAuthorizationResult =
  | { ok: true; context: AuthorizationContext }
  | { ok: false; reason: AuthorizationDeniedReason };

export interface ResolveAuthorizationInput {
  userId: UserId;
  firmId?: FirmId; // optional hint; must still match an active membership
}

export function resolveAuthorization(
  input: ResolveAuthorizationInput,
): Promise<ResolveAuthorizationResult>;
```

Resolution rules:

1. `userId` is the authenticated identity only (caller is a server function / test). Never take permissions, role ids, or membership status from the client.
2. Load memberships for `userId` with `status = 'active'` and join `firms` where `is_active = true`.
3. If `firmId` is omitted: succeed only when there is **exactly one** such membership; otherwise deny (`membership_not_found`).
4. If `firmId` is present: succeed only when that pair exists and is active.
5. Load `membership_roles` → `roles` (same `firm_id`) → `role_permissions` → `permissions.key`. Ignore inactive roles (`roles.is_active = false`).
6. Build `permissions` as a `Set`. Default `scope` is `{ kind: "firm" }` until Phase 4.
7. Invited / suspended / removed memberships never return `ok: true`.

### Security invariants

- Guessed `firmId` with no active membership → deny.
- Inactive firm → deny even if membership rows exist.
- Empty role set → deny (`no_roles`), not an empty-permission “viewer”.
- Resolver results are not cached across users or firms in this phase.
- `bootstrapFirm` continues to require `authMiddleware`; owner is always `context.userId`.

### Tests required

- Active membership + Owner grants → expected permission set from Phase 1 keys.
- Invited / suspended / removed → deny.
- Inactive firm → deny.
- Unknown `firmId` → deny.
- Two active memberships and omitted `firmId` → deny (no implicit tenant).
- Forged bootstrap `ownerUserId` in payload cannot change the inserted `firm_memberships.user_id`.
- Duplicate slug still rejected (existing behavior).

### Files that must NOT be changed

- `src/lib/api.ts` (no `requireAdmin` replacement yet)
- `migrations/**` (no schema)
- `src/lib/db-test-utils.ts` unless tests cannot run; if needed, **only** append `0002_firmos_foundation.sql` to the apply list (do not renumber — Phase 8)
- `src/routes/**`
- Backup / payment / report implementations

---

## Phase 3 — Same-firm role / membership integrity

**Audit:** AUTH-05, remaining AUTH-04 integrity

**Dependencies:** Phase 2 (behavior exists; this phase makes the database refuse illegal rows)

### Files to change

- `migrations/0004_firmos_membership_integrity.sql` (**new**; filename may become `0005_…` if Phase 5 lands first — see ordering note)
- `src/lib/firmos/membership-integrity.test.ts` (**new**)
- `docs/firmos/DATABASE_SPECIFICATION.md` — canonical table name `firm_memberships`; document same-firm constraint; document User as Better Auth `"user"`, not a second `users` table
- `src/lib/firmos/bootstrap-server.ts` — only if inserts must include new columns required by the constraint (should be unnecessary if constraint is trigger/FK on existing columns)

### Database migrations

New file after `0003_bootstrap.sql`:

1. **Do not rename** `firm_memberships` → `memberships` in code. Update the spec to match SQL (smaller, safer than a table rename during foundation).
2. Same-tenant integrity on `membership_roles`:
   - Preferred: trigger `BEFORE INSERT OR UPDATE` that rejects when  
     `(select firm_id from firm_memberships where id = membership_id) <> (select firm_id from roles where id = role_id)`.
   - Optional supplement: denormalized `firm_id` on `membership_roles` with composite FKs to `(firm_memberships(id, firm_id))` and `(roles(id, firm_id))` — only if unique `(id, firm_id)` keys are added on both parents.
3. Foreign key `firm_memberships.user_id` → `"user"("id")` **only if** PGLite/Better Auth tests always insert `"user"` rows first. If preview `dev-user` is not in `"user"`, **do not** add the FK; document the exception in `DATABASE_SPECIFICATION.md` instead of breaking bootstrap. Decide with a failing test, not by guessing.
4. Indexes already present stay. Add index on `membership_roles(membership_id)` if missing (PK already covers it).

### Interfaces / types to introduce

- None in the domain package beyond documenting that `FirmMembership.roleIds` is a **resolved view**, not a stored column.
- SQL error mapping (optional small helper) `isCrossTenantRoleAssignmentError(err)` for tests.

### Security invariants

- A membership in Firm A cannot hold a role whose `roles.firm_id` is Firm B.
- Unique `(firm_id, user_id)` remains.
- Application code is not the only line of defense for this invariant.
- Deleting a firm still cascades roles and memberships without deleting global `permissions` (AUTH-09).

### Tests required

- Insert `membership_roles` across two firms → rejected.
- Same-firm assignment → accepted.
- Unique membership per `(firm_id, user_id)`.
- Two firms may both have a role named `Owner` (or later `Admin`) with different grants.
- Delete firm: role_permissions for that firm’s roles gone; `permissions` catalog intact.
- Bootstrap still creates one active membership and one role assignment.

### Files that must NOT be changed

- `src/lib/api.ts`
- `migrations/0002_monthly.sql`
- Permission vocabulary (`domain.ts` `FIRMOS_PERMISSIONS`) unless a trigger requires a type tweak (it should not)
- UI, backup, monthly report logic
- Do not introduce a FirmOS `users` table

**Ordering note:** If this PR and Phase 5 race, the lower unused integer after `0003` wins (`0004_firmos_membership_integrity.sql` vs `0004_firmos_audit_events.sql`). Do not reuse a basename.

---

## Phase 4 — V1 scope model and `authorize(context, permission, resource)`

**Audit:** AUTH-06

**Dependencies:** Phase 1 (types), Phase 2 (context is always membership-derived). Phase 3 recommended but not required for unit tests of pure `authorize`.

### Files to change

- `src/lib/firmos/domain.ts` — `ProtectedResource`, `authorize`, keep `hasPermission` as the permission-half only
- `src/lib/firmos/authorize.test.ts` (**new**)
- `docs/firmos/API_PERMISSION_SPECIFICATION.md` — V1 scope matrix
- `docs/firmos/DATABASE_SPECIFICATION.md` — state explicitly: **no `scopes` table in V1**; scope is computed from membership + resource fields
- `docs/firmos/DOMAIN_MODEL.md` — tenant scope via `firm_id` on resources; work assignment scope when work tables exist

### Database migrations

- None. Do not create `work_items`, `work_assignments`, or a `scopes` table in this phase.

### Interfaces / types to introduce

```ts
export type FirmOSResourceType =
  | "firm"
  | "membership"
  | "role"
  | "client"
  | "service"
  | "work"
  | "invoice"
  | "payment"
  | "report"
  | "audit_event"
  | "backup";

export interface ProtectedResource {
  type: FirmOSResourceType;
  firmId: FirmId;
  id?: string;
  /** When type === "work", membership ids that may access assigned_work scope. */
  assigneeMembershipIds?: readonly MembershipId[];
  clientId?: string;
}

export type AuthorizeDeniedReason =
  | "permission_missing"
  | "tenant_mismatch"
  | "scope_mismatch"
  | "inactive_context";

export type AuthorizeResult =
  | { ok: true }
  | { ok: false; reason: AuthorizeDeniedReason };

export function authorize(
  context: AuthorizationContext,
  permission: FirmOSPermission,
  resource: ProtectedResource,
): AuthorizeResult;
```

### V1 scope matrix (must be documented and tested)

| Context `scope.kind` | Resource | Rule |
|---|---|---|
| `firm` | any | allow iff `resource.firmId === context.firmId` and permission present |
| `assigned_work` | `type === "work"` | allow iff tenant match **and** `context.membershipId` is in `assigneeMembershipIds` |
| `assigned_work` | any other type | deny (`scope_mismatch`) unless permission is a firm-governance key listed below |
| `client` | resource with `clientId` | allow iff tenant match **and** `resource.clientId` is in `context.scope.clientIds` |
| any | missing `resource.firmId` | deny |

V1 **default** for resolved contexts remains `{ kind: "firm" }` (Phase 2). `assigned_work` / `client` are real functions in `authorize` so later work/client modules do not invent a second API. Do not start writing `assigned_work` onto Member roles until work tables exist.

Firm-governance keys that `assigned_work` may still use against `type: "firm"` resources: `firm.view` only. Not `users.*`, not finance, not backup.

### Security invariants

- Permission key present + wrong `firmId` → deny (`tenant_mismatch`). This is the load-bearing tenant check.
- `hasPermission` must not be used as the server-function gate after this phase lands; server code added from here on calls `authorize`. Existing `api.ts` still waits until Phase 7.
- Scope never comes from the client. Only the resolver (Phase 2) or explicit system policy sets `context.scope`.
- Do not treat “Member has `work.view`” as assignment-limited until Member contexts are given `assigned_work` **and** work resources carry assignees.

### Tests required

- Same permission, two resources, different `firmId` → one allow, one deny.
- `assigned_work` + membership in `assigneeMembershipIds` → allow; otherwise deny.
- `assigned_work` + client resource → deny.
- `client` scope + matching `clientId` → allow; other client → deny.
- Empty/missing `firmId` on resource → deny.
- `hasPermission` true does not override tenant mismatch inside `authorize`.

### Files that must NOT be changed

- `src/lib/api.ts`
- `src/lib/firmos/bootstrap-server.ts`
- Any monthly `clients` / `activities` / `payments` schema or CRUD
- Do not add `firm_id` to existing monthly tables here (separate domain refactor)

---

## Phase 5 — Tenant-scoped `audit_events` and sanitized authorization errors

**Audit:** AUTH-07

**Dependencies:** Phase 2 (bootstrap has firm + membership + user). Phase 4 optional for bootstrap (bootstrap can log `authorize` denials later).

### Files to change

- `migrations/0004_firmos_audit_events.sql` or `0005_…` if Phase 3 took `0004`
- `src/lib/firmos/audit.ts` (**new**) — `recordAuditEvent` inside the caller’s transaction
- `src/lib/firmos/errors.ts` (**new**) — `FirmOSAuthorizationError` with `referenceId`
- `src/lib/firmos/domain.ts` — `requirePermission` / a new `requireAuthorized` should throw `FirmOSAuthorizationError` without interpolating the permission key into the **public** message
- `src/lib/firmos/bootstrap-server.ts` — replace `insert into audit_logs` with `audit_events` in the same transaction as firm creation
- `src/lib/firmos/audit.test.ts` (**new**)
- `src/lib/firmos/errors.test.ts` (**new**)
- `docs/firmos/DATABASE_SPECIFICATION.md` — `audit_events`, `error_events` columns
- `docs/firmos/DOMAIN_MODEL.md` — audit vs error event

### Database migrations

Create:

```text
audit_events (
  id uuid PK,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  membership_id uuid NULL REFERENCES firm_memberships(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  detail text NOT NULL DEFAULT '',
  before_payload jsonb NULL,
  after_payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
error_events (
  id uuid PK,
  reference_id text NOT NULL UNIQUE,
  firm_id uuid NULL REFERENCES firms(id) ON DELETE SET NULL,
  user_id text NULL,
  sanitized_message text NOT NULL,
  internal_detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

Indexes: `(firm_id, created_at desc)` on `audit_events`; `(reference_id)` on `error_events`.

Do **not** drop or alter `audit_logs`. Monthly code keeps writing to `audit_logs` until Phase 7.

### Interfaces / types to introduce

```ts
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
}

export class FirmOSAuthorizationError extends Error {
  readonly referenceId: string;
  readonly publicMessage: string; // e.g. "You are not allowed to perform this action."
}
```

Authorization failure path: insert `error_events` (best-effort / same request) → throw `FirmOSAuthorizationError`. Public JSON/API mapping happens in Phase 7; this phase provides the type.

Bootstrap action remains conceptually `firm.bootstrap` but stored on `audit_events`.

### Security invariants

- Every FirmOS foundation mutation in this slice (bootstrap) writes `audit_events` with `firm_id` in the **same transaction**.
- Audit queries introduced here (if any test helper) **must** filter `firm_id = context.firmId`. No `select * from audit_events` without tenant predicate.
- Client-visible authorization errors do not include permission keys, SQL, or stack traces.
- `error_events.internal_detail` is never returned to the client.
- Do not log secrets (session tokens, passwords).

### Tests required

- Bootstrap inserts `audit_events` with the new `firm_id` and authenticated `user_id`; **no** new `audit_logs` row from bootstrap.
- Audit helper queried with Firm B context cannot see Firm A rows.
- `FirmOSAuthorizationError` public message has no permission key; `referenceId` is present.
- Failed authorization writes `error_events` keyed by that `referenceId` (unit test with test sql).

### Files that must NOT be changed

- `src/lib/api.ts` `audit()` helper and `listAudit` (still `audit_logs`)
- `migrations/0002_monthly.sql`
- Backup restore implementation
- UI

---

## Phase 6 — Admin / Owner / Developer-IT governance model

**Audit:** AUTH-03

**Dependencies:** Phase 1 (vocabulary). Should land before Phase 7. Independent of Phase 4. If Phase 5 already landed, bootstrap/admin assignment tests should still write `audit_events`.

### Files to change

- `src/lib/firmos/domain.ts` — append IT keys `diagnostics.view`, `error_events.view`
- `src/lib/firmos/bootstrap.ts` — `DEFAULT_FIRM_ROLES`; `FirmBootstrapResult.ownerRoleName`
- `src/lib/firmos/bootstrap-server.ts` — assign the Admin system role (name change only)
- `migrations/0002_firmos_foundation.sql` **or** additive `000X_firmos_it_permissions.sql` inserting the two IT keys
- `docs/firmos/API_PERMISSION_SPECIFICATION.md` — Admin default grants; IT separate
- `src/lib/firmos/governance.test.ts` (**new**)

### Database migrations

- Insert IT permission keys into `permissions` (`on conflict do nothing`).
- No change to existing firms’ role names in SQL except what bootstrap does for **new** firms.
- Do **not** write a data backfill that renames `Owner` → `Admin` on already-bootstrapped firms unless a tiny, explicit `UPDATE roles SET name = 'Admin' WHERE is_system AND name = 'Owner'` is included and tested. Prefer documenting “new firms get Admin; existing Owner rows are equivalent until a follow-up backfill PR” if any firm already exists.

### Interfaces / types to introduce

```ts
export const FIRMOS_SYSTEM_ROLE_ADMIN = "Admin";
export const FIRMOS_IT_PERMISSIONS = ["diagnostics.view", "error_events.view"] as const;

export const DEFAULT_FIRM_ROLES: readonly {
  name: "Admin" | "Manager" | "Member" | "Viewer";
  description: string;
  permissions: readonly FirmOSPermission[];
}[]
```

Default grants (product mapping):

- **Admin:** all **non-IT** permissions, including `users.*`, `roles.*`, `firm.*`, `reports.generate`, `reports.export`, `audit.view`, `backup.create`. **Does not** include `backup.restore`, `diagnostics.view`, `error_events.view`.
- **Manager:** operational set only (clients/services/work/finance view+create, reports view/generate/export). No `users.*` writes, no `roles.*`, no `firm.manage`, no `payments.correct`, no backup, no audit.
- **Member:** `firm.view`, `clients.view`, `services.view`, `work.view` (and `work.update` only if product later sets `assigned_work` — **not** in this phase).
- **Viewer:** Member reads plus `reports.view`. No finance.
- **Developer/IT:** not a firm-bootstrap role. IT permissions exist in the catalog only. Grant path is out of band (platform operator), not `bootstrapFirm`.

`FirmBootstrapResult.ownerRoleName` becomes `"Admin"`.

### Security invariants

- Firm Admin cannot restore backups or read `error_events.internal_detail` by default.
- Additional seeded roles contain only the lists above (explicit grants, not “Admin minus a few”).
- IT permissions are never attached in `bootstrapFirm`.
- Unique `(firm_id, name)` still holds (`Admin` once per firm).

### Tests required

- Bootstrap assigns exactly one system role named `Admin` to the creator.
- Admin grant set equals all `FIRMOS_PERMISSIONS` minus `FIRMOS_IT_PERMISSIONS` minus `backup.restore`.
- Manager / Member / Viewer sets equal the frozen lists; no IT keys.
- Catalog contains IT keys; `role_permissions` for the four system roles do not.
- Two firms can each have `Admin`.

### Files that must NOT be changed

- `src/lib/api.ts` (still `requireAdmin` against `app_profiles`)
- Backup restore algorithm
- Do not add a Developer/IT UI
- Do not implement platform-operator grant UI

---

## Phase 7 — Migration of existing protected server functions to FirmOS authorization

**Audit:** AUTH-08

**Dependencies:** Phases 1, 2, 4, 5, 6. Phase 3 strongly recommended so role assignment cannot cross tenants.

### Residual tenant-isolation constraint (do not “fix” by redesign)

Monthly tables (`clients`, `payments`, `activities`, …) still have **no `firm_id`**. This phase replaces **gates**, not data ownership. Therefore:

- Resolve context via Phase 2. If the user has zero or more than one active membership, **fail closed**.
- Do **not** add `firm_id` columns to monthly tables in this PR (that is the clients/services domain refactor).
- Document in a short comment at the `requireActive` removal site: remaining data is single-tenant-bridged until those tables are tenant-scoped.
- Multi-firm production use is unsupported until that later refactor.

### Files to change

- `src/lib/api.ts` — replace `requireActive` / `requireAdmin` call sites with FirmOS resolve + `authorize`
- `src/lib/firmos/legacy-api-auth.ts` (**new**, optional) — `requireFirmOS(sql, userId, permission, resource)` used only by `api.ts`
- Tests colocated with existing API/auth tests if present; otherwise `src/lib/firmos/legacy-api-auth.test.ts`
- `docs/firmos/APPLICATION_DOMAIN_AUDIT.md` — one subsection: coarse `admin`/`viewer` is a migration bridge being removed from **server gates**

### Database migrations

- None.

### Interfaces / types to introduce

```ts
export async function requireFirmOSAction(input: {
  userId: UserId;
  permission: FirmOSPermission;
  resource: ProtectedResource; // typically { type, firmId } from resolved context
}): Promise<AuthorizationContext>;
```

Throws `FirmOSAuthorizationError` (Phase 5) on deny.

### Gate mapping (exact current exports)

| Server function | Current gate | FirmOS permission | Resource `type` |
|---|---|---|---|
| `getSessionWorkspace` | session / provision | authenticated only; no firm permission | — |
| `updateSettings` | `requireAdmin` | `firm.manage` | `firm` |
| `listClients` | `requireActive` | `clients.view` | `client` / `firm` |
| `createClient` | `requireAdmin` | `clients.create` | `firm` |
| `updateClient` | `requireAdmin` | `clients.edit` (archive path: `clients.archive` if the handler archives) | `client` |
| `listServices` | `requireActive` | `services.view` | `firm` |
| `createService` | `requireAdmin` | `services.create` | `firm` |
| `updateService` | `requireAdmin` | `services.edit` | `service` |
| `assignClientService` | `requireAdmin` | `services.edit` | `client` |
| `unassignClientService` | `requireAdmin` | `services.edit` | `client` |
| `getWorkspace` | `requireActive` | `work.view` | `firm` |
| `addSection` / `updateSection` / `deleteSection` / `reorderSections` | `requireAdmin` | `work.update` | `firm` |
| `saveActivity` / `deleteActivity` | `requireAdmin` | `work.update` | `firm` |
| `duplicatePeriod` | `requireAdmin` | `reports.generate` | `report` |
| `savePayment` | `requireAdmin` | new payment: `payments.create`; mutation of existing amount/status: `payments.correct` | `payment` |
| `deletePayment` | `requireAdmin` | `payments.correct` | `payment` |
| `listPayments` | `requireActive` + `viewersSeePayments` | `finance.view` only — **stop using** the global setting as authorization | `firm` |
| `getDashboard` | `requireActive` | `work.view` (finance widgets additionally require `finance.view` or omit amounts) | `firm` |
| `getMonthSummary` | (follow current file) | same as dashboard / workspace | `firm` |
| `getFounderSummary` | `requireActive` | `reports.view` | `report` |
| `getClientReport` | `requireActive` | `reports.view` | `report` |
| `getCombinedReport` | `requireActive` | `reports.generate` | `report` |
| `listUsers` | `requireAdmin` | `users.view` | `firm` |
| `updateUserAccess` | `requireAdmin` | `users.edit` / `users.disable` | `membership` |
| `createEmailUser` | `requireAdmin` | `users.create` | `firm` |
| `listAudit` | `requireAdmin` | `audit.view` | `audit_event` |
| `createBackup` | `requireAdmin` | `backup.create` | `backup` |
| `listBackups` | `requireAdmin` | `backup.create` | `backup` |
| `restoreBackup` | `requireAdmin` | `backup.restore` (IT; ordinary Admin must fail) | `backup` |

`listAudit`: if still reading `audit_logs`, keep that table but require `audit.view`. Do not cross-wire into a full `audit_events` query rewrite unless it is a small additive `UNION` — prefer leaving monthly `audit_logs` as legacy listing until a later audit migration PR.

`requireAdmin` / `requireActive` should be deleted once unused, or marked `@deprecated` with a throw if called.

### Security invariants

- Every protected export except `getSessionWorkspace` calls `resolveAuthorization` + `authorize`.
- Fail closed when membership is missing or not unique.
- `restoreBackup` is not Admin-equivalent.
- `listPayments` is not controlled by `viewers_see_payments`.
- `getCombinedReport` requires `reports.generate`, not merely an active profile.
- `app_profiles.role = 'admin'` must not bypass FirmOS deny.
- Authorization errors returned to the client use `FirmOSAuthorizationError.publicMessage` + `referenceId`.

### Tests required

- Member context cannot call `createClient`, `savePayment`, `restoreBackup`, `listAudit`.
- Admin context can call `createClient` and `reports.generate`; cannot `restoreBackup`.
- Unauthenticated / no membership → deny on a protected function.
- Two memberships → deny until tenant columns exist.
- Existing backup restore tests still pass **functionally**; only the actor gate changes (use an identity that has `backup.restore` in test setup, or skip restore tests that assumed `app_profiles.admin`).
- Payment visibility: actor without `finance.view` does not see amounts even if `viewers_see_payments` is true.

### Files that must NOT be changed

- `src/routes/**` UI components (no new “Sign in with Grok” buttons; no redesign)
- `src/lib/backup.ts` restore/payload logic (import gate only from `api.ts`)
- `src/lib/validation.ts` schemas except where a role enum `admin|viewer` would block Admin membership tests — change the **minimum** needed, do not redesign validation
- Monthly table schemas
- `public/**`, PWA plugins
- Finance domain tables (invoices/allocations) — they still do not exist; do not create them here

---

## Phase 8 — Migration numbering and comprehensive tests

**Audit:** AUTH-10 (and regression net of Phases 1–7)

**Dependencies:** Phases 1–7 should already have landed their own tests. This phase is numbering hygiene plus a gap-closing suite.

### Files to change

- `migrations/0002_firmos_foundation.sql` → rename to `migrations/0004_firmos_foundation.sql` **only if** no shared database has `_migrations.name = '0002_firmos_foundation.sql'`. If it has been applied, **do not rename**; instead add a no-op note in docs.
- Any Phase 3/5 files already named `0004_*` / `0005_*` — re-sequence only on fresh environments; never rename applied basenames.
- `src/lib/db-test-utils.ts` — apply **all** FirmOS SQL files in basename order after `0003_bootstrap.sql`
- `scripts/migration-plan.test.mjs` — assert FirmOS migration files appear in `pendingMigrations` for this workspace
- `src/lib/firmos/*.test.ts` — fill coverage gaps listed below
- `package.json` test script **only if** FirmOS tests are not already picked up by the existing test runner glob
- `docs/firmos/DATABASE_SPECIFICATION.md` — list actual filenames
- `docs/firmos/README.md` — link this plan and the audit

### Database migrations

- No behavioral schema in this phase unless a missing index/constraint was discovered. Prefer a new `000N` over editing applied files.
- Goal state on a **fresh** database, in name order:

```text
0001_auth.sql
0002_monthly.sql
0003_bootstrap.sql
0004_firmos_foundation.sql          # renamed from 0002_firmos_foundation.sql when safe
0005_firmos_membership_integrity.sql
0006_firmos_audit_events.sql
0007_firmos_it_permissions.sql      # if Phase 6 used an additive file
```

If rename is unsafe, keep `0002_firmos_foundation.sql` and number integrity/audit after `0003` as already shipped.

### Interfaces / types to introduce

- None. This phase does not add authorization API.

### Security invariants

- Test harness schema includes `firms`, `firm_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`, `audit_events`, `error_events`.
- Fresh migrate from empty DB succeeds once, and a second run applies zero pending files.
- Global permission catalog is not truncated by firm delete (reconfirm).

### Tests required (comprehensive checklist)

Must exist by the end of this phase (create any that earlier PRs skipped):

1. Permission catalog ↔ `FIRMOS_PERMISSIONS` equality.
2. `AuthorizationContext` construction (`ownerAuthorizationContext` / resolver) with `permissions: Set`.
3. Resolver: active / invited / suspended / removed / inactive firm / guessed firmId / multi-membership.
4. Cross-firm `membership_roles` rejected.
5. `authorize` tenant mismatch; `assigned_work`; `client` scope.
6. Bootstrap: Admin assignment, IT keys absent, `audit_events` row, authenticated user wins over payload.
7. `FirmOSAuthorizationError` sanitization + `error_events.reference_id`.
8. `createTestSql()` applies FirmOS migrations; a smoke query `select key from permissions` returns the frozen list.
9. `pendingMigrations` includes the FirmOS files; does not include `migrations/auth`.
10. Legacy API gates: Member vs Admin vs IT restore (from Phase 7).
11. `npm run typecheck` and existing backup/validation tests remain green.

### Files that must NOT be changed

- `src/lib/api.ts` (no further gate redesign)
- `migrations/0001_auth.sql`, `migrations/auth/0001_auth.sql`
- `migrations/0002_monthly.sql`, `migrations/0003_bootstrap.sql`
- Application UI, backup payload format, monthly domain columns
- Do not introduce a second test database stack

---

## Explicit out of scope (all phases)

- Work item / assignment / invoice / payment-allocation schema
- Adding `firm_id` to monthly `clients`, `payments`, `activities`
- Replacing Better Auth
- Developer/IT operator console
- UI permission editors
- Changing `viewers_see_payments` **setting storage** beyond ignoring it for authorization in Phase 7
- Merging pull requests
- Implementing any phase in the same change as this document

## Suggested PR titles

1. `FirmOS auth phase 1: canonical permissions and AuthorizationContext`
2. `FirmOS auth phase 2: membership authorization resolver`
3. `FirmOS auth phase 3: same-firm membership role integrity`
4. `FirmOS auth phase 4: V1 authorize() scope model`
5. `FirmOS auth phase 5: tenant audit_events and sanitized auth errors`
6. `FirmOS auth phase 6: Admin system role and Developer/IT permissions`
7. `FirmOS auth phase 7: migrate server function gates to FirmOS RBAC`
8. `FirmOS auth phase 8: foundation migration numbering and auth test harness`
