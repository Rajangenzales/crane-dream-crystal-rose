# FirmOS Domain Model v1.0

## Core Relationships

```text
User
  └── Membership ──> Firm
                      ├── Roles / Permissions
                      ├── Clients
                      │    └── Client Services
                      ├── Services
                      ├── Work Items
                      │    ├── Responsible Member
                      │    ├── Reviewer / Approver
                      │    └── Status History
                      ├── Finance
                      │    ├── Invoices
                      │    └── Payments / Allocations
                      ├── Documents
                      ├── Reports
                      ├── Notifications
                      └── Audit Events
```

## Core Entities
- Firm: tenant boundary and firm-level configuration.
- User: authenticated human identity.
- Membership: relationship between a user and a firm.
- Role: named, firm-scoped collection of permissions.
- Permission: atomic capability stored as a global key such as `clients.edit` or `payments.create` (spec names: CLIENT_EDIT, PAYMENT_CREATE). Permission keys are a global catalog; firms compose them into roles and do not copy permission rows per tenant.
- Client: customer/business managed by a firm.
- Contact: person associated with a client.
- Service: tenant-defined service catalogue item.
- Client Service: service relationship between a client and a service.
- Work Item: unit of operational work.
- Assignment: responsibility/reviewer/approver relationship for work.
- Status History: immutable record of workflow transitions.
- Invoice: financial charge document.
- Invoice Line: component of an invoice.
- Payment: money received/recorded.
- Payment Allocation: relationship between payment and invoice balance.
- Document: uploaded file or extracted business document.
- Report: generated business output subject to permission.
- Audit Event: tenant-scoped trace of security-sensitive or business-significant FirmOS actions (`audit_events`). Each event carries `firm_id` and a `reference_id`. Monthly `audit_logs` remains a separate legacy listing store.
- Error Event: sanitized application diagnostic linked to an internal reference ID (`error_events`). Client-visible authorization failures expose only the public message and `referenceId`.

## Rules
- Tenant-owned entities must be tenant-scoped through a controlled relationship. Resource authorization uses the stored `firm_id` on the resource, compared to the membership-resolved context firm.
- Tenant identifiers are not authorization mechanisms; authorization is enforced server-side via `authorize(context, permission, resource)`.
- Assigned-work scope is represented at the authorization contract. It applies when work resources carry assignee membership ids. Do not treat Member `work.view` as assignment-limited until work tables exist and Member contexts are given `assigned_work`.
- Client scope is represented at the authorization contract and is evaluated against server-resolved `clientId` values. It is not assigned until a client resource model exists.
- Work status is separate from finance status.
- Financial corrections require permission and an audit trail.
- AI-extracted financial data remains candidate data until a human-authorized workflow confirms it.
