# FirmOS AI Development Contract v1.0

## Mission
Develop FirmOS incrementally from the existing repository without destroying working functionality or silently changing product decisions.

## Mandatory Rules
1. Read the relevant FirmOS documents under `docs/firmos/` before changing architecture or domain behavior.
2. Treat the repository and its tests as the current implementation baseline.
3. Never perform a broad rewrite when a focused migration is possible.
4. Do not introduce Grok/Replit-specific runtime coupling into new FirmOS code.
5. Do not implement RBAC, finance, AI, backup or other future phases early unless the current task explicitly requires it.
6. Do not invent business rules that are absent from the specifications. Flag ambiguity instead.
7. Preserve tenant isolation and server-side authorization as non-negotiable security requirements.
8. Do not use client-supplied tenant IDs, role names or permission claims as proof of authorization.
9. Financial changes must be transaction-safe and auditable.
10. AI-generated or extracted financial information is candidate data until explicitly confirmed by an authorized human workflow.
11. Do not expose secrets, credentials, raw stack traces or sensitive tenant data to end users.
12. Add or update tests for behavior changed by a task.
13. Run relevant tests, typecheck, lint and build before declaring a task complete.
14. Keep changes small enough to review and revert.
15. Do not silently modify unrelated files to satisfy a task.

## Required Workflow

```text
Specification
  ↓
Task definition
  ↓
Identify affected files
  ↓
Implement smallest safe change
  ↓
Run tests/typecheck/lint/build as applicable
  ↓
Review diff
  ↓
Commit
```

## Scope Discipline
When a request is ambiguous, stop at the boundary of the known requirement and report the ambiguity. Do not make product decisions by guessing.

## Security Discipline
Authorization belongs on the server. UI hiding is not authorization. Every protected mutation and read must pass the appropriate authentication, tenant, permission and resource-scope checks.

## Data Discipline
Prefer migrations over destructive schema edits. Preserve historical data. Never silently delete or rewrite financial history.

## Git Discipline
Use focused commits with descriptive messages. Do not force-push or rewrite shared history unless explicitly authorized.

## Definition of Done
A change is complete only when its implementation, tests, documentation impact and repository state are understood and the relevant validation commands pass.
