# Monthly Report App
## Product Requirements Document (PRD)

**Version:** 2.0  
**Status:** Product direction / architecture baseline  
**Date:** September 2026  
**Repository:** `Rajangenzales/monthly-report`

---

## 1. Product Overview

The Monthly Report App is a responsive web application for managing client work throughout the month and turning that underlying work data into polished monthly reports.

The application is **not primarily a report-generation form**.

> **Core principle: Work is entered and managed once in the client workspace. Reports are generated from that data.**

The system is intended for an agency-like business delivering services such as website development, website maintenance, SEO, AEO/GEO, Google Ads, Meta Ads, social media, creative design, posters, animated posters, video production, motion graphics, logo design, brand identity, board design, packaging design, product photography, content creation, landing pages, and future services.

The product should evolve from the current V3 prototype into a proper production-oriented web application with:

- Polished responsive UI
- Client-centric work management
- Monthly service/section workspaces
- Activities recorded under each monthly section
- Independent payment management
- Individual client reports
- Combined reports
- Overall monthly summaries
- Founder-oriented monthly summaries
- Role-based administration
- Strong data integrity and historical preservation
- Automatic and manual backups
- Local SQLite support
- PostgreSQL-ready server architecture
- GitHub as the source of truth
- Maintainable, modular architecture for future expansion

---

## 2. Product Vision

The application should become a lightweight **client work-management and reporting operating system**.

A user should be able to:

1. Create and manage clients.
2. Assign services to each client.
3. Open a client.
4. Select or create a monthly work period.
5. Manage each service/section for that month.
6. Record activities directly under the section.
7. Record quantities, units, descriptions, notes, and completion status.
8. Record payments independently.
9. View the month's complete picture.
10. Generate a report for that client.
11. Generate a combined report for selected clients.
12. Generate an overall monthly summary.
13. Generate a founder-oriented summary.

The system must avoid forcing the user to re-enter information merely because they want a report.

---

## 3. Core Product Principle

### Data first, reports second

The fundamental hierarchy is:

```text
Client
  ↓
Client Services
  ↓
Monthly Work Period
  ↓
Monthly Sections
  ↓
Activities
```

Payments exist as independent client/monthly business data.

Reports are generated from these records.

```text
WORK DATA
   ↓
Monthly Summary
   ↓
Individual Client Report
   ↓
Combined Report
   ↓
Founder Summary
```

---

## 4. Target Users

### 4.1 Admin

Administrators can:

- Create, edit, deactivate, and manage clients
- Manage Client Services
- Manage the Service Library
- Add custom services
- Promote client-specific services to the global Service Library
- Create/edit/delete/reorder monthly sections
- Create/edit/delete/reorder activities
- Manage payments
- Generate reports
- Generate combined reports
- View monthly summaries
- Manage users
- Assign roles
- Activate/deactivate users
- Manage backups
- Restore backups
- Manage system settings
- Review audit history

### 4.2 Viewer

Viewers can:

- View clients
- View services
- View monthly work
- View activities
- View payments according to configured permissions
- View reports
- Download reports

Viewers cannot modify or delete protected business data.

Permissions must be enforced server-side, not only through UI visibility.

### 4.3 Future Roles

The architecture should allow future roles without redesigning authentication.

Potential future roles:

- Manager
- Staff
- Accountant
- Report Editor
- Read-only Founder

These are future considerations, not mandatory V1 functionality.

---

## 5. Core Domain Model

The system must distinguish between the following concepts.

### 5.1 Service Library

The global catalogue of services offered by the business.

Initial catalogue includes:

- Website Development
- Website Maintenance
- SEO
- AEO / GEO
- Google Ads
- Meta Ads
- Ad Campaigns
- Social Media
- Creative Design
- Posters
- Animated Posters
- Video Production
- Motion Graphics
- Logo Design
- Brand Identity
- Board Design
- Packaging Design
- Product Photography
- Content Creation
- Landing Page

