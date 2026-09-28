# FirmOS Tenant Data Architecture

## 1. Purpose

This document records the current tenant-data architecture of FirmOS after the authorization foundation phases. It is an inventory and architecture baseline, not a claim that the legacy monthly data is already fully multi-tenant.

The goal is to answer three questions clearly:

1. Which data already belongs to a Firm?
2. Which data is global or only indirectly connected to a Firm?
3. What must change before FirmOS can safely support multiple Firms using the monthly business data in production?

This document is based on the current repository schema and application access patterns. It intentionally separates **authorization** from **data isolation**.

---

## 2. Current Architecture in Simple Terms

FirmOS now has a strong authorization boundary:

```text
Authenticated User
       |
       v
Active Firm Membership
       |
       v
Firm
       |
       v
Roles
       |
       v
Permissions
       |
       v
authorize()
```

This answers:

> Is this person allowed to perform this action for this Firm?

The legacy monthly business tables are different. They were designed before FirmOS tenant isolation and generally do not contain `firm_id`.

So the current system has:

```text
Authorization boundary:     Firm-aware
Business-data boundary:     Partly legacy / unscoped
```

This distinction is critical. Passing FirmOS authorization does not, by itself, prove that a returned database row belongs to the same Firm.

---

## 3. Tenant Root

The tenant root is the `firms` table.

A Firm is connected to authenticated users through `firm_memberships`.

The canonical relationship is:

```text
Better Auth user
      |
      v
firm_memberships
      |
      v
firms
```

FirmOS roles are also tenant-owned:

```text
firms
  |
  +--> roles
  |
  +--> firm_memberships
          |
          +--> membership_roles --> roles
```

The permission catalog itself is global. Permission keys describe actions; Firm roles determine which actions are granted inside a Firm.

---

## 4. Data Classification

Every table should be understood as one of these categories.

### 4.1 Global

Shared platform/catalog data that is not owned by one Firm.

Examples:

- Better Auth identity/session infrastructure
- `permissions`
- global permission vocabulary
- `service_library` rows explicitly marked global

### 4.2 Tenant-owned

Rows contain a direct Firm identity and are protected by a Firm boundary.

Examples:

- `firms`
- `firm_memberships`
- `roles`
- `audit_events`

### 4.3 Tenant-linked

Rows do not necessarily contain `firm_id`, but can currently be traced to a Firm through another tenant-owned relationship.

This is useful for understanding the model, but **indirect traceability is not the same as database-enforced tenant isolation**.

Examples include the legacy monthly hierarchy:

```text
client
  |
  +--> client_services
  |
  +--> report_periods
          |
          +--> report_sections
                  |
                  +--> activities
  |
  +--> payments
```

### 4.4 Legacy / unscoped

Tables that currently do not contain a reliable Firm boundary and therefore cannot safely support independent multi-Firm data isolation.

Examples:

- `clients`
- `audit_logs`
- `backups`
- `app_settings` where settings are currently application-wide

These require deliberate architecture work before being treated as fully tenant-safe.

---

## 5. Current Table Inventory

| Table / area | Current Firm identity | Classification | Current interpretation |
|---|---|---|---|
| `firms` | own row | Tenant root | Root of the Firm boundary |
| `firm_memberships` | `firm_id` | Tenant-owned | Connects Better Auth identity to Firm |
| `roles` | `firm_id` | Tenant-owned | Firm-specific roles |
| `membership_roles` | membership + stamped `firm_id` | Tenant-owned/link | Same-Firm role integrity enforced by Phase 3 |
| `permissions` | none | Global | Shared permission catalog |
| `role_permissions` | through role | Tenant-linked | Connects permissions to Firm roles |
| `audit_events` | `firm_id` | Tenant-owned | FirmOS audit stream |
| `error_events` | optional `firm_id` | Platform/tenant | Sanitized authorization/error records |
| `clients` | none | Legacy / unscoped | Root of much of the old monthly business data |
| `client_services` | through `client_id` | Tenant-linked | Depends on client ownership |
| `service_library` | `is_global` | Global / catalog | Shared service definitions are possible by design |
| `report_periods` | through `client_id` | Tenant-linked | Monthly reporting belongs to a client today |
| `report_sections` | through `report_period_id` | Tenant-linked | Belongs to a reporting period |
| `activities` | through `report_section_id` | Tenant-linked | Belongs to report sections |
| `payments` | through client/period relationships | Tenant-linked | Financial data follows legacy client/report relationships |
| `report_exports` | client/report references | Legacy / weakly linked | Requires review before true tenant isolation |
| `audit_logs` | `user_id` only | Legacy / unscoped | Old monthly audit stream has no `firm_id` |
| `backups` | `created_by` only | Legacy / unscoped | Backup ownership is not currently Firm-partitioned |
| `app_settings` | none | Global / legacy | Some settings are application-wide today |
| `app_profiles` | `user_id` | Legacy identity layer | Older application profile model alongside FirmOS membership |
| Better Auth `user` / `session` / `account` / `verification` | identity | Global identity infrastructure | Authentication infrastructure, not Firm business data |

