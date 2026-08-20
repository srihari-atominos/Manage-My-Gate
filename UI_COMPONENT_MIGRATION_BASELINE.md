# UI Component Migration Baseline

## 1. Purpose

This document establishes an evidence-based, zero-risk baseline for migrating and consolidating UI components in the React Native mobile application (`mobile/mobile-app`).

Following an architectural audit that revealed duplicate component families, raw primitive usage (`TouchableOpacity`, `TextInput`, `Modal`), inconsistent RTL spacing, and competing barrel exports, this baseline defines:
* **Canonical implementation decisions** for all duplicate/competing component families.
* **API compatibility matrices** mapping old props to canonical props.
* **Complete usage inventories** across `app/`, `src/features/`, `src/modules/`, and `components/`.
* **Screen risk categorizations** (Low, Medium, High).
* **Strict migration rules, execution order, rollback strategies, and protected sensitive areas**.
* **The Safe Migration Contract** governing all subsequent implementation phases.

> [!IMPORTANT]  
> **PHASE 1 DIRECTIVE**: No application code, component implementations, styles, barrel exports, or route files are modified in this phase. This report serves exclusively as the authoritative analysis and baseline contract prior to Phase 2 execution.

---

## 2. Current UI Architecture

### 2.1 Reusable Component Catalog Structure
The mobile app maintains a 117-component catalog across 12 directories inside `mobile/mobile-app/components/`:

```text
mobile/mobile-app/components/
├── ui/           # 23 Atomic UI primitives (ScreenShell, StatusBadge, ListCard, Skeleton, button, input)
├── common/       # 25 Generic components (Button, Avatar, Card, Modal, ConfirmationDialog, BottomSheet)
├── forms/        # 10 Form inputs (TextInput, PasswordInput, DropdownSelect, Checkbox, RadioGroup)
├── feedback/     # 8  Feedback UI (ActionSheet, AlertDialog, EmptyState, SkeletonLoader)
├── layout/       # 8  Containers (SafeAreaWrapper, KeyboardAvoidingShell, ScrollContainer, GridRow)
├── navigation/   # 6  Headers & context switchers (OrgSwitchModal, VillaSwitchModal, ProfileModal)
├── hardware/     # 5  Device integrations (QRScannerOverlay, NFCScanIndicator, FlashlightToggle)
├── data/         # 8  Data display (OptimizedDataGrid, AuditTimeline, MetricCard)
├── dashboard/    # 8  Dashboard widgets (HeroBanner, ActionTile, CustomiseSheetModal)
├── auth/         # 5  Auth UI (BiometricUnlockButton, SocialAuthButton, PasswordStrengthMeter)
├── analytics/    # 4  Analytics views (ExportReportButton, RealtimeMetricChart)
└── settings/     # 7  App settings (ThemeToggleWidget, StorageCleanerWidget, PermissionRequestCard)
```

### 2.2 Import System & Barrel Exports
Components are exposed through central and category-level barrel export files:
* **Central Barrel**: `components/index.ts`
  * Re-exports `*` from `./ui`, `./forms`, `./feedback`, `./layout`, `./navigation`, `./hardware`, `./data`, `./dashboard`, `./auth`, `./analytics`, `./settings`.
  * Selectively re-exports from `./common` with aliasing (e.g. `Button as CommonButton`, `BottomSheet as CommonBottomSheet`).
* **Category Barrels**: `components/ui/index.ts`, `components/common/index.ts`, `components/forms/index.ts`, `components/feedback/index.ts`.

#### Current Import Patterns in Codebase:
1. **Canonical Aliases**: `import { Button, StatusBadge, ListCard } from '@/components'`
2. **Category Direct**: `import { Button } from '@/components/ui/button'` or `import { TextInput } from '@/components/forms/TextInput'`
3. **Legacy Common Direct**: `import { Button } from '../common/Button'` or `import { Modal } from './Modal'`
4. **Relative Path Import**: `import { Button } from '../../components/ui/button'`

