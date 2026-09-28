# FirmOS Tenant Data Migration Plan

**Status:** Frozen architecture plan
**Current phase:** Phase 9A planning
**Scope:** Tenant data ownership and isolation
**Application code:** Not changed by this document

## 1. Purpose

FirmOS authorization is now membership-based and tenant-aware, but the legacy monthly business tables are not yet physically tenant-scoped. This document defines the migration path from that state to genuine multi-tenant business data isolation.

The goal is not to add `firm_id` to every table automatically. The goal is to establish clear ownership boundaries, migrate existing data safely, enforce tenant-aware application queries, and finally add database-level protection against cross-Firm relationships.

## 2. Current state after Phase 8

The authorization chain is:

```text
Authenticated User
      ↓
Active Firm Membership
      ↓
Firm
      ↓
Firm Role
      ↓
Permission
      ↓
authorize()
```

Protected server functions resolve the Firm from the authenticated user's membership. Client-supplied `firmId`, roles, permissions, membership status, and scope are not trusted as authorization inputs.

However, the legacy monthly business tables still do not contain a direct tenant identity. Therefore authorization currently protects the action, while the underlying legacy rows are not yet physically partitioned by Firm.

## 3. Target architecture

The target business-data hierarchy is:

```text
Platform
├── Platform Operations
├── Technical Operations
└── Firms
    ├── Memberships
    ├── Roles
    ├── Firm Configuration
    └── Business Data
        └── Clients
            ├── Client Services
            ├── Report Periods
            │   └── Report Sections
            │       └── Activities
            ├── Payments
            └── Report Exports
```

The Firm becomes the explicit owner of tenant business data.

## 4. Core tenant rule

The authoritative tenant identity always comes from the authenticated session and active Firm membership:

```text
Authenticated User
      ↓
Active Membership
      ↓
Resolved Firm
      ↓
Authorization
      ↓
Tenant-aware query or mutation
```

A client-supplied `firm_id` must never establish tenant ownership.

For reads, the resolved Firm must constrain the query.

For writes, the resolved Firm must be written by the server.

## 5. Phase 9A: Tenant Data Foundation

Phase 9A is a schema/documentation foundation phase. It must establish the intended tenant-root model before application queries are rewritten.

### 5.1 Direct tenant roots

The first tenant-owned business roots are:

- `clients`
- `report_periods`
- `payments`
- `report_exports`

These tables should eventually have an explicit `firm_id` foreign key to `firms`.

### 5.2 Why these roots

`clients` is the principal business-data root for the current monthly system.

`report_periods` belongs to a client and represents reporting work for that client.

`payments` contains financial records and should have an explicit tenant boundary rather than relying only on an indirect client relationship.

`report_exports` represents generated tenant artifacts and should belong explicitly to a Firm.

## 6. Child tables and inherited ownership

The following tables currently obtain their business relationship through parent records:

```text
client_services
    ↓
clients

report_sections
    ↓
report_periods
    ↓
clients

activities
    ↓
report_sections
    ↓
report_periods
    ↓
clients
```

Phase 9A does not automatically add `firm_id` to every child table.

The initial principle is:

> Put direct `firm_id` on important tenant roots. Use strong parent relationships to establish inherited ownership where appropriate.

Later database-integrity work may use composite foreign keys to ensure that child references cannot cross Firms.

## 7. Service library

`service_library` is not treated as a tenant root in Phase 9A.

The current schema supports global services through `is_global`. Global service definitions may therefore remain shared across Firms.

A future Firm-specific service model can be introduced separately if the product requires custom tenant-owned services.

Do not add `firm_id` to `service_library` merely for the sake of uniformity.

## 8. Existing data and backfill

Existing legacy rows cannot safely receive `firm_id` until their owning Firm is known.

Therefore the migration must not assume that SQL can infer historical ownership.

The backfill process must establish an explicit mapping:

```text
Legacy workspace/data
        ↓
Verified target Firm
        ↓
Existing business rows
```

Only after the backfill has been verified should tenant-root `firm_id` columns become mandatory.

No migration may invent ownership for ambiguous production data.

## 9. Phase 9B: Legacy Data Backfill

Phase 9B will populate tenant identity for existing data.

Required verification gates include:

- Every client has exactly one Firm.
- Every report period belongs to the same Firm as its client.
- Every payment belongs to the same Firm as its client.
- Every report export belongs to one Firm.
- No orphan tenant references remain.
- No cross-Firm parent/child relationships exist.
- The intended legacy-to-Firm mapping is documented and reviewable.

The backfill must be reversible or recoverable through an explicit migration/backup strategy before production execution.

## 10. Phase 9C: Tenant Query Enforcement

After backfill, protected business queries must use the resolved Firm as a database constraint.

