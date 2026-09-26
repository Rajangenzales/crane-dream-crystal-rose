# FirmOS System Architecture v1.0

## Architectural Layers

```text
Responsive Web UI
      ↓
Application / API Layer
      ↓
Authorization + Tenant Context
      ↓
Domain Services
      ↓
Persistence Layer
      ↓
PostgreSQL / supported storage
```

Cross-cutting services:
- Authentication/session management
- Audit logging
- Error handling and diagnostics
- Notifications
- Backup/restore
- File/object storage
- AI gateway
- External integrations

## Deployment Principle
The application must not depend on Replit, Grok or another development platform. The codebase should remain deployable to suitable hosted or self-managed infrastructure.

## AI Gateway
Features call an internal AI interface rather than provider SDKs directly. Provider adapters can be added later without coupling domain code to a specific AI vendor.

## Integration Layer
Email, messaging, storage and other external APIs are accessed through replaceable integration adapters.

## Security Boundary
Every protected request resolves current user, firm membership, role/permission and resource scope before returning or mutating tenant data.

## Developer / IT Boundary
Firm administrators manage their firm's business operations. Developer/IT administration is separately protected and may access system diagnostics, infrastructure-level error information and deployment health as appropriate.