A service can be active or inactive.

Inactive services remain available for historical records.

### 5.2 Client Services

Services assigned to a specific client.

Example:

```text
Client A

✓ SEO
✓ Google Ads
✓ Creative Design
✓ Video Production
```

Removing a service from a client must not destroy historical monthly work.

### 5.3 Monthly Sections

The actual work areas used for a specific client/month.

Example:

```text
Client A
September 2026

SEO
Google Ads
Creative Design
```

A monthly section may originate from a Client Service, but the historical section must survive later changes to Client Services.

Users must also be able to create manual/custom monthly sections.

### 5.4 Activities

Activities represent actual work performed.

Activities belong under a monthly section.

Example:

```text
September 2026
  ↓
SEO
  ↓
12 Sep
On-page optimisation
12
Pages
Completed
```

Activities are created and managed as work data, not during report generation.

---

## 6. Activity Requirements

Every monthly section must provide an activity-management area.

Each activity supports:

- Activity date
- Title
- Description
- Quantity
- Unit
- Status
- Notes
- Sort order
- Created timestamp
- Updated timestamp

### Quantity

Quantity is optional because not every activity is measurable.

Examples:

- 10 Creatives
- 3 Videos
- 5 Pages
- 2 Campaigns
- 4 Articles
- 1 Logo
- 8 Boards
- 12 Hours
- 1 Project

### Units

Initial units:

- Creatives
- Posters
- Videos
- Animations
- Pages
- Campaigns
- Articles
- Logos
- Boards
- Hours
- Tasks
- Projects
- Custom

The architecture should allow future units without major code changes.

### Statuses

Initial statuses:

- Planned
- In Progress
- Ongoing
- Delivered
- Completed
- Not Applicable

The status model should be maintainable and extensible.

### Activity Ordering

Activities should support manual ordering and date-based ordering.

---

## 7. Monthly Work Workspace

The primary working interface for a client/month should resemble:

```text
Client A
September 2026

[Overview]

Services / Sections

┌──────────────────────────────────────────┐
│ SEO                                      │
│ 5 activities                             │
│ 5 completed                              │
│                                          │
│ + Add Activity                           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Creative Design                          │
│ 16 creatives                             │
│ 16 delivered                             │
│                                          │
│ + Add Activity                           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Google Ads                               │
│ 2 campaigns                              │
│ 1 completed, 1 ongoing                   │
│                                          │
│ + Add Activity                           │
└──────────────────────────────────────────┘

[Payments]

[Generate Client Report]
```

Activities must be accessible immediately within every section.

The user should not have to navigate to a separate report-generation page to enter work.

---

## 8. Client Management

Each client has a dedicated workspace.

Client information supports:

- Client name
- Company name
- Contact person
- Email
- Phone
- Notes
- Active/inactive state
- Created timestamp
- Updated timestamp

The client workspace exposes:

- Overview
- Services
- Monthly Work
- Payments
- Reports
- History

Future extensions may include:

- Multiple contact persons
- Addresses
- Billing details
- Tax information
- Client attachments
- Client-specific report preferences

---

## 9. Custom Services

The system supports client-specific custom services.

When adding a service:

1. Search the existing Service Library.
2. If a matching service exists, use the existing service.
3. If it does not exist, allow:
   - Client-only custom service
   - Add permanently to Service Library

If permanently added:

- It becomes available to other clients.
- Existing client assignment remains intact.
- Duplicate global services must be prevented.

Historical records remain intact if the service is later renamed or deactivated.

---

## 10. Monthly Periods

The application treats a month as a meaningful business period.

A monthly period identifies:

- Client
- Month
- Year
- Title/display name
- Optional status
- Created timestamp
- Updated timestamp

Uniqueness should normally prevent duplicate monthly periods for the same client.

Example:

```text
Client A
September 2026
```

### Monthly Duplication

Users can duplicate a previous month's structure.

Example:

```text
Duplicate August 2026 → September 2026
```

Default behavior:

- Copy selected services/sections
- Copy section ordering
- Optionally copy reusable structure
- Do not blindly copy historical activity dates into the new month
- Do not duplicate payment records as received payments
- Allow future recurring-activity templates

Historical data remains untouched.

---

## 11. Payments

Payments are managed independently from report generation.

Payment data is associated with a client and relevant monthly period.

Initial fields:

- Month/period
- Payment status
- Amount
- Payment date
- Notes

Initial statuses:

- Not Applicable
- Pending
- Received

Future fields:

- Invoice number
- Payment method
- Currency
- Reference number
- Attachment
- Due date

Payment records must not be destroyed when a report is regenerated.

---

## 12. Monthly Summary

The application provides a monthly summary across clients.

Example:

```text
September 2026

Clients Served: 24
Total Activities: 486

Completed: 431
Delivered: 23
In Progress: 32

Payments Received: ₹X
Payments Pending: ₹Y
```

Client-level summary:

| Client | Work Done | Total Work |
|---|---|---:|
| Client A | Website, SEO, 14 creatives | 18 activities |
| Client B | Google Ads, 8 creatives | 11 activities |
| Client C | Social Media, 12 posts, 3 videos | 17 activities |

The summary supports drill-down into individual clients.

---

## 13. Founder Monthly Summary

A founder-oriented summary provides a high-level operational view.

Potential metrics:

- Active clients
- Clients with work this month
- Total activities
- Completed activities
- Delivered activities
- In-progress activities
- Work quantities by unit
- Service distribution
- Payments received
- Payments pending
- Clients with no recorded work
- Clients with outstanding payments

The founder summary should be concise enough for rapid review.

---

## 14. Individual Client Reports

The system generates a separate report for each customer.

Example:

```text
September 2026
Client A

Services Worked On

SEO
  • Keyword research
  • On-page optimisation
  • Content optimisation

Creative Design
  • 10 social creatives
  • 4 campaign creatives

Google Ads
  • Campaign setup
  • Optimisation

Payment
  Status: Received
```

The report is generated from stored data.

PDF export is required.

---

## 15. Combined Reports

Users can select multiple clients and create one combined report.

Example:

```text
September 2026

☑ Client A
☑ Client B
☐ Client C
☑ Client D
```

The generated PDF contains the selected clients' reports in a consistent format.

---

## 16. Report Generation

Report generation is a presentation/export layer.

It reads:

- Client information
- Monthly sections
- Activities
- Quantities
- Units
- Statuses
- Payment information
- Optional notes

Report generation must never become the primary data-entry mechanism.

Reports must be reproducible from stored data.

---

## 17. Target Database Architecture

The target relational database should conceptually contain:

```text
users
clients
service_library
client_services

report_periods
report_sections
activities

payments

reports
report_exports

audit_logs
attachments
settings
backups
```

Exact physical table names may be adjusted during architecture review, but the domain separation must remain.

### Relationship model

```text
CLIENT
  │
  ├── CLIENT_SERVICES
  │       │
  │       └── SERVICE_LIBRARY
  │
  ├── REPORT_PERIODS
  │       │
  │       ├── REPORT_SECTIONS
  │       │       │
  │       │       └── ACTIVITIES
  │       │
  │       └── PAYMENTS
  │
  └── REPORTS / REPORT_EXPORTS
```

### Historical Preservation

Historical monthly data must not be destroyed merely because:

- A service is renamed
- A client service is removed
- A service becomes inactive
- A client changes services
- A client becomes inactive

Soft deletion or archival should be preferred for important business entities.

---

## 18. SQLite and PostgreSQL

The system must support a local-first deployment using SQLite while remaining PostgreSQL-ready.

### Local

```text
Web App
   ↓
SQLite
```

### Server

```text
Web App
   ↓
PostgreSQL
```

Use a proper database abstraction/data-access layer.

