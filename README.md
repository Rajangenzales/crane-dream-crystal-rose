# Monthly

**A client-work operating system for the Genzales studio.**

Log what happened for a client this month once. Reports, summaries, and payments come from that record — not from a separate spreadsheet.

- **Studio:** Genzales
- **Tagline:** Work first. Reports follow.
- **Default currency:** INR
- **Live code:** [github.com/Rajangenzales/crane-dream-crystal-rose](https://github.com/Rajangenzales/crane-dream-crystal-rose) (private)
- **Stack:** TanStack Start, React 19, Postgres (Neon in production, embedded PGLite in preview), Better Auth

The chat preview is a sandbox. For real studio use, **Publish** in Grok Build (hosted URL on `grok.me`) or run the app on your own server.

---

## What it is

Monthly is an internal tool for an agency that sells retainers and project work (websites, SEO, ads, social, design, video).

The unit of work is **one client × one calendar month**:

1. Assign services to the client.
2. Record activities under those services (date, quantity, status).
3. Record payment status for that month.
4. Print a client report, a studio monthly summary, or a founder summary.

Admins run the studio. Viewers can see work (and optionally payment amounts) after an admin activates them.

---

## What is completed

### Product

| Area | Status |
|---|---|
| Sign-in (Google, X, email/password) | Done |
| First signed-in user becomes the only bootstrap admin | Done |
| Later users are viewers until an admin activates them | Done |
| Home dashboard for the selected month | Done |
| Client directory (create, archive, contact details) | Done |
| Service library (seeded with Genzales services; global + per-client) | Done |
| Client workspace: overview, monthly work, services, payments, reports | Done |
| Activities with status, quantity, unit | Done |
| Duplicate a month’s structure into another month | Done |
| Payments (pending / received / n/a) | Done |
| Viewer payment-amount redaction (studio setting) | Done |
| Printable reports: client, combined, monthly summary, founder summary | Done |
| User management (role + active flag, create email users) | Done |
| Studio settings (name, tagline, currency, payment visibility) | Done |
| JSON backup / restore with safety copy | Done |
| Audit log | Done |

Seeded services include Website Development, Maintenance, SEO, AEO/GEO, Google Ads, Meta Ads, Social, Creative, Posters, Video, Motion, Logo, Brand Identity, Packaging, Photography, Content, Landing Page, and more.

Activity statuses: Planned, In Progress, Ongoing, Delivered, Completed, Not Applicable.

### Security and QA (audit, Sep 2026)

Closed in [PR #1](https://github.com/Rajangenzales/crane-dream-crystal-rose/pull/1):

| ID | Finding | Fix |
|---|---|---|
| SEC-01 | Backup restore interpolated column names | Allow-listed tables/columns; unknown keys rejected |
| SEC-02 | First-admin race | Singleton `app_bootstrap` row inside a transaction |
| SEC-03 | Auth flag missing | `VITE_AUTH_ENABLED=true` explicit; fail closed if DB is set with auth off |
| SEC-04 | Missing security headers | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy |
| SEC-05 | Identity-only input checks | Zod validators (length, enum, date, email, size) |
| SEC-06 | Non-atomic restore | Validate first, then delete+insert in one transaction; rollback on failure |
| QA-01 / QA-02 | Failing tests, no CI | 273 tests passing; CI runs typecheck, lint, test, build |
| UX-01 | Stuck “Loading workspace…” | 12s timeout with Retry |

### Hosting as designed

- **Grok Build Publish** → public (or link-only) URL on `*.grok.me`, Neon Postgres, Google/X via Grok’s auth broker.
- Preview in Grok chat is temporary (in-memory DB; wiped on restart).

---

## How to use it (studio)

1. Sign in. The **first** account is admin.
2. **Settings** — agency name, currency.
3. **Services** — confirm or add the catalog.
4. **Clients → New client** — then assign services.
5. Open the client, pick the month, log work under **Monthly work**.
6. Record **Payments** for that month.
7. **Reports** → open a document → Print / Save as PDF.
8. **Users** — add teammates, set admin/viewer, turn Active on.

Viewers who sign in before activation see “Waiting for activation.”

Email/password can **sign in** existing accounts. New email accounts are created by an admin under **Users** (there is no public self-sign-up).

---

## What the Git repository contains

Repository: `Rajangenzales/crane-dream-crystal-rose`

```
.github/workflows/ci.yml    CI: npm ci → typecheck → lint → test → build
.grok/app-env.json          Auth ON + deploy.database true
migrations/
  0001_auth.sql             Better Auth tables
  0002_monthly.sql          Studio schema + service seed + default settings
  0003_bootstrap.sql        First-admin singleton
src/routes/
  login.tsx                 Sign-in
  _app/                     Home, clients, reports, payments, services, users, settings
  print.tsx                 Printable documents
src/lib/
  api.ts                    Server functions (auth-gated)
  backup.ts                 Allow-listed dump/restore
  provision.ts              Atomic first-admin
  validation.ts             Zod input schemas
  security-headers.ts       Shared header policy
  auth/                     Better Auth (Google, X, email/password)
server/middleware/          PWA + security headers on deploy
scripts/                    Env wrapper, migrate, smoke, auth invariant
```

**Not in the repo (and should not be):** `.env` files, database passwords, session secrets.

Default studio settings in the database: agency **Genzales**, currency **INR**, viewers can see payment amounts until you turn that off.

---

## Deploy

### A. Grok (intended)

1. In this Grok Build project, click **Publish**.
2. Choose access (only you / anyone with the link / public).
3. Open the `https://….grok.me` URL on any computer.
4. Sign in with Google or X. First login = admin.

Publish again after merging product changes so production matches `main`.

### B. Your own server (not Grok-hosted)

This app is a **Node 22 + Postgres** website. It is not a desktop installer and not GitHub Pages.

You need:

- Linux server (VPS or office Linux box)
- Node.js 22
- Postgres (local or Neon)
- HTTPS domain (e.g. `monthly.yourstudio.com`)

Environment on the server (never commit):

```
VITE_AUTH_ENABLED=true
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/monthly
BETTER_AUTH_URL=https://monthly.yourstudio.com
BETTER_AUTH_SECRET=<long random secret>
```

Then `npm ci && npm run build` and keep the process running (systemd, pm2, or Docker) behind HTTPS.

**Limits today**

- The production build target in this repo is **Vercel / Grok Publish**, not a raw VPS binary. Self-host still needs a Node-server or Docker packaging step.
- Google / X through Grok’s broker **do not** follow the app onto your server.
- There is no public email sign-up, so the first admin cannot create themselves with email only.

---

## Future (not built yet)

Suggested in priority order for real studio use:

1. **Self-host pack** — Docker Compose + Node-server build + documented env.
2. **First-admin email sign-up** — only while no admin exists, so a private server can bootstrap without Google/X.
3. **Custom domain** on the Grok-published app (studio URL instead of `grok.me`).
4. **Invite links / email invites** so staff don’t wait on a manual Users form.
5. **Client-facing portal** (read-only monthly report link for the client).
6. **GST / invoice export** from payment records.
7. **Reminders** — unpaid months, missing work for active clients.
8. **Richer report layout** — studio letterhead, sign-off, attachments.
9. **Soft locks** — freeze a month once the client report is sent.
10. **Share-card / brand image** — optional; this is an internal admin tool so the placeholder card is acceptable.

Out of scope unless requested: native mobile apps, WhatsApp bots, public marketing site, GitHub Pages hosting.

---

## Roles

| Role | Can |
|---|---|
| **Admin** | Everything: clients, services, users, settings, backups, restore |
| **Viewer** (active) | View work; payments only if the studio setting allows |
| **Viewer** (inactive) | Sign in, then wait on the activation screen |

---

## Development notes

```bash
npm ci
npm run dev          # wrapped so VITE_AUTH_ENABLED matches app-env
npm test             # platform script tests + app tests
npm run typecheck
npm run lint
npm run build        # Vite/Nitro Vercel output; migrates if DATABASE_URL is set
```

Node 22. Do not start Vite directly — always `npm run dev` / `build` so `.grok/app-env.json` is applied.

---

## License

Private studio software for Genzales. Not published as an open-source product.