### 2.3 Styling Architecture & Design Tokens
* **Utility Framework**: NativeWind (Tailwind CSS v3 engine for React Native).
* **Design Tokens**: `src/design-system/tokens/` (`colors.ts`, `dimensions.ts`, `radius.ts`, `shadows.ts`, `spacing.ts`, `typography.ts`).
* **CVA Variants**: Class-Variance-Authority (`cva`) used in `components/ui/` primitives (`button.tsx`, `Skeleton.tsx`, `StatusBadge.tsx`, `ListCard.tsx`, `ScreenShell.tsx`).

---

## 3. Canonical Component Candidates

Below is the evaluation of the 8 primary duplicate/competing component families.

| Component Family | Candidate Implementation | Current Usage Count | Canonical Candidate | Selection Rationale | Migration Risk |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Button** | `components/ui/button.tsx`<br>`components/common/Button.tsx` | 90+ usages<br>6 usages | `components/ui/button.tsx` *(Enhanced)* | CVA-driven, default `@/components` export, theme-token styled. Enhancing it with `leftIcon`, `rightIcon`, `loading` props supercedes `common/Button.tsx`. | **Medium** |
| **BottomSheet** | `components/ui/BottomSheet.tsx`<br>`components/common/BottomSheet.tsx` | 15+ feature sheets<br>1 usage (`ActionSheet`) | `components/ui/BottomSheet.tsx` *(Standard Modal)*<br>`components/common/BottomSheet.tsx` *(Gesture Gorhom)* | Standard popup sheets use RN `<Modal>` (`ui/BottomSheet.tsx`). Heavy drag/gesture sheets keep `@gorhom/bottom-sheet` wrapper. | **Medium** |
| **Modal / Dialog** | `components/common/Modal.tsx`<br>`components/ui/ConfirmationModal.tsx`<br>`components/common/ConfirmationDialog.tsx`<br>`components/feedback/AlertDialog.tsx` | 12+ feature modals<br>15+ screens/features<br>0 screen usages<br>2 banner usages | Base: `components/common/Modal.tsx`<br>Confirm: `components/ui/ConfirmationModal.tsx`<br>Alert: `components/feedback/AlertDialog.tsx` | `ConfirmationModal` in `ui/` has dark mode token integration, rich variants (`danger`/`warning`/`info`), and icon headers. `ConfirmationDialog` is dead duplicate code. `AlertDialog` is an inline banner, not a popup. | **Low** |
| **Input** | `components/ui/input.tsx`<br>`components/forms/TextInput.tsx` | 12 visitor steps<br>20+ feature forms | `components/forms/TextInput.tsx` *(Unified)* | `forms/TextInput.tsx` handles RTL logical spacing (`me-2`, `ms-2`), Lucide icon props (`leftIcon`, `rightIcon`), error states, multiline, and custom class overrides. `ui/input.tsx` has directional `mr-`/`ml-` RTL bugs. | **Medium** |
| **Skeleton** | `components/ui/Skeleton.tsx`<br>`components/feedback/SkeletonLoader.tsx` | 4 component templates<br>1 feature screen | `components/ui/Skeleton.tsx` | `ui/Skeleton.tsx` is the animated primitive (Reanimated shared values). `SkeletonLoader.tsx` is a 10-line pass-through wrapper that will be aliased. | **Low** |
| **Status Indicator** | `components/ui/StatusBadge.tsx`<br>`components/common/Badge.tsx` | 30+ screens/cards<br>0 screen usages | `components/ui/StatusBadge.tsx` *(Pill)*<br>`components/common/Badge.tsx` *(Tag)* | `StatusBadge` provides domain status auto-mapping (`STATUS_VARIANT_MAP`), dark mode token palettes, and pulsing dots. `Badge` is retained only for static label tags. | **Low** |
| **Empty State** | `components/feedback/EmptyState.tsx`<br>Feature Empty States | 8 feature screens<br>2 wrapper files | `components/feedback/EmptyState.tsx` | Single canonical implementation exists. Feature wrappers (`NoticeBoardEmptyState`, `PollEmptyState`) pass domain props into `EmptyState`. | **Low** |
| **Card** | `components/common/Card.tsx`<br>`components/ui/ListCard.tsx`<br>`components/ui/KPICard.tsx` | 3 layout containers<br>20+ list items<br>10+ dashboard tiles | Role-Based Distinction:<br>• `ListCard`: List rows<br>• `KPICard`: Metrics<br>• `Card`: Layout containers | Serving distinct layout roles. Custom inline card views in screens must migrate to one of these three canonical cards. | **Low** |