This table is a current-state inventory. It does not prescribe the final schema.

---

## 6. Monthly Business Data Dependency Graph

The current monthly schema is centered on `clients`.

```text
clients
  |
  +--------------------+
  |                    |
  v                    v
client_services     report_periods
  |                    |
  v                    v
service_library     report_sections
                       |
                       v
                   activities

clients / report_periods
        |
        v
     payments
```

This means a Firm boundary added to `clients` can potentially become the root from which much of the monthly hierarchy is isolated.

However, this must be implemented deliberately. The application must not assume that an indirect relationship automatically provides database-level tenant protection.

---

## 7. Authorization vs Data Isolation

These are separate controls.

### Authorization

FirmOS currently resolves the active membership and uses that Firm as the authorization tenant.

A protected operation effectively follows:

```text
Authenticated user
       |
       v
Resolve active membership
       |
       v
Resolved Firm
       |
       v
Permission + resource authorization
```

Client-supplied Firm identity is not trusted for authorization.

### Data isolation

The database must also ensure that queries return only rows belonging to that resolved Firm.

The legacy monthly model currently cannot do that directly because its principal business tables do not carry `firm_id`.

Therefore:

```text
FirmOS authorization != complete row-level tenant isolation
```

This is the main architectural limitation remaining after Phase 8.

---

## 8. Current Application Access Pattern

Protected server functions now use FirmOS authorization rather than the old `requireAdmin()` / `requireActive()` gates.

The resolved membership provides the tenant context. For example, client access is permission-gated through FirmOS.

Conceptually:

```text
User
  |
  v
FirmOS membership resolution
  |
  v
authorize(clients.view, resource)
  |
  v
legacy clients query
```

The final step still reads the legacy `clients` table without a direct `firm_id` predicate because that column does not currently exist.

This is why Phase 7 correctly stopped short of claiming full multi-tenant production support for the legacy monthly data.

---

## 9. What Is Already Tenant-Safe

The following FirmOS areas have an explicit tenant model:

- Firm membership resolution
- Firm-specific roles
- Membership-to-role same-Firm integrity
- FirmOS authorization context
- Resource tenant matching in `authorize()`
- FirmOS `audit_events`
- Platform and Technical authorization planes being separate from Firm membership

Platform and Technical permissions are deliberately not attached to Firm roles. They belong to separate authorization domains.

There is no `superadmin` authority that combines all three domains.

---

## 10. What Is Not Yet Tenant-Safe

The following legacy areas remain outside full row-level Firm isolation:

### Clients

`clients` has no `firm_id`. It is currently the root of much of the monthly business data.

### Services assigned to clients

`client_services` can be traced through `client_id`, but its tenant boundary depends on the client relationship rather than a direct database constraint.

### Monthly reports

`report_periods`, `report_sections`, and `activities` inherit their business relationship through clients and report periods. They do not have a direct Firm identity.

### Payments

Payments are connected to the legacy client/report model rather than directly to a Firm.

### Legacy audit

`audit_logs` remains unscoped. FirmOS `audit_events` should be treated as the tenant-aware audit stream for the FirmOS architecture.

### Backups

The current backup model is not yet a Firm-partitioned data boundary. Backup payload internals were intentionally left unchanged during the authorization phases.

### Settings

Some application settings are currently global. A future architecture must distinguish platform settings from Firm configuration.

---

## 11. Service Catalog Is Not Automatically Tenant Data

`service_library` deserves special treatment.

The current model contains an `is_global` concept. Therefore, not every service definition should automatically receive a `firm_id`.

