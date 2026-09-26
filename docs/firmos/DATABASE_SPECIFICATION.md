# FirmOS Database Specification v1.0

## Principles
- PostgreSQL is the target production relational database.
- Database constraints protect integrity; application authorization protects access.
- Tenant-owned records must be tenant-scoped.
- Foreign keys and appropriate indexes are required for relational integrity and common access paths.
- Financial records require transaction-safe writes and explicit correction/audit behavior.
- Schema changes are delivered through versioned migrations.

## Core Tables / Aggregates
- firms
- `"user"` (Better Auth identity; there is no separate FirmOS `users` table)
- firm_memberships (canonical User↔Firm membership; not `memberships`)
- roles (per-firm named collections of permission keys)
- permissions (global catalog of atomic keys; not copied per tenant)
- role_permissions
- membership_roles (same-firm only: a membership cannot hold a role from another firm)
- clients
- contacts
- services
- client_services
- work_items
- work_assignments
- work_status_history
- invoices
- invoice_lines
- payments
- payment_allocations
- documents
- reports
- audit_events
- error_events
- notifications
- backup_records

## Tenant Rule
Tenant identity is part of the data model, but raw tenant IDs must never be treated as proof of authorization. Server-side membership and permission checks are mandatory.

## V1 Scope Rule
There is **no `scopes` table in V1**. Scope is computed from membership plus resource fields (`firm_id`, work assignees, client id) inside `authorize()`. Do not persist a client-supplied scope. Do not create `work_items` or `work_assignments` until that resource model is implemented.

## Permission Catalog Rule
`permissions.key` values are a global vocabulary shared by every firm. `roles` are tenant-scoped. Firms grant catalog keys through `role_permissions`; they must not insert per-firm copies of the same capability.

## Membership Integrity Rule
`firm_memberships` is the FirmOS membership table. `membership_roles` is constrained so `firm_memberships.firm_id` equals `roles.firm_id` (trigger stamps `membership_roles.firm_id` from the membership; composite foreign keys enforce both parents). Application code is not the only line of defense.

User identity is Better Auth `"user"`. `firm_memberships.user_id` is `text` without a foreign key to `"user"("id")`: preview/dev fixtures and first-insert ordering are not guaranteed to have a matching `"user"` row, and a second FirmOS `users` table is not introduced.

Deleting a firm cascades its roles, memberships, and `membership_roles` rows. The global `permissions` catalog is not tenant-owned and is not deleted.

## FirmOS Audit Rule
`audit_events` is the FirmOS authorization/audit table. Rows are tenant-scoped by `firm_id` (from the server-resolved firm in the same transaction) and carry a `reference_id` for tracing. Queries must filter `firm_id = context.firmId`. There is no cross-tenant listing helper.

`error_events` stores sanitized authorization failures keyed by `reference_id`. `internal_detail` is for server-side tracing and is never returned to the client.

Monthly `audit_logs` is unchanged. It is not replaced by `audit_events` and is still the source for existing `listAudit` behavior.

## Financial Rule
Payments and allocations are separate from work completion. Corrections must preserve an auditable history rather than silently rewriting financial history.

## Future Extensions
AI extraction, external integrations, cloud storage and additional modules should be additive and should not force redesign of the core identity or tenant model.