---

## 4. Component API Compatibility

### 4.1 Button Family Comparison
```text
components/common/Button.tsx                  components/ui/button.tsx
-----------------------------                  ------------------------
children: ReactNode                            children: ReactNode
variant: 'default'|'destructive'|'outline'|... variant: 'default'|'destructive'|'outline'|...
size: 'default'|'sm'|'lg'|'icon'               size: 'default'|'sm'|'lg'|'icon'
leftIcon?: LucideIcon          ─── [MISSING] ─→ Needs backward compatibility shim
rightIcon?: LucideIcon         ─── [MISSING] ─→ Needs backward compatibility shim
loading?: boolean              ─── [MISSING] ─→ Needs ActivityIndicator support
textClassName?: string         ─── [MISSING] ─→ Needs textClassName prop mapping
ref: View                      ─── [DIFFERENT]→ Ref is Pressable in ui/button.tsx
```
* **Mapping Strategy**: Extend `components/ui/button.tsx` props to accept optional `leftIcon`, `rightIcon`, `loading`, and `textClassName`.
* **Classification**: **CONTROLLED**.

---

### 4.2 BottomSheet Family Comparison
```text
components/ui/BottomSheet.tsx                  components/common/BottomSheet.tsx
-----------------------------                  ---------------------------------
visible: boolean                               snapPoints?: string[]
onClose: () => void                            ref: ForwardedRef<GorhomBottomSheet>
title?: string                                 enablePanDownToClose: boolean (internal)
children: ReactNode                            children: ReactNode
[Uses RN Modal + Pressable Backdrop]            [Uses @gorhom/bottom-sheet]
```
* **Mapping Strategy**: Maintain `components/ui/BottomSheet.tsx` for controlled modal popups. `components/common/BottomSheet.tsx` remains dedicated to gesture-driven multi-snap sheets.
* **Classification**: **CONTROLLED**.

---

### 4.3 Confirmation Dialog Family Comparison
```text
components/common/ConfirmationDialog.tsx       components/ui/ConfirmationModal.tsx
-----------------------------------------       ------------------------------------
visible: boolean                                visible: boolean
onClose: () => void                             onCancel: () => void
onConfirm: () => void                           onConfirm: () => void
title: string                                   title: string
message: string                                 message: string
confirmLabel?: string                           confirmLabel?: string
cancelLabel?: string                            cancelLabel?: string
variant?: 'danger'|'warning'|'info'              variant?: 'danger'|'warning'|'info'
loading?: boolean                               loading?: boolean
```
* **Mapping Strategy**: `ConfirmationModal` in `ui/` maps 1:1 with `ConfirmationDialog` except `onClose` is named `onCancel`.
* **Classification**: **SAFE**.

---

### 4.4 Input Family Comparison
```text
components/ui/input.tsx                        components/forms/TextInput.tsx
-----------------------                        -----------------------------
label?: string                                 label?: string
error?: string                                 error?: string
isPassword?: boolean           ─── [ADVANCED] → Use PasswordInput or toggle prop
leftIcon?: ReactNode                            leftIcon?: LucideIcon
                                               rightIcon?: LucideIcon
                                               onRightIconPress?: () => void
                                               containerClassName?: string
                                               labelClassName?: string
                                               inputClassName?: string
                                               errorClassName?: string
[Directional mr- / ml- padding]                 [Logical me-2 / ms-2 padding]
```
* **Mapping Strategy**: Adopt `components/forms/TextInput.tsx` as the single canonical input. Aliases and prop shims will allow existing `ui/input` usages to seamlessly render `forms/TextInput.tsx`.
* **Classification**: **CONTROLLED**.

---

### 4.5 Skeleton Family Comparison
```text
components/feedback/SkeletonLoader.tsx         components/ui/Skeleton.tsx
--------------------------------------         --------------------------
variant?: 'card'|'listItem'|'kpi'|...          variant?: 'card'|'listItem'|'kpi'|...
count?: number                                 count?: number
width?: number|string                          width?: number|string
height?: number|string                         height?: number|string
[Thin Wrapper Pass-Through]                     [Reanimated Animated Shared Values]
```
* **Mapping Strategy**: `SkeletonLoader` in `feedback/` is a 100% direct pass-through wrapper around `ui/Skeleton`.
* **Classification**: **SAFE**.

