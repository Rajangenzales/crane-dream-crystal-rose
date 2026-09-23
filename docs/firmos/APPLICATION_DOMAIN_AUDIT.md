# FirmOS Application & Domain Audit v1.0

Status: In Progress  
Branch: `firmos-foundation`

## Purpose

Compare the current repository implementation with the approved FirmOS specifications before changing the core application domain.

## Current repository baseline

The repository is a React 19 / TanStack Start application with TypeScript, Kysely, PostgreSQL (`pg`), PGLite, Better Auth, Zod, Node/TypeScript tests, Playwright, Vite and Nitro. The package scripts include development, production build, database migration, typecheck, authentication invariant checks, tests and linting. fileciteturn228file0

## Confirmed implementation observations

### Platform / runtime
- The old `.grok/app-env.json` runtime dependency has been removed from the active environment path.
- A provider-neutral FirmOS PWA boundary and implementation are active.
- The production build currently succeeds in Codespaces based on the validation reported during this migration.
- The current development environment can fall back to PGLite when `DATABASE_URL` is absent. The DB module explicitly selects Neon when `DATABASE_URL` is set and PGLite otherwise. fileciteturn231file0

### Authentication
Better Auth is already present, with `user`, `session`, `account`, and `verification` tables in the first migration. fileciteturn235file0

The existing gate identity layer is still strongly tied to the previous platform. It uses `x-grok-identity`, `GROK_PROJECT_ID`, `GROK_GATE_ORIGIN`, Grok hosts, a Grok-specific preview origin, and Grok-specific fallback identity values. fileciteturn233file0

**Decision: REFACTOR.** Keep Better Auth and the session foundation, but remove platform identity from the FirmOS authorization model. FirmOS authorization must resolve through authenticated user + firm membership + role/permission context.

### Current application schema
The current application migration contains `app_profiles`, `app_settings`, `clients`, `service_library`, `client_services`, `report_periods`, `report_sections`, `activities`, `payments`, `report_exports`, `audit_logs`, and `backups`. fileciteturn236file0

This is a useful working foundation, but it represents a **single-firm monthly work/reporting model**, not the target multi-tenant FirmOS domain.

## Initial FirmOS comparison

### Firm / Tenant
The FirmOS domain model defines `Firm` as the tenant boundary and `Membership` as the relationship between User and Firm. It also requires tenant-scoped Clients, Services, Work, Finance, Documents, Reports, Notifications and Audit Events. fileciteturn237file0

The current application schema has no first-class `firm` or `membership` table. `app_profiles` is keyed only by `user_id` and limits roles to `admin` and `viewer`. fileciteturn236file0

**Decision: INTRODUCE.** Firm and Membership must become first-class domain entities. Do not try to make `app_profiles` alone represent the tenant boundary.

### Users / Roles / Permissions
The current role model is only `admin` / `viewer`. fileciteturn236file0

FirmOS requires admin-controlled user provisioning and granular permissions, with named roles and atomic permissions. The target domain explicitly includes Role and Permission. fileciteturn237file0

**Decision: REFACTOR / INTRODUCE RBAC.** Keep authenticated User identity, replace the coarse app role with firm membership, roles and permissions.

### Clients
The current `clients` table already contains client/company/contact/email/phone/notes/active fields, and `client_services` provides a many-to-many relationship to services. fileciteturn236file0

FirmOS defines Client, Contact, Service and Client Service separately. fileciteturn237file0

Current client records have no firm/tenant owner, and `contact_person` is embedded instead of being a first-class Contact entity.

**Decision: REFACTOR.** Preserve useful CRUD/data fields, add tenant ownership and introduce Contact where the domain requires it.

### Services
The current `service_library` supports named services, active state, ordering and client relationships, with seeded services. fileciteturn236file0

FirmOS requires a tenant-defined service catalogue. A starter catalogue can remain useful, but tenant ownership must become authoritative.

**Decision: REFACTOR.** Preserve the service concept and relationships, change the ownership/scope model.

### Work / Responsibility
The current `activities` table belongs to `report_sections`, so operational activity is structurally nested under a monthly report. fileciteturn236file0

FirmOS defines Work Item, Assignment and Status History as independent concepts, including responsible member, reviewer/approver and immutable workflow history. fileciteturn237file0

**Decision: INTRODUCE / REPLACE THE OPERATIONAL MODEL.** Existing activities can be retained as historical reporting data or migrated into work records where appropriate, but Work must no longer depend on Reports as its primary parent.

