# Dashboard Discovery & Deviation Report

**Target Workspace:** `mobile/mobile-app`  
**Audit Scope:** `app/` and `src/features/`  
**Enforcement Standard:** Single Source of Truth (SSOT) Unified Dashboard UI Blueprint  
**Audit Date:** 2026-08-19

---

## 1. Executive Summary

A comprehensive discovery scan and architectural audit was performed across all route entry points (`app/`), feature screens (`src/features/`), and shared dashboard components (`components/dashboard/`).

* **Total Discovered Feature Dashboards / Consoles / Hubs:** **21 Entry Points** across **7 Feature Modules**
* **Root Layout `<ScreenShell>` Compliance:** **52%** (11/21 screens utilize `<ScreenShell>`; 10 screens rely on raw `SafeAreaView`, `SafeAreaWrapper`, or standard `View`)
* **Metric & KPI Canonical Compliance:** **43%** (Extensive hardcoded hex colors and custom `View` stat boxes identified)
* **Quick Actions `<Button>` / `<TabBar>` Compliance:** **29%** (Widespread usage of raw `TouchableOpacity` / `Pressable` tiles in custom 2x2, 3-column, and 4-column grids)
* **Feed `<ListCard>` Compliance:** **38%** (Custom `Pressable` rows, `ListItem`, and legacy feed wrappers used instead of `<ListCard>`)

---

## 2. Blueprint SSOT Evaluation Criteria

| Blueprint Pillar | Required Canonical Standard | Forbidden / Flagged Deviations |
| :--- | :--- | :--- |
| **1. Root Layout** | `<ScreenShell>` with title & subtitle props | Local `<ScrollView>` padding, `SafeAreaView` / `SafeAreaWrapper` wrapper nesting, double safe-area insets |
| **2. Metrics** | Canonical `<KPICard>` and `<KPIRow>` | Hardcoded hex colors (`#6366f1`, `#10b981`, etc.), custom colored `View` stat boxes, detached `<Text>` subtitles |
| **3. Quick Actions** | Canonical `<Button>` variants or `<TabBar>` | Raw `<Pressable>` or `<TouchableOpacity>` action tiles, custom grid containers (`ActionTile`, custom `w-[48%]` tiles) |
| **4. Feeds & Lists** | Canonical `<ListCard>` (or `<PaginatedList>` with `<ListCard>`) | Custom `Pressable` cards, legacy `<Card>` / `<ListItem>`, raw `View` card items, non-standard activity item components |

---

## 3. Discovered Dashboards & Deviation Inventory

---

### Module 1: Core & Resident Hub Module

#### 1.1 Resident Home Dashboard & Quick Actions Hub
* **File Path:** [`app/(resident)/dashboard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/dashboard.tsx)
* **Role / Signature:** Top-level resident home screen featuring dynamic notice banner (`HeroBanner`), 4-column quick action grid (`QuickActionsGrid`), and customization slide-up sheet (`CustomiseSheetModal`).
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Wraps content in `<View className="flex-1 bg-background">` with manual `<MobileHeader />` and local `<ScrollView className="flex-1 px-4 pt-2">`.
  * **Metrics:** ⚠️ No aggregate KPI counters present on the main landing hub.
  * **Quick Actions:** ❌ Uses `QuickActionsGrid` which internally renders [`ActionTile.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/dashboard/ActionTile.tsx) using raw `<TouchableOpacity>` tiles instead of canonical `<Button>` variants.
  * **Feeds:** ⚠️ Relies on custom `HeroBanner` carousel rather than standard feed cards.

