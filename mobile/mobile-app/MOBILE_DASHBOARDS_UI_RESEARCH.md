# Mobile Dashboards UI Layout & Reusable Component Research

> **Target Directory**: `mobile/mobile-app/`  
> **Audience**: Mobile Developers, Frontend Engineers & AI Agents  
> **Source of Truth**: Components Catalog (`mobile/mobile-app/COMPONENTS_CATALOG.md`)

---

## Executive Summary & Architecture Overview

All 6 mobile dashboards adhere strictly to the **Modular Feature Architecture**, **Catalog-First Component Reuse Mandate**, **RTL & Logical Spacing** (`ms-`, `me-`, `ps-`, `pe-`), and **NativeWind Theme Tokens** (`bg-card`, `border-border`, `text-foreground`, `bg-muted`).

### Cross-Dashboard Architectural Patterns
1. **Outer Screen Container**: Uniformly wrapped in canonical `<ScreenShell>` or `<FeatureDetailScreen>` to encapsulate safe-area insets, standard back navigation, header slots, pull-to-refresh, and error retry state machines.
2. **Key Metric Indicators**: Grouped using `<KPICard>` and `<KPIRow>` components with Lucide icons, live trend indicators, and formatted currency/counts.
3. **Data Rows & Lists**: Structured using `<VisitorPassCard>`, `<ListItem>`, `<ActivityLogItem>`, and `<StatusBadge>` with zero duplicated inline primitives.
4. **Navigation Hubs**: Multi-column responsive quick-action tiles and grids with badge counters.

---

