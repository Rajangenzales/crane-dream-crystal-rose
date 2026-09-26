# FirmOS UX / Screen Specification v1.0

## Navigation
The responsive web application uses an elegant adaptive sidebar/navigation pattern. Navigation visibility is permission-aware.

## Core Areas
1. Dashboard
2. Clients
3. Services
4. Work
5. Finance
6. Reports
7. Documents
8. Team / Users
9. Notifications
10. Settings

Developer/IT administration is separated from normal firm administration.

## First-Time Firm Setup
Admin creates the account and firm details, then configures users, roles/permissions, services and clients. For small firms the Admin may perform all of these functions.

## Client Screens
Client list, create, view, edit and archive. Client detail connects to assigned services, work, finance, documents and relevant activity.

## Service Screens
Tenant-defined service catalogue. Authorized users can create and edit service names and details. Services connect to client-service assignments and work.

## Work Screens
Create work, select client/service, assign responsible member, optionally assign reviewer/approver, set due date and track status. Status history remains auditable.

## Finance Screens
Finance is a distinct area for invoices, payments, allocations, balances and controlled corrections. Work completion must not be treated as payment completion.

## Reports
Reports are generated only by users with REPORT_GENERATE. Admin receives this capability by default. Outputs should support print/download and future email/messaging delivery without making those delivery channels mandatory to V1.

## Responsive Behavior
Desktop and laptop prioritize information density and sidebar navigation. Tablet and mobile adapt navigation and tables/forms without exposing desktop-only local backup workflows on mobile.

## UX Rules
- Clear empty states.
- Clear loading states.
- Permission-aware actions.
- Human-readable errors with reference IDs where useful.
- Avoid exposing internal IDs unnecessarily.
- Keep common workflows short and predictable.
