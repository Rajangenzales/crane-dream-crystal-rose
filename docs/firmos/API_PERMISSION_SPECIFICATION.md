# FirmOS API & Permission Specification v1.0

## Authorization Model

```text
User → Membership → Firm → Role → Permission → Scope → Resource
```

Permissions are action-oriented. Scope determines where an allowed action applies.

## Initial Permission Families

### Clients
- CLIENT_VIEW
- CLIENT_CREATE
- CLIENT_EDIT
- CLIENT_ARCHIVE

### Services
- SERVICE_VIEW
- SERVICE_CREATE
- SERVICE_EDIT

### Work
- WORK_VIEW
- WORK_CREATE
- WORK_ASSIGN
- WORK_UPDATE
- WORK_REVIEW
- WORK_COMPLETE

### Finance
- FINANCE_VIEW
- INVOICE_CREATE
- PAYMENT_CREATE
- PAYMENT_CORRECT

### Reports
- REPORT_VIEW
- REPORT_GENERATE

### Users / Governance
- USER_VIEW
- USER_CREATE
- USER_EDIT
- USER_DISABLE

### Operations
- BACKUP_CREATE
- BACKUP_RESTORE

## API Rules
- Authentication is required for protected endpoints.
- Tenant context is derived from authenticated membership, not trusted client input.
- Authorization is enforced server-side for every protected action.
- Input is validated at API boundaries.
- Errors returned to users are sanitized and receive a reference ID where appropriate.
- Financial mutations use transactions and preserve audit information.

## Default Governance
The firm Admin role receives broad firm-management permissions by default. Additional roles receive only explicitly granted capabilities. Developer/IT permissions are separate from normal firm administration.