## 1. Amenities Executive Dashboard
* **Route / File**: [`app/(resident)/amenities/dashboard.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/amenities/dashboard.tsx)
* **Domain Feature**: Amenities & Facility Booking (`src/features/amenities/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Amenities Dashboard" [Icon: BarChart3]   │
├────────────────────────────────────────────────────────┤
│ [ 🔍 Search amenities, bookings, modules...          ] │ ← SearchBar
├────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│ │ Total Revenue │ │ Today Rev.    │ │ Maintenance    │ │ ← KPICard Row (3-Col)
│ │   ₹42,500     │ │   ₹8,250      │ │   2 Active     │ │
│ │ Total Earned  │ │  +14% Live    │ │  2 Ongoing     │ │
│ └───────────────┘ └───────────────┘ └────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ALL AMENITIES FEATURES (3-Column Quick-Nav Grid)       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │Amenities │ │Admin Cal.│ │ Ledgers  │                 │
│ ├──────────┤ ├──────────┤ ├──────────┤                 │
│ │Maint.    │ │ Discover │ │Bookings  │                 │ ← MobileQuickNavHub
│ ├──────────┤ ├──────────┤ ├──────────┤                 │
│ │ Wallet   │ │ Scanner  │ │ Sec-Logs │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
├────────────────────────────────────────────────────────┤
│ LIVE ACTIVITY & SCANNER LOGS             [LIVE Badge]  │
│ • Rahul Sharma (Villa 102) - Swimming Pool [CHECKED-IN]│ ← MobileLiveActivityWidget
│ • Ananya Roy (Flat 404-B)  - Tennis Court  [CONFIRMED] │
│ • Vikram Seth (Villa 45)   - Gym Fitness   [EXPIRED]   │
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | Outer screen container handling safe area, navigation bar, loading skeleton, and error retry state. |
| **`KPICard`** | `@/components/ui/KPICard` | High-level financial & maintenance metrics (Total Revenue, Today Revenue +14%, Active Maintenance). |
| **`SearchBar`** | `@/components/forms/SearchBar` | Search input with live text filtering across all 9 quick navigation amenity tiles. |
| **`StatusBadge`** | `@/components/ui/StatusBadge` | Color-coded status pills (`CHECKED-IN`, `CONFIRMED`, `EXPIRED`) in the real-time activity log feed. |
| **`MobileQuickNavHub`** | `@/features/amenities/components/` | Responsive 3-column navigation grid routing to 9 sub-features (Master, Calendar, Ledgers, Maintenance, Discover, Bookings, Wallet, Scanner, Security Logs) with badge counters. |
| **`MobileLiveActivityWidget`** | `@/features/amenities/components/` | Live gate access feed and booking activity monitor with click-to-view detail modals. |
| **`SecurityLogDetailModal`** | `@/features/amenities/components/` | Modal presenting granular scan verification data, QR status, and gate officer notes. |
| **`FullActivityLogsModal`** | `@/features/amenities/components/` | Full-screen paginated security activity log history modal. |

---

## 2. Resident Visitor & Passes Dashboard
* **Route / File**: [`app/(resident)/visitor/index.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/visitor/index.tsx)
* **Domain Feature**: Visitor Management (`src/features/visitor/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Visitors & Passes"    [+ Invite Visitor] │
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌────────────────────────┐ │
│ │ Active Passes           │ │ Walk-In Waiting        │ │ ← KPICard Row (2-Col)
│ │      3 (Live)           │ │     1 (Needs action)   │ │
│ └─────────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ + New Invite │ │ History Logs │ │ Walk-Ins (1)     │ │ ← Quick Action Nav
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
├────────────────────────────────────────────────────────┤
│ Recent Visitor Passes                         View All │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Delivery] Amazon Delivery - Alex Rivera           │ │
│ │ Entry Code: #8921 | Valid: Today 2:00 PM - 4:00 PM │ │ ← VisitorPassCard
│ │ Status: [ACTIVE]                     [Show QR Code]│ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Guest] Sarah Jenkins                              │ │
│ │ Entry Code: #4312 | Valid: Today 6:00 PM           │ │ ← VisitorPassCard
│ │ Status: [APPROVED]                   [Show QR Code]│ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│                                        [+ FAB: Invite] │ ← FAB
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | Top screen layout wrapper with subtitle and top-right "Invite Visitor" direct action button. |
| **`KPICard`** | `@/components/ui/KPICard` | Live counters for active pre-approved visitor passes and urgent walk-in authorization requests. |
| **`VisitorPassCard`** | `@/src/features/visitor/components/` | Canonical visitor card extending `ListCard` & `StatusBadge` showing visitor category, pass code, validity times, and "Show QR" CTA. |
| **`FAB`** | `@/components/ui/FAB` | Floating action button anchored at bottom-right for instant pass creation. |
| **`VisitorInvitationTypeSheet`** | `@/src/features/visitor/components/shared/` | Bottom sheet selector for pass types (Guest, Delivery, Cab, Service, Kid Exit). |
| **`VisitorLogDetailsModal`** | `@/src/features/visitor/components/history/` | Modal displaying full digital QR code, gate pass details, and entry log history. |
| **`Button`** | `@/components/ui/button` | Interactive button variant for network error retry states. |

---