Avoid SQLite-specific application logic where practical.

The target architecture should allow PostgreSQL adoption without rewriting business logic.

---

## 19. Backend Architecture

The existing Flask foundation may be retained but should be modularized appropriately.

Recommended domains:

```text
Application
│
├── Authentication
├── Clients
├── Services
├── Monthly Work
├── Activities
├── Payments
├── Reports
├── Summaries
├── Users
├── Backups
├── Audit
└── Settings
```

Business rules should not be buried inside individual HTML routes.

Introduce a service/domain layer where appropriate.

The architecture should allow future API endpoints without rewriting the core domain.

---

## 20. Web/API Architecture

The application should be developed as a proper web application.

Conceptual architecture:

```text
Browser
   ↓
Web UI / API
   ↓
Application Services
   ↓
Repository / Database Layer
   ↓
SQLite / PostgreSQL
```

This enables future:

- Mobile clients
- PWA functionality
- Server deployment
- Integrations
- External reporting
- API consumers

---

## 21. Frontend Architecture and Design

The UI should be redesigned as a polished modern web application.

Design principles:

- Apple-inspired restraint
- Clean typography
- Generous spacing
- Minimal visual noise
- Strong hierarchy
- Subtle borders
- Rounded surfaces
- Consistent controls
- Clear primary actions
- Smooth but restrained transitions
- Responsive layouts
- Excellent mobile experience
- Keyboard accessibility
- Accessible contrast
- Clear empty states
- Clear validation feedback
- Fast interaction

The goal is **not** to copy Apple's proprietary interface. It is to achieve a similarly disciplined level of hierarchy, clarity, and polish.

---

## 22. Suggested Navigation

Primary navigation:

```text
Dashboard
Clients
Reports
Services
Payments
Users
Settings
```

Possible future navigation:

```text
Tasks
Analytics
Templates
Files
Notifications
Integrations
```

---

## 23. Dashboard

Potential dashboard cards:

```text
Active Clients
This Month's Clients
Total Activities
Completed Work
Pending Work
Payments Received
Payments Pending
```

The dashboard must allow navigation into underlying data.

---

## 24. Client Detail Experience

Suggested layout:

```text
Client A
Company Name
Contact information

[Overview] [Services] [Monthly Work] [Payments] [Reports]

September 2026

Work Summary
────────────────────────────

SEO
5 activities · 5 completed

Creative Design
16 creatives · 16 delivered

Google Ads
2 campaigns · 1 ongoing

Payments
₹25,000 · Received

[Generate Report]
```

The client workspace is one of the central screens of the product.

---

## 25. Activity Editing UX

Activities should be easy to add without excessive navigation.

Possible interaction:

```text
+ Add Activity
```

opens a compact modal, drawer, or inline form.

Fields:

```text
Date
Title
Description
Quantity
Unit
Status
Notes
```

Validate on the client for good UX and on the server for security/integrity.

---

## 26. Reports UX

Reports area should allow:

- Select month
- Select client
- Generate individual report
- Select multiple clients
- Generate combined report
- View previous generated reports
- Download PDF

Report generation should be predictable and fast.

---

## 27. User Management

After initial admin setup, administrators must be able to manage users.

Required:

- Create user
- Select role
- Edit user
- Change password
- Activate/deactivate user
- Change role
- Prevent unauthorized privilege escalation
- Enforce permissions server-side

Protected requests should re-check current database state for user activity and role.

Session invalidation should be considered for deactivated users and privilege changes.

---

## 28. Authentication and Security

Security requirements:

- Strong password hashing
- Secure sessions
- CSRF protection
- Secure cookies in production
- Production secret-key management
- Security headers
- Safe error responses
- Server-side authorization
- Input validation
- Output escaping
- Audit logging
- Backup protection
- Protection against unauthorized restore
- Protection against privilege escalation

Production secrets must never be hard-coded.

---

## 29. Audit Log

