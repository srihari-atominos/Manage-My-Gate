# Admin Billing Ledger Reference & UI/UX Design System Guide

> **Screen Reference URL:** `http://localhost:8081/admin/billing/ledger`  
> **Source Screen File:** [`mobile/mobile-app/src/features/billing/screens/BillingLedgerScreen.tsx`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/src/features/billing/screens/BillingLedgerScreen.tsx)  
> **Component Catalog:** [`mobile/mobile-app/COMPONENTS_CATALOG.md`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/COMPONENTS_CATALOG.md)  
> **Audience:** UI/UX Designers & Mobile Frontend Engineers designing high-density search, filter, grouping, and audit ledger screens.

---

## 1. Executive Summary & Page Purpose

The **Admin Billing Ledger** (`/admin/billing/ledger`) is the operational workhorse for estate financial records. Unlike the high-level **Billing Overview Dashboard** (which summarizes metrics into 4 KPI cards and preview snippets), the **Ledger** is built for **deep search, audit inspection, multi-perspective grouping, camera barcode scanning, and multi-action workflows** (offline approval, rejection, manual collection, receipt export).

### Primary Design Objectives:
1. **High-Density Scalability:** Capable of rendering thousands of community transactions using server-side pagination (`PaginatedList`), infinite scrolling, and pull-to-refresh.
2. **Unified Search & Status Matrix:** Instant debounced text search combined with dynamic horizontal status pills showing live record counts (e.g. `⚠️ Pending (4)`, `❌ Overdue (12)`).
3. **Hardware Barcode/QR Scanning:** Direct camera scanning to locate invoices or physical bank cheques and auto-open their action sheets.
4. **Multi-Perspective Grouping:** Seamlessly pivots data between **Flat Invoices**, **By Unit / Villa**, **By Resident**, and **By Billing Cycle** without leaving the screen.
5. **Contextual Action Modals:** Layered slide-up sheets for filtering (`LedgerFilterDrawer`), invoice inspection (`InvoiceActionsBottomSheet`), and manual office collection (`AdminOfflineSettleSheet`).

---

## 2. Visual Layout Blueprint (Wireframe)

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
│  [ 📄 Flat ]  [ 🏢 By Unit ]  [ 👥 By Resident ] [ 🗂️ Cycle]│  <-- Zone 3: LedgerGroupingToggle
│                                                           │      Interactive Chip Bar
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