## 3. Admin Master Visitor Security Dashboard
* **Route / File**: [`app/(resident)/visitor/admin/index.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/visitor/admin/index.tsx)
* **Domain Feature**: Admin Visitor Security Console (`src/features/visitor/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Community Visitor Management" [AdminPass]│
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ Visitor Traffic Analytics Breakdown                │ │ ← VisitorAnalyticsCard
│ │ Today: 142 Entries | 88 Resident / 54 Walk-In      │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌────────────────────────┐ │
│ │ Inside Now              │ │ Pending Gate           │ │ ← KPICard Row (2-Col)
│ │      28 (Live)          │ │     4 (Needs Action)   │ │
│ └─────────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ADMIN SECURITY CONTROLS (2x2 Grid)                     │
│ ┌─────────────────────────┐ ┌────────────────────────┐ │
│ │ All Passes              │ │ Master Walk-Ins (4)    │ │
│ ├─────────────────────────┤ ├────────────────────────┤ │ ← 2x2 Action Tiles
│ │ Blacklist (2)           │ │ Audit Logs             │ │
│ └─────────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ Recent Community Passes                       View All │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Villa 104] Courier Delivery - BlueDart            │ │ ← VisitorPassCard
│ │ Pass #CD-9901 | Checked In: 10:14 AM  [INSIDE]     │ │   (with Villa Badge)
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | Outer security container with title, subtitle, and top-right "Admin Pass" button. |
| **`VisitorAnalyticsCard`** | `@/src/features/visitor/components/admin/` | High-level analytics widget displaying total entries today, resident invite vs walk-in breakdown, and traffic metrics. |
| **`KPICard`** | `@/components/ui/KPICard` | Live metrics for visitors currently inside community grounds and pending gate check-ins. |
| **`VisitorPassCard`** | `@/src/features/visitor/components/` | Community pass list item configured with `villaBadge` to highlight unit destinations. |
| **`VisitorLogDetailsModal`** | `@/src/features/visitor/components/history/` | Admin detail modal with timestamps, gate guard details, and audit history. |

---

