# UI Deviation Report: Visitor Management Module

**Target Module**: Visitor Access & Gate Operations (`src/features/visitor/`, `app/(resident)/visitor/`, `app/(visitor)/`)  
**Design System Baseline**: Single Source of Truth (SSOT) — NativeWind v4 Logical Spacing, HSL Theme Tokens, Canonical Catalog Components  
**Audit Status**: Deep Audit Completed — Zero Code Modified Yet  

---

## 1. Executive Summary of Module Findings

```
                               VISITOR MODULE DEVIATION AUDIT
┌─────────────────────────┬───────────────┬─────────────────────────────────────────────────────────────┐
│ Category                │ Total Defects │ Primary Violations Found                                    │
├─────────────────────────┼───────────────┼─────────────────────────────────────────────────────────────┤
│ Layout & Spacing        │ 11 instances  │ Local ScrollView container padding, physical margin (mr-2)  │
│ Colors & Theme Tokens   │ 16 instances  │ Hardcoded hexes (#fff, #2563eb), raw bg-amber-600/emerald   │
│ Raw Primitives          │ 22 instances  │ Raw <TextInput>, <ActivityIndicator>, raw TouchableOpacity  │
│ Deprecated Components   │ 4 instances   │ Custom modal dialogs, non-canonical <Input> primitive       │
└─────────────────────────┴───────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 2. File-by-File UI Deviation Checklist

### A. Pre-Approval & Wizard Screens (`src/features/visitor/components/`)

#### 1. [`CreateVisitorPassSheet.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/CreateVisitorPassSheet.tsx)
- [ ] **Raw Primitives**: Uses primitive `<Input>` (lines 102, 119, 137) instead of canonical `@/components/forms/TextInput`.
- [ ] **Raw Primitives**: Renders raw `<ActivityIndicator color="#fff" />` (line 156) instead of `<Button loading={loading}>`.
- [ ] **Raw Primitives**: Implements pass type selector with raw `<TouchableOpacity>` (line 72) instead of canonical `<Chip>` component.
- [ ] **Colors & Tokens**: Hardcoded `#fff` inside button activity indicator.

#### 2. [`VisitorPassCard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/VisitorPassCard.tsx)
- [ ] **Colors & Tokens**: Passes hardcoded hex overrides `leftIconBgColor="rgba(37, 99, 235, 0.1)"` and `leftIconColor="#2563eb"` (lines 53–54) rather than relying on canonical `ListCard` semantic theme token defaults.

#### 3. Wizard Step Containers (`guest/GuestDetailsStep.tsx`, `cab/CabScheduleStep.tsx`, `delivery/DeliveryValidityStep.tsx`, etc.)
- [ ] **Layout & Spacing**: Local `ScrollView` wrappers use hardcoded `contentContainerClassName="p-4 gap-4"` rather than relying on screen shell container layout.
- [ ] **Raw Primitives**: Multiple step forms instantiate primitive `<Input>` instead of canonical `<TextInput label="..." required helperText="..." />`.
- [ ] **Raw Primitives (`cab/CabScheduleStep.tsx`)**: Instantiates raw `TextInput` from `react-native` (line 2).

#### 4. [`shared/VisitorPassFlowFooter.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/shared/VisitorPassFlowFooter.tsx)
- [ ] **Raw Primitives**: Uses raw `<ActivityIndicator color="#fff" />` (line 50) instead of passing `loading={loading}` to `<Button>`.
- [ ] **Colors & Tokens**: Hardcoded icon color `#fff` (lines 57, 59).

---

### B. Guard Operations & Scanner Modals (`src/features/visitor/components/guard/` & `admin/`)

#### 5. [`guard/GuardInitiateWalkInModal.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/guard/GuardInitiateWalkInModal.tsx)
- [ ] **Layout & Spacing**: Contains physical margin `mr-2` on line 110 (`flex-row items-center gap-2 flex-1 mr-2`).
- [ ] **Raw Primitives**: Instantiates 4 raw `TextInput` elements from `react-native` (lines 130, 142, 154, 166) with manual border styling.
- [ ] **Raw Primitives**: Renders raw `<ActivityIndicator size="small" color="#fff" />` (line 181) inside the submit button.
- [ ] **Colors & Tokens**: Uses hardcoded `bg-amber-600` (line 179) instead of semantic tokens.