---

## 5. Component Usage Inventory

### 5.1 Button Family Usages
* **`components/ui/button.tsx`** (Canonical Target):
  * `app/(auth)/login.tsx`
  * `app/(auth)/otp.tsx`
  * `app/(resident)/amenities/*.tsx` (10 screens)
  * `app/(resident)/visitor/*.tsx` (6 screens)
  * `app/(visitor)/index.tsx`, `scanner.tsx`
  * `components/ui/ActionBar.tsx`
  * `components/ui/ConfirmationModal.tsx`
  * `components/feedback/EmptyState.tsx`
  * `src/features/amenities/components/*.tsx` (12 modals)
  * `src/features/billing/components/*.tsx` (8 components)
  * `src/features/visitor/components/*.tsx` (15 components)
* **`components/common/Button.tsx`** (Legacy - To be migrated):
  * `components/common/ConfirmationDialog.tsx`
  * `components/feedback/AlertDialog.tsx`
  * `components/analytics/ExportReportButton.tsx`
  * `components/settings/OnboardingCarousel.tsx`
  * `components/settings/PermissionRequestCard.tsx`
  * `components/settings/StorageCleanerWidget.tsx`

---

### 5.2 BottomSheet Family Usages
* **`components/ui/BottomSheet.tsx`** (Standard Modal Sheet):
  * `app/(resident)/amenities/scanner.tsx`
  * `app/(resident)/showcase.tsx`
  * `components/common/DatePickerModal.tsx`
  * `src/features/amenities/components/AmenityDetailSheet.tsx`
  * `src/features/amenities/components/AmenityFormModal.tsx`
  * `src/features/visitor/components/CreateVisitorPassSheet.tsx`
  * `src/features/visitor/components/VisitorPassDetailsModal.tsx`
  * `src/features/noticeBoard/screens/CreateEditNoticeScreen.jsx`
  * `src/features/noticeBoard/subFeatures/poll/components/CreatePollModal.tsx`
  * `src/features/noticeBoard/subFeatures/poll/components/VoterListBottomSheet.tsx`
* **`components/common/BottomSheet.tsx`** (Gorhom Gesture Sheet):
  * `components/feedback/ActionSheet.tsx`

---

### 5.3 Modal / Dialog Family Usages
* **`components/ui/ConfirmationModal.tsx`** (Canonical Confirmation):
  * `app/(resident)/amenities/admin-master.tsx`
  * `app/(resident)/amenities/booking/[id].tsx`
  * `app/(resident)/amenities/maintenance.tsx`
  * `app/(resident)/visitor/admin/blacklist.tsx`
  * `app/(resident)/visitor/admin/community-passes.tsx`
  * `app/(resident)/visitor/resident-passes.tsx`
  * `app/(visitor)/scanner.tsx`
  * `src/features/visitor/components/admin/AdminBlacklistModal.tsx`
  * `src/features/visitor/components/admin/AdminForceCheckoutModal.tsx`
  * `src/features/noticeBoard/subFeatures/poll/components/DeletePollConfirmationModal.tsx`
* **`components/common/ConfirmationDialog.tsx`** (Legacy):
  * 0 screen usages (internal test artifact).
* **`components/common/Modal.tsx`** (Base Structural Container):
  * `components/navigation/OrgSwitchModal.tsx`
  * `components/navigation/VillaSwitchModal.tsx`
  * `components/navigation/RoleSwitchModal.tsx`
  * `components/navigation/ProfileModal.tsx`
  * `src/features/visitor/components/guard/GuardInitiateWalkInModal.tsx`
  * `src/features/visitor/components/guard/GuardQRScannerModal.tsx`
  * `src/features/amenities/components/ManualBookingModal.tsx`
* **`components/feedback/AlertDialog.tsx`** (Inline Banner):
  * `src/features/billing/components/PaymentResultBanner.tsx`
  * `src/features/complaints/components/ComplaintStatusBanner.tsx`