## 4. Admin Billing & Collections Dashboard
* **Route / Files**: [`app/(resident)/admin/billing/index.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/admin/billing/index.tsx) & [`src/features/billing/screens/AdminBillingDashboardScreen.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx)
* **Domain Feature**: Billing, Assessments & Invoices (`src/features/billing/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Billing Overview" [Icon: BarChart3]      │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ Current Month Collection Progress             74%  │ │ ← Card + Target Icon
│ │ [████████████████████████████░░░░░░░░░░]           │ │ ← ProgressBar
│ │ Collected: ₹3,12,000      | Billed: ₹4,20,000      │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ COLLECTION PERFORMANCE SUMMARY (Horizontal Carousel)   │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────┐ │
│ │Gross Billed│ │Total Coll. │ │Unpaid Arr. │ │Pending│ │ ← KPIRow / KPICards
│ │ ₹4,20,000  │ │ ₹3,12,000  │ │ ₹1,08,000  │ │₹14,500│ │
│ └────────────┘ └────────────┘ └────────────┘ └───────┘ │
├────────────────────────────────────────────────────────┤
│ ATTENTION REQUIRED                                     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ⚠️ Pending Offline Payment Verification             │ │ ← Attention Box
│ │ ₹14,500 in cheque/NEFT submissions awaiting clear. │ │   + Review Button
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ QUICK NAVIGATION (2x2 Grid)                            │
│ ┌─────────────────────────┐ ┌────────────────────────┐ │
│ │ Billing Dashboard       │ │ Billing Ledger         │ │
│ ├─────────────────────────┤ ├────────────────────────┤ │ ← 2x2 Action Tiles
│ │ Assessment Manager      │ │ Action Center          │ │
│ └─────────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ Recent Collections                            View All │
│ • Villa 204 • Rajesh Kumar (Inv #INV-2024-001)         │ ← ListItem
│ • Flat 501 • Priya Sen    (Inv #INV-2024-002)         │
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | Standard screen wrapper providing RBAC permission-denied fallback and pull-to-refresh. |
| **`Card`** | `@/components/common/Card` | Theme-tokenized container wrapping the monthly collection target progress widget. |
| **`ProgressBar`** | `@/components/common/ProgressBar` | Linear progress bar displaying the collection recovery percentage (Collected vs Billed). |
| **`KPIRow` & `KPICard`** | `@/components/ui/` | Horizontal carousel showcasing 4 financial metrics (Gross Billed, Total Collected, Unpaid Arrears, Pending Clearance). |
| **`SectionHeader`** | `@/components/common/SectionHeader` | Section header with title and "View All" routing to the master billing ledger. |
| **`ListItem`** | `@/components/common/ListItem` | Structured list item displaying latest transaction invoices with left file icons and navigation touch triggers. |
| **`ErrorBanner`** | `@/components/feedback/ErrorBanner` | Dismissible alert banner displaying API and sync errors. |
| **`Button`** | `@/components/ui/button` | Primary and outline action buttons for offline clearance reviews and permission recovery. |

---

## 5. Notice Board Management Dashboard
* **Route / File**: [`app/(resident)/notices/dashboard.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/notices/dashboard.tsx)
* **Domain Feature**: Notice Board & Community Announcements (`src/features/noticeBoard/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Notice Board Dashboard"                  │
├────────────────────────────────────────────────────────┤
│ MANAGEMENT OVERVIEW                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │Active Notices│ │ Drafts       │ │ Pinned           │ │ ← Horizontal KPICards
│ │      14      │ │      3       │ │        2         │ │
│ │  Published   │ │ Unpublished  │ │     Featured     │ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
├────────────────────────────────────────────────────────┤
│ QUICK NAVIGATION                                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│ │Dashboard │ │  Active  │ │  Manage  │ │    Polls    │ │ ← 4-Column Quick Nav
│ └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
├────────────────────────────────────────────────────────┤
│ LIVE ACTIVITY LOG                         [LIVE 🟢]    │
│ • Maintenance Notice - Water Supply Scheduled          │
│   Priority: [HIGH] | Status: [PUBLISHED] | 10 mins ago │ ← ActivityLogItem
│ • Annual General Meeting Notice                        │
│   Priority: [NORMAL] | Status: [PINNED]  | 2 hours ago │
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | Standard outer screen wrapper handling header, pull-to-refresh, and error states. |
| **`KPICard`** | `@/components/ui/KPICard` | Category metrics tracking Active, Draft, Pinned, and Urgent notices. |
| **`ActivityLogItem`** | `@/components/data/ActivityLogItem` | Reusable data timeline component rendering notice category, priority tag, publication status, and relative timestamps. |
| **`Text`** | `@/components/ui/text` | Design system typography primitive maintaining light/dark mode and RTL formatting. |

---

## 6. Complaints & Helpdesk Executive Dashboard
* **Route / Files**: [`app/(resident)/complaints/dashboard.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/complaints/dashboard.tsx) & [`components/dashboard/FeatureDetailScreen.tsx`](file:///D:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/dashboard/FeatureDetailScreen.tsx)
* **Domain Feature**: Complaints, Tickets & SLA Maintenance (`src/features/complaints/`)

### 📐 Simplified Visual Layout
```text
┌────────────────────────────────────────────────────────┐
│ [← Back] Complaints Dashboard             [FeatureIcon]│
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Icon] Complaints Dashboard    [Active Sub-Feature]│ │ ← Main Feature Header Card
│ │ Executive metrics, ticket resolution SLA           │ │
│ │ performance, category breakdown, and satisfaction. │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ ⚡ Domain: Complaints & Maintenance | Store:complaintSlice
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🛡️ Required Permission: complaints:dashboard [Granted] │ ← RBAC Permission Banner
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌────────────────────────┐ │
│ │ STATUS                  │ │ ACTIVITY               │ │ ← Real-time Sync Cards
│ │ Live & Synced           │ │ Connected              │ │
│ │ Updated just now        │ │ Real-time WebSocket    │ │
│ └─────────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ SUB-FEATURE CONSOLE PANEL                              │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [FeatureIcon] Complaints Dashboard Active View     │ │ ← Action Console
│ │ Connected to complaintSlice.js for live operations │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 🧩 Reusable Components & Purpose
| Component | Import Path | Purpose |
| :--- | :--- | :--- |
| **`FeatureDetailScreen`** | `@/components/dashboard/FeatureDetailScreen` | Standardized modular dashboard container rendering header navigation, feature description, domain slice info, and live WebSocket telemetry. |
| **`FeatureIcon`** | `@/components/ui/FeatureIcon` | Reusable icon wrapper applying domain-specific background badges and tint colors. |
| **`Text`** | `@/components/ui/text` | Design system typography component with variant and color styling tokens. |