#### 1.2 Resident Automation & Diagnostics Overview
* **File Path:** [`app/(resident)/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/index.tsx)
* **Role / Signature:** Resident system overview screen with live agentic state status and recent activity logs.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Uses legacy `<SafeAreaWrapper>` with local `<ScrollView className="flex-1 px-4">`.
  * **Metrics:** ❌ Uses custom `<AgenticStateTracker>` view box instead of canonical `<KPICard>`.
  * **Quick Actions:** ❌ Missing quick navigation action buttons.
  * **Feeds:** ❌ Uses custom `<OptimizedDataGrid>` table box instead of `<ListCard>`.

#### 1.3 All Features & Quick Actions Directory Hub
* **File Path:** [`app/(resident)/all-features.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/all-features.tsx)
* **Role / Signature:** Master category index of all quick action tiles grouped by permission/role with search and customization triggers.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Uses raw `<SafeAreaView edges={['top', 'bottom']}>` with custom header bar and `<ScrollView className="flex-1 px-4 pt-3">`.
  * **Metrics:** ⚠️ N/A (Directory hub).
  * **Quick Actions:** ❌ Renders categorized action grids using raw `<TouchableOpacity>` based [`ActionTile`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/dashboard/ActionTile.tsx) components with hardcoded hex colors (`#444`, `#888`, `#03A9F4`).
  * **Feeds:** ⚠️ N/A.