---

### 5.4 Input Family Usages
* **`components/forms/TextInput.tsx`** (Canonical Input):
  * `app/(resident)/amenities/scanner.tsx`
  * `app/(resident)/amenities/security-logs.tsx`
  * `src/features/amenities/components/*.tsx` (6 modals)
  * `src/features/billing/components/*.tsx` (4 step wizards)
  * `src/features/noticeBoard/components/NoticeBoardFilters.jsx`
  * `src/features/noticeBoard/screens/CreateEditNoticeScreen.jsx`
  * `src/features/noticeBoard/subFeatures/poll/components/CreatePollModal.tsx`
  * `src/modules/automation-engine/TriggerNodeBuilder.tsx`
* **`components/ui/input.tsx`** (To be migrated / wrapped):
  * `app/(auth)/login.tsx`
  * `app/(resident)/showcase.tsx`
  * `app/(resident)/visitor/gate-console.tsx`
  * `src/features/visitor/components/CreateVisitorPassSheet.tsx`
  * `src/features/visitor/components/cab/*.tsx` (3 steps)
  * `src/features/visitor/components/delivery/*.tsx` (3 steps)
  * `src/features/visitor/components/group/*.tsx` (3 steps)
  * `src/features/visitor/components/guest/*.tsx` (3 steps)
  * `src/features/visitor/components/service/*.tsx` (3 steps)

---

## 6. Raw Primitive Usage

Inventory of raw React Native primitives found outside reusable component wrappers:

| Primitive Type | Occurrence Location | Usage Context | Classification | Reusable Catalog Replacement |
| :--- | :--- | :--- | :--- | :--- |
| **`TouchableOpacity`** | `components/common/Button.tsx`<br>`components/ui/BottomSheet.tsx` | Internal component trigger | **VALID PRIMITIVE** | None (Internal implementation) |
| **`TouchableOpacity`** | `app/(auth)/login.tsx`<br>`app/(resident)/all-features.tsx`<br>`app/(resident)/amenities/security-logs.tsx`<br>`app/(resident)/visitor/gate-console.tsx` | Custom inline buttons & clickable rows | **VIOLATION** | `<Button>` or `<ListCard>` |
| **`TouchableOpacity`** | `src/features/billing/components/wizard/*.tsx`<br>`src/features/visitor/components/cab/*.tsx`<br>`src/features/noticeBoard/components/NoticeCard.jsx` | Wizard step action cards & list item rows | **VIOLATION** | `<Button>` or `<ListCard>` |
| **`Pressable`** | `components/ui/button.tsx`<br>`components/ui/ListCard.tsx` | Internal component hit target | **VALID PRIMITIVE** | None (Internal implementation) |
| **`Pressable`** | `app/(resident)/visitor/admin/community-passes.tsx`<br>`app/(resident)/visitor/resident-passes.tsx` | Inline pass row wrappers | **VIOLATION** | `<ListCard>` |
| **`TextInput`** | `components/ui/input.tsx`<br>`components/forms/TextInput.tsx` | Internal input field element | **VALID PRIMITIVE** | None (Internal implementation) |
| **`TextInput`** | `app/(resident)/visitor/admin/blacklist.tsx`<br>`src/features/visitor/components/guard/GuardInitiateWalkInModal.tsx` | Direct raw inline search input | **VIOLATION** | `<TextInput>` from `@/components/forms` |
| **`ActivityIndicator`** | `components/common/Button.tsx`<br>`components/ui/ConfirmationModal.tsx` | Internal button/modal spinner | **VALID PRIMITIVE** | None (Internal implementation) |
| **`ActivityIndicator`** | `app/(auth)/login.tsx`<br>`app/(resident)/amenities/discover.tsx`<br>`src/features/billing/screens/InvoiceDetailsScreen.tsx` | Direct inline page loading spinner | **VIOLATION** | `<ScreenShell>` or `<Skeleton>` |
| **`Modal`** | `components/common/Modal.tsx`<br>`components/ui/BottomSheet.tsx` | Reusable modal primitives | **VALID PRIMITIVE** | None (Internal implementation) |
| **`Modal`** | `src/features/visitor/components/guard/GuardQRScannerModal.tsx`<br>`src/features/visitor/components/admin/AdminBlacklistModal.tsx` | Direct raw modal overlay creation | **VIOLATION** | `<Modal>` from `@/components/common` |
| **`ScrollView`** | `app/(resident)/visitor/admin/create-pass.tsx`<br>`src/features/noticeBoard/screens/ActiveBoardScreen.jsx` | Full screen scrolling containers | **VIOLATION** | `<ScreenShell>` or `<ScrollContainer>` |
| **`FlatList`** | `src/features/visitor/components/history/VisitorHistoryView.tsx`<br>`src/features/billing/screens/ResidentMyDuesScreen.tsx` | Raw unpaginated array list rendering | **VIOLATION** | `<PaginatedList>` |

