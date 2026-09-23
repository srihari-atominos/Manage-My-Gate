# Resident My Bookings Reference & UI/UX Design System Guide

> **Screen Reference URL:** `http://localhost:8081/amenities/my-bookings`  
> **Source Screen File:** [`mobile/mobile-app/app/(resident)/amenities/my-bookings.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/amenities/my-bookings.tsx)  
> **Component Catalog:** [`mobile/mobile-app/COMPONENTS_CATALOG.md`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/COMPONENTS_CATALOG.md)  
> **Audience:** UI/UX Designers & Mobile Frontend Engineers designing resident activity logs, booking cards, and multi-state pass management.

---

## 1. Executive Summary & Page Purpose

The **My Amenity Bookings Screen** (`/amenities/my-bookings`) allows residents to view, search, track, and manage their personal reservations for community amenities (e.g., Clubhouse, Swimming Pool, Tennis Court, Banquet Hall, BBQ Pavilion).

### Primary Design Objectives:
1. **At-a-Glance Reservation Passes:** Rich cards displaying facility name, assigned court/slot, reservation code, date, 12-hour time range, and guest headcount.
2. **Multi-Dimensional Lifecycle Clarity:** Clear visualization of complex real-world reservation statuses across 5 dimensions: Booking, Payment, Management Approval, Gate QR Access, and Session Attendance.
3. **Instant Filter & Search:** Real-time search by facility name or reservation ID paired with quick status tab filters (*All*, *Upcoming*, *Awaiting Approval*, *Past*, *Cancelled*).
4. **Frictionless Creation & Cancellation:** A prominent top-right CTA button (*"Book Amenity"*) to discover facilities, plus inline cancellation triggers backed by confirmation dialogs explaining refund and pass-revocation policies.

---

## 2. Visual Layout Blueprint (Wireframe)

```
┌───────────────────────────────────────────────────────────┐
│ [←]  My Amenity Bookings                  [➕ Book Amenity]│  <-- Zone 1: ScreenShell Header
│      View, manage & access your digital passes            │      Title + Subtitle + Header Action
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │  <-- Zone 2: SearchFilterBar (Row 1)
│  │ 🔍 Search by facility name or reservation #...      │  │      Real-time Search Input
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [ All ]  [ Upcoming ]  [ Awaiting Approval ]  [ Past ]   │  <-- Zone 2: SearchFilterBar (Row 2)
│  ═══════                                                  │      Horizontal Category Tabs
├───────────────────────────────────────────────────────────┤
│  VIRTUALIZED RESERVATION FEED (PaginatedList)             │  <-- Zone 3: Paginated Feed
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🎾 Tennis Court A                        [CONFIRMED]│  │  <-- Header: Facility + Booking Status
│  │ Court 2 • RES-2026-0891                     [PAID]  │  │      Subtitle + Payment Badge
│  ├─────────────────────────────────────────────────────┤  │
│  │ 📅 Sat, 28 Mar 2026   🕒 06:00 PM - 07:00 PM  👥 2  │  │  <-- Schedule & Headcount Row
│  ├─────────────────────────────────────────────────────┤  │
│  │ ┌─ Status Lifecycle Summary ──────────────────────┐ │  │  <-- Multi-Dimensional Status Box
│  │ │ 🛡️ Approval:  [APPROVED]                        │ │  │      (bg-muted/40 rounded-2xl)
│  │ │ 📲 Gate Pass: [PASS GENERATED]                  │ │  │
│  │ │ ⏳ Session:   [PENDING]                         │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                 [ Cancel Booking ]  │  │  <-- Inline Cancellation CTA
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

[ResidentCancelModal (ConfirmationModal)]
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

---

## 3. Component Inventory & Catalog Breakdown

Every visual element is imported from the canonical design system (`@/components/ui`, `@/components/common`, `@/components/feedback`):

| Component | Catalog Import Path | Props & Configuration in this Screen | Purpose & UX Role |
| :--- | :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | `title="My Amenity Bookings"`<br>`subtitle="View, manage & access your digital reservation passes"`<br>`iconName="CalendarCheck"`<br>`loading={loading && reservations.length === 0}`<br>`error={error?.message}`<br>`onRetry={refresh}`<br>`headerRight={<Button ... />}` | Outer layout shell handling safe area, navigation back button, title/subtitle typography, initial full-screen loading skeleton, error banner with retry trigger, and top-right CTA slot. |
| **`Button`** | `@/components/ui/button` | `variant="default"`, `size="sm"` (`"Book Amenity"` with `Plus` icon)<br>`variant="outline"`, `size="sm"`, `border-destructive/40` (`"Cancel Booking"`) | 1. Header action to navigate to amenity discovery (`/(resident)/amenities/discover`).<br>2. Dangerous inline cancellation trigger on individual cards. |
| **`SearchFilterBar`** | `@/components/ui/SearchFilterBar` | `searchValue={searchQuery}`<br>`onSearchChange={setSearchQuery}`<br>`sortOptions={sortOptions}`<br>`currentSort={selectedTab}`<br>`onSortChange={...}`<br>`searchPlaceholder="Search by facility name or reservation number..."` | **Unified Top Control Bar**: Instant keyword search input coupled with a horizontal scrollable tab bar (*All*, *Upcoming*, *Awaiting Approval*, *Past*, *Cancelled*). Passed directly to `ListHeaderComponent`. |
| **`PaginatedList`** | `@/components/ui/PaginatedList` | `data={filteredReservations}`<br>`pagination={pagination}`<br>`onLoadMore={loadMore}`<br>`onRefresh={refresh}`<br>`loading={loading}`<br>`refreshing={isRefreshing}`<br>`emptyIcon="CalendarX"`<br>`emptyTitle="No Bookings Found"`<br>`contentContainerClassName="px-4 pt-3 pb-28"` | High-performance virtualized feed managing infinite scroll loading, pull-to-refresh spinner, header docking, and contextual empty state screen. |
| **`ResidentReservationCard`** | Local Feature Component | `reservation={item}`<br>`onPress={handleCardPress}`<br>`onCancelPress={setCancelTarget}` | Domain card extending [`ListCard`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/ListCard.tsx) with facility title, reservation number, dual status badges, schedule metadata, 5-dimensional lifecycle box, and cancellation action. |
| **`ListCard`** | `@/components/ui/ListCard` | `title={facilityName}`<br>`subtitle={reservationNumber}`<br>`status={...}`<br>`secondaryBadge={...}`<br>`onPress={...}` | Canonical base card handling border styling (`border-border`), pressable feedback, rounded corners, and primary/secondary header badge positioning. |
| **`StatusBadge`** | `@/components/ui/StatusBadge` | `label={...}`<br>`variant={'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'}`<br>`size="sm"` | Status pill component rendering semantic variants for all 5 lifecycle statuses across the card header and status box. |
| **`ResidentCancelModal`** | Local Feature Component | `visible={!!cancelTarget}`<br>`reservation={cancelTarget}`<br>`onConfirm={handleConfirmCancel}`<br>`onClose={...}`<br>`loading={isCancelling}` | Modal wrapping [`ConfirmationModal`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/ConfirmationModal.tsx) (`variant="danger"`) that presents cancellation consequences (slot release, QR revocation, refund policy) before executing cancellation. |
| **`ConfirmationModal`** | `@/components/ui/ConfirmationModal` | `title="Cancel Reservation"`<br>`variant="danger"`<br>`confirmLabel="Yes, Cancel Booking"`<br>`cancelLabel="Keep Reservation"` | Canonical confirmation dialog preventing accidental booking cancellations. |
| **`Text`** | `@/components/ui/text` | Variant classes: `variant="muted"`, `text-xs`, `font-semibold` | Theme-aware typography wrapper. |
| **`Icon`** | `@/components/ui/icon` | `as={Calendar}`, `as={Clock}`, `as={Users}`, `as={ShieldCheck}`, `as={QrCode}`, `as={Hourglass}` | Lucide vector icon wrapper. |

---

## 4. Design System & Architectural Rules Followed

### 1. Catalog-First Component Reuse Mandate (Catalog Rule 1.1 - 1.3)
* **Rule:** Always reuse canonical components from `COMPONENTS_CATALOG.md`.
* **Application:** Every element builds on top of the catalog: `ScreenShell`, `SearchFilterBar`, `PaginatedList`, `ListCard`, `StatusBadge`, `ConfirmationModal`, and `Button`. No inline `<TouchableOpacity>` buttons or custom activity spinners were created.

### 2. Multi-Dimensional Status Modeling (Domain Architecture Standard)
* **Design Problem:** Real-world amenity reservations cannot be represented by a single binary status (e.g. "Active"). A booking can be *Confirmed* by schedule, *Pending* in payment, *Approved* by the admin, *Pass Generated* at the hardware turnstile, and *Pending* in physical session attendance.
* **Application:** The card breaks this into 5 orthogonal dimensions:
  1. **Booking Lifecycle** (`CONFIRMED`, `PENDING_APPROVAL`, `CANCELLED`, `REJECTED`) -> Primary Badge
  2. **Payment Status** (`PAID`, `HELD_AUTHORIZED`, `PENDING`, `NOT_REQUIRED`, `FAILED`) -> Secondary Badge
  3. **Approval Status** (`APPROVED`, `PENDING_REVIEW`, `REJECTED`, `NOT_REQUIRED`) -> Status Box Row 1
  4. **Gate Pass Access** (`PASS_GENERATED`, `CHECKED_IN`, `CHECKED_OUT`, `ACCESS_REVOKED`) -> Status Box Row 2
  5. **Session Completion** (`COMPLETED`, `PENDING`, `NO_SHOW`, `ABANDONED`) -> Status Box Row 3

### 3. Scroll Containment & Bottom Clearance (Catalog Rule 36 / Catalog Rule V.2)
* **Rule:** Scrollable list containers must provide adequate bottom padding (`pb-28` or `110px`) to prevent content from clipping underneath bottom bars or navigation tabs.
* **Application:**
  ```tsx
  contentContainerClassName="px-4 pt-3 pb-28"
  ```

### 4. Zero Inline Modal Duplication (Catalog Section 1)
* **Rule:** Modal confirmation alerts must wrap `ConfirmationModal` rather than building custom React Native `Modal` primitives.
* **Application:** `ResidentCancelModal` wraps `ConfirmationModal` with `variant="danger"`, automatic loading state disabling, and structured confirmation copy.

### 5. Role-Based Access Control (RBAC) Fallbacks (Workflow Rule VIII)
* **Rule:** Ensure unauthorized access is guarded before rendering protected views.
* **Application:** The screen inspects `isFeatureAllowedForUser` against `amenities:my_booking`. If the user is a guard/security staff who only has scanner permissions, they are redirected to `/(resident)/amenities/scanner`; otherwise, they are redirected to the resident dashboard.

### 6. The "Thin View" Pattern & Custom Hook Controller (Workflow Rule I, V)
* **Rule:** Visual screens must not perform direct Axios calls or contain heavy state transitions.
* **Application:** All data fetching, tab filtering, debounced search filtering, pagination increments, and cancellation thunk dispatches are encapsulated in `useResidentReservations()`.

### 7. NativeWind Theme Tokens & Logical Spacing (Workflow Rule IV, IX)
* **Rule:** Use theme tokens (`bg-background`, `bg-muted/40`, `border-border/50`, `text-muted-foreground`) and logical spacing (`gap-x-4`, `gap-y-2`, `pt-2.5`) to ensure dark mode fidelity and RTL compatibility.

---

## 5. UI/UX Replication Guide for Other Features

When designing a user activity feed, ticket log, or pass manager for another domain (e.g., **Visitor Pass History**, **Facility Service Requests**, **Clubhouse Event Registrations**, or **Vehicle Parking Permits**), use this blueprint:

### Step 1: Layout Shell
* Wrap with `<ScreenShell title="My [Entity]" subtitle="..." iconName="...">`.
* Add a primary creation button in `headerRight` (e.g. `+ Invite Visitor`, `+ New Request`, `+ Register`).

### Step 2: Integrated Filter & Search Bar
* In `ListHeaderComponent`, render `<SearchFilterBar>`:
  * Provide a clear search placeholder.
  * Supply 4-5 status category tabs (e.g. *All*, *Active / Upcoming*, *Pending Action*, *Completed*, *Cancelled*).

### Step 3: Domain Item Card (Extending `<ListCard>`)
* Use `<ListCard>` as the foundation:
  * **Header:** Title (Entity Name) + Subtitle (Reference #) + Primary Status Badge + Secondary Badge (Payment / Priority).
  * **Middle Metadata:** Date, Time Range, Headcount/Location with Lucide icons.
  * **Multi-Status Summary Box:** If the entity has multiple operational stages (e.g., Guard Clearance, Admin Approval, Fulfillment), group them into a subtle `bg-muted/40` rounded box using `<StatusBadge size="sm">`.
  * **Inline CTA Button:** Place an outline button (`variant="outline"`, `size="sm"`) at the bottom right for the most frequent contextual action (e.g. *Cancel*, *View QR Pass*, *Download Receipt*).

### Step 4: Dangerous Action Confirmation
* Always wrap cancellation, deletion, or revocation actions in a `<ConfirmationModal variant="danger">`.
* Detail the consequences clearly in the message (slot released, pass revoked, refund details).
