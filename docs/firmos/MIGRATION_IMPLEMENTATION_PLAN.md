# FirmOS Repository Migration & Implementation Plan v1.0

## Migration Principle
Preserve → Isolate → Refactor → Replace → Extend.

The existing application and green test baseline are protected. Migration is incremental and reversible.

## Phases
0. Freeze/baseline and establish development contract.
1. Platform cleanup and isolation of Grok-specific assumptions.
2. Identity and tenancy.
3. RBAC and permissions.
4. Clients and services.
5. Work, responsibility and workflow.
6. Finance.
7. Reports and documents.
8. Backup, IT diagnostics and notifications.
9. AI gateway and integrations.
10. Security hardening and release.

## Current Phase
Phase 0.1: repository documentation and AI development contract.

## Next Phase
Phase 0.2: inspect and isolate Grok/platform-specific dependencies without changing the core domain prematurely.

## Migration Order
1. Baseline repository.
2. Remove/isolate platform coupling.
3. Normalize configuration.
4. Establish FirmOS naming and documentation.
5. Tenant model.
6. Membership model.
7. RBAC.
8. Permission enforcement.
9. Client/service refactor.
10. Work and assignment.
11. Workflow and audit history.
12. Finance.
13. Reports/documents.
14. Backup and diagnostics.
15. AI/integrations.
16. Security and production hardening.

## Change Rule
Each phase must leave the application in a testable state. Do not combine unrelated domain migrations into one uncontrolled change.
