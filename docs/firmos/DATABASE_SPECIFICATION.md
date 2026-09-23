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
- users
- memberships
- roles
- permissions
- role_permissions
- membership_roles
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

## Financial Rule
Payments and allocations are separate from work completion. Corrections must preserve an auditable history rather than silently rewriting financial history.

## Future Extensions
AI extraction, external integrations, cloud storage and additional modules should be additive and should not force redesign of the core identity or tenant model.
