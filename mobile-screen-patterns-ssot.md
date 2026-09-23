# Mobile Screen Design Patterns & Layout Architecture
## Master Reference & Single Source of Truth (SSOT) for Mobile Admin & Resident Experiences

> **Document Type:** Authoritative UI/UX Design System & Architectural Blueprint  
> **Workspace Path:** `e:\atominos\Manage-My-Gate/mobile-screen-patterns-ssot.md`  
> **Target Audience:** UI/UX Designers, Product Managers, and Mobile Frontend Engineers  
> **Authoritative Catalogs & Rules:**  
> - Component Catalog: [`mobile/mobile-app/COMPONENTS_CATALOG.md`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/COMPONENTS_CATALOG.md)  
> - Catalog Rules: [`.agents/rules/mobile-component-catalog.md`](file:///e:/atominos/Manage-My-Gate/.agents/rules/mobile-component-catalog.md)  
> - Workflow Rules: [`.agents/rules/mobile-workflow-rules.md`](file:///e:/atominos/Manage-My-Gate/.agents/rules/mobile-workflow-rules.md)

---

## 1. Executive Overview: The Four Mobile Screen Archetypes

Every functional screen across the **Manage My Gate** mobile application maps directly into one of four standardized design archetypes. Rather than reinventing layouts for each domain, all features (Billing, Amenities, Visitor Management, Security, Maintenance, Platform Admin) must strictly adhere to one of these four blueprints:

| Archetype | Reference Screen | Route URL | Primary UX Objective | Core Component Stack |
| :--- | :--- | :--- | :--- | :--- |
| **Archetype A: Executive Overview & Command Center** | Admin Billing Dashboard | `http://localhost:8081/admin/billing` | High-hierarchy glanceable metrics, goal tracking, action alerts, 3-column launcher grid, and strict 3-item recent feed snippet. | `ScreenShell` + `KPIDashboardStrip` + `Card` + `ProgressBar` + `ActionGrid` + `SectionHeader` + `ListItem` + `FAB` |
| **Archetype B: High-Density Search, Filter & Audit Ledger** | Admin Billing Ledger | `http://localhost:8081/admin/billing/ledger` | Deep search, camera barcode/QR scanning, multi-perspective grouping, server-side pagination, and contextual slide-up action sheets. | `ScreenShell` + `SearchFilterBar` + `LedgerGroupingToggle` + `PaginatedList` + `InvoiceCard` / `ListCard` + `BottomSheet` + `QRScannerModal` |
| **Archetype C: Resident Activity Feed & Digital Pass Manager** | Resident My Bookings | `http://localhost:8081/amenities/my-bookings` | Personal pass inspection, 5-dimensional lifecycle status modeling, fast discovery CTA, and safe inline cancellation. | `ScreenShell` + `SearchFilterBar` (in `ListHeaderComponent`) + `PaginatedList` + `ResidentReservationCard` + `ConfirmationModal` |
| **Archetype D: Type-Selection-First Multi-Step Creation Wizard** | Admin Facility Master | `http://localhost:8081/amenities/admin-master` | 3-stage flow: Archetype selection bottom sheet -> Locked-type wizard container -> Dynamically mutated step inputs & multi-chip presets. | `AmenityArchetypeSheet` + `AmenityCreationWizard` + `AmenityCreationFlowHeader` + `AmenityCreationStepIndicator` + `AmenityCreationFlowFooter` + Dynamic Step Components |

---

## 2. Universal Architectural Directives (Must Obey Across All Screens)

Before building any screen, designers and developers must silently enforce these 8 foundational rules:

1. **Mandatory Catalog Reuse (Catalog First):** Never construct buttons, text fields, cards, status pills, or modals using raw React Native primitives (`View`, `Text`, `TouchableOpacity`, `TextInput`, `Modal`). Always import from `@/components/ui`, `@/components/common`, `@/components/forms`, `@/components/feedback`, or `@/components/hardware`.
2. **Scroll Containment & Bottom Inset (`pb-28`):** All scrollable containers (`ScrollView`, `PaginatedList`, `FlatList`) on screens featuring a bottom Floating Action Button (`<FAB>`) or bottom navigation tab bar MUST specify `contentContainerClassName="... pb-28"` (minimum 112px bottom padding). This prevents content from clipping or getting obscured underneath floating buttons.
3. **Strict 3-Item Limit on Dashboard Feeds (Catalog Rule V.1):** Top-level overview and dashboard screens MUST ONLY render a preview of at most 3 items (`.slice(0, 3)`) in their recent activity snippet. Unbounded lists or full tables are strictly forbidden on dashboards; full datasets belong on dedicated ledger screens accessible via `<SectionHeader actionLabel="View All">`.
4. **Locked-Type Flow Header on Wizards (Catalog Rule VI.2):** Multi-step creation wizards MUST display the chosen archetype/type as a **static, read-only status badge**. Placing dropdown menus or chevrons (`ChevronDown`) in the wizard header to switch types mid-flow is strictly prohibited to prevent form corruption and broken step validations.
5. **Logical Spacing for Full Arabic (RTL) Support:** Physical directional classes (`mr-`, `ml-`, `pr-`, `pl-`) are strictly forbidden. Always use NativeWind logical spacing utilities (`me-`, `ms-`, `pe-`, `ps-`, `text-start`).
6. **Theme Tokens for Light & Dark Mode:** Never hardcode hex color strings (`#ffffff`, `#000000`) or static color names (`bg-slate-50`). Always use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-destructive/10`.
7. **The "Thin View" Pattern:** UI screens must remain purely declarative. Zero direct Axios/fetch calls inside screen files. All data retrieval, state mapping, and action dispatches must be offloaded to custom domain hooks (e.g., `useBilling`, `useResidentReservations`, `useAmenityMaster`).
8. **Real-Time Decoupling:** Never instantiate WebSockets directly inside visual screens. WebSocket subscriptions must live in dedicated background hooks (e.g., `useBillingSocket`) that silently dispatch updates to the Redux store.

---

## 3. Detailed Specifications for the Four Archetypes

---

### Archetype A: Executive Overview & Command Center

* **Reference Screen:** Admin Billing Dashboard (`/admin/billing`)
* **Screen File:** [`AdminBillingDashboardScreen.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx)
* **Target Audience:** Estate Community Admins, Treasurers, Finance Managers, Facility Directors.
* **Best Used For:** Admin landing pages, gate security overview, treasurer command center, facility admin dashboard.

#### Layout Wireframe
```
┌───────────────────────────────────────────────────────────┐
│ [←]  Billing Overview                    [💳 My Dues]     │  <-- Header: ScreenShell with Title,
│      Community Collection & Dues Snapshot                 │      Subtitle & Personal Counterpart Link
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │ 🧾 Gross Billed         │  │ 📈 Total Collected     │  │  <-- Zone 1: KPIDashboardStrip
│  │ ₹4,85,000               │  │ ₹3,60,000              │  │      (2x2 Responsive Matrix)
│  │ 142 total invoices      │  │ ↑ 74% rate             │  │
│  └─────────────────────────┘  └────────────────────────┘  │
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │ ⚠️ Unpaid Arrears       │  │ 🕒 Pending Clearance   │  │
│  │ ₹1,25,000               │  │ ₹45,000                │  │
│  │ Pending collection  (→) │  │ 4 submissions      (→) │  │
│  └─────────────────────────┘  └────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🎯 Current Month Collection Progress           74%  │  │  <-- Zone 2: Goal / Performance Progress Card
│  │ [████████████████████████░░░░░░░░░]                 │  │      (Card + ProgressBar)
│  │ Collected: ₹3,60,000               Billed: ₹4,85,000│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🕒 Pending Offline Payment Verification             │  │  <-- Zone 3: Exception Callout Banner
│  │    ₹45,000 across 4 submissions     [ Review (→) ]  │  │      (Conditional Warning Box)
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  QUICK NAVIGATION                                         │  <-- Zone 4: ActionGrid Launcher
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │      (3-Column Hub with Badges)
│  │ [🧾] (4)     │  │ [🏛️]         │  │ [📑]         │     │
│  │ Billing      │  │ Assessments  │  │ Personal     │     │
│  │ Ledger       │  │              │  │ Dues         │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ [👛]         │  │ [🕒]         │                       │
│  │ Digital      │  │ Payment      │                       │
│  │ Wallet       │  │ History      │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                           │
│  RECENT INVOICES                            View All (→)  │  <-- Zone 5: Recent Activity Preview
│  ┌─────────────────────────────────────────────────────┐  │      (Strictly Capped at 3 Items)
│  │ 📄 Villa A-101 • Rajesh Sharma                      │  │
│  │    Inv #INV-2026-001 • UNPAID • ₹4,500          (>) │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 📄 Villa B-204 • Priya Patel                        │  │
│  │    Inv #INV-2026-002 • PAID • ₹6,200            (>) │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 📄 Villa C-302 • Mohammed Al-Otaibi                 │  │
│  │    Inv #INV-2026-003 • VERIFICATION • ₹3,800    (>) │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│                                            ┌───────────┐  │
│                                            │ ➕ New    │  │  <-- Zone 6: Persistent Action Layer
│                                            │ Assessment│  │      (Bottom-Right FAB)
│                                            └───────────┘  │
│  [pb-28 Inset Clearance Zone]                             │
└───────────────────────────────────────────────────────────┘
```

#### Component Composition Table
| Section | Component | Import Source | Role & Configuration |
| :--- | :--- | :--- | :--- |
| **Screen Wrapper** | `ScreenShell` | `@/components/ui/ScreenShell` | Handles safe-area, back button, title, subtitle, loading, and right-header slot. |
| **Header Link** | `Button` | `@/components/ui/button` | Small outline pill button (`size="sm"`) routing to personal dues counterpart. |
| **KPI Metrics Matrix** | `KPIDashboardStrip` | `@/components/ui/KPIDashboardStrip` | 2x2 grid housing 4 `KPICard` objects with built-in skeleton loaders. |
| **KPI Cards** | `KPICard` | `@/components/ui/KPICard` | Semantic variants (`default`, `success`, `destructive`, `warning`) with touch deep links. |
| **Performance Bar** | `Card` + `ProgressBar` | `@/components/common` | Surface container rendering dynamic completion rate vs target. |
| **Exception Alert** | Callout Banner + `Button` | `@/components/ui/button` | Highlighted warning box for items requiring immediate clearance. |
| **Action Launcher** | `ActionGrid` | `@/components/ui/ActionGrid` | 3-column launcher grid with icons, 10% tinted backgrounds, and notification badges. |
| **Activity Header** | `SectionHeader` | `@/components/common/SectionHeader` | Title header with `"View All"` button linking to the ledger. |
| **Activity Rows** | `ListItem` | `@/components/common/ListItem` | Compact rows rendering title, metadata, icon, and right chevron (strictly max 3). |
| **Primary Creation** | `FAB` | `@/components/ui/FAB` | Bottom-right floating action button initiating entity creation. |

---

### Archetype B: High-Density Search, Filter & Audit Ledger

* **Reference Screen:** Admin Billing Ledger (`/admin/billing/ledger`)
* **Screen File:** [`BillingLedgerScreen.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/BillingLedgerScreen.tsx)
* **Target Audience:** Estate Admins, Auditors, Property Accountants, Gate Staff.
* **Best Used For:** Gate access logs, financial ledgers, visitor pass histories, violation tickets, maintenance requests.

#### Layout Wireframe
```
┌───────────────────────────────────────────────────────────┐
│ [←]  Billing Ledger                                       │  <-- Zone 1: ScreenShell Header
│      Total 142 community invoices                         │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────┐  ┌───────┐  ┌─────────────┐  │  <-- Zone 2: SearchFilterBar (Row 1)
│  │ 🔍 Search unit, Chq #...│  │ [📷]  │  │ [⚙️ Filters]│  │      Search input + Camera Scan +
│  └─────────────────────────┘  └───────┘  └─────────────┘  │      Advanced Filter Drawer Trigger
│                                                           │
│  (All 142)  (⚠️ Pending 4)  (❌ Overdue 12)  (Unpaid 28)   │  <-- Zone 2: SearchFilterBar (Row 2)
│  ─────────  ──────────────  ──────────────  ───────────   │      Horizontal Status Pill Badges
│                                                           │
│  [ 📄 Flat ]  [ 🏢 By Unit ]  [ 👥 By Resident ] [ 🗂️ Cycle]│  <-- Zone 3: Perspective Grouping Bar
│                                                           │      Interactive Chip Toggle
├───────────────────────────────────────────────────────────┤
│  PAGINATED RECORD FEED (Infinite Scroll + Pull-to-Refresh)│  <-- Zone 4: PaginatedList
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🧾 Maintenance Assessment - Q1 2026                 │  │      Flat Mode: <InvoiceCard>
│  │    Villa 104 • Rajesh Sharma                        │  │      (Wrapping <ListCard>)
│  │    [⚠️ VERIFICATION PENDING]            ₹4,500      │  │
│  │    12 Mar 2026                                  (>) │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🧾 Sinking Fund Assessment - 2026                   │  │
│  │    Villa 208 • Priya Patel                          │  │
│  │    [✅ PAID]                            ₹12,000     │  │
│  │    10 Mar 2026                                  (>) │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🏢 Villa 302 • Block C                    [▼ Expand]│  │      Grouped Mode:
│  │    Primary: Mohammed Al-Otaibi                      │  │      <UnitLedgerGroupCard>
│  │    Total: ₹18,500 • Due: ₹4,000 (2 Invoices)        │  │      Accordion summary
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [pb-28 Inset Clearance Zone]                             │
└───────────────────────────────────────────────────────────┘

═══════════════════ MODAL OVERLAYS & WORKFLOW SHEETS ═══════════════════

1. [Filter Drawer Sheet]      2. [Item Action BottomSheet]  3. [Manual Settle Sheet]
┌─────────────────────────┐  ┌─────────────────────────┐   ┌─────────────────────────┐
│ ⚙️ Advanced Filters [X] │  │ 🧾 Invoice #INV-2026-04 │   │ 💰 Record Offline Pay   │
│ Date Presets:           │  │ Status: [PENDING REVIEW]│   │ Unit: Villa 104         │
│ [All Time] [This Month] │  │ Amount: ₹4,500          │   │ Method: [Cash][Cheque]  │
│ Block: [Block A ▼]      │  │ Payment: Cheque #004123 │   │ Cheque #: [__________]  │
│ Method: [All Methods ▼] │  │ ----------------------- │   │ Proof: [📷 Attach Copy] │
│ [Reset]        [Apply]  │  │ [ Approve ]  [ Reject ] │   │ [ Cancel ]  [ Confirm ] │
└─────────────────────────┘  └─────────────────────────┘   └─────────────────────────┘
```

#### Component Composition Table
| Section | Component | Import Source | Role & Configuration |
| :--- | :--- | :--- | :--- |
| **Screen Wrapper** | `ScreenShell` | `@/components/ui/ScreenShell` | Displays record count subtitle and handles top-level loading. |
| **Control Bar** | `SearchFilterBar` | `@/components/ui/SearchFilterBar` | Search input + QR camera scan trigger + filter drawer trigger + status pills with live counts. |
| **Grouping Selector** | `Chip` Carousel | `@/components/common/Chip` | Switches data view between Flat, Entity, Owner, and Time Cycle. |
| **Virtualized Feed** | `PaginatedList` | `@/components/ui/PaginatedList` | Infinite scroll list with database pagination, pull-to-refresh, and dynamic empty states. |
| **Flat Item Cards** | `ListCard` + `StatusBadge` | `@/components/ui` | Standard card displaying title, subtitle, date, status, and formatted currency/amount. |
| **Group Accordions** | Custom Group Cards | Local Feature Component | Collapsible summary cards displaying group totals and child items. |
| **Hardware Scanner**| `QRScannerModal` | `@/components/hardware/QRScannerModal` | Live camera scanner parsing app barcodes and auto-opening matched records. |
| **Filter Drawer** | `BottomSheet` | `@/components/ui/BottomSheet` | Slide-up modal containing date presets, `DropdownSelect`, and `DatePicker`. |
| **Action Sheet** | `BottomSheet` | `@/components/ui/BottomSheet` | Contextual sheet with `DetailSection`, `DetailRow`, and action `Button` CTAs. |
| **Confirmation** | `ConfirmationModal` | `@/components/ui/ConfirmationModal` | Dialog guarding destructive actions (rejecting payments, revoking passes). |

---

### Archetype C: Resident Activity Feed & Digital Pass Manager

* **Reference Screen:** Resident My Bookings (`/amenities/my-bookings`)
* **Screen File:** [`app/(resident)/amenities/my-bookings.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/amenities/my-bookings.tsx)
* **Target Audience:** Residents, Tenants, Villa Owners.
* **Best Used For:** Personal visitor pass manager, amenity reservations, resident maintenance requests, vehicle parking permits.

#### Layout Wireframe
```
┌───────────────────────────────────────────────────────────┐
│ [←]  My Amenity Bookings                  [➕ Book Amenity]│  <-- Header: ScreenShell with Title,
│      View, manage & access your digital passes            │      Subtitle & Primary Action Button
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │  <-- Zone 1: SearchFilterBar (Row 1)
│  │ 🔍 Search by facility name or reservation #...      │  │      Real-time Keyword Search Input
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [ All ]  [ Upcoming ]  [ Awaiting Approval ]  [ Past ]   │  <-- Zone 1: SearchFilterBar (Row 2)
│  ═══════                                                  │      Horizontal Category Filter Tabs
├───────────────────────────────────────────────────────────┤
│  VIRTUALIZED RESERVATION FEED (PaginatedList)             │  <-- Zone 2: Paginated Feed
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🎾 Tennis Court A                        [CONFIRMED]│  │  <-- Card Header: Title + Booking Status
│  │ Court 2 • RES-2026-0891                     [PAID]  │  │      Subtitle + Payment Badge
│  ├─────────────────────────────────────────────────────┤  │
│  │ 📅 Sat, 28 Mar 2026   🕒 06:00 PM - 07:00 PM  👥 2  │  │  <-- Schedule & Headcount Metadata Row
│  ├─────────────────────────────────────────────────────┤  │
│  │ ┌─ Status Lifecycle Summary ──────────────────────┐ │  │  <-- Multi-Dimensional Status Summary Box
│  │ │ 🛡️ Approval:  [APPROVED]                        │ │  │      (bg-muted/40 rounded-2xl border)
│  │ │ 📲 Gate Pass: [PASS GENERATED]                  │ │  │
│  │ │ ⏳ Session:   [PENDING]                         │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                 [ Cancel Booking ]  │  │  <-- Inline Contextual Action Button
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🏊 Olympic Swimming Pool         [PENDING APPROVAL] │  │
│  │ Main Pool • RES-2026-0892            [NOT REQUIRED] │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 📅 Sun, 29 Mar 2026   🕒 07:00 AM - 08:30 AM  👥 1  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ┌─ Status Lifecycle Summary ──────────────────────┐ │  │
│  │ │ 🛡️ Approval:  [PENDING REVIEW]                  │ │  │
│  │ │ 📲 Gate Pass: [NOT APPLICABLE]                  │ │  │
│  │ │ ⏳ Session:   [PENDING]                         │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                 [ Cancel Booking ]  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [pb-28 Inset Clearance Zone]                             │
└───────────────────────────────────────────────────────────┘

═══════════════════ MODAL OVERLAYS & WORKFLOW SHEETS ═══════════════════

[Cancellation Confirmation Modal]
┌───────────────────────────────────────────────────────────┐
│ ⚠️ Cancel Reservation                                [X]  │
│                                                           │
│ Are you sure you want to cancel your reservation for      │
│ Tennis Court A (RES-2026-0891)?                           │
│                                                           │
│ • Your reserved court slot will be released immediately.  │
│ • Any active digital QR gate passes will be revoked.      │
│ • If payment was completed, an automated refund will be   │
│   scheduled according to community policy.                │
│                                                           │
│ [ Keep Reservation ]             [ Yes, Cancel Booking ]  │
└───────────────────────────────────────────────────────────┘
```

#### Component Composition Table
| Section | Component | Import Source | Role & Configuration |
| :--- | :--- | :--- | :--- |
| **Screen Wrapper** | `ScreenShell` | `@/components/ui/ScreenShell` | Full page container with back button, title, and discovery CTA slot. |
| **Discovery CTA** | `Button` | `@/components/ui/button` | Primary button (`variant="default"`, `size="sm"`) linking to the booking catalog. |
| **Integrated Search**| `SearchFilterBar` | `@/components/ui/SearchFilterBar` | Embedded inside `ListHeaderComponent` with real-time text search and category tabs. |
| **Feed Renderer** | `PaginatedList` | `@/components/ui/PaginatedList` | Virtualized list handling pull-to-refresh, infinite scroll, and empty states. |
| **Pass Card** | `ListCard` | `@/components/ui/ListCard` | Base card handling border styling, press feedback, and primary/secondary badge slots. |
| **Status Pills** | `StatusBadge` | `@/components/ui/StatusBadge` | Renders semantic color badges (`success`, `warning`, `danger`, `info`, `neutral`). |
| **Status Matrix** | Status Summary Box | `bg-muted/40 rounded-2xl` | Groups orthogonal lifecycle states (Approval, Gate QR Pass, Session Completion). |
| **Inline Action** | `Button` | `@/components/ui/button` | Danger-tinted outline button (`variant="outline"`, `size="sm"`) for cancellation. |
| **Confirmation** | `ConfirmationModal` | `@/components/ui/ConfirmationModal` | Guard modal explaining slot release, pass revocation, and refund terms. |

---

### Archetype D: Standardized Type-Selection-First Multi-Step Creation Wizard

* **Reference Screen:** Admin Facility Master (`/amenities/admin-master`)
* **Wizard Implementation Folder:** [`mobile/mobile-app/src/features/amenities/components/creation-wizard/`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/amenities/components/creation-wizard/)
* **Target Audience:** Community Admins, Facility Supervisors, Estate Operations Staff.
* **Best Used For:** Adding entities that have multiple operational varieties (Facilities, Visitor Passes by Archetype, Maintenance Tickets by Discipline, Service Requests, Incident Reports).

#### Layout Wireframe
```
[Stage 1: Archetype Selection Bottom Sheet (AmenityArchetypeSheet.tsx)]
┌───────────────────────────────────────────────────────────┐
│ Select Facility Archetype                             [X] │
│ Choose the archetype to configure booking & capacity rules│
├───────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [👥]  Shared Capacity                    [Headcount]│  │  <-- e.g. Pool, Gym, Club Lounge
│  │       Concurrent headcount pool & resident quotas.  │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [⏱️]  Exclusive Hourly             [Slots & Buffer] │  │  <-- e.g. Tennis, Badminton, Squash
│  │       Court exclusivity with time slots & buffers.  │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [✨]  Event Space                  [Admin Approval] │  │  <-- e.g. Banquet Hall, Party Lawn
│  │       Daily reservations, deposits & approval flow. │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [🚪]  Room Resource                     [Multi-Room]│  │  <-- e.g. Meeting Rooms, Co-working
│  │       Sub-rooms with AV equipment & specs.          │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [🔧]  Inventory & Tools             [Stock Checkout]│  │  <-- e.g. Toolkits, Projectors
│  │       Physical asset checkout & return inspection.  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘

[Stage 2 & 3: Locked-Type Dynamic Wizard (AmenityCreationWizard.tsx)]
┌───────────────────────────────────────────────────────────┐
│ [←] Create Amenity Facility       [⏱️ Exclusive Hourly] [X]│  <-- Header: Locked Type Badge (No Chevrons)
│     Step 3 of 5                                           │
│     Slot & Buffer Setup                                   │
├───────────────────────────────────────────────────────────┤
│  [●]─────────────[●]─────────────[●]─────────────[○]───── │  <-- Step Progress Indicator
│  Info         Schedule         Slots           Pricing    │
├───────────────────────────────────────────────────────────┤
│  STEP 3: DYNAMIC FORM MUTATION                            │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⏱️ Single Slot Duration                             │  │  <-- Multi-Chip Presets
│  │    [ 30 min ]  [ 45 min ]  [ 60 min ● ]  [ 90 min ] │  │
│  │    Custom: [ 60               ] minutes             │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⏳ Setup & Cleaning Buffer                          │  │  <-- Turnaround Buffer
│  │    [ None (0) ]  [ 10 min ● ]  [ 15 min ]  [ 30 min]│  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📅 Advance Booking Window                           │  │  <-- Advance Limit
│  │    [ 3 Days ]  [ 7 Days ● ]  [ 14 Days ]  [ 30 Days]│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [pb-28 Inset Clearance Zone]                             │
├───────────────────────────────────────────────────────────┤
│  [ Save Draft ]                      [ Back ]   [ Next → ] │  <-- Flow Footer
└───────────────────────────────────────────────────────────┘
```

#### Dynamic Step Mutation Matrix
| Archetype | Step 1 (Identity) | Step 2 (Schedule) | **Step 3 (Dynamic Form Mutation)** | **Step 4 (Pricing & Policy)** | Step 5 (Review) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SHARED_CAPACITY`** | Name, Code, Location, Photo, Desc | Open/Close times, Days | **`SharedCapacityConfigStep`**: Headcount pool, Max guests/headcount per booking | Default `FREE`, guest fee toggle, refund policy | `AmenityCreationReviewStep` |
| **`EXCLUSIVE_HOURLY`**| Name, Code, Location, Photo, Desc | Open/Close times, Days | **`ExclusiveHourlyConfigStep`**: Slot duration chips (30, 45, 60, 90m), Cleaning buffers (0, 10, 15, 30m), Advance booking window | Default `HOURLY`, hourly fee, refund cutoff hours | `AmenityCreationReviewStep` |
| **`EVENT_SPACE`** | Name, Code, Location, Photo, Desc | Open/Close times, Days | **`EventSpaceConfigStep`**: Guest capacity, Advance notice chips (24h, 48h, 72h, 1w), Admin approval toggle | Default `DAILY`, daily fee, mandatory security deposit | `AmenityCreationReviewStep` |
| **`ROOM_RESOURCE`** | Name, Code, Location, Photo, Desc | Open/Close times, Days | **`RoomResourceConfigStep`**: Sub-rooms list with individual capacities, AV equipment chips (Wi-Fi, Projector, AC) | Default `HOURLY`, room rate, deposit policy | `AmenityCreationReviewStep` |
| **`INVENTORY_TOOLS`** | Name, Code, Location, Photo, Desc | Open/Close times, Days | **`InventoryToolsConfigStep`**: Available stock, Max loan hours (2h, 4h, 24h, 3d, 1w), Return inspection toggle | Default `FREE`, replacement deposit | `AmenityCreationReviewStep` |

---

## 4. UI/UX Decision Matrix: Choosing the Right Archetype

Use this decision flowchart when planning any new screen:

```
                                [ New Screen Required ]
                                           │
                    Is this an executive / high-level summary screen?
                                     ┌─────┴─────┐
                                    YES          NO
                                     │           │
                          [ Archetype A ]        Is this an entity creation workflow
                          Executive Dashboard    with multiple varieties/types?
                          (/admin/billing)             ┌─────┴─────┐
                                                      YES          NO
                                                       │           │
                                                [ Archetype D ]  Is this for Admins (audit)
                                                Type-Selection   or for Residents (passes)?
                                                Creation Wizard        ┌─────┴─────┐
                                                (/amenities/         ADMIN      RESIDENT
                                                 admin-master)         │           │
                                                                [ Archetype B ] [ Archetype C ]
                                                                Audit Ledger    Pass Manager
```

### Complete Cross-Archetype Feature Comparison

| Feature Dimension | Archetype A (Dashboard) | Archetype B (Audit Ledger) | Archetype C (Activity Feed) | Archetype D (Creation Wizard) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary User Role** | Community Admin / Finance | Estate Admin / Auditor | Resident / Tenant / Owner | Admin / Staff / Facility Mgr |
| **Information Density** | Macro (KPI cards, Goal bar) | Dense (Search, Filter, Grouping) | Focused (Pass cards, Lifecycle) | Multi-step form with chip presets |
| **Activity Feed Length**| **Strictly 3 items max** (`.slice(0, 3)`)| Infinite (`PaginatedList` pages)| Infinite (`PaginatedList` pages)| Multi-step modal container |
| **Search Mechanism** | None (Navigates to ledger) | Dual-row `SearchFilterBar` + Drawer | Integrated `SearchFilterBar` | None (Form inputs only) |
| **Hardware Scanning** | None | Live Camera QR/Barcode Modal | Optional (View QR Pass) | None (Optional Photo uploader) |
| **Data Grouping** | Fixed 3-column `ActionGrid` | Multi-mode `LedgerGroupingToggle` | Horizontal Category Tabs | Dynamic 5-step wizard progression |
| **Item Interaction** | Deep links to filtered ledger | Contextual slide-up `BottomSheet` | Full pass view / inline cancel | Step Back / Next / Save Draft |
| **Primary Action CTA** | Floating Action Button (`<FAB>`)| Filter Drawer Trigger | Header Action Button (`+ Book`) | Bottom Footer (`Publish / Save Draft`)|
| **Bottom Inset Padding**| `pb-28` (112px for FAB clearance) | `pb-28` (112px for tab clearance) | `pb-28` (112px for tab clearance) | `pb-28` (112px for footer clearance)|

---

## 5. Master Cross-Page Component Directory (The Complete UI Inventory)

The following master directory catalogues every single component used across all four reference screens, organized by category:

### Category 1: Layout & Screen Containers
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | All 4 Screens | `title`, `subtitle`, `iconName`, `loading`, `error`, `onRetry`, `headerRight`. Built-in safe areas. |
| **`PaginatedList`** | `@/components/ui/PaginatedList` | Ledger, Bookings, Master | `data`, `pagination`, `onLoadMore`, `onRefresh`, `loading`, `emptyTitle`, `emptySubtitle`, `contentContainerClassName`. |

### Category 2: Modals, Sheets & Feedback
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`BottomSheet`** | `@/components/ui/BottomSheet` | Ledger, Creation Wizard | `visible`, `onClose`, `title`. Native slide-up modal for contextual workflows. |
| **`ConfirmationModal`** | `@/components/ui/ConfirmationModal` | Ledger, Bookings, Master | `visible`, `title`, `message`, `confirmLabel`, `cancelLabel`, `variant={'danger'\|'warning'\|'info'}`. |
| **`ErrorBanner`** | `@/components/feedback/ErrorBanner` | Dashboard, Ledger, Master | `message`, `onDismiss`. Dismissable top banner for API failures. |

### Category 3: Form Controls & Inputs
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`TextInput`** | `@/components/forms/TextInput` | Ledger, Creation Wizard | `label`, `placeholder`, `value`, `onChangeText`, `error`, `keyboardType`. Form input with focus rings. |
| **`DropdownSelect`** | `@/components/forms/DropdownSelect` | Ledger Filter Drawer | `label`, `options`, `value`, `onSelect`. Modal selection picker with search. |
| **`DatePicker`** | `@/components/common/DatePicker` | Ledger Filter Drawer | `date`, `onChange`, `label`. Date picker modal. |
| **`Chip`** | `@/components/common/Chip` | Ledger, Creation Wizard | `label`, `icon`, `selected`, `onPress`. Interactive tag pill for presets and grouping. |
| **`AttachmentPicker`** | `@/components/ui/AttachmentPicker` | Ledger Settle, Wizard | `attachments`, `onSelect`, `maxFiles`. Photo and document file dropzone. |

### Category 4: Metrics, Data Visuals & Action Hubs
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`KPIDashboardStrip`** | `@/components/ui/KPIDashboardStrip` | Dashboard | `cards`, `layout={'grid2x2'\|'row'\|'carousel'}`, `loading`. 2x2 metric matrix. |
| **`KPICard`** | `@/components/ui/KPICard` | Dashboard | `title`, `value`, `subtitle`, `trend`, `iconName`, `variant`, `onPress`. Individual metric tile. |
| **`Card`** | `@/components/common/Card` | Dashboard, Bookings | Surface enclosure box adhering to theme tokens (`bg-card`, `border-border`). |
| **`ProgressBar`** | `@/components/common/ProgressBar` | Dashboard | `progress` (0-100). Animated linear percentage bar. |
| **`ActionGrid`** | `@/components/ui/ActionGrid` | Dashboard | `title`, `items`. 3-column launcher grid with icons, 10% background tints, and badges. |

### Category 5: Lists, Rows & Status Badges
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`SectionHeader`** | `@/components/common/SectionHeader` | Dashboard, Bookings | `title`, `actionLabel`, `onAction`. Section header with `"View All"` link. |
| **`ListItem`** | `@/components/common/ListItem` | Dashboard (Recent Feed) | `title`, `subtitle`, `leftIcon`, `onPress`. Standard compact list row. |
| **`ListCard`** | `@/components/ui/ListCard` | Ledger, Bookings, Master | `title`, `subtitle`, `status`, `secondaryBadge`, `timestamp`, `onPress`. Elevated interactive card. |
| **`StatusBadge`** | `@/components/ui/StatusBadge` | All 4 Screens | `label`, `variant={'success'\|'warning'\|'danger'\|'info'\|'neutral'}`, `size`. Semantic pill. |

### Category 6: Hardware, Navigation & Control Bars
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`SearchFilterBar`** | `@/components/ui/SearchFilterBar` | Ledger, Bookings, Master | `searchValue`, `onSearchChange`, `sortOptions`, `currentSort`, `onScanPress`, `onFilterPress`. |
| **`QRScannerModal`** | `@/components/hardware/QRScannerModal` | Ledger | `visible`, `onClose`, `onScanCode`, `title`, `instruction`. Camera QR/barcode overlay. |
| **`Button`** | `@/components/ui/button` & `/common` | All 4 Screens | `variant={'default'\|'outline'\|'destructive'}`, `size={'sm'\|'lg'}`. Standard interactive button. |
| **`FAB`** | `@/components/ui/FAB` | Dashboard | `iconName`, `label`, `onPress`. Floating action button fixed at bottom right. |

### Category 7: Primitive Wrappers
| Component | Catalog Path | Used in Screens | Primary Props & Key Features |
| :--- | :--- | :--- | :--- |
| **`Text`** | `@/components/ui/text` | All 4 Screens | `variant={'large'\|'muted'}`, `className`. Theme-aware typography primitive. |
| **`Icon`** | `@/components/ui/icon` | All 4 Screens | `as={LucideIcon}`, `size`, `className`. Lucide vector wrapper. |

---

## 6. Architectural Verification Checklist for Designers & Developers

Before submitting any newly designed or coded mobile screen, verify this final checklist:

- [ ] **Catalog Lookup:** Every interactive element is imported from `mobile/mobile-app/components/`. Zero raw `<TouchableOpacity>` or `<TextInput>` primitives were constructed.
- [ ] **Outer Container:** The screen is wrapped in `<ScreenShell>` with title, subtitle, and loading states.
- [ ] **Activity Cap (Dashboards):** If building an Archetype A dashboard, the recent feed is strictly capped at 3 items (`.slice(0, 3)`).
- [ ] **FAB Clearance:** The scrollable container includes `pb-28` bottom inset padding to prevent FAB or navigation bar clipping.
- [ ] **Database Pagination:** If rendering a list, `<PaginatedList>` handles database-level `page` and `limit`. No in-memory array splitting.
- [ ] **Locked Header on Wizards:** The creation flow header displays the chosen type as a static, read-only badge. No mid-flow dropdown switching.
- [ ] **RTL Logical Spacing:** Spacing classes use `me-`, `ms-`, `pe-`, `ps-`, and `text-start`. No directional `mr-` or `pl-` classes.
- [ ] **Theme Design Tokens:** All surfaces use `bg-card`, `bg-background`, `border-border`, and `text-foreground`. No hardcoded hex codes.
- [ ] **Thin View Pattern:** The screen imports a custom domain hook (e.g. `useFeature()`). Zero direct Axios calls exist in the view.
- [ ] **Destructive Safeguard:** Dangerous actions (cancellations, rejections, revocations) are wrapped in `<ConfirmationModal variant="danger">`.
