# Web Responsive Route and Component Inventory

## Baseline

- Frontend: Vite, React 19, React Router 7, Redux Toolkit, CoreUI 5, Sass.
- Shell: `App.jsx` -> `DefaultLayout` -> `AppSidebar`, `AppHeader`, `AppContent`.
- Routing: public routes in `App.jsx`; protected/lazy routes in `src/routes.js`; visibility is filtered from the navigation configuration by workspace modules and permissions.
- Responsive foundation: CoreUI breakpoints with phone `<576px`, tablet `576-991px`, desktop `>=992px`.

## Route groups audited

| Area | Routes / views | Responsive treatment |
| --- | --- | --- |
| Public and account | Login, registration, invite handling, checkout, invoice link, privacy, terms, support, delete account, 404/500 | Fluid page containers, safe text wrapping, viewport-safe dialogs and forms. |
| Workspace and administration | Dashboard, profile, users, invitations, villas, role builder, integrations, workspace configuration, organizations, audit logs, CRM/billing | Shared action/toolbars, scrollable tables, stacked form grids and dialogs. |
| Visitor operations | Resident, admin and guard visitor management plus gate approval | Responsive dashboard grids, table containment, mobile overlays and action controls. |
| Amenities | Admin dashboard/master/calendar/ledgers/maintenance/scanner/logs and resident discover/calendar/wallet/booking | Calendar/chart clipping protection, table containment, responsive booking and maintenance dialogs. |
| Complaints and notices | Complaint dashboard/create/track/manage/staff/assignee/issue reports and notice/poll views | Stacked forms, safe custom modals, mobile card/grid behavior and overflow-safe data tables. |
| Finance and platform | Billing, assessments, platform CRM, invoices, orders, subscriptions, provisioning | Scrollable ledger tables, wrapping identifiers, responsive filters and pagination. |

## Shared UI coverage

- Tables: 53 JSX files contain table markup; `.table-responsive` and the reusable data-table scroll area provide touch scrolling and sticky-header-safe containment.
- Dialogs: 115 JSX files use modal, drawer, dialog, or overlay behavior; CoreUI and custom overlay classes now respect mobile viewport dimensions and internal scrolling.
- Forms: 35 JSX files contain forms or React Hook Form usage; established form-row grids collapse to one column on phones.
- Inline layouts: 180 JSX files use inline styles; the global responsive shell supplies safe limits without changing feature logic.

## Intentional constraints

- Dense operational and financial tables remain horizontally scrollable rather than losing data or actions.
- Role-specific flows require authenticated seeded users for browser-level verification; no RBAC, API, state, or route behavior was changed.