#### 6. [`guard/GuardQRScannerModal.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/guard/GuardQRScannerModal.tsx)
- [ ] **Raw Primitives**: Uses raw `TextInput` from `react-native` (line 52) with hardcoded placeholder color `rgba(255, 255, 255, 0.6)`.
- [ ] **Raw Primitives**: Action button contains hardcoded text styling `<Text className="text-white">` instead of inheriting from canonical `<Button>`.
- [ ] **Catalog Reuse**: Recreates custom camera frame instead of importing canonical `<QRScannerOverlay>`.

#### 7. [`admin/AdminBlacklistModal.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/admin/AdminBlacklistModal.tsx)
- [ ] **Raw Primitives**: Instantiates 4 raw `TextInput` fields from `react-native` (lines 74, 84, 95, 105).
- [ ] **Raw Primitives**: Action button uses raw `<ActivityIndicator size="small" color="#fff" />` (line 122) instead of `<Button loading={loading}>`.
- [ ] **Raw Primitives**: Uses raw `<TouchableOpacity>` for the modal close button (line 59) instead of `<IconButton size="sm">`.

#### 8. [`admin/AdminForceCheckoutModal.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/admin/AdminForceCheckoutModal.tsx)
- [ ] **Deprecated Components**: Custom modal popup recreating a confirmation flow that should be consolidated into canonical `<ConfirmationModal>`.
- [ ] **Raw Primitives**: Instantiates raw `TextInput` (line 50) for the checkout note.
- [ ] **Colors & Tokens**: Uses hardcoded `bg-amber-600` and raw `#fff` spinner (line 63).

#### 9. [`walkin/WalkInApprovalCard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/walkin/WalkInApprovalCard.tsx)
- [ ] **Colors & Tokens**: Uses hardcoded `bg-emerald-600 dark:bg-emerald-700` and `color="#fff"` (lines 95, 97) instead of `status-success` semantic tokens.

---

### C. Top-Level Route Screens (`app/(resident)/visitor/`)

#### 10. [`gate-console.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/visitor/gate-console.tsx)
- [ ] **Layout & Spacing**: Local `ScrollView` applies `contentContainerClassName="p-4 gap-4 pb-8"` (line 134) inside `<ScreenShell>`.
- [ ] **Raw Primitives**: Navigation tabs (lines 92, 104, 116) and Quick Action tiles (lines 178, 189) use raw `TouchableOpacity` with hardcoded `#fff` and `#6b7280` instead of canonical `<TabBar>` / `<Button>`.
- [ ] **Raw Primitives**: Uses primitive `<Input>` (line 150) instead of canonical `<TextInput>`.

#### 11. [`resident-passes.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/app/%28resident%29/visitor/resident-passes.tsx)
- [ ] **Raw Primitives**: `headerRight` action slot renders a custom `<TouchableOpacity>` with hardcoded `#fff` (lines 94–101) instead of `<Button variant="default" size="sm">`.
- [ ] **Raw Primitives**: Walk-in approval banner (lines 107–121) is constructed via raw `<TouchableOpacity>`.

#### 12. [`history.tsx` & `VisitorHistoryView.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/src/features/visitor/components/history/VisitorHistoryView.tsx)
- [ ] **Layout & Spacing**: `PaginatedList` uses local container padding `p-4 gap-3` (line 142) instead of standard shell gutters.
- [ ] **Colors & Tokens**: Status banner uses custom error container instead of canonical `<ErrorBanner onRetry={...}>`.

---

## 3. Prioritized Refactoring Targets for Execution

1. **PreApproveVisitorScreen / Creation Sheets**: Strip local scrollview padding, replace `<Input>` with canonical `<TextInput>`, and replace inline spinners with `<Button loading={loading}>`.
2. **GuardVerificationScreen / Gate Console**: Replace raw `TouchableOpacity` tab bars with canonical `<TabBar>`, replace `<Input>` with `<TextInput>`, and remove hardcoded hex values.
3. **Admin & Guard Modals (`AdminBlacklistModal`, `AdminForceCheckoutModal`, `GuardInitiateWalkInModal`)**: Standardize form inputs to canonical `<TextInput>`, replace inline spinners with `<Button loading={loading}>`, and fix physical `mr-2` margin.
4. **Approval Cards & Footers (`WalkInApprovalCard`, `VisitorPassFlowFooter`)**: Remove hardcoded emerald/amber hex classes and bind to semantic tokens.