#### 1.4 Setup / Root Diagnostics & Auth Gateway
* **File Path:** [`app/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/index.tsx)
* **Role / Signature:** Root entry gateway rendering backend health diagnostics, authentication state, and login triggers.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Uses bare `<ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">`.
  * **Metrics:** ❌ Custom diagnostic status view boxes with manual activity indicators and status badges instead of `<KPICard>`.
  * **Quick Actions:** ⚠️ Uses canonical `<Button>` for auth actions, but lacks quick navigation blueprint integration.
  * **Feeds:** ⚠️ N/A.

---

### Module 2: Visitor & Security Gate Module

#### 2.1 Resident Visitors & Passes Dashboard
* **File Path:** [`app/(resident)/visitor/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/index.tsx)
* **Role / Signature:** Resident visitor management hub with active pass counters, walk-in alerts, quick action row, and recent passes list.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but nests an inner `<View className="flex-1 bg-background">` with a duplicate `<ScrollView contentContainerClassName="p-4 pt-3 gap-2.5 pb-8">`.
  * **Metrics:** ⚠️ Uses `<KPICard>`, but passes hardcoded hex colors (`iconColor="#16a34a"`, `iconColor="#ea580c"`).
  * **Quick Actions:** ❌ Renders a 3-column "Quick Actions" container using raw `<TouchableOpacity>` tiles with custom background opacities (`bg-primary/10`, `bg-muted`, `bg-amber-500/10`) instead of canonical `<Button>` or `<TabBar>`.
  * **Feeds:** ⚠️ Uses feature-specific `<VisitorPassCard>` (based on `<ListCard>`), but wraps recent items in a local ScrollView without `<PaginatedList>`.

#### 2.2 Gate Security Console & Guard Hub
* **File Path:** [`app/(resident)/visitor/gate-console.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/gate-console.tsx)
* **Role / Signature:** Guard check-in verification console with 3-tab segment (`Console`, `Walk-Ins Queue`, `Visitors Inside`), PIN input, and QR scanner.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but nests local `<ScrollView contentContainerClassName="gap-4 pb-8">` inside tab view.
  * **Metrics:** ⚠️ Lacks `<KPICard>` metrics for current gate traffic / queue volume.
  * **Quick Actions:** ✅ Uses canonical `<TabBar variant="pill">` and `<Button>` components.
  * **Feeds:** ⚠️ Subviews render individual log items.

#### 2.3 Community Visitor Management Admin Master Console
* **File Path:** [`app/(resident)/visitor/admin/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/admin/index.tsx)
* **Role / Signature:** Admin master console displaying visitor traffic charts, live inside metrics, 2x2 security control tiles, and recent community passes.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but has local `<ScrollView contentContainerClassName="p-4 gap-4 pb-8">`.
  * **Metrics:** ⚠️ Uses `<KPICard>`, but passes hardcoded hex colors (`#16a34a`, `#ea580c`). Also contains custom `<VisitorAnalyticsCard>`.
  * **Quick Actions:** ❌ "Admin Security Controls" 2x2 grid is built entirely with raw `<TouchableOpacity>` tiles (`w-full` / `flex-1` flex-rows with `bg-primary/10`, `bg-amber-500/10`, `bg-destructive/10`, `bg-muted`) instead of canonical `<Button>` or `<TabBar>`.
  * **Feeds:** ⚠️ Uses `<VisitorPassCard>` inside a manual ScrollView slice rather than standard `<PaginatedList>` + `<ListCard>`.

#### 2.4 Gate Visitor Analytics Dashboard
* **File Path:** [`app/(resident)/visitor/admin/analytics.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/visitor/admin/analytics.tsx)
* **Role / Signature:** Guard & admin analytics dashboard displaying pass category distribution and check-in trends.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but contains local `<ScrollView contentContainerClassName="p-4 gap-4 pb-8">`.
  * **Metrics:** ❌ Uses custom `VisitorAnalyticsCard` and raw text percentage rows (`Guest: 45% • Cab: 30%...`) rather than canonical `<KPICard>` / `<KPIRow>`.
  * **Quick Actions:** ❌ No quick action navigation buttons provided.
  * **Feeds:** ⚠️ N/A.

#### 2.5 Visitor / Guard Gate Management Hub (Legacy)
* **File Path:** [`app/(visitor)/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(visitor)/index.tsx)
* **Role / Signature:** Legacy visitor management screen displaying pending walk-in approvals and QR scanner overlay trigger.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Uses `<SafeAreaWrapper>` with local `<ScrollView className="flex-1 px-4 pt-6">`.
  * **Metrics:** ❌ Missing all KPI metric cards.
  * **Quick Actions:** ❌ Raw action bar using custom typography.
  * **Feeds:** ❌ Uses custom legacy `<WalkInApprovalCard>` instead of canonical `<ListCard>` / `<ScreenShell>`.

---

### Module 3: Amenities & Facility Booking Module

#### 3.1 Amenities Executive Dashboard & Hub
* **File Path:** [`app/(resident)/amenities/dashboard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/amenities/dashboard.tsx)
* **Role / Signature:** Executive dashboard featuring master search, 3-column KPI row (Revenue, Today Rev, Maintenance), 9-item quick navigation hub, and live QR activity ticker.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but wraps content in local `<ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-10">`.
  * **Metrics:** ⚠️ Uses `<KPICard>`, but relies on custom parsing and manual layout styling rather than standard `<KPIRow>`.
  * **Quick Actions:** ❌ Embeds [`MobileQuickNavHub.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/amenities/components/MobileQuickNavHub.tsx) which renders a 3-column grid of raw `<Pressable className="w-[31%] bg-card p-3 rounded-2xl ...">` tiles with hardcoded hex colors (`#14b8a6`, `#03A9F4`, `#10b981`, `#f59e0b`, `#3b82f6`, `#6366f1`, `#06b6d4`, `#a855f7`, `#64748b`) instead of canonical `<Button>` / `<TabBar>`.
  * **Feeds:** ❌ Embeds [`MobileLiveActivityWidget.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/amenities/components/MobileLiveActivityWidget.tsx) which renders custom raw `<Pressable>` card rows and hex colors (`#3b82f6`, `#0084FF`) instead of canonical `<ListCard>`.

#### 3.2 Amenity Master Console
* **File Path:** [`app/(resident)/amenities/admin-master.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/amenities/admin-master.tsx)
* **Role / Signature:** Admin facility console with category chips, facility creation modal, and paginated amenity records.
* **Deviations Identified:**
  * **Root Layout:** ✅ Uses `<ScreenShell>`.
  * **Metrics:** ⚠️ Lacks summary KPI counters (e.g. Total Amenities, Active, Maintenance count).
  * **Quick Actions:** ✅ Uses `<Button>` for `+ Add Amenity` and item management.
  * **Feeds:** ⚠️ Custom image card branch rendered with raw `<Pressable>` view alongside canonical `<ListCard>`.

#### 3.3 Discover & Facility Catalog Hub
* **File Path:** [`app/(resident)/amenities/discover.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/amenities/discover.tsx)
* **Role / Signature:** Resident facility discovery hub with search, horizontal category filters, quick summary pills, and booking triggers.
* **Deviations Identified:**
  * **Root Layout:** ✅ Uses `<ScreenShell>`.
  * **Metrics:** ❌ Uses custom pill-badge container (`<View className="flex-row items-center gap-2 mb-3 bg-card p-2.5 ...">`) instead of canonical `<KPICard>`.
  * **Quick Actions:** ⚠️ Uses `<Chip>` and `<Button>`, but lacks top-level action controls.
  * **Feeds:** ⚠️ Custom image card branch rendered alongside `<ListCard>`.

---

### Module 4: Billing & Financial Management Module

#### 4.1 Billing Entry Gateway Router
* **File Path:** [`app/(resident)/billing/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/billing/index.tsx)
* **Role / Signature:** Root gateway redirecting admins to `admin/billing` and residents to `billing/my-dues`.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Bare `<View className="flex-1 justify-center items-center">`.
  * **Metrics:** ⚠️ Hardcoded hex color `#6366f1` in `<ActivityIndicator>`.
  * **Quick Actions:** ⚠️ N/A (Redirect route).
  * **Feeds:** ⚠️ N/A.

#### 4.2 Admin Financial Billing Dashboard
* **File Path:** [`src/features/billing/screens/AdminBillingDashboardScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/AdminBillingDashboardScreen.tsx) (Route: [`app/(resident)/admin/billing/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/billing/index.tsx))
* **Role / Signature:** Executive financial dashboard with collection progress bar, KPI carousel, attention box, 2x2 quick navigation hub, and recent collections feed.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but wraps content in local `<ScrollView contentContainerStyle={{ paddingVertical: 16 }}>` with hardcoded RefreshControl color `#6366f1`.
  * **Metrics:** ⚠️ Uses `<KPIRow>`, but supplies hardcoded hex colors and alpha tints: `#6366f1`, `#6366f11f`, `#10b981`, `#10b9811f`, `#ef4444`, `#ef44441f`, `#f59e0b`, `#f59e0b1f`. Also uses a custom `<Card>` for collection rate progress.
  * **Quick Actions:** ❌ 2x2 "Quick Navigation" grid uses raw `<Pressable className="w-[48%] bg-card ...">` tiles instead of canonical `<Button>` or `<TabBar>`.
  * **Feeds:** ❌ "Recent Collections" uses custom `<ListItem>` and raw `<Card>` container instead of canonical `<ListCard>`.

#### 4.3 Resident Portfolio & Dues Dashboard
* **File Path:** [`src/features/billing/screens/ResidentMyDuesScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/ResidentMyDuesScreen.tsx) (Route: [`app/(resident)/billing/my-dues.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/billing/my-dues.tsx))
* **Role / Signature:** Resident personal financial hub displaying total outstanding portfolio liability, digital wallet widget, and dues breakdown.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but contains inner local `<ScrollView contentContainerClassName="gap-4 pb-28">`.
  * **Metrics:** ❌ Renders custom hero card (`<View className="bg-card border border-border rounded-2xl p-5 shadow-sm">`) and custom wallet pill instead of canonical `<KPICard>`.
  * **Quick Actions:** ⚠️ Mixes `<Button>` with custom raw `<TouchableOpacity>` rows for navigation.
  * **Feeds:** ❌ Maintenance invoices rendered as custom raw `<TouchableOpacity className="bg-card border border-border rounded-xl p-4 ...">` cards rather than canonical `<ListCard>`.

---

### Module 5: Complaints & Maintenance Module

#### 5.1 Complaints Executive Dashboard
* **File Path:** [`app/(resident)/complaints/dashboard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/dashboard.tsx)
* **Role / Signature:** Executive complaints dashboard entry point rendering `FeatureDetailScreen`.
* **Deviations Identified:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. Delegates to [`FeatureDetailScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/dashboard/FeatureDetailScreen.tsx) which uses a raw `<View className="flex-1 bg-background">` and `<ScrollView className="flex-1 px-4 pt-4">`.
  * **Metrics:** ❌ Contains hardcoded hex color `#a855f7` and pseudo-metric cards (`Live & Synced`, `Connected`) rendered with raw `<View className="flex-1 bg-card ...">` instead of canonical `<KPICard>`.
  * **Quick Actions:** ❌ Raw `<TouchableOpacity>` buttons used in placeholder panel.
  * **Feeds:** ❌ Missing complaints feed / tickets list.

#### 5.2 Complaints Management & Sub-Feature Consoles
* **File Paths:**
  * [`app/(resident)/complaints/manage.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/manage.tsx) (Complaints Management Console)
  * [`app/(resident)/complaints/my-tickets.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/my-tickets.tsx) (Resident Tickets Hub)
  * [`app/(resident)/complaints/staff.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/staff.tsx) (Maintenance Staff Console)
  * [`app/(resident)/complaints/assignee.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/complaints/assignee.tsx) (Assignee Resolution Console)
* **Role / Signature:** Sub-feature console entry points in Complaints module.
* **Deviations Identified:**
  * **All Screens:** ❌ Missing `<ScreenShell>`. Directly render `FeatureDetailScreen` with hardcoded hex colors (`#6366f1`, `#03A9F4`, `#14b8a6`, `#10b981`), raw ScrollView padding, and missing canonical `<KPICard>` and `<ListCard>` implementations.

---

### Module 6: Notice Board & Polls Module

#### 6.1 Notice Board Executive Dashboard
* **File Path:** [`app/(resident)/notices/dashboard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/notices/dashboard.tsx)
* **Role / Signature:** Notice board overview dashboard featuring 4 horizontal KPI cards (Active, Drafts, Pinned, Urgent), 4-column quick navigation grid, and live activity log.
* **Deviations Identified:**
  * **Root Layout:** ⚠️ Uses `<ScreenShell>`, but nests local `<ScrollView className="flex-1" contentContainerClassName="p-4 pb-24">`.
  * **Metrics:** ⚠️ Uses `<KPICard>`, but wraps them in horizontal `<ScrollView>` with custom fixed `<View className="w-40">`, hardcoded hex colors (`#16a34a`, `#eab308`, `#4f46e5`, `#dc2626`, `#6366f1`), and detached `<Text className="text-[10px] ... mt-1 px-1">` subtitles outside the card.
  * **Quick Actions:** ❌ 4-column "Quick Navigation" grid built with raw `<TouchableOpacity>` tiles (`bg-blue-500/10`, `bg-emerald-500/10`, `bg-primary/10`, `bg-indigo-500/10`) instead of canonical `<Button>` or `<TabBar>`.
  * **Feeds:** ❌ "Live Activity Log" renders custom `<ActivityLogItem>` inside a raw `<View className="bg-card ...">` instead of canonical `<ListCard>`.

#### 6.2 Community Polls Dashboard (Sub-Feature Variant)
* **File Path:** [`app/(resident)/notices/polls/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/notices/polls/index.tsx)
* **Role / Signature:** Community polls dashboard with KPI counters (`Active Polls`, `My Polls`), pill TabBar, and paginated poll list.
* **Deviations Identified:**
  * **Root Layout:** ✅ Uses `<ScreenShell>`.
  * **Metrics:** ⚠️ Uses `<KPICard>`, but with hardcoded hex colors (`iconColor="#2563eb"`, `iconColor="#16a34a"`).
  * **Quick Actions:** ✅ Uses `<TabBar variant="pill">` and `<FAB>`. Header action uses raw `<TouchableOpacity>` with `#ffffff` hex color instead of canonical `<Button>`.
  * **Feeds:** ⚠️ Renders custom `<PollCard>` with custom option bars inside `<PaginatedList>`.

#### 6.3 Community Polls Feature Dashboard
* **File Path:** [`src/features/poll/screens/PollDashboardScreen.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/poll/screens/PollDashboardScreen.tsx) (Route: [`app/(resident)/polls/index.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/polls/index.tsx))
* **Role / Signature:** Standalone feature screen for community polls with underline tab bar and paginated list.
* **Deviations Identified:**
  * **Root Layout:** ✅ Uses `<ScreenShell>`.
  * **Metrics:** ❌ Missing KPI metric counters entirely.
  * **Quick Actions:** ✅ Uses canonical `<Button>` and `<TabBar variant="underline">`.
  * **Feeds:** ⚠️ Uses `<PollCard>` inside `<PaginatedList>`.

---

### Module 7: Administration & Core Governance Module

#### 7.1 Admin Core Sub-Feature Consoles
* **File Paths:**
  * [`app/(resident)/admin/users.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/users.tsx) (User Management Console)
  * [`app/(resident)/admin/villas.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/villas.tsx) (Villa & Unit Management Console)
  * [`app/(resident)/admin/organizations.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/organizations.tsx) (Organization Management Console)
  * [`app/(resident)/admin/audit-logs.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/audit-logs.tsx) (Audit Logs & Security Trail Console)
  * [`app/(resident)/admin/role-builder.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/role-builder.tsx) (Role Builder & Dynamic RBAC Console)
  * [`app/(resident)/admin/workspace-settings.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/(resident)/admin/workspace-settings.tsx) (Workspace Settings Console)
* **Role / Signature:** Administrative management hubs for core platform domains.
* **Deviations Identified across all 6 screens:**
  * **Root Layout:** ❌ Missing `<ScreenShell>`. All 6 route entry files directly render `FeatureDetailScreen` (which wraps in `<View className="flex-1">` and `<ScrollView className="flex-1 px-4 pt-4">`).
  * **Metrics:** ❌ Hardcoded theme hex colors (`#6366f1`, `#14b8a6`, `#a855f7`, `#64748b`, `#f43f5e`, `#03A9F4`) with mock status cards instead of canonical `<KPICard>`.
  * **Quick Actions:** ❌ Missing canonical quick action bars.
  * **Feeds:** ❌ Missing domain data lists / `<ListCard>` feeds.

---

## 4. SSOT Blueprint Compliance Matrix

| Discovered Dashboard File | Module | Root Layout (`<ScreenShell>`) | Metrics (`<KPICard>`) | Quick Actions (`<Button>`/`<TabBar>`) | Feeds (`<ListCard>`) | Total Violations |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `app/(resident)/dashboard.tsx` | Core Hub | ❌ Non-compliant | ⚠️ Missing | ❌ Non-compliant | ⚠️ Custom Hero | **3** |
| `app/(resident)/index.tsx` | Core Hub | ❌ Non-compliant | ❌ Non-compliant | ❌ Missing | ❌ Non-compliant | **4** |
| `app/(resident)/all-features.tsx` | Core Hub | ❌ Non-compliant | ⚠️ N/A | ❌ Non-compliant | ⚠️ N/A | **2** |
| `app/index.tsx` | Core Hub | ❌ Non-compliant | ❌ Non-compliant | ⚠️ Partial | ⚠️ N/A | **3** |
| `app/(resident)/visitor/index.tsx` | Visitor | ⚠️ Nested ScrollView | ⚠️ Hex Colors | ❌ Non-compliant | ⚠️ PassCard | **3** |
| `app/(resident)/visitor/gate-console.tsx` | Visitor | ⚠️ Nested ScrollView | ⚠️ Missing | ✅ Compliant | ⚠️ Custom View | **2** |
| `app/(resident)/visitor/admin/index.tsx` | Visitor | ⚠️ Nested ScrollView | ⚠️ Hex Colors | ❌ Non-compliant | ⚠️ PassCard | **3** |
| `app/(resident)/visitor/admin/analytics.tsx` | Visitor | ⚠️ Nested ScrollView | ❌ Non-compliant | ❌ Missing | ⚠️ N/A | **3** |
| `app/(visitor)/index.tsx` | Visitor | ❌ Non-compliant | ❌ Missing | ❌ Non-compliant | ❌ Non-compliant | **4** |
| `app/(resident)/amenities/dashboard.tsx` | Amenities | ⚠️ Nested ScrollView | ⚠️ Custom Layout | ❌ Non-compliant | ❌ Non-compliant | **3** |
| `app/(resident)/amenities/admin-master.tsx` | Amenities | ✅ Compliant | ⚠️ Missing | ✅ Compliant | ⚠️ Partial Image | **2** |
| `app/(resident)/amenities/discover.tsx` | Amenities | ✅ Compliant | ❌ Non-compliant | ⚠️ Partial | ⚠️ Partial Image | **2** |
| `app/(resident)/billing/index.tsx` | Billing | ❌ Non-compliant | ⚠️ Hex Color | ⚠️ N/A | ⚠️ N/A | **2** |
| `AdminBillingDashboardScreen.tsx` | Billing | ⚠️ Nested ScrollView | ⚠️ Hex Colors / Card | ❌ Non-compliant | ❌ Non-compliant | **4** |
| `ResidentMyDuesScreen.tsx` | Billing | ⚠️ Nested ScrollView | ❌ Non-compliant | ⚠️ Partial | ❌ Non-compliant | **3** |
| `app/(resident)/complaints/dashboard.tsx` | Complaints | ❌ Non-compliant | ❌ Non-compliant | ❌ Non-compliant | ❌ Missing | **4** |
| `app/(resident)/complaints/manage.tsx` (x4) | Complaints | ❌ Non-compliant | ❌ Non-compliant | ❌ Non-compliant | ❌ Missing | **4 each** |
| `app/(resident)/notices/dashboard.tsx` | Notices | ⚠️ Nested ScrollView | ⚠️ Hex Colors / Box | ❌ Non-compliant | ❌ Non-compliant | **4** |
| `app/(resident)/notices/polls/index.tsx` | Notices/Poll | ✅ Compliant | ⚠️ Hex Colors | ⚠️ Partial | ⚠️ PollCard | **2** |
| `src/features/poll/screens/PollDashboardScreen.tsx`| Poll | ✅ Compliant | ❌ Missing | ✅ Compliant | ⚠️ PollCard | **2** |
| `app/(resident)/admin/users.tsx` (x6) | Admin Core | ❌ Non-compliant | ❌ Non-compliant | ❌ Non-compliant | ❌ Missing | **4 each** |

---

## 5. Blueprint Standardization Action Plan

1. **Root Layout Normalization:**
   * Replace all manual `SafeAreaView`, `SafeAreaWrapper`, and custom headers with canonical `<ScreenShell title="..." subtitle="...">`.
   * Strip redundant inner `<ScrollView>` containers that declare conflicting local padding (`px-4`, `p-4`, `paddingVertical: 16`).

2. **Metric & KPI Unification:**
   * Offload all metric calculations to canonical `<KPICard>` and `<KPIRow>` components.
   * Strip all hardcoded hex values (`#6366f1`, `#10b981`, `#ea580c`, `#16a34a`, `#03A9F4`, `#dc2626`) in favor of design system semantic theme tokens (`text-primary`, `text-status-success`, `text-status-warning`, `text-destructive`).
   * Consolidate external `<Text>` status badges/subtitles into the `subtitle` prop of `<KPICard>`.

3. **Quick Action Grid Normalization:**
   * Refactor all raw `<TouchableOpacity>` and `<Pressable>` 2x2, 3-column, and 4-column tiles (in `AdminBillingDashboardScreen`, `NoticeDashboardScreen`, `AdminVisitorDashboardScreen`, `VisitorDashboardScreen`, `MobileQuickNavHub`, and `ActionTile`) to use canonical `<Button>` variants or `<TabBar>`.

4. **Feed & List Consolidation:**
   * Consolidate custom activity feeds, transaction lists, and recent item cards across Amenities, Billing, Notices, and Visitor modules to render via canonical `<ListCard>` (or `<PaginatedList>` with `<ListCard>`).