---

## 7. Low-Risk Migration Candidates (Group A)

Screens and components where migration to canonical components involves minimal prop mapping and zero state/logic changes:

1. **`app/(resident)/showcase.tsx`**: Showcase gallery page; uses `Button`, `Input`, `StatusBadge`, `Skeleton`, `ConfirmationModal`, `BottomSheet`.
2. **`components/analytics/ExportReportButton.tsx`**: Uses `components/common/Button.tsx` → Migrate directly to `components/ui/button.tsx`.
3. **`components/settings/PermissionRequestCard.tsx`**: Uses `components/common/Button.tsx` → Migrate directly to `components/ui/button.tsx`.
4. **`components/settings/StorageCleanerWidget.tsx`**: Uses `components/common/Button.tsx` → Migrate directly to `components/ui/button.tsx`.
5. **`components/settings/OnboardingCarousel.tsx`**: Uses `components/common/Button.tsx` → Migrate directly to `components/ui/button.tsx`.
6. **`src/features/noticeBoard/components/NoticeBoardLoadingSkeleton.jsx`**: Uses `SkeletonLoader` with invalid `variant="circular"` → Fix prop to `variant="circle"` on canonical `Skeleton`.

---

## 8. Medium-Risk Migration Candidates (Group B)

Screens where migration requires prop mapping, container style adjustments, or form handler integration:

1. **`app/(auth)/login.tsx`**: Uses `ui/input.tsx` and raw `TouchableOpacity` → Migrate inputs to `forms/TextInput.tsx` and buttons to `ui/button.tsx`.
2. **`app/(resident)/visitor/gate-console.tsx`**: Uses `ui/input.tsx` and raw `TouchableOpacity` → Migrate to canonical `TextInput` and `Button`.
3. **`app/(resident)/visitor/admin/blacklist.tsx`**: Uses direct `RNTextInput` and `ConfirmationModal` → Migrate to `forms/TextInput.tsx`.
4. **`src/features/visitor/components/CreateVisitorPassSheet.tsx`**: Multi-step pass sheet using `ui/input.tsx` → Unified `forms/TextInput.tsx` mapping.
5. **`src/features/visitor/components/cab/*.tsx`**, **`delivery/*.tsx`**, **`group/*.tsx`**, **`guest/*.tsx`**, **`service/*.tsx`**: 15 step wizard components using `ui/input.tsx` → Migrate to unified `forms/TextInput.tsx`.

---

## 9. High-Risk Migration Candidates (Group C)

Screens and features tightly coupled to business logic, hardware integrations, real-time sockets, or complex state machines:

1. **`app/(resident)/amenities/scanner.tsx`**: Hardware camera QR scanning screen with pass validation states and custom bottom sheet modals.
2. **`app/(visitor)/scanner.tsx`**: Hardware camera scanner with real-time gate entry trigger logic.
3. **`src/features/visitor/components/guard/GuardQRScannerModal.tsx`**: Camera overlay modal with Torch controls, manual code fallbacks, and gate unlock hooks.
4. **`src/features/billing/screens/AssessmentManagementScreen.tsx`**: Complex multi-step assessment calculation wizard with financial state management.
5. **`src/features/visitor/components/walkin/WalkInApprovalCard.tsx`**: Real-time socket listener card managing visitor entry/rejection flows.

---

## 10. Migration Rules