Conceptually:

```sql
SELECT *
FROM clients
WHERE firm_id = resolvedFirmId;
```

Not:

```sql
SELECT *
FROM clients;
```

The same rule applies to tenant-owned report, payment, and export queries.

### Writes

Creation must derive tenant ownership from the server-resolved authorization context:

```text
resolvedFirmId
      ↓
INSERT tenant-owned row
```

The request body must not be trusted to choose the Firm.

### Updates and deletes

Mutations must constrain both the requested record and the resolved Firm. A valid record ID alone must never be sufficient to cross a tenant boundary.

## 11. Phase 9D: Database Tenant Integrity

Application filtering is necessary but not sufficient.

The database should eventually enforce same-Firm relationships for tenant-owned records.

For example, a payment must not be able to reference a client from Firm A while carrying Firm B ownership.

The eventual model should use appropriate composite foreign keys or equivalent database constraints where required.

The principle is:

```text
Firm A
  Client A

Firm B
  Client B

Payment B → Client A
       ✕ database rejects
```

## 12. Phase 9E: Firm Configuration

The current `app_settings` table contains settings that may actually represent Firm configuration, including agency identity, tagline, currency, and payment-visibility behavior.

Do not simply add `firm_id` to the existing key/value table without deciding which settings are:

- Platform-wide
- Firm-specific
- Technical/infrastructure configuration

A separate Firm configuration model should be designed before migrating these settings.

## 13. Phase 9F: Legacy Audit and Backups

The legacy `audit_logs` table is not the same as the newer FirmOS `audit_events` stream.

`audit_events` is already tenant-aware through `firm_id`, membership, user, action, entity and reference identifiers.

Do not blindly merge or rewrite historical `audit_logs` during the initial tenant-data migration.

Backups require a separate boundary decision. A future Firm backup should represent one Firm's business data, while platform/infrastructure backups remain outside the tenant domain.

Backup payload internals must not be redesigned as part of Phase 9A.

## 14. Phase 9G: Multi-Tenant Verification

Before declaring legacy monthly data multi-tenant, the system must prove isolation using at least two Firms.

Required scenarios include:

1. Firm A user can read Firm A clients.
2. Firm A user cannot read Firm B clients.
3. Firm A user cannot update Firm B records by guessing an ID.
4. Firm A cannot create a record owned by Firm B.
5. Child records cannot be attached across Firms.
6. Reports cannot expose another Firm's clients or financial data.
7. Payments cannot cross Firms.
8. Exports cannot cross Firms.
9. Firm-scoped audit events remain isolated.
10. Platform and Technical authorization remain separate from tenant authorization.

## 15. Migration sequence

| Phase | Name | Purpose |
|---|---|---|
| 9A | Tenant Data Foundation | Establish the target tenant-root schema and constraints to be introduced |
| 9B | Legacy Data Backfill | Map existing records to verified Firms |
| 9C | Tenant Query Enforcement | Make application reads and writes Firm-aware |
| 9D | Database Tenant Integrity | Prevent cross-Firm relationships at database level |
| 9E | Firm Configuration | Separate Firm settings from Platform settings |
| 9F | Backup & Audit Migration | Resolve legacy backup and audit boundaries |
| 9G | Multi-Tenant Verification | Prove Firm-to-Firm isolation end to end |

These stages should remain separately reviewable. Do not combine them into one large migration.

## 16. Explicit non-goals

Phase 9A must not:

- Rewrite existing monthly tables without an approved migration design.
- Backfill production data without a verified Firm mapping.
- Trust client-supplied `firm_id`.
- Add `firm_id` to every table automatically.
- Change Platform/Technical authorization architecture.
- Create a `superadmin` role.
- Redesign backup payload internals.
- Replace FirmOS `audit_events` with legacy `audit_logs`.
- Change UI routes or branding.
- Introduce Row-Level Security without a separate design and compatibility review.

## 17. Phase 9A acceptance criteria

Phase 9A is complete when:

- The tenant-root tables are explicitly identified.
- The intended `firm_id` ownership model is documented.
- Child-table ownership rules are documented.
- Global tables are distinguished from tenant-owned tables.
- The legacy backfill requirement is explicit.
- The application query migration is explicitly deferred until after backfill.
- Database integrity requirements are explicitly defined for the later phase.
- No application behavior has been changed merely to claim tenant isolation.

## 18. Frozen rule

The central FirmOS tenant-data rule is:

> **Authorization determines which Firm the authenticated user is acting within. Data queries and mutations must then use that server-resolved Firm identity. Client input never establishes tenant ownership.**

This document freezes the migration direction. Individual migration PRs must implement only the stage they claim to implement and must not silently combine later stages.