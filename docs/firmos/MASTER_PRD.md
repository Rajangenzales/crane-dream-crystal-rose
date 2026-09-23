# FirmOS Master PRD v1.0

## Purpose
FirmOS is a general, multi-tenant internal working OS for firms. It provides a simple operational layer for team members, clients, services, work assignment, workflow, finance, reporting, documents, audit, backup, notifications and future AI integrations.

## Product Principles
- Admin-controlled governance.
- Least-privilege access through RBAC and permissions.
- Tenant isolation is mandatory.
- Business domains remain separated where correctness matters, especially finance.
- Responsive web application for desktop, laptop, tablet and mobile screens.
- Desktop/laptop may support local backup workflows; mobile devices are not treated as local-backup destinations.
- Reports are permission-controlled and initially generated only by authorized users, with Admin receiving the default capability.
- AI is assistive, replaceable and never the silent source of truth for financial data.
- Deployment must remain portable and not depend on a single development platform.

## Core Domains
1. Identity and authentication
2. Firms and tenancy
3. Users, memberships, roles and permissions
4. Clients and contacts
5. Service catalogue and client services
6. Work items, responsibility, workflow and audit history
7. Finance: invoices, payments, allocations and corrections
8. Documents and attachments
9. Reports
10. Notifications
11. Backup and restore
12. IT/developer diagnostics and error logs
13. Integration and AI gateway

## V1 Outcome
A firm can create its firm account, manage users and permissions, define services, manage clients, assign work and responsibility, track workflow, maintain invoices and payments accurately, generate authorized reports, attach documents, maintain audit history, and perform controlled backup/restore operations.

## Explicit Non-Goals for Core V1
Do not prematurely implement a full CRM, HR/payroll suite, inventory system, native mobile application, complex automation builder, accounting-platform replacement, or provider-specific AI architecture.

## Development Rule
Existing working functionality and tests are preserved unless a documented migration step replaces them. Changes are incremental, reviewable and test-gated.
