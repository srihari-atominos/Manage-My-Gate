# Mobile Dashboard Layout & Uniformity Detailed Report

> **Target Screens Analyzed:**
> - [amenities/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/amenities/dashboard.tsx)
> - [visitor/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/index.tsx)
> - [visitor/admin/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/admin/index.tsx)
> - [admin/billing/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/billing/index.tsx) & [`AdminBillingDashboardScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx)
> - [notices/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/notices/dashboard.tsx)
> - [complaints/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/dashboard.tsx)

---

## 1. Executive Summary & Uniformity Scorecard

All 6 screens implement the unified **Manage-My-Gate Executive Mobile Dashboard Pattern** designed around five core primitives:
1. **[`ScreenShell`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/ScreenShell.tsx)**: Manages safe area insets, domain metadata badges, synchronization status, back navigation, and right action pills.
2. **[`KPIDashboardStrip`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/KPIDashboardStrip.tsx)**: Responsive auto-layout KPI metrics (2 cards = row, 3 cards = carousel, 4 cards = $2 \times 2$ balanced grid).
3. **[`ActionGrid`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/ActionGrid.tsx)**: 3-column touchable quick-navigation grid with color-coded icon containers and counter badges.
4. **Contextual Activity / Feed / Queue**: Displays recent transactions, active passes, live gate logs, or SLA ticket queues.
5. **[`FAB`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/FAB.tsx)**: High-visibility floating action button in the bottom-right for primary domain write actions.

### Uniformity Scorecard

| Dashboard Screen | Outer Shell | Header Right Action | KPI Metric Strip | Action Grid | Feed / Queue Area | Floating Action (FAB) | Real-Time / Socket | Screen Layering |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amenities** | `ScreenShell` | `My Bookings` Pill | 3 Cards (Carousel) | 9 Items (3x3 Searchable) | Live QR Scanner Log Widget | `Book Amenity` | Polling / Redux | Direct in `app/` |
| **Visitor (Resident)** | `ScreenShell` | `History` Pill | 2 Cards (Row) | 3 Items (Row) | Recent Pass Cards List | `Invite Visitor` | Redux Slice Sync | Direct in `app/` |
| **Visitor (Admin)** | `ScreenShell` | `Audit Logs` Pill | 4 Cards ($2 \times 2$ Grid) | 4 Items (Wrap) | Analytics Card + Passes | `Admin Pass` | Redux Slice Sync | Direct in `app/` |
| **Admin Billing** | `ScreenShell` | `Ledger` Pill | 4 Cards ($2 \times 2$ Grid) | 4 Items (Wrap) | Progress + Alert + List | `New Assessment` | `useBillingSocket()` | Thin Route $\rightarrow$ `src/` |
| **Notices** | `ScreenShell` | `Manage` Pill | 4 Cards ($2 \times 2$ Grid) | 4 Items (Wrap) | Live Activity Log Feed | `New Notice` | `useNoticeSocket()` | Direct in `app/` |
| **Complaints** | `ScreenShell` | `My Tickets` Pill | 4 Cards ($2 \times 2$ Grid) | 4 Items (Wrap) | SLA Queue & Recent Items | `Raise Ticket` | Custom Hook / Redux | Direct in `app/` |

---

## 2. Screen-by-Screen In-Depth Layout Breakdown

---

### A. Amenities Executive Dashboard
* **File:** [amenities/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/amenities/dashboard.tsx)
* **Purpose:** Resident & Facility Manager overview of bookable resources, revenue, and maintenance.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Amenities Dashboard"                     │
│ [Icon: BarChart3] [Domain: Amenities] [Sync: Live]     │
│ Right Slot: [ CalendarCheck "My Bookings" Pill ]       │
├────────────────────────────────────────────────────────┤
│ ScrollView                                             │
│ ├─ SearchBar: "Search amenities, bookings, modules..." │
│ ├─ KPIDashboardStrip (3 Cards Carousel):               │
│ │   [ Total Revenue ] [ Today Rev. (+14%) ] [ Maint. ] │
│ ├─ MobileQuickNavHub: ActionGrid (9 Items, 3x3)        │
│ │   [Amenities][Admin Cal][Ledgers][Maint][Discover]   │
│ │   [Bookings][Wallet][Scanner][Security Logs]         │
│ └─ MobileLiveActivityWidget: Real-time scan logs + feed │
├────────────────────────────────────────────────────────┤
│ FAB: [+ Book Amenity]                                  │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - Employs `<ScreenShell>` with built-in metadata bar (`sharedSlice="amenitySlice.ts"`).
  - Single top-level `<ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-24">`.
  - Master search bar dynamically filters 9 navigation items in `MobileQuickNavHub`.
  - Integrates `MobileLiveActivityWidget` with live ticker, status pills (`CHECKED-IN`, `CONFIRMED`, `EXPIRED`), and modal drill-downs.

---

### B. Visitor (Resident) Dashboard
* **File:** [visitor/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/index.tsx)
* **Purpose:** Personal gate approvals, visitor QR issuance, and quick entry history.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Visitors & Passes"                       │
│ [Icon: ShieldCheck] [Domain: Visitor Mgmt] [Sync: Live]│
│ Right Slot: [ History "History" Pill ]                 │
├────────────────────────────────────────────────────────┤
│ FIXED TOP CONTROLS (Non-scrolling header block):       │
│ ├─ KPIDashboardStrip (2 Cards Row):                    │
│ │   [ Active Passes (Live) ] [ Walk-In Waiting (Alert) ]│
│ ├─ ActionGrid (3 Items):                               │
│ │   [ New Invite ] [ History Logs ] [ Walk-Ins (Badge)]│
│ └─ Section Header: "Recent Visitor Passes" [View All]  │
├────────────────────────────────────────────────────────┤
│ ScrollView (Scrollable Card Feed):                     │
│ ├─ Error Retry Banner (if failed)                      │
│ ├─ ActivityIndicator (if loading)                      │
│ └─ List of <VisitorPassCard /> items                   │
├────────────────────────────────────────────────────────┤
│ FAB: [+ Invite Visitor]                                │
│ Modals: VisitorInvitationTypeSheet, VisitorDetailsModal │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - Employs a **split layout**: Top Controls (KPIs + ActionGrid + Header) are fixed at the top with a subtle border divider (`border-b border-border/40`), while the pass list underneath scrolls independently.
  - Passes are rendered using domain-standard `VisitorPassCard` with badge metadata and QR modal triggers.

---

### C. Visitor Admin Security Console
* **File:** [visitor/admin/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/admin/index.tsx)
* **Purpose:** High-level guard & security manager console for community-wide gate security and blacklists.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Community Visitor Management"            │
│ [Icon: ShieldCheck] [Domain: Security Console]         │
│ Right Slot: [ History "Audit Logs" Pill ]              │
├────────────────────────────────────────────────────────┤
│ ScrollView (Unified Scroll):                           │
│ ├─ VisitorAnalyticsCard (High-level entry charts/stats)│
│ ├─ KPIDashboardStrip (4 Cards 2x2 Grid):               │
│ │   [ Inside Now ]     [ Pending Gate ]                │
│ │   [ Today Entries ]  [ Blacklisted ]                 │
│ ├─ ActionGrid (4 Items):                               │
│ │   [ All Passes ] [ Master Walk-Ins ]                 │
│ │   [ Blacklist ]  [ Audit Logs ]                      │
│ ├─ Section Header: "Recent Community Passes" [View All]│
│ └─ List of <VisitorPassCard villaBadge="Villa 102" />  │
├────────────────────────────────────────────────────────┤
│ FAB: [UserPlus "Admin Pass"]                           │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - Full-screen unified scroll containing a hero `VisitorAnalyticsCard`.
  - Employs 4 KPI cards matching the $2 \times 2$ auto-grid.
  - Reuses `VisitorPassCard` with the `villaBadge` prop to distinguish multi-tenant community entries.

---

### D. Admin Billing Dashboard
* **Files:** [admin/billing/index.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/billing/index.tsx) & [`AdminBillingDashboardScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx)
* **Purpose:** HOA financial metrics, collection progress, offline dues verification, and invoice summaries.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Billing Overview"                        │
│ [Icon: BarChart3] [Permission: billing:dashboard]      │
│ Right Slot: [ Receipt "Ledger" Pill ]                  │
├────────────────────────────────────────────────────────┤
│ ScrollView:                                            │
│ ├─ Collection Progress Widget:                         │
│ │   Target Icon + Progress Bar (e.g. 78% Collected)    │
│ ├─ KPIDashboardStrip (4 Cards 2x2 Grid):               │
│ │   [ Gross Billed ]    [ Total Collected ]            │
│ │   [ Unpaid Arrears ]  [ Pending Clear ]              │
│ ├─ Attention Required Alert Box:                       │
│ │   Pending Cheque/NEFT offline payments + [Review] CTA│
│ ├─ ActionGrid (4 Items):                               │
│ │   [ Billing Dashboard ] [ Billing Ledger ]           │
│ │   [ Assessments ]       [ Resident Dues ]            │
│ └─ SectionHeader: "Recent Collections" + ListItems     │
├────────────────────────────────────────────────────────┤
│ FAB: [+ New Assessment]                                │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - Follows the **clean architecture pattern**: `app/(resident)/admin/billing/index.tsx` is an ultra-thin 12-line route delegate rendering `AdminBillingDashboardScreen`.
  - RBAC protected via `permission="billing:dashboard"` in `ScreenShell`.
  - Integrates `useBillingSocket()` for live ledger updates.

---

### E. Notices Board Dashboard
* **File:** [notices/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/notices/dashboard.tsx)
* **Purpose:** Broadcast announcements, urgent society alerts, drafts, and resident polls.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Notice Board Dashboard"                  │
│ [Icon: Bell] [Domain: Communications] [Sync: Live]     │
│ Right Slot: [ ListChecks "Manage" Pill ]               │
├────────────────────────────────────────────────────────┤
│ ScrollView:                                            │
│ ├─ [Redundant Inner Title: "Management Overview"]      │
│ ├─ KPIDashboardStrip (4 Cards 2x2 Grid):               │
│ │   [ Active Notices ] [ Drafts ]                      │
│ │   [ Pinned ]         [ Urgent Notices ]              │
│ ├─ ActionGrid (4 Items):                               │
│ │   [ Dashboard ]      [ Active Notices ]              │
│ │   [ Manage ]         [ Polls & Votes ]               │
│ └─ Card: Live Activity Log with <ActivityLogItem />    │
├────────────────────────────────────────────────────────┤
│ FAB: [+ New Notice]                                    │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - Binds `useNoticeSocket()` for real-time notice events.
  - Displays a dedicated live broadcast feed using `ActivityLogItem`.

---

### F. Complaints & Helpdesk Dashboard
* **File:** [complaints/dashboard.tsx](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/dashboard.tsx)
* **Purpose:** Facility tickets, SLA tracking, technician assignments, and satisfaction rating.

```
┌────────────────────────────────────────────────────────┐
│ ScreenShell: "Complaints Dashboard"                    │
│ [Icon: BarChart3] [Domain: Complaints & Maint]         │
│ Right Slot: [ LifeBuoy "My Tickets" Pill ]             │
├────────────────────────────────────────────────────────┤
│ ScrollView:                                            │
│ ├─ KPIDashboardStrip (4 Cards 2x2 Grid):               │
│ │   [ Open Tickets ]  [ In Progress ]                  │
│ │   [ SLA Resolved ]  [ Satisfaction ]                 │
│ ├─ ActionGrid (4 Items):                               │
│ │   [ My Tickets ]    [ Raise Ticket ]                 │
│ │   [ Manage Queue ]  [ Staff Assigned ]               │
│ └─ SectionHeader: "Recent Helpdesk Activity" + Tickets │
├────────────────────────────────────────────────────────┤
│ FAB: [+ Raise Ticket]                                  │
└────────────────────────────────────────────────────────┘
```

* **Layout Highlights:**
  - High degree of visual alignment with the Billing dashboard.
  - Combines `KPIDashboardStrip` $\rightarrow$ `ActionGrid` $\rightarrow$ `SectionHeader` + `ListItem` components.

---

## 3. Uniformity Analysis & Design Patterns

### 1. Header Right Action Pill Pattern (100% Uniform)
Every single dashboard screen integrates an identical quick-action pill in the top-right header slot:
```tsx
<TouchableOpacity
  onPress={() => router.push('...')}
  activeOpacity={0.8}
  className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border border-border"
  accessibilityRole="button"
  accessibilityLabel="..."
>
  <LucideIcon size={14} className="text-foreground" />
  <Text className="text-xs font-semibold text-foreground">{label}</Text>
</TouchableOpacity>
```

### 2. Universal KPI Metric Layouts (`KPIDashboardStrip`)
The KPI cards automatically compute their layout based on density:
* **2 Cards** (`visitor/index.tsx`): Rendered as an expansive 50/50 horizontal flex row.
* **3 Cards** (`amenities/dashboard.tsx`): Rendered as a horizontal carousel with `showsHorizontalScrollIndicator={false}`.
* **4 Cards** (`admin/billing`, `notices`, `complaints`, `visitor/admin`): Rendered as a balanced $2 \times 2$ grid (`w-[48.5%]`).

### 3. Action Grid Uniformity (`ActionGrid`)
All screens use the standard 3-column wrap layout with:
- Standard card surface (`bg-card border border-border rounded-2xl p-3 min-h-[96px]`)
- Icon container (`w-11 h-11 rounded-2xl items-center justify-center mb-2`)
- 2-line title (`text-[11px] font-bold text-foreground text-center`)
- Absolute positioned pill badges (`-top-1.5 -right-1.5 px-2 py-0.5 rounded-full`)

### 4. Floating Action Button Standard (`FAB`)
All 6 screens provide a persistent FAB in the bottom right corner with an action verb label (`"Book Amenity"`, `"Invite Visitor"`, `"Admin Pass"`, `"New Assessment"`, `"New Notice"`, `"Raise Ticket"`).

---

## 4. Identified Inconsistencies & Actionable Directives

| Area | Inconsistency Observed | Recommended Standard Action |
| :--- | :--- | :--- |
| **Scrolling Strategy** | `visitor/index.tsx` uses a fixed top controls header, while all other screens use unified scrolling. | Convert `visitor/index.tsx` to a single unified `ScrollView` for small-screen ergonomics. |
| **Screen Architecture** | Only Billing separates Expo route (`app/`) from Screen (`src/features/screens/`). Others place full code in `app/`. | Refactor screens into `src/features/[feature]/screens/` and keep `app/` routes as thin delegates. |
| **Redundant Titles** | `notices/dashboard.tsx` renders a redundant inner `"Management Overview"` title. | Remove inner duplicate heading from `notices/dashboard.tsx`. |
| **Container Classes** | Billing screen uses inline `contentContainerStyle={{ paddingVertical: 16 }}`. | Standardize to NativeWind `contentContainerClassName="p-4 pb-24 gap-4"`. |
| **Loading / Errors** | `visitor/index.tsx` implements manual `ActivityIndicator` rather than delegating to `ScreenShell`. | Pass `loading` & `error` props into `<ScreenShell>` to leverage standard skeleton loaders. |
