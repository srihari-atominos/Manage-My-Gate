# Admin Dashboard Reference & UI/UX Design System Guide

> **Screen Reference URL:** `http://localhost:8081/admin/billing`  
> **Source Screen File:** [`mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx)  
> **Component Catalog:** [`mobile/mobile-app/COMPONENTS_CATALOG.md`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/COMPONENTS_CATALOG.md)  
> **Audience:** UI/UX Designers & Mobile Frontend Engineers designing administrative overview dashboards.

---

## 1. Executive Summary & Page Purpose

The **Admin Billing Dashboard** (`/admin/billing`) serves as the administrative command center for community finance managers, treasurers, and property administrators.

The primary design objectives are:
1. **Glanceable Hierarchy:** Immediate visibility into top-level financial metrics (billed, collected, arrears, pending clearance) without cognitive overload.
2. **Goal Tracking:** Visual progress towards monthly collection targets.
3. **Exception Handling:** Prominent notification and one-tap action on pending offline clearance items requiring administrative review.
4. **Hub Navigation:** Quick-launch grid linking directly to deep operational sub-screens (Ledger, Assessments, Personal Dues, Digital Wallet, Payment History).
5. **Recent Activity Snapshot:** Clean, compact preview of the 3 latest transactions linked to the full ledger.
6. **Primary Creation CTA:** Unobtrusive Floating Action Button (FAB) allowing admins to initiate new billing assessments from anywhere on the screen.

---

## 2. Visual Layout Blueprint (Wireframe)

```
┌───────────────────────────────────────────────────────────┐
│ [←]  Billing Overview                    [💳 My Dues]     │  <-- Zone 1: ScreenShell Header
│      Community Collection & Dues Snapshot                 │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │ 🧾 Gross Billed         │  │ 📈 Total Collected     │  │  <-- Zone 2: KPIDashboardStrip
│  │ ₹4,85,000               │  │ ₹3,60,000              │  │      (2x2 Responsive Grid)
│  │ 142 total invoices      │  │ ↑ 74% rate             │  │
│  └─────────────────────────┘  └────────────────────────┘  │
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │ ⚠️ Unpaid Arrears       │  │ 🕒 Pending Clearance   │  │
│  │ ₹1,25,000               │  │ ₹45,000                │  │
│  │ Pending collection  (→) │  │ 4 submissions      (→) │  │
│  └─────────────────────────┘  └────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🎯 Current Month Collection Progress           74%  │  │  <-- Zone 3: Target Progress Card
│  │ [████████████████████████░░░░░░░░░]                 │  │      (Card + ProgressBar)
│  │ Collected: ₹3,60,000               Billed: ₹4,85,000│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🕒 Pending Offline Payment Verification             │  │  <-- Zone 4: Attention Callout
│  │    ₹45,000 across 4 submissions     [ Review (→) ]  │  │      (Conditional Exception Box)
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  QUICK NAVIGATION                                         │  <-- Zone 5: ActionGrid Hub
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │      (3-Column Icon Grid)
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
│  RECENT INVOICES                            View All (→)  │  <-- Zone 6: Recent Activity Feed
│  ┌─────────────────────────────────────────────────────┐  │      (Strict 3-Item Limit)
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
│                                            │ ➕ New    │  │  <-- Zone 7: Floating Action Button
│                                            │ Assessment│  │      (Bottom-Right FAB)
│                                            └───────────┘  │
│  [pb-28 / 112px Bottom Inset Padding for FAB Clearance]   │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Component Inventory & Catalog Breakdown

All components are imported directly from the authoritative mobile component catalog (`mobile/mobile-app/components/`). **Zero custom inline buttons, inputs, or primitive duplicates are used.**

| UI Component | Catalog Import Path | Props & Configuration in this Screen | Purpose & UX Rationale |
| :--- | :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | `title="Billing Overview"`<br>`subtitle="Community Collection & Dues Snapshot"`<br>`iconName="BarChart3"`<br>`loading={loadingStates.fetchKPIs && !kpis}`<br>`headerRight={<Button ... />}` | Outer layout wrapper providing safe-area insets, back button, contextual title/subtitle, pull-to-refresh spinner, and header action slot. |
| **`Button`** | `@/components/ui/button` | `variant="outline"`, `size="sm"`<br>`variant="default"`, `size="lg"` | 1. Header right slot button (`"My Dues"` with `CreditCard` icon) for switching to personal resident dues.<br>2. Attention banner `"Review"` button.<br>3. Access Denied fallback button. |
| **`KPIDashboardStrip`** | `@/components/ui/KPIDashboardStrip` | `cards={kpiCards}`<br>`loading={...}`<br>`layout="grid2x2"` | High-level metrics matrix rendering a 2x2 grid with built-in skeleton loader during data fetching. |
| **`KPICard`** | `@/components/ui/KPICard` | `title`, `value`, `subtitle`, `trend`, `iconName`, `variant`, `onPress` | Individual metric cards: (1) Gross Billed (`default`), (2) Total Collected (`success`), (3) Unpaid Arrears (`destructive` with deep link), (4) Pending Clearance (`warning` with deep link). |
| **`Card`** | `@/components/common/Card` | `className="bg-card border border-border rounded-2xl p-4"` | Theme-token container enclosing the target progress bar and recent activity placeholder. |
| **`ProgressBar`** | `@/components/common/ProgressBar` | `progress={collectionRate}`<br>`className="h-2 rounded-full mb-3"` | Linear visual progress indicator displaying current collection percentage (`0% - 100%`). |
| **`ActionGrid`** | `@/components/ui/ActionGrid` | `title="Quick Navigation"`<br>`items={navItems}` | Universal 3-column launcher grid with icons, 10% tinted background pills, route links, and notification badges. |
| **`SectionHeader`** | `@/components/common/SectionHeader` | `title="Recent Invoices"`<br>`actionLabel="View All"`<br>`onAction={...}` | Grouping header with right-aligned action button linking to the full ledger. |
| **`ListItem`** | `@/components/common/ListItem` | `title={...}`, `subtitle={...}`, `leftIcon={FileText}`, `onPress={...}` | Standard list rows displaying recent invoice activity with icons, metadata, and right accessory chevron. |
| **`FAB`** | `@/components/ui/FAB` | `iconName="Plus"`<br>`label="New Assessment"`<br>`onPress={...}` | Prominent Floating Action Button in the bottom-right corner for creating a new assessment. |
| **`ErrorBanner`** | `@/components/feedback/ErrorBanner` | `message={error}`<br>`onDismiss={resetBillingError}` | Dismissable alert banner shown when API operations encounter errors. |
| **`Text`** | `@/components/ui/text` | Variant classes: `text-xl font-bold`, `text-xs text-muted-foreground` | Typography primitive wrapping text with active theme colors. |
| **`Icon`** | `@/components/ui/icon` | `as={Target}`, `as={Clock}`, `as={ShieldAlert}` | Icon primitive wrapping Lucide vector icons. |

---

## 4. Design System & Architectural Rules Followed

The screen strictly complies with the **Mobile Component Catalog Rules** (`.agents/rules/mobile-component-catalog.md`) and **Mobile Workflow Rules** (`.agents/rules/mobile-workflow-rules.md`):

### Rule 1: Catalog-First Component Reuse Mandate (Catalog Rule 1.1 - 1.3)
* **Principle:** Every UI screen must reuse existing components from `COMPONENTS_CATALOG.md`.
* **Application:** `ScreenShell`, `KPIDashboardStrip`, `Card`, `ProgressBar`, `ActionGrid`, `SectionHeader`, `ListItem`, `FAB`, and `Button` are all imported from design system barrels. No inline `<TouchableOpacity>` button or custom styled primitives were duplicated.

### Rule 2: Strict 3-Item Limit for Dashboard Activity Previews (Catalog Rule V.1)
* **Principle:** Top-level executive and resident dashboards MUST ONLY render a preview of at most 3 items in their Recent Activity / Feed section. Never render full datasets or unbounded arrays on dashboard screens.
* **Application:**
  ```tsx
  // Strict 3-Item Limit for Dashboard Activity Previews per Mobile Rule V.1
  const recentTransactions = Array.isArray(invoicesList) ? invoicesList.slice(0, 3) : [];
  ```
  The full dataset is accessed via the `<SectionHeader actionLabel="View All">` button which routes to the full ledger screen (`/admin/billing/ledger`).

### Rule 3: Scroll Containment & FAB Clearance (Catalog Rule V.2)
* **Principle:** Any screen with a Floating Action Button (`<FAB>`) MUST configure its `<ScrollView>` with adequate bottom content padding (minimum `pb-28` or `112px`) to prevent list items from scrolling beyond the visible viewport or getting clipped underneath the bottom FAB.
* **Application:**
  ```tsx
  <ScrollView
    className="flex-1 bg-background"
    contentContainerClassName="p-4 pb-28 gap-5"
  >
  ```

### Rule 4: RTL & Logical Spacing Mandate (Workflow Rule IX / Catalog Rule 2)
* **Principle:** Physical directional margin and padding classes (`mr-`, `ml-`, `pr-`, `pl-`) are strictly forbidden to ensure native Arabic (RTL) support.
* **Application:** Uses NativeWind logical spacing utility classes: `me-2`, `me-3`, `ms-2`, `pe-3`, `ps-3`, `text-start`.

### Rule 5: Semantic Theme Tokens & Dark Mode Compatibility (Workflow Rule IV)
* **Principle:** No hardcoded hex color codes (`#ffffff`, `#000000`) or static slate color names (`bg-slate-50`) in surfaces and text.
* **Application:** Uses design system tokens (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-destructive/10`, `text-destructive`). Automatically adapts across Light and Dark modes.

### Rule 6: The "Thin View" Pattern & Custom Hook Abstraction (Workflow Rule I & V)
* **Principle:** Visual screen components must remain pure UI renderers without direct Axios/fetch calls.
* **Application:** The screen imports `useBilling()`. The hook provides all state (`kpis`, `invoicesList`, `loadingStates`, `error`) and action dispatches (`loadAdminDashboard`, `resetBillingError`).

### Rule 7: Real-Time Protocol Decoupling via Dedicated Hook (Workflow Rule XI)
* **Principle:** WebSockets must never be instantiated directly within UI components.
* **Application:** The screen calls `useBillingSocket()` at the top. The hook listens to real-time events in the background and silently dispatches Redux updates.

### Rule 8: RBAC & Fallback Access Control (Workflow Rule VIII)
* **Principle:** Non-admin users must be handled gracefully with an informative fallback instead of a blank screen or unhandled error.
* **Application:** If `hasDashboardPermission === false`, the screen displays an "Access Denied" screen with a `ShieldAlert` icon and a `"Return to My Dues"` button.

---

## 5. UI/UX Replication Guide: Building Similar Dashboards for Other Features

When creating an administrative dashboard for another feature domain (e.g., **Visitor Management**, **Facility Bookings**, **Amenity Management**, or **Incident / Helpdesk Tickets**), use this structured template:

### Step 1: Enclose with `<ScreenShell>`
* Set a concise title (e.g., `"Visitor Overview"` or `"Facility Bookings"`).
* Set a subtitle describing the scope (e.g., `"Daily Gate Traffic & Pre-Approvals"`).
* Add a relevant Lucide icon (e.g., `"Users"`, `"Calendar"`, `"ShieldCheck"`).
* In the `headerRight` slot, add an outline button linking to the personal/resident version of the feature (e.g., `"My Passes"`, `"My Bookings"`).

### Step 2: Configure a 4-Card `<KPIDashboardStrip>`
Use `layout="grid2x2"` with 4 metric cards following this semantic pattern:
1. **Total Inflow / Demand** (`variant="default"`): Total Passes, Total Requests, Total Bookings.
2. **Success / Active** (`variant="success"`): Approved, Active on Campus, Confirmed.
3. **Critical / Overdue** (`variant="destructive"`): Overstayed, Rejected, Breached SLA. *Add `onPress` to open the list filtered to this status.*
4. **Action Required** (`variant="warning"`): Pending Approvals, Pending Verification. *Add `onPress` to open the approval queue.*

### Step 3: Add a Progress / Goal Indicator Card (Optional)
If your feature tracks a quota, capacity, or SLA:
* Wrap in a `<Card className="bg-card border border-border rounded-2xl p-4">`.
* Use `<ProgressBar progress={percentage} />` with labels comparing current vs capacity/target.

### Step 4: Build a 3-Column `<ActionGrid>`
Provide 3 to 6 shortcuts to deep feature screens:
* Use standard Lucide icons with subtle background tints: `bg-emerald-500/10`, `bg-teal-500/10`, `bg-indigo-500/10`, `bg-cyan-500/10`, `bg-purple-500/10`.
* Add notification counter badges on tiles that have pending action items (e.g., badge on "Gate Approvals" when items are awaiting review).

### Step 5: Render a 3-Item Recent Activity Feed
* Use `<SectionHeader title="Recent [Items]" actionLabel="View All" onAction={() => router.push('/feature/list')} />`.
* Render **only 3 items** (`.slice(0, 3)`) using `<ListItem>` inside a bordered card container.
* Add an empty state card when no items exist.

### Step 6: Add a Bottom Floating Action Button (`<FAB>`)
* Configure `<FAB iconName="Plus" label="New [Item]" onPress={...} />` for the primary intake action.
* **Important:** Ensure the outer `<ScrollView>` has `contentContainerClassName="p-4 pb-28 gap-5"` so the FAB never covers the bottom-most list items.