### Rule 1 — Search Before Creating
Before creating any new UI component, developers and agents MUST search:
1. `mobile/mobile-app/components/`
2. `COMPONENTS_CATALOG.md`
3. `.agents/rules/mobile-component-catalog.md`

### Rule 2 — Prefer Existing Canonical Components
If an existing canonical component provides required behavior, reuse it. Do NOT duplicate or build raw inline alternatives.

### Rule 3 — Do Not Blindly Replace
Never replace a component solely because names match. Always compare:
* Props and default values
* Behavior and event callbacks
* Styling and theme tokens
* Accessibility attributes (`role`, `accessibilityLabel`)
* Dark mode compatibility
* RTL logical spacing (`me-`, `ms-`, `pe-`, `ps-`)

### Rule 4 — Preserve Behavior & Contracts
Component migration MUST NOT break:
* API service contracts & Redux thunk flows
* Form validation (`React Hook Form` / `Yup` / `Zod`)
* Navigation routing & parameters
* Hardware device hooks (Camera, Torch, NFC)
* Socket event listeners

### Rule 5 — Small Batches
Perform all future migrations in small, isolated, reviewable batches grouped by component family or screen feature.

### Rule 6 — Mandatory Multi-Level Verification
After every migration batch, execute:
1. TypeScript compilation check (`npm run check-ts` / `npx tsc --noEmit`)
2. Lint check (`npm run lint` if configured)
3. Grep search for remaining legacy references
4. Inspection of barrel exports and import paths

---

## 11. Recommended Migration Order

Based on component dependency trees, usage volume, and safety isolation:

```text
Phase 2.1: Skeleton Component Family
        ↓
Phase 2.2: StatusBadge Component Family
        ↓
Phase 2.3: Button Component Family
        ↓
Phase 2.4: Modal & Confirmation Dialog Family
        ↓
Phase 2.5: Input Component Family
        ↓
Phase 2.6: BottomSheet & Action Sheet Family
        ↓
Phase 2.7: Card & List Item Family
        ↓
Phase 2.8: Screen-Level Raw Primitive Cleanup (Group A → B → C)
```

### Rationale:
1. **Skeleton (Phase 2.1)**: Simplest leaf component; zero downstream risk; fixes prop bug in `NoticeBoardLoadingSkeleton.jsx`.
2. **StatusBadge (Phase 2.2)**: Pure presentational pill; no callbacks; cleans up status displays across cards.
3. **Button (Phase 2.3)**: Foundational atomic primitive used by Modals, Cards, and ActionBars. Enhancing `ui/button.tsx` unlocks safe modal migration.
4. **Modal & Confirmation Dialog (Phase 2.4)**: `ConfirmationModal` depends on `Button`. Eliminating un-used `ConfirmationDialog` reduces component clutter.
5. **Input (Phase 2.5)**: Unifying `ui/input.tsx` and `forms/TextInput.tsx` fixes RTL spacing bugs across 20+ form components.
6. **BottomSheet (Phase 2.6)**: Depends on `Button` and `Input` baseline.
7. **Card & List Item (Phase 2.7)**: Composite components containing `StatusBadge`, `Button`, and `Icon`.
8. **Screen Primitives (Phase 2.8)**: Final pass replacing inline `TouchableOpacity` and `TextInput` in screens once all atomic catalog components are validated.

---

## 12. Rollback Strategy

To guarantee quick recovery if a regression occurs during later phases:

### 12.1 Git Commit Policy
Every migration step MUST be committed independently using Conventional Commits:
```bash
git commit -m "feat(ui): enhance ui/button props for backward compatibility"
git commit -m "refactor(ui): migrate common/Button usages to ui/button"
git commit -m "chore(ui): deprecate legacy common/Button implementation"
```

### 12.2 Isolated Rollback Execution
If a specific component family migration fails verification:
* Revert ONLY the commit corresponding to that family:
  ```bash
  git revert <commit-hash-for-family>
  ```
* Do NOT run `git reset --hard` across unrelated component work.

### 12.3 Failure Signals Triggering Rollback
A migration batch MUST be immediately halted and reverted if:
1. TypeScript reports type errors (`tsc --noEmit` fails).
2. Existing UI test suite or automated navigation breaks.
3. Dark mode or RTL layout regressions occur.
4. Redux store or socket event bindings fail to dispatch.