1. [LedgerFilterDrawer]      2. [InvoiceActionsBottomSheet] 3. [AdminOfflineSettleSheet]
┌─────────────────────────┐  ┌─────────────────────────┐   ┌─────────────────────────┐
│ ⚙️ Advanced Filters [X] │  │ 🧾 Invoice #INV-2026-04 │   │ 💰 Record Offline Pay   │
│ Date Presets:           │  │ Status: [PENDING REVIEW]│   │ Unit: Villa 104         │
│ [All Time] [This Month] │  │ Amount: ₹4,500          │   │ Method: [Cash][Cheque]  │
│ Block: [Block A ▼]      │  │ Payment: Cheque #004123 │   │ Cheque #: [__________]  │
│ Method: [All Methods ▼] │  │ ----------------------- │   │ Proof: [📷 Attach Copy] │
│ [Reset]        [Apply]  │  │ [ Approve ]  [ Reject ] │   │ [ Cancel ]  [ Confirm ] │
└─────────────────────────┘  └─────────────────────────┘   └─────────────────────────┘
```

---

## 3. Component Inventory & Catalog Breakdown

Every visual building block on this screen is imported from the canonical design system (`@/components/ui`, `@/components/common`, `@/components/forms`, `@/components/feedback`, `@/components/hardware`).

| Component | Catalog Import Path | Props & Configuration in this Screen | Purpose & UX Role |
| :--- | :--- | :--- | :--- |
| **`ScreenShell`** | `@/components/ui/ScreenShell` | `title="Billing Ledger"`<br>`subtitle="Total {count} community invoices"`<br>`iconName="Receipt"`<br>`loading={...}` | Root page container providing safe-area insets, back button, contextual title/counter, and built-in full-screen loader. |
| **`SearchFilterBar`** | `@/components/ui/SearchFilterBar` | `searchValue={search}`<br>`onSearchChange={setSearch}`<br>`sortOptions={statusSortOptions}`<br>`currentSort={statusFilter}`<br>`onScanPress={() => setShowScanner(true)}`<br>`onFilterPress={() => setShowFilterDrawer(true)}`<br>`activeFilterCount={count}` | **Unified Control Bar**: Combines a search input, a hardware scanner trigger icon, an advanced filter drawer button with active-filter badge count, and horizontal scrollable status filter pills with dynamic count badges. |
| **`LedgerGroupingToggle`** | Local Feature Component | `mode={groupMode}`<br>`onModeChange={setGroupMode}` | Horizontal bar of [`Chip`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/common/Chip.tsx) components switching perspectives between Flat Invoices, By Unit, By Resident, and By Cycle. |
| **`PaginatedList`** | `@/components/ui/PaginatedList` | `data={invoicesList}`<br>`pagination={pagination}`<br>`onLoadMore={handleLoadMore}`<br>`onRefresh={handleRefresh}`<br>`loading={loadingStates.fetchGrid}`<br>`emptyTitle="No Records Found"` | High-performance virtualized list with built-in pull-to-refresh spinner, infinite scroll pagination, skeleton loaders, and contextual empty states. |
| **`InvoiceCard`** | Local Feature Component | `invoice={item}`<br>`onPress={() => setSelectedInvoice(item)}` | Wraps [`ListCard`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/ListCard.tsx) and [`StatusBadge`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/StatusBadge.tsx) to render title, resident subtitle, status pill, formatted currency amount, and creation date. |
| **`UnitLedgerGroupCard`**<br>**`ResidentLedgerGroupCard`**<br>**`CycleLedgerGroupCard`** | Local Grouping Components | `unitGroup={item}`<br>`onSelectInvoice={setSelectedInvoice}` | Collapsible accordion cards grouping invoices by physical unit, resident owner, or monthly cycle with subtotal balances and item expansion. |
| **`LedgerFilterDrawer`** | Local Feature Component | `visible={showFilterDrawer}`<br>`filters={activeFilters}`<br>`onApply={...}`<br>`onReset={...}` | Slide-up modal wrapping [`BottomSheet`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/BottomSheet.tsx), [`Chip`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/common/Chip.tsx) date presets, [`DropdownSelect`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/forms/DropdownSelect.tsx) for blocks and payment methods, and [`DatePicker`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/common/DatePicker.tsx). |
| **`LedgerQRScannerModal`** | Local Feature Component | `visible={showScanner}`<br>`onScanCode={handleScannedCode}` | Wraps [`QRScannerModal`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/hardware/QRScannerModal.tsx) to scan physical invoice barcodes or cheque QR codes via the device camera, auto-filtering the ledger to the scanned item. |
| **`InvoiceActionsBottomSheet`** | Local Feature Component | `visible={!!selectedInvoice}`<br>`invoice={selectedInvoice}`<br>`onApproveOffline={...}`<br>`onRejectOffline={...}` | Slide-up action sheet wrapping [`BottomSheet`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/BottomSheet.tsx), [`DetailSection`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/DetailSection.tsx), [`DetailRow`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/DetailRow.tsx), and [`ConfirmationModal`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/ConfirmationModal.tsx) for approvals, rejections, and receipt viewing. |
| **`AdminOfflineSettleSheet`** | Local Feature Component | `visible={!!settleInvoice}`<br>`invoice={settleInvoice}` | Settlement sheet wrapping [`BottomSheet`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/BottomSheet.tsx), [`TextInput`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/forms/TextInput.tsx), and [`AttachmentPicker`](file:///e:/atominos/Manage-My-Gate/mobile/mobile-app/components/ui/AttachmentPicker.tsx) for manually recording offline office payments with proof attachments. |
| **`ErrorBanner`** | `@/components/feedback/ErrorBanner` | `message={error}`<br>`onDismiss={resetBillingError}` | Dismissable alert banner shown when ledger queries fail. |
| **`Button`** | `@/components/common/Button` | `variant="default"`, `size="lg"` | Action button used in modals and Access Denied fallback screens. |

---

## 4. Design System & Architectural Rules Followed

The implementation strictly adheres to the project's **Mobile Component Catalog Rules** (`.agents/rules/mobile-component-catalog.md`) and **Mobile Workflow Rules** (`.agents/rules/mobile-workflow-rules.md`):

### 1. Catalog-First Component Reuse Mandate (Catalog Rule 1.1 - 1.3)
* **Rule:** Developers must inspect `COMPONENTS_CATALOG.md` and reuse existing components before writing custom UI.
* **Application:** Zero primitive buttons or custom text inputs were created. The screen leverages `ScreenShell`, `SearchFilterBar`, `PaginatedList`, `ListCard`, `StatusBadge`, `BottomSheet`, `DropdownSelect`, `DatePicker`, `AttachmentPicker`, and `QRScannerModal`.

### 2. Server-Side Database Pagination via `PaginatedList` (Workflow Rule V)
* **Rule:** Never split arrays in memory for data lists. Rely on backend database-level pagination, passing `page` and `limit`, and storing pagination metadata in Redux.
* **Application:**
  ```tsx
  <PaginatedList<any>
    data={invoicesList}
    pagination={pagination}
    onLoadMore={handleLoadMore}
    onRefresh={handleRefresh}
    loading={loadingStates.fetchGrid}
  />
  ```
  The screen triggers `changeTablePage(page, currentQueryParams)` when scrolling hits the bottom threshold.

### 3. Search & Filter Bar Standardization (Catalog Section 1)
* **Rule:** Unified search inputs, sort pill carousels, camera scanners, and drawer triggers must use `SearchFilterBar`.
* **Application:** Uses `SearchFilterBar` with 300ms debouncing on text search, live counter badges on status filter pills, and active filter count badge (`activeFilterCount`) on the drawer icon.

### 4. Hardware Scanning Integration Standard (Catalog Section 20 / Workflow Rule IV)
* **Rule:** Hardware features (camera QR/barcode scanning) must consume canonical hardware components (`QRScannerModal` or `QRScannerOverlay`).
* **Application:** `LedgerQRScannerModal` wraps `QRScannerModal`. When a barcode or cheque QR is scanned, `parseAndValidateAppBarcode` parses the payload, resets restrictive filters, queries the database, and automatically pops open the matched invoice's action sheet.

### 5. Native Contextual Sheets over Navigational Redirects (Catalog Section 1)
* **Rule:** Contextual item operations (view details, approve, reject, settle, filter) should utilize slide-up bottom sheets (`BottomSheet`) to maintain user focus rather than forcing full-page routing transitions.
* **Application:** `InvoiceActionsBottomSheet`, `LedgerFilterDrawer`, and `AdminOfflineSettleSheet` all open contextually over the ledger list without losing scroll position.

### 6. RTL & Logical Spacing Mandate (Workflow Rule IX / Catalog Rule 2)
* **Rule:** Physical directional margins and paddings (`mr-`, `ml-`, `pr-`, `pl-`) are strictly forbidden.
* **Application:** All layouts use NativeWind logical spacing: `me-2`, `me-3`, `ms-2`, `pe-3`, `ps-3`, `text-start`.

### 7. Theme Tokens & Dark Mode Compatibility (Workflow Rule IV / Catalog Rule 3)
* **Rule:** Use theme design tokens (`bg-card`, `bg-background`, `border-border`, `text-foreground`, `text-muted-foreground`, `status.*`) rather than hardcoded hex colors.
* **Application:** Full adaptation between Light and Dark mode across cards, badges, and bottom sheets.

### 8. The "Thin View" Pattern & Feature Decoupling (Workflow Rule I, II, V)
* **Rule:** Screens must contain zero direct Axios or Fetch calls.
* **Application:** The view imports `useBilling()`. State management, pagination dispatches, offline approvals, and rejections are orchestrated through the custom hook and Redux slice.

---

## 5. UI/UX Replication Guide: Building Similar Ledgers for Other Features

When designing a search-heavy, filterable ledger or audit log for other features (e.g., **Visitor Pass History**, **Gate Access Logs**, **Amenity Booking Records**, or **Facility Maintenance Tickets**), follow this 5-stage blueprint:

### Stage 1: Page Shell & Total Records Counter
* Enclose the screen in `<ScreenShell title="[Domain] Ledger" subtitle="Total {totalRecords} records" iconName="...">`.
* If user lacks permission, display the standard Access Denied layout.

### Stage 2: Dual-Row Search & Filter Bar
* Use `<SearchFilterBar>`:
  * **Search Input:** Debounced text field with a feature-specific placeholder (e.g. *"Search visitor name, vehicle plate, pass code..."*).
  * **Camera Scan Button:** If physical passes, tickets, or QR badges exist, enable `onScanPress` to open `<QRScannerModal>`.
  * **Filter Drawer Button:** Enable `onFilterPress` and display an `activeFilterCount` badge.
  * **Status Pills (Row 2):** Horizontal scrollable pills with dynamic count badges:
    * `All ({count})`
    * `⚠️ Pending ({count})`
    * `Approved / Active ({count})`
    * `Completed / Paid ({count})`
    * `Rejected / Overdue ({count})`

### Stage 3: Perspective Grouping Toggle (Optional but Recommended)
* If records can be grouped logically (e.g. *By Visitor*, *By Villa*, *By Date*, or *By Category*), place a `<Chip>`-based grouping toggle below the filter bar.
* Switch card layout dynamically based on the active grouping mode.

### Stage 4: Virtualized Paginated Feed
* Use `<PaginatedList>` configured with:
  * `onLoadMore` calling backend page increment.
  * `onRefresh` pulling page 1 fresh data.
  * Meaningful `emptyTitle` and dynamic `emptySubtitle` explaining whether zero results are due to search terms or active filters.
* Wrap each record in a `<ListCard>` displaying title, subtitle, date, status pill (`StatusBadge`), and right content.

### Stage 5: Contextual Action Sheet (`BottomSheet`)
* Tapping a record should open a `<BottomSheet>` containing:
  * Key-value metadata rows using `<DetailSection>` and `<DetailRow>`.
  * Primary / secondary action buttons using `<Button>` (e.g. *Approve*, *Revoke*, *Download Pass*, *Print Receipt*).
  * Dangerous actions (Revoke, Reject) wrapped in a `<ConfirmationModal>`.
