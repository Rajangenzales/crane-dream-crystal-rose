# FirmOS Phase 6 Architecture Specification

## Platform Operations, Technical Operations, and Tenant Administration Boundary

**Status:** Architecture freeze  
**Phase:** 6  
**Depends on:** FirmOS Authorization Foundation Phases 1–5  
**Implementation:** Not started  
**Scope:** Authorization architecture only

---

## 1. Purpose

FirmOS is a multi-tenant SaaS platform. The authorization foundation establishes the tenant decision chain:

```text
Authenticated User
  -> Membership
  -> Firm
  -> Role
  -> Permission
  -> Scope
  -> Resource
```

FirmOS now requires a clear distinction between three security planes:

1. Customer/Tenant Administration
2. FirmOS Platform Operations
3. FirmOS Technical Operations

These are separate authorization domains. They must not be collapsed into one universal administrator role.

---

## 2. Three Security Planes

```text
                         FIRMOS
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
     CUSTOMER PLANE   PLATFORM PLANE   TECHNICAL PLANE
          |                |                |
     Firm Admin       Platform Admin    Developer / IT
     Manager          Operations        Operations
     Member
     Viewer
```

### Customer/Tenant Plane
Operates inside a customer Firm through membership and Firm roles.

### Platform Plane
Operates the FirmOS SaaS platform and tenant lifecycle metadata.

### Technical Plane
Operates the FirmOS technical system, diagnostics, health, and infrastructure.

---

## 3. Customer / Tenant Plane

Customer users are represented by a Firm membership:

```text
User
  -> Membership
  -> Firm
  -> Firm Role
  -> Permission
  -> Scope
  -> Resource
```

Default Firm roles remain:

- Admin
- Manager
- Member
- Viewer

A Firm Admin is an administrator **inside that Firm**. A Firm Admin is not a FirmOS Platform Administrator.

Existing tenant authorization from Phases 1–5 remains the governing model for customer resources.

---

## 4. Platform Operations Plane

The Platform Operations Plane belongs to the operator of FirmOS.

Its purpose is to operate the SaaS platform and manage tenant lifecycle and platform-level metadata.

Conceptual responsibilities:

```text
Platform Operations
├── Tenant lifecycle
├── Platform usage
├── Subscription / entitlement status
├── Platform monitoring
└── Support metadata
```

Potential future information includes:

- registered Firms
- Firm status
- Firm creation date
- plan/subscription status
- entitlement status
- user/member counts
- usage metrics
- last activity
- operational status
- support metadata

Platform Operations does **not** automatically grant access to customer business records.

Principle:

> Platform visibility is not customer-data visibility.

---

## 5. Technical Operations Plane

The Technical Operations Plane is responsible for the technical operation of FirmOS.

Conceptual responsibilities:

```text
Technical Operations
├── Diagnostics
├── Error events
├── System health
├── Technical troubleshooting
└── Infrastructure operations
```

Potential future information includes:

- system diagnostics
- application errors
- technical health information
- infrastructure status
- job/queue status
- technical logs
- performance information
- operational troubleshooting information

Technical Operations does not automatically grant access to customer clients, invoices, payments, documents, or business records.

Technical telemetry should also avoid unnecessarily storing customer business data.

---

## 6. Platform Admin and Developer/IT Are Separate Authorities

Platform Admin and Developer/IT must not become one universal `superadmin` authority.

```text
Platform Admin
  -> Platform Operations

Developer / IT
  -> Technical Operations
```

A person may eventually hold both authorities, but those are separate grants. Possessing one does not implicitly grant the other.

Example:

```text
Platform Admin
  - tenant lifecycle
  - usage
  - subscription/entitlement metadata
  - support metadata
  - no infrastructure administration by default
  - no customer business-data access by default
```

```text
Developer / IT
  - diagnostics
  - error events
  - system health
  - technical troubleshooting
  - infrastructure operations where authorized
  - no platform tenant administration by default
  - no customer business-data access by default
```

---

## 7. Platform and Technical Operations Are Not Firm Memberships

Platform Admin and Developer/IT must **not** be implemented by creating a membership in every customer Firm.

Do not model platform authority as:

```text
Platform Admin
  -> Membership in Firm A
  -> Membership in Firm B
  -> Membership in Firm C
```

