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
- A client-supplied firm id is only a hint: the server resolves an active membership for the authenticated user in that firm, or denies. If no firm id is supplied, resolution succeeds only when the user has exactly one active membership in an active firm.
- Permission sets come from stored role assignments. Clients cannot submit permissions, roles, membership status, or an owner user id.
- Authorization is enforced server-side for every protected action.
- Input is validated at API boundaries.
- Errors returned to users are sanitized and receive a reference ID where appropriate. FirmOS authorization denials use `FirmOSAuthorizationError`: the public payload is only `publicMessage` plus `referenceId`. Permission keys and deny reasons stay in `error_events.internal_detail` for server tracing.
- FirmOS bootstrap writes `audit_events` (tenant-scoped, same transaction as firm creation). Monthly `audit_logs` is unchanged and remains the existing `listAudit` source.
- Financial mutations use transactions and preserve audit information.

## V1 Resource Authorization

Protected actions use the server-side contract:

```text
authorize(context, permission, resource)
```

`context` is the membership-resolved `AuthorizationContext`. `permission` is a canonical stored key from the catalog above. `resource` is a server-resolved `ProtectedResource` whose `firmId` comes from stored tenant rows, never from untrusted client scope data.

Authorization fails closed. Unknown permission keys, missing permission grants, inactive membership, inactive firm, and missing `resource.firmId` are denials.

### V1 scope matrix

Scope is computed on the server from membership and resource fields. There is no `scopes` table in V1. A client-supplied scope is never proof of authorization.

Resolved contexts default to `{ kind: "firm" }`. `assigned_work` and `client` are valid `authorize()` inputs so later work/client modules reuse this contract. They are not assigned to Member roles until the underlying resource model exists.

| Context `scope.kind` | Resource | Rule |
|---|---|---|
| `firm` | any | allow iff `resource.firmId === context.firmId` and the canonical permission is present |
| `assigned_work` | `type === "work"` | allow iff tenant match **and** `context.membershipId` is in `assigneeMembershipIds` |
| `assigned_work` | `type === "firm"` | allow iff tenant match **and** permission is `firm.view` |
| `assigned_work` | any other type | deny (`scope_mismatch`) |
| `client` | resource with `clientId` | allow iff tenant match **and** `resource.clientId` is in `context.scope.clientIds` |
| any | missing `resource.firmId` | deny (`tenant_mismatch`) |

`assigned_work` may not use `users.*`, finance, or backup against firm resources. Firm-governance access under `assigned_work` is `firm.view` only.

Permission present plus a different `resource.firmId` is always `tenant_mismatch`. Scope cannot override resource firm identity.

## Default Governance
The firm Admin role receives broad firm-management permissions by default. Additional roles receive only explicitly granted capabilities. Developer/IT permissions are separate from normal firm administration.