Maintain an audit trail for important administrative/business actions.

Potential events:

- User created
- User deactivated
- Role changed
- Client created
- Client updated
- Client archived
- Service created
- Service deactivated
- Client service changed
- Monthly period created
- Activity created
- Activity edited
- Activity deleted
- Payment changed
- Backup created
- Backup restored

Audit logs must not expose passwords or secrets.

---

## 30. Backup and Restore

### Automatic backups

Local automatic database backups.

### Manual backup

Admin action:

```text
Backup Now
```

### Restore

Admin action:

```text
Restore Backup
```

Before restore:

1. Validate backup.
2. Create a safety backup of the current database.
3. Restore.
4. Verify database integrity.
5. Record the audit event.

Backups contain business data and must be protected.

Future production deployments should support encrypted backup storage.

---

## 31. Report Export Storage

Generated reports may be stored as export records.

An export should identify:

- Client or combined selection
- Month
- Generation timestamp
- Generated by
- Export format
- File location/reference
- Version/hash if appropriate

Underlying business data remains authoritative.

Immutable report snapshots can be added later if required.

---

## 32. Attachments

Attachments are a future-ready capability.

Potential locations:

- Client
- Activity
- Payment
- Report

The architecture should support an attachment/file-storage abstraction without storing large file blobs directly in core business tables.

---

## 33. Responsive Design

The application must work properly on:

- Desktop
- Laptop
- Tablet
- Mobile phone

Mobile should be deliberately designed rather than simply shrinking the desktop interface.

Important mobile interactions:

- Client selection
- Month selection
- Activity creation
- Activity editing
- Payment updates
- Report generation
- Dashboard review

---

## 34. Accessibility

Target modern accessibility expectations:

- Keyboard navigation
- Visible focus states
- Semantic controls
- Appropriate labels
- Accessible dialogs
- Accessible validation errors
- Sufficient contrast
- Screen-reader-friendly structure
- No functionality dependent solely on hover

---

## 35. Performance

Requirements:

- Proper database indexes
- Pagination where appropriate
- Efficient queries
- Avoid N+1 query patterns
- Lazy loading where appropriate
- Optimized report generation
- Avoid loading all clients/activities into one page unnecessarily

The application should remain responsive as the dataset grows.

---

## 36. Data Integrity

Database constraints should enforce important business rules.

Examples:

- Unique client/month period
- Valid foreign keys
- Controlled status values
- Controlled service relationships
- Valid payment states
- Safe deletion rules
- Transactional multi-record updates where necessary

Application-level and database-level validation should complement each other.

---

## 37. Testing

### Unit tests

- Domain logic
- Validation
- Summary calculations
- Permissions
- Report data preparation

### Integration tests

- Client creation
- Service assignment
- Monthly period creation
- Activity creation/edit/delete
- Payment management
- Report generation
- User management
- Backup/restore

### Security tests

- CSRF
- Authorization
- Role enforcement
- Session invalidation
- Input validation
- Production configuration

### Regression tests

Existing working functionality must remain protected.

---

## 38. GitHub Development Workflow

GitHub is the canonical source of truth.

Repository:

`Rajangenzales/monthly-report`

Preferred workflow:

```text
Requirement / Issue
       ↓
Architecture review
       ↓
Codex implementation
       ↓
Automated tests
       ↓
Manual review
       ↓
Pull Request
       ↓
Review
       ↓
Merge
```

Avoid large uncontrolled changes directly on the main branch.

Important architectural changes should be reviewed before merging.

---

## 39. Development Rules for Codex

Codex should:

- Read this PRD before implementation.
- Inspect the repository before modifying it.
- Preserve existing data.
- Avoid destructive migrations.
- Write explicit migrations.
- Add tests with new functionality.
- Run the test suite after changes.
- Keep changes modular.
- Avoid unnecessary dependencies.
- Avoid hard-coded business logic where configuration/data is more appropriate.
- Keep presentation concerns separate from domain logic.
- Document important architectural decisions.
- Do not commit or push major changes without review when explicitly instructed.