Instead, distinguish:

```text
Customer Principal
  -> Firm Membership
  -> Firm Role
```

from:

```text
Platform Principal
  -> Platform Authority
```

and:

```text
Technical Principal
  -> Technical Authority
```

A tenant membership must not automatically satisfy a Platform or Technical authorization request.

---

## 8. Access Surfaces

FirmOS should eventually expose separate application surfaces.

Conceptually:

```text
app.firmos.com
  -> Customer Application
```

```text
platform.firmos.com
  -> Platform Operations
```

```text
it.firmos.com
  -> Technical Operations
```

These are architectural examples only. Phase 6 does not require these exact domains or any particular deployment topology.

The system may eventually use one deployment with multiple domains or separate deployments. That infrastructure decision is deferred.

The authorization boundary must exist independently of deployment topology.

---

## 9. Login Surface Separation

Customer users must not be presented with Platform Operations or Technical Operations login surfaces as part of the normal customer application.

Customer flow:

```text
Customer Login
  -> Authenticated User
  -> Firm Membership
  -> Customer Application
```

Platform operators authenticate through the Platform Operations surface.

Technical operators authenticate through the Technical Operations surface.

Frontend route hiding is not an authorization mechanism. Any direct request to an unauthorized operational route must be denied server-side.

> Hidden route != security.

---

## 10. No Universal Super Admin

FirmOS must not introduce a generic `superadmin` role that automatically grants every Firm, customer data, Platform Operations, Technical Operations, infrastructure access, backup restoration, and financial access.

Authorities must remain explicitly separated for least privilege, auditability, separation of duties, and incident investigation.

---

## 11. Permission Namespaces

Tenant permissions use the normal resource/action vocabulary, for example:

```text
client.view
client.create
work.view
invoice.view
payment.correct
report.generate
backup.create
backup.restore
```

Platform-level permissions use the `platform.*` namespace where appropriate, for example:

```text
platform.tenant.view
platform.tenant.suspend
platform.system.view
platform.error.view
platform.error.manage
platform.integration.manage
platform.ai.manage
platform.health.view
```

Platform permissions must not be granted automatically to Firm Admins.

Technical Operations should use a distinct technical namespace where appropriate. The exact Technical Operations permission catalog must be frozen before implementation rather than invented ad hoc.

---

## 12. Authorization Domains

The authorization engine must distinguish the domain being evaluated.

### Tenant Authorization

```text
Membership
  -> Firm Role
  -> Permission
  -> Scope
  -> Tenant Resource
```

### Platform Authorization

```text
Platform Principal
  -> Platform Permission
  -> Platform Resource
```

### Technical Authorization

```text
Technical Principal
  -> Technical Permission
  -> Technical Resource
```

A tenant membership must not automatically satisfy a Platform or Technical authorization request.

Platform authority must not automatically satisfy a tenant resource authorization request.

Technical authority must not automatically satisfy a tenant resource authorization request.

---

## 13. Customer Data Boundary

Default rule:

> Platform Operations and Technical Operations must not provide implicit access to customer business data.

For example, Platform Admin may eventually see:

```text
Firm ABC
Active
23 users
Pro plan
Usage metrics
```

without automatically seeing:

```text
ABC customers
ABC invoices
ABC payments
ABC documents
```

Developer/IT may eventually see:

```text
Error event
Failed job
Service health
Infrastructure status
```

without automatically seeing customer business records.

If support or incident response later requires controlled customer-data access, it must be designed as a separate, explicit, audited capability. It must not emerge from a universal administrator role.

---

## 14. Audit Requirements

Platform and Technical Operations must eventually have auditable activity.

Examples:

```text
Platform:
  tenant.view
  tenant.suspend
  subscription.view
  usage.view
```

```text
Technical:
  diagnostics.view
  error_events.view
  system.health.view
```

The existing FirmOS audit architecture from Phase 5 should be extended for these operations rather than bypassed.

---

## 15. Phase 6 Implementation Boundary

Phase 6 is an authorization-foundation phase. It must not implement the complete Platform Operations product.

Do not create platform product tables such as:

```text
platform_admins
subscriptions
usage_events
tenant_analytics
support_console
platform_dashboard
technical_dashboard
```