A future design may distinguish:

```text
Global service definition
        |
        +--> available to Firms

Firm-specific service definition
        |
        +--> owned by one Firm
```

The correct choice should be made from product requirements rather than adding `firm_id` mechanically.

---

## 12. Recommended Future Direction

The next multi-tenancy work should establish a **Firm data boundary**, starting at the root of the legacy business graph.

A likely direction is:

```text
firms
  |
  +--> clients
          |
          +--> client_services
          |
          +--> report_periods
                  |
                  +--> report_sections
                          |
                          +--> activities
          |
          +--> payments
```

The exact migration should be designed only after production-data assumptions, existing rows, and backup behavior are verified.

Where appropriate, direct `firm_id` columns should be preferred for important tenant-owned tables because they make isolation explicit and enforceable.

Indirect joins can remain useful for normalization, but they should not be the only security boundary for sensitive tenant data.

---

## 13. Migration Principles

Future tenant-data migrations should follow these rules:

1. **Do not silently reinterpret existing data.**
2. **Establish how existing rows map to a Firm before adding non-null tenant constraints.**
3. **Backfill and validate before enforcing constraints.**
4. **Keep authorization and data isolation as separate controls.**
5. **Prefer database-enforced tenant relationships where practical.**
6. **Do not modify monthly schemas merely to satisfy an authorization phase.**
7. **Do not mix Platform or Technical operator data into Firm business tables.**
8. **Treat backups as a tenant-boundary concern before declaring multi-tenant production readiness.**
9. **Keep legacy `audit_logs` separate from tenant-aware FirmOS `audit_events` until a deliberate migration is designed.**
10. **Do not introduce a catch-all superadmin role to solve cross-plane operations.**

---

## 14. Explicitly Deferred

This document does **not** implement or authorize the following:

- Adding `firm_id` to monthly tables
- Migrating existing monthly data
- Replacing `audit_logs`
- Redesigning backup payloads
- Creating Platform operator tables
- Creating Technical operator tables
- Changing UI routes or login domains
- Changing Platform/Technical permission catalogs
- Backfilling historical `Owner` roles
- Creating a `superadmin`

Those are separate architectural decisions and implementation phases.

---

## 15. Multi-Tenant Production Readiness Criteria

FirmOS should not be described as fully multi-tenant for business data until all of the following are true:

- Every tenant-owned business row has a reliable Firm boundary.
- Server-side authorization derives the Firm from authenticated membership.
- Queries cannot accidentally return another Firm's rows.
- Important tenant relationships are enforced by database constraints where practical.
- Existing production rows have a verified Firm mapping.
- Backups have an explicit Firm boundary or an explicitly documented platform-level design.
- Audit data has a deliberate tenant/platform classification.
- Cross-Firm access tests exist for every sensitive business resource.
- A two-Firm integration test proves that Firm A cannot read or mutate Firm B's business data.
- The application can safely operate with more than one active Firm without relying on the legacy assumption that the user has only one membership.

---

## 16. Current Status After Phase 8

### Completed

- FirmOS permission vocabulary
- Server-side authorization context
- Active membership resolution
- Same-Firm role integrity
- Resource authorization and scope contract
- Tenant-scoped FirmOS audit events
- Sanitized authorization errors
- Separate Customer/Tenant, Platform, and Technical authorization planes
- FirmOS gates on protected server functions
- Migration/test infrastructure for the FirmOS authorization foundation

### Remaining architectural boundary

The authorization foundation is now substantially complete, but the legacy monthly business data is not yet fully tenant-partitioned.

The next work should therefore focus on **tenant data architecture and migration**, not on adding more authorization abstractions to solve a database ownership problem.

---

## 17. Decision Summary

The current FirmOS architecture should be understood as:

```text
                FIRMOS
                  |
       +----------+----------+
       |          |          |
    TENANT     PLATFORM   TECHNICAL
       |          |          |
       v          v          v
   Firm data   Platform    Engineering
   + auth      operations  operations
       |
       v
  Legacy monthly data
       |
       v
  Needs explicit Firm
  data boundary
```

The central design principle is simple:

> **Authorization decides who may act. Data ownership decides which rows exist inside that person's Firm boundary. FirmOS now has the first foundation. This document defines the work required to make the second foundation explicit.**
