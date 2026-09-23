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
- Role: named collection of permissions.
- Permission: atomic capability such as CLIENT_EDIT or PAYMENT_CREATE.
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
- Audit Event: trace of security-sensitive or business-significant actions.
- Error Event: sanitized application diagnostic linked to an internal reference ID.

## Rules
- Tenant-owned entities must be tenant-scoped through a controlled relationship.
- Tenant identifiers are not authorization mechanisms; authorization is enforced server-side.
- Work status is separate from finance status.
- Financial corrections require permission and an audit trail.
- AI-extracted financial data remains candidate data until a human-authorized workflow confirms it.