unless a later, explicitly approved architecture phase requires them.

Phase 6 should establish the authorization vocabulary and boundaries required for later implementation.

---

## 16. Future Platform Operations Layer

After the authorization foundation is complete, FirmOS may introduce a dedicated Platform Operations product layer:

```text
FirmOS Platform Operations
|
├── Tenant Registry
├── Tenant Lifecycle
├── Usage & Entitlements
├── Subscription
├── Platform Monitoring
└── Support Metadata
```

This layer should operate on tenant/platform metadata and explicitly defined operational resources. It should not become a general-purpose customer-data browser.

---

## 17. Future Technical Operations Layer

A separate Technical Operations layer may eventually provide:

```text
FirmOS Technical Operations
|
├── Diagnostics
├── Error Events
├── System Health
├── Technical Troubleshooting
├── Jobs / Queues
└── Infrastructure Operations
```

Technical Operations remains separate from Platform Operations.

A technical operator does not automatically become a Platform Admin.

A Platform Admin does not automatically become a technical operator.

---

## 18. Security Invariants

The following invariants are mandatory:

### S1 — Tenant isolation
A customer authorization context cannot access another Firm merely because the Firm ID is known.

### S2 — Platform isolation
A tenant membership cannot grant Platform Operations authority.

### S3 — Technical isolation
A tenant membership cannot grant Technical Operations authority.

### S4 — Platform/Technical separation
Platform authority does not automatically grant Technical authority, and Technical authority does not automatically grant Platform authority.

### S5 — No universal super-admin
There is no implicit role that combines every authority.

### S6 — Customer-data protection
Platform and Technical authority do not automatically imply customer business-data access.

### S7 — Server-side enforcement
Frontend route hiding is never considered an authorization mechanism.

### S8 — Explicit authority
Every privileged operation must have an explicit permission and authorization path.

### S9 — Auditability
Privileged Platform and Technical operations must be auditable.

### S10 — Least privilege
Each operational plane receives only the capabilities necessary for its function.

---

## 19. Relationship to Existing FirmOS Architecture

The existing tenant authorization remains:

```text
User
  -> Membership
  -> Firm
  -> Role
  -> Permission
  -> Scope
  -> Resource
```

The architecture adds two parallel authorization domains:

```text
                    AUTHORIZATION
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
       TENANT         PLATFORM       TECHNICAL
       DOMAIN          DOMAIN          DOMAIN
          |              |              |
      Membership      Platform       Technical
      + Firm Role     Authority       Authority
          |              |              |
          v              v              v
      Customer        Platform       Technical
      Resources       Resources      Resources
```

These domains must not be collapsed into one role hierarchy.

---

## 20. Implementation Principle

> **One FirmOS platform, multiple authorization planes, explicit boundaries.**

Customer administration operates inside a Firm.

Platform administration operates above Firms.

Technical operations operate on the FirmOS system.

None of these authorities should silently inherit the others.

---

## 21. Deferred Decisions

The following are intentionally deferred:

- exact Platform Admin identity storage
- exact Technical/Developer identity storage
- whether one human may hold multiple operational authorities
- MFA requirements for operational surfaces
- exact domain names
- one deployment versus multiple deployments
- Platform Operations database schema
- subscription/billing schema
- usage/entitlement schema
- support tooling
- tenant impersonation or break-glass access
- customer-data support access
- technical log redaction architecture
- Platform Operations UI
- Technical Operations UI

These decisions belong to a later Platform Operations / Technical Operations architecture rather than the authorization foundation.

---

## 22. Final Rule

FirmOS must never become:

```text
One login
  -> Super Admin
  -> Everything
```

It should become:

```text
                 FIRMOS
                    |
       +------------+------------+
       |            |            |
       v            v            v
   CUSTOMER      PLATFORM      TECHNICAL
     PLANE        PLANE          PLANE
       |            |            |
   Firm Admin   Platform Admin   IT
   Manager
   Member
   Viewer
```

Each plane has its own authority, resources, access surface, and audit boundary.

The customer plane protects customer business data.

The platform plane operates the SaaS tenancy.

The technical plane operates the technology.

**Operational visibility must never become accidental customer-data access.**
