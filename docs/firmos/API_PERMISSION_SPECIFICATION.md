# FirmOS API & Permission Specification v1.0

## Authorization Model

```text
User → Membership → Firm → Role → Permission → Scope → Resource
```

Permissions are action-oriented. Scope determines where an allowed action applies.

## Initial Permission Families

Stored keys are dotted and action-oriented (`clients.edit`). Spec names remain
SCREAMING_SNAKE for documentation. Authorization decisions use the stored key
only. Permission **keys** are a global catalog; firms compose them into roles.

### Firm (governance)
- `firm.view`
- `firm.manage`

### Clients
- CLIENT_VIEW → `clients.view`
- CLIENT_CREATE → `clients.create`
- CLIENT_EDIT → `clients.edit`
- CLIENT_ARCHIVE → `clients.archive`

### Services
- SERVICE_VIEW → `services.view`
- SERVICE_CREATE → `services.create`
- SERVICE_EDIT → `services.edit`

### Work
- WORK_VIEW → `work.view`
- WORK_CREATE → `work.create`
- WORK_ASSIGN → `work.assign`
- WORK_UPDATE → `work.update`
- WORK_REVIEW → `work.review`
- WORK_COMPLETE → `work.complete`

### Finance
- FINANCE_VIEW → `finance.view`
- INVOICE_CREATE → `invoices.create`
- PAYMENT_CREATE → `payments.create`
- PAYMENT_CORRECT → `payments.correct`

### Reports
- REPORT_VIEW → `reports.view`
- REPORT_GENERATE → `reports.generate`
- `reports.export` (spec additive)

### Users / Governance
- USER_VIEW → `users.view`
- USER_CREATE → `users.create`
- USER_EDIT → `users.edit`
- USER_DISABLE → `users.disable`
- `roles.view`
- `roles.manage`
- `audit.view`

### Operations
- BACKUP_CREATE → `backup.create`
- BACKUP_RESTORE → `backup.restore`

## API Rules
- Authentication is required for protected endpoints.
- Tenant context is derived from authenticated membership, not trusted client input.
- Authorization is enforced server-side for every protected action.
- Input is validated at API boundaries.
- Errors returned to users are sanitized and receive a reference ID where appropriate.
- Financial mutations use transactions and preserve audit information.

## Default Governance
The firm Admin role receives broad firm-management permissions by default. Additional roles receive only explicitly granted capabilities. Developer/IT permissions are separate from normal firm administration.