---

## 13. Sensitive Files / Protected Areas

The following files and directories MUST NOT be modified during UI component migrations unless explicitly authorized:

```text
# Authentication & Session Infrastructure
mobile/mobile-app/src/features/auth/
mobile/mobile-app/src/services/api/
mobile/mobile-app/src/store/

# Navigation & Guards
mobile/mobile-app/app/_layout.tsx
mobile/mobile-app/app/(auth)/_layout.tsx
mobile/mobile-app/app/(resident)/_layout.tsx

# Hardware Integrations
mobile/mobile-app/components/hardware/
mobile/mobile-app/app/(resident)/amenities/scanner.tsx
mobile/mobile-app/app/(visitor)/scanner.tsx

# Real-Time Sockets & Event Emitters
mobile/mobile-app/src/hooks/use*Socket.ts
mobile/mobile-app/src/services/socket.ts
```

---

## 14. Safe Migration Contract

When executing subsequent migration phases, the AI Agent and Developer MUST adhere to the following contract:

```markdown
1. SCOPE: Modify ONLY the targeted component family or screen batch specified in the user request.
2. NO API BREAKAGE: Preserve all component prop signatures or provide backward-compatible fallbacks.
3. RTL MANDATE: Ensure all modified styles use NativeWind logical spacing (me-, ms-, pe-, ps-, text-start).
4. THEME TOKENS: Ensure all modified styles use theme tokens (bg-card, bg-muted, text-foreground, border-border).
5. VERIFICATION: Run `npx tsc --noEmit` and check for clean compilation before declaring completion.
6. NO TOUCH: Do NOT touch sensitive backend, auth, socket, or hardware logic files.
```

---

## 15. Phase 2 Recommendation

Proceed to **Phase 2 — Batch 1: Skeleton & StatusBadge Consolidation**.
* **Target 1**: Deprecate pass-through `components/feedback/SkeletonLoader.tsx` in favor of `components/ui/Skeleton.tsx` and fix the `variant="circular"` bug in `NoticeBoardLoadingSkeleton.jsx`.
* **Target 2**: Standardize status pills onto `components/ui/StatusBadge.tsx` and confirm `components/common/Badge.tsx` is strictly reserved for static label tags.

---

## 16. Verification Checklist

Before starting any Phase 2 implementation, verify:
* [x] Codebase audited across `components/`, `app/`, `src/features/`, `src/modules/`, `src/design-system/`.
* [x] Canonical candidates determined for all 8 component families.
* [x] API differences mapped and classified (Safe vs Controlled vs High Risk).
* [x] Inventory of all raw primitive usages documented (`TouchableOpacity`, `TextInput`, `Modal`).
* [x] Screens classified into Low (Group A), Medium (Group B), and High (Group C) risk groups.
* [x] Strict migration rules and order established.
* [x] Rollback strategy and Git commit structure defined.
* [x] Protected sensitive files identified.
* [x] Safe Migration Contract established.
* [x] **Zero source code files modified during Phase 1 analysis**.

---

## Executive Summary

* **Duplicate Component Families Identified**: 8 families (`Button`, `BottomSheet`, `Modal/Confirmation`, `Input`, `Skeleton`, `Status/Badge`, `EmptyState`, `Card`).
* **Raw Primitive Usages Inventory**: 50+ raw `TouchableOpacity`, `Pressable`, `TextInput`, and `Modal` occurrences across screens and features requiring catalog migration.
* **Low-Risk Migration Candidates**: 6 components/screens (Group A).
* **Medium-Risk Migration Candidates**: 20+ form screens & step wizards (Group B).
* **High-Risk Migration Candidates**: 5 hardware/real-time screens & modals (Group C).
* **Recommended First Migration Batch**: `Skeleton` & `StatusBadge` (Phase 2.1 & 2.2).
* **Biggest Migration Risk**: Unifying `ui/input.tsx` and `forms/TextInput.tsx` across 15 visitor multi-step wizards without breaking form handlers.
* **Protected Sensitive Areas**: `src/features/auth/`, `src/services/`, `app/_layout.tsx`, `components/hardware/`.
