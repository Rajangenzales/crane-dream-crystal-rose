# FirmOS Application & Domain Audit v1.0

Status: In Progress  
Branch: `firmos-foundation`

## Purpose

Compare the current repository implementation with the approved FirmOS specifications before changing the core application domain.

## Current repository baseline

The repository is a React 19 / TanStack Start application with TypeScript, Kysely, PostgreSQL (`pg`), PGLite, Better Auth, Zod, Vitest/Node tests, Playwright, Vite and Nitro. The existing package scripts include development, production build, database migration, typecheck, authentication invariant checks, tests and linting.

## Confirmed implementation observations

### Platform / runtime
- The old `.grok/app-env.json` runtime dependency has been removed from the active environment path.
- A provider-neutral FirmOS PWA boundary and implementation are now active.
- The production build currently succeeds in Codespaces.
- The current development environment can fall back to PGLite when `DATABASE_URL` is absent.
- Production database migration is currently represented by the existing `db:migrate` path and must be reviewed during database migration planning.

### Existing technical capabilities
- Better Auth is present as an authentication dependency.
- Kysely is present as the SQL/query layer.
- PostgreSQL support is present through `pg`.
- PGLite is present as a development/local fallback.
- Existing automated tests cover authentication, app-data, backup/restore, validation, security headers and provisioning among other areas.

## Initial FirmOS comparison

| Area | Existing evidence | FirmOS target | Initial decision |
|---|---|---|---|
| Authentication | Better Auth + auth tests | Tenant-aware identity and secure login | Refactor / verify |
| Firm / Tenant | Requires deeper code audit | Firm is tenant boundary | Inspect and implement |
| Users | Existing auth/provisioning capability | Admin-created users with explicit access | Refactor |
| Roles / Permissions | Existing auth foundation; detailed RBAC requires audit | RBAC + granular permissions | Design and implement |
| Clients | Existing application capability must be mapped from source | Client CRUD connected to firm, work and payments | Audit then refactor |
| Services | Existing application capability must be mapped from source | Firm-defined services | Audit then refactor |
| Responsibility / Work | Existing application capability must be mapped from source | Admin assigns responsibility, visibility and status | Audit then refactor |
| Payments | Existing backup/app-data capability exists; financial model requires source audit | Separate, exact financial domain | High-priority audit |
| Reports | Existing reporting capability must be mapped | Admin-only generation | Audit then refactor |
| Backup / Restore | Existing backup and restore tests are present | Local desktop/laptop + cloud backup and planned restoration | Preserve useful foundation, refactor architecture |
| Error logging | Security/error foundations exist; full developer logging requires audit | Developer IT/admin error visibility | Design and implement |
| AI connectors | No FirmOS connector architecture established yet | Provider-neutral connector/pipeline layer | Future architecture boundary |
| PWA | Legacy platform coupling replaced | Provider-neutral web application | Completed |

## Audit rules

1. Do not rewrite a working module until its current behavior is understood.
2. Compare implementation against the FirmOS specifications, not against assumptions.
3. Preserve useful existing tests and behavior where compatible.
4. Separate tenant isolation, authorization and financial integrity concerns from UI concerns.
5. Treat payments as a separate high-integrity domain.
6. Keep AI and external integrations behind provider-neutral interfaces.
7. Every material migration step must preserve or intentionally update the test baseline.

## Next inspection set

1. Authentication/session implementation and provisioning.
2. Database connection, schema/migrations and query modules.
3. Existing app-data/domain modules.
4. Client/service/work/report/payment implementations.
5. Server/API routes and authorization boundaries.
6. Backup/restore implementation.
7. Error handling and logging.
8. Existing UI routes and screen-to-domain relationships.

## Exit condition for Phase 0.3.1

The audit is complete when each existing domain capability is mapped to a concrete source location, its current behavior is recorded, and a KEEP / REFACTOR / REPLACE / REMOVE decision is supported by repository evidence.