---

## 40. Migration Strategy

The existing V3 application is a working prototype.

Migration should be incremental.

### Phase 0: Architecture Audit

- Inspect current repository
- Map existing schema
- Map routes
- Map templates
- Map authentication
- Identify technical debt
- Produce target architecture
- Produce target database design

### Phase 1: Database Foundation

- Finalize relational schema
- Create migrations
- Preserve existing data
- Add indexes
- Add historical preservation rules
- Establish repository/data-access layer
- Validate SQLite compatibility
- Validate PostgreSQL compatibility

### Phase 2: Client Workspace

Build:

- Client overview
- Services
- Monthly periods
- Monthly sections
- Activities
- Payments

The client workspace becomes the primary work-entry experience.

### Phase 3: Reporting

Build:

- Individual client reports
- Monthly summary
- Combined reports
- Founder summary
- PDF export

### Phase 4: User Management and Administration

Build:

- User CRUD
- Roles
- Activation/deactivation
- Password management
- Audit logging
- Permissions

### Phase 5: UI/UX Redesign

Implement the polished responsive visual system.

### Phase 6: Backup and Reliability

- Automatic backups
- Manual backups
- Restore workflow
- Integrity verification
- Backup protection
- Recovery testing

### Phase 7: Server Deployment

- PostgreSQL
- Production configuration
- WSGI deployment
- Reverse proxy
- HTTPS
- Production logging
- Server-side backups

### Phase 8: Future Platform Features

Potential:

- PWA
- Mobile enhancements
- File attachments
- Notifications
- Analytics
- Templates
- Integrations
- API
- Multi-organization support
- Advanced reporting

---

## 41. Non-Goals for Initial Production Build

Do not allow these to distract from the core product:

- Full accounting system
- Full CRM
- Full project-management suite
- Payroll
- Inventory
- Complex invoicing engine
- AI-generated reports as a core dependency
- Real-time multi-user collaboration beyond what the server architecture naturally supports

These may be considered later.

---

## 42. V1 Definition of Done

V1 is successful when an administrator can:

1. Create a client.
2. Assign services.
3. Create a monthly period.
4. See every service/section under that month.
5. Add activities directly under each section.
6. Record date, description, quantity, unit, status, and notes.
7. Edit, delete, and reorder activities.
8. Add, edit, delete, and reorder monthly sections.
9. Manage payments independently.
10. View a monthly client summary.
11. Generate an individual client PDF.
12. Generate a combined PDF.
13. Generate an overall monthly summary.
14. Generate a founder summary.
15. Create and manage Viewer/Admin accounts.
16. Archive/deactivate clients and services without destroying history.
17. Back up the database.
18. Restore a verified backup.
19. Use the application comfortably on desktop and mobile.
20. Run the application locally.
21. Deploy the same application architecture to a server using PostgreSQL.
22. Pass automated tests covering core functionality and security.

---

## 43. Architectural Success Criteria

The architecture is successful if:

- Work data exists independently from reports.
- Activities are naturally nested under monthly client sections.
- Payments are independently managed.
- Reports are generated from authoritative stored data.
- Historical records survive service/client changes.
- SQLite and PostgreSQL are both viable database targets.
- Business logic is separated from presentation.
- New services, statuses, and units can be added without major rewrites.
- The UI is responsive and polished.
- Authentication and authorization are enforced server-side.
- The application can grow into a larger web product without another complete rebuild.

---

## 44. Guiding Principle

The application should always answer:

> **“What work happened for this client this month?”**

Everything else should be an intelligent view of that answer.

The **client workspace is the heart of the product**.

Reports are outputs.

The database is the source of truth.

GitHub is the source of code truth.

The architecture should be designed today so that tomorrow's server, mobile experience, analytics, integrations, and additional business modules can grow around the same stable foundation.
