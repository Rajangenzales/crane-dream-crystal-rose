# FirmOS Platform Dependency Audit v1.0

## Purpose

Identify platform-specific assumptions in the current repository before FirmOS implementation begins. This document records findings only. Phase 0.2 does not remove working behavior yet.

## Current status

Baseline on `firmos-foundation` is green according to the development workflow: dependency installation, typecheck, lint, tests, and build have passed.

## Findings

### 1. Grok workspace metadata

**Status: REPLACE / REMOVE LATER**

The repository contains a `.grok/` workspace tree with app environment data, preview logs, references, skills, and authentication guidance. `.grok/app-env.json` currently carries `VITE_AUTH_ENABLED` and a deployment database flag.

The current `scripts/with-app-env.mjs` explicitly reads `.grok/app-env.json` and merges its `VITE_` values into the process environment.

**Target:** replace this with normal repository/environment configuration. `.grok/` must not remain a runtime requirement for FirmOS.

### 2. Grok PWA / platform chrome

**Status: REPLACE**

`vite.config.ts` imports `scripts/grok-pwa-plugin.mjs`. The plugin provides Grok-specific PWA behavior, a Grok virtual OG identity, and platform-specific document/manifest handling.

The deployed Nitro middleware `server/middleware/grok-pwa.ts` also depends on `virtual:grok-og-identity` and Grok-named manifest routes.

**Target:** create a provider-neutral FirmOS PWA/metadata layer if these capabilities are still required. Do not carry Grok naming or runtime contracts into FirmOS.

### 3. Grok external script / OG service

**Status: REPLACE**

`scripts/grok-pwa-shared.mjs` contains explicit Grok platform identifiers, including a Grok extensions script URL and a default `og.grok.me` service URL.

**Target:** remove platform-specific external services from the core application. Any future metadata/share-card provider should be configured through a provider-neutral adapter or environment setting.

### 4. Vercel deployment assumptions

**Status: ISOLATE**

The current deployment guidance and Vite configuration target Vercel/Nitro. This is useful for the current deployment path, but FirmOS requirements call for deployment flexibility.

**Target:** retain a deployment adapter/configuration that works for the initial host, while keeping domain logic independent of Vercel.

### 5. Authentication environment contract

**Status: REFACTOR**

The current environment wrapper is designed around a single `VITE_AUTH_ENABLED` flag and platform-provided behavior. FirmOS will require proper tenant-aware identity, memberships, roles, permissions, and server-side authorization.

**Target:** authentication configuration becomes application-level configuration; authorization becomes a server-side FirmOS concern rather than a platform flag.

### 6. Development-only environment endpoint

**Status: REVIEW / KEEP IF SAFE**

`scripts/app-env-plugin.mjs` exposes `/__app-env` only during Vite serve mode and is used by the current auth invariant check.

**Target:** retain only if it remains necessary and exposes no sensitive configuration. Rework it when the environment contract is replaced.

## Migration rules

1. Do not delete `.grok/` or Grok runtime files until their consumers have been mapped.
2. Do not change `vite.config.ts` merely to remove names before replacement behavior exists.
3. Preserve the green baseline after each migration step.
4. No FirmOS domain/database redesign is part of this audit.
5. No production deployment change is part of this audit.
6. Every removed platform capability must have an explicit replacement, or be documented as intentionally retired.

## Phase 0.2 sequence

1. Map all `.grok/` consumers.
2. Map Grok-specific imports and runtime routes.
3. Identify platform environment variables.
4. Separate deployment concerns from application concerns.
5. Define provider-neutral replacements.
6. Implement one replacement at a time.
7. Remove obsolete platform code only after tests pass.
8. Re-run the complete baseline validation.

## Exit criteria

Phase 0.2 is complete when the application can run and build without requiring Grok-specific workspace files or Grok-specific runtime services, while preserving required PWA, authentication, metadata, and deployment behavior through provider-neutral implementations.