### Finance / Payments
The current `payments` table records client, optional report period, year/month, status, amount, payment date and notes. fileciteturn236file0

FirmOS requires a separate finance domain with Invoice, Invoice Line, Payment and Payment Allocation. It also requires exact financial corrections with permission and audit trail, and explicitly separates work status from finance status. fileciteturn237file0

**Decision: INTRODUCE / REPLACE THE FINANCE MODEL.** Treat the current payment table as legacy data during migration. Do not build the new financial workflow by extending the monthly report status model.

### Reports / Exports
The current schema already has report periods, sections, activities and report exports. `report_exports.generated_by` records the generating user. fileciteturn236file0

FirmOS requires Reports subject to permission, with the product decision that report generation is controlled by authorized users/admins.

**Decision: REFACTOR.** Reports should consume the new Work and Finance domains rather than own operational work.

### Audit Events / Error Events
The current `audit_logs` table stores user, action, entity type/id, detail and timestamp. fileciteturn236file0

FirmOS defines Audit Event and Error Event separately. Error Events are sanitized application diagnostics linked to an internal reference ID. fileciteturn237file0

**Decision: REFACTOR.** Preserve the audit concept, add tenant context and a proper event model. Do not use business audit logs as the application error log.

### Backup / Restore
The current schema contains a `backups` table and the repository already has backup/restore tests. The package test command explicitly includes `backup.test.ts` and `backup.restore.test.ts`. fileciteturn228file0

FirmOS requires scheduled backup plus local desktop/laptop backup and cloud backup/restore planning. Mobile local backup is intentionally excluded from the requested design.

**Decision: KEEP THE TESTED FOUNDATION, REFACTOR ARCHITECTURE.** Backup storage should become a service/adapter rather than remain permanently coupled to a business table.

### Documents / Bill Image Extraction
The current migration does not define a first-class Document or extraction-candidate model. fileciteturn236file0

FirmOS requires Documents and future AI-assisted bill extraction, with extracted financial data remaining candidate data until a human-authorized workflow confirms it. fileciteturn237file0

**Decision: INTRODUCE LATER.** Do not couple AI extraction directly to final financial records.

## Domain mapping table

| FirmOS entity | Current repository | Decision |
|---|---|---|
| Firm | Missing | Introduce |
| User | Better Auth `user` | Keep |
| Membership | Missing | Introduce |
| Role | `app_profiles.role` only | Replace/refactor |
| Permission | Missing | Introduce |
| Client | `clients` | Refactor |
| Contact | Embedded `contact_person` | Introduce as needed |
| Service | `service_library` | Refactor |
| Client Service | `client_services` | Refactor |
| Work Item | No independent entity | Introduce |
| Assignment | Missing | Introduce |
| Status History | Missing | Introduce |
| Invoice | Missing | Introduce |
| Invoice Line | Missing | Introduce |
| Payment | `payments` | Refactor/replace |
| Payment Allocation | Missing | Introduce |
| Document | Missing | Introduce |
| Report | `report_periods` + sections/exports | Refactor |
| Notification | Missing | Introduce later |
| Audit Event | `audit_logs` | Refactor |
| Error Event | Missing as domain event | Introduce |

## Architectural conclusion

The existing repository is **not disposable**. It already contains a useful authentication/session foundation, database abstraction, migration system, clients, services, monthly reports, payments, audit logs and backup/restore behavior. fileciteturn231file0 fileciteturn235file0 fileciteturn236file0

But the current domain is fundamentally **single-firm / user-scoped monthly reporting**, whereas FirmOS is **tenant-scoped operational management with RBAC and a separate finance domain**.

The safest migration sequence is therefore:

1. Preserve the working authentication/database foundation.
2. Introduce Firm and Membership.
3. Introduce RBAC and permission resolution.
4. Add tenant ownership to clients and services and enforce it server-side.
5. Separate Work from Reports.
6. Introduce the finance domain with exact financial invariants.
7. Refactor reports around the new work and finance relationships.
8. Add documents, backup adapters, notifications, error events and AI connectors progressively.

## Current next step

**Phase 0.3.1 remains in progress.**

The next implementation milestone should be the **FirmOS Domain Foundation**: Firm, Membership, Role, Permission, and a reusable server-side authorization context that every tenant-owned operation can use.

No broad UI rewrite should begin before that foundation exists.
