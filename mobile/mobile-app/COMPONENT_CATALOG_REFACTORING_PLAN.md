# Mobile Component Catalog Review & Refactoring Plan

**Project**: Manage-My-Gate Enterprise Mobile Application  
**Platform**: React Native (0.81.5) / Expo SDK 56 / Expo Router / NativeWind v4  
**Date**: 2026-08-19  
**Status**: Approved Component Modernization & Standardization Roadmap  

---

## 1. Executive Summary

A comprehensive architectural audit of our 117-component catalog (`components/` directory) was conducted against the **Single Source of Truth (SSOT)** design system strategy. 

While the catalog provides extensive feature coverage across 12 domain categories, several core atomic components exhibit:
1. **Design Token Drift & Hardcoded Literals**: Remnants of deprecated Slate palettes (`bg-slate-100`, `text-slate-900`), hardcoded hex colors (`#dbeafe`, `#fee2e2`, `#2563eb`), and raw color classes (`text-red-500`, `bg-emerald-100`).
2. **RTL & Spacing Violations**: Directional physical utility classes (`mr-2`, `mr-3`, `ml-2`, `-ml-1.5`) that break layout mirroring during Arabic (RTL) localization.
3. **Redundant & Competing Implementations**: Parallel duplicate components for BottomSheets, Badges, Alert Dialogs, and Icon Buttons.
4. **Missing Essential Props & Contract Inconsistencies**: Missing loading states, accessibility properties, helper text/error bindings, and rigid prop requirements.

This document details the defect inventory and outlines a phased **Component Refactoring Plan** to upgrade and harden our reusable component ecosystem.

---

## 2. Component Defect & Redundancy Matrix

```
                        COMPONENT CATALOG GAP & REDUNDANCY INVENTORY
┌─────────────────────────┬───────────────────────────────────┬──────────────────────────────────────────────────┐
│ Component               │ Category / Location               │ Identified Defect / Gap / Redundancy             │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────────────────┤
│ BottomSheet (Dual Impl) │ components/ui & components/common │ Competing Gorhom BottomSheet vs RN Modal Sheet   │
│ Badge vs StatusBadge    │ components/common/Badge.tsx       │ Redundant to StatusBadge; hardcoded Slate/Hex    │
│ AlertDialog             │ components/feedback/AlertDialog   │ Unused (0 consumers); duplicates ErrorBanner     │
│ IconButton              │ components/common/IconButton.tsx  │ Redundant to Button (size="icon") with Slate css │
│ ScreenShell             │ components/ui/ScreenShell.tsx     │ Physical mr-/ml- classes; hardcoded #fee2e2 hex  │
│ ListCard                │ components/ui/ListCard.tsx        │ Hardcoded #dbeafe/#2563eb; physical mr-3/ml-2    │
│ EmptyState              │ components/feedback/EmptyState    │ Hardcoded Slate; Mandatory icon prop crashes app │
│ TextInput               │ components/forms/TextInput.tsx    │ Hardcoded #94a3b8; text-red-500; no focus ring   │
│ Card                    │ components/common/Card.tsx        │ Hardcoded Slate; uses deprecated space-y-1.5     │
│ ErrorBanner             │ components/feedback/ErrorBanner   │ Physical mr-3/ml-3; missing onRetry/Action slot  │
│ ConfirmationModal       │ components/ui/ConfirmationModal   │ Raw ActivityIndicator instead of Button loading  │
└─────────────────────────┴───────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 3. Deep-Dive Gap Analysis

### A. Redundant & Duplicate Implementations

1. **Dual Bottom Sheet Primitives**:
   - `components/common/BottomSheet.tsx`: Implemented via `@gorhom/bottom-sheet` (gesture-based).
   - `components/ui/BottomSheet.tsx`: Implemented via React Native `Modal` + `Pressable` backdrop.
   - **Resolution**: Standardize on a single canonical `BottomSheet` supporting dynamic content height, snap points, and safe-area insets.
2. **`Badge.tsx` vs `StatusBadge.tsx`**:
   - `components/common/Badge.tsx` uses custom `variantClasses` (`bg-slate-100`, `emerald-100`, `red-100`) and non-standard variant names (`error`).
   - `components/ui/StatusBadge.tsx` is the canonical implementation with animated pulsing dots, CVA variants, and centralized status mappings (`getStatusVariant`).
   - **Resolution**: Consolidate all badge usages onto `StatusBadge` and deprecate `Badge.tsx`.
3. **`IconButton.tsx` vs `Button (size="icon")`**:
   - `components/common/IconButton.tsx` recreates button states using raw `Pressable` and hardcoded `bg-slate-100`, `bg-red-500`.
   - Canonical `@/components/ui/button` already supports `size="icon"` with CVA variants (`default`, `secondary`, `outline`, `ghost`, `destructive`).
   - **Resolution**: Reimplement `IconButton` to be a thin wrapper around canonical `Button` with `size="icon"`.
4. **`AlertDialog.tsx` (Unused Dead Code)**:
   - `components/feedback/AlertDialog.tsx` is an inline card implementation with 0 active consumers that duplicates `ErrorBanner` and `ConfirmationModal`.
   - **Resolution**: Delete `AlertDialog.tsx`.

---

### B. Design Token & RTL Violations in Core Primitives

1. **`ScreenShell.tsx`**:
   - **Physical Classes**: Contains `mr-2`, `mr-2.5`, `-ml-1.5` in header and back button slots.
   - **Hardcoded Palette**: Error banner uses hardcoded `#fee2e2` and `#450a0a` background hexes, `text-red-800`, and `bg-red-600` instead of `status-danger` / `destructive` tokens.
2. **`ListCard.tsx`**:
   - **Hardcoded Hexes**: Default props hardcode `leftIconBgColor = '#dbeafe'` and `leftIconColor = '#2563eb'`.
   - **Physical Classes**: Contains `mr-3` and `ml-2` violating RTL layout.
3. **`Card.tsx`**:
   - **Slate Palettes**: Uses `bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800` instead of `bg-card border-border`.
   - **Deprecated Utilities**: Uses `space-y-1.5` instead of NativeWind `gap-y-1.5`.
4. **`EmptyState.tsx`**:
   - **Slate Palettes**: Uses `bg-slate-100 dark:bg-slate-800`, `text-slate-900 dark:text-white`, `text-slate-500`.

---

### C. Missing Essential Props & Contract Inconsistencies

1. **`TextInput.tsx`**:
   - **Missing Props**: `helperText?: string`, `required?: boolean`, `loading?: boolean`.
   - **Styling Gaps**: Hardcoded placeholder color (`#94a3b8`), `text-red-500` error text (instead of `text-destructive`), and no focus ring state (`border-primary` / `ring-ring`).
2. **`EmptyState.tsx`**:
   - **Fragile Contract**: `icon: LucideIcon` is mandatory. If an optional icon is passed as undefined, it throws a runtime render error. Needs a default fallback icon (`Inbox` / `SearchX`).
3. **`ErrorBanner.tsx`**:
   - **Missing Props**: `onRetry?: () => void`, `retryLabel?: string`.
4. **`ConfirmationModal.tsx`**:
   - **Primitive Duplication**: Uses raw `<ActivityIndicator size="small" color="#ffffff" />` instead of `<Button loading={loading}>`.

---

## 4. Component Refactoring Roadmap

```
                              REFACTORING ROADMAP PHASES
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: TOKEN & RTL CLEANUP ON ATOMIC PRIMITIVES                                               │
│ • Update ScreenShell, ListCard, Card, StatusBadge to 100% theme tokens & logical classes (me/ms)│
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: COMPONENT PRUNING & CONSOLIDATION                                                      │
│ • Deprecate/delete components/feedback/AlertDialog.tsx (0 consumers)                            │
│ • Standardize BottomSheet to a single canonical primitive                                       │
│ • Deprecate Badge.tsx in favor of canonical StatusBadge                                         │
│ • Refactor IconButton.tsx to wrap Button (size="icon")                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: PROPS ENHANCEMENT & CONTRACT HARDENING                                                 │
│ • Upgrade TextInput: add helperText, required indicator, theme placeholder, focus ring          │
│ • Upgrade EmptyState: make icon optional with fallback, replace Slate with tokens               │
│ • Upgrade ErrorBanner: add onRetry slot, replace red-* with status-danger tokens                │
│ • Upgrade ConfirmationModal: use Button loading prop directly                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: BARREL EXPORTS & CATALOG VERIFICATION                                                  │
│ • Update components/index.ts and COMPONENTS_CATALOG.md                                          │
│ • Run test suite to verify 0 regressions across all consumer screens                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phase-by-Phase Implementation Specifications

### Phase 1: Token & RTL Cleanup on Core Primitives

#### 1. [`components/ui/ScreenShell.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/ScreenShell.tsx)
- Replace all directional margins:
  - `mr-2` $\longrightarrow$ `me-2`
  - `mr-2.5` $\longrightarrow$ `me-2.5`
  - `-ml-1.5` $\longrightarrow$ `-ms-1.5`
- Replace hardcoded error banner colors:
  - `bg-[#fee2e2] dark:bg-[#450a0a]` $\longrightarrow$ `bg-destructive/10 dark:bg-destructive/20 border-destructive/30`
  - `text-red-800 dark:text-red-200` $\longrightarrow$ `text-destructive`
  - `bg-red-600` $\longrightarrow$ `bg-destructive`

#### 2. [`components/ui/ListCard.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/ListCard.tsx)
- Replace directional margins:
  - `mr-3` $\longrightarrow$ `me-3`
  - `ml-2` $\longrightarrow$ `ms-2`
- Default icon background and text colors to design tokens:
  - `bg-primary/10` and `text-primary` instead of `#dbeafe` / `#2563eb`.

#### 3. [`components/common/Card.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/common/Card.tsx)
- Standardize surface classes:
  - `default`: `bg-card border border-border`
  - `elevated`: `bg-card shadow-sm shadow-black/5 dark:shadow-none border border-border/50`
  - `outline`: `bg-transparent border border-border`
- Replace `space-y-1.5` with `gap-y-1.5`.

---

### Phase 2: Pruning & Consolidation

#### 1. Delete Dead Code
- Remove [`components/feedback/AlertDialog.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/feedback/AlertDialog.tsx) and its barrel export.

#### 2. BottomSheet Consolidation
- Standardize on `components/ui/BottomSheet.tsx` as the single canonical bottom sheet, supporting:
  - `visible: boolean`, `onClose: () => void`, `title?: string`, `snapPoints?: (string | number)[]`, `children: React.ReactNode`.

#### 3. Badge Consolidation
- Re-export canonical `StatusBadge` in `components/common/Badge.tsx` with a deprecation notice to preserve backwards compatibility while unifying the UI.

#### 4. IconButton Consolidation
- Refactor [`components/common/IconButton.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/common/IconButton.tsx) to delegate directly to `<Button variant={variant} size="icon">`.

---

### Phase 3: Props Enhancement & Contract Hardening

#### 1. [`components/forms/TextInput.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/forms/TextInput.tsx)
```tsx
export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}
```
- Integrate `onFocus` and `onBlur` listeners to apply an active `border-primary` focus ring.
- Replace `text-red-500` with `text-destructive`.
- Replace hardcoded `#94a3b8` placeholder with dynamic theme token styling.

#### 2. [`components/feedback/EmptyState.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/feedback/EmptyState.tsx)
```tsx
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}
```
- Make `icon` optional and default to `Inbox` from `lucide-react-native`.
- Replace all Slate classes with `bg-muted`, `text-foreground`, and `text-muted-foreground`.
- Rely on `<Button variant="default">` for action rendering.

#### 3. [`components/feedback/ErrorBanner.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/feedback/ErrorBanner.tsx)
- Add `onRetry?: () => void` and `retryLabel?: string`.
- Standardize on `bg-destructive/10 border-destructive/20 text-destructive` tokens and logical margins (`me-3`, `ms-3`).

#### 4. [`components/ui/ConfirmationModal.tsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/components/ui/ConfirmationModal.tsx)
- Replace raw `<ActivityIndicator />` in the confirm button with `<Button loading={loading} variant={confirmButtonVariant}>`.

---

### Phase 4: Barrel Exports & Verification

1. Synchronize all category barrel exports (`components/ui/index.ts`, `components/forms/index.ts`, `components/feedback/index.ts`, `components/common/index.ts`, `components/index.ts`).
2. Update [`COMPONENTS_CATALOG.md`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/mobile/mobile-app/COMPONENTS_CATALOG.md) to reflect pruned components and updated prop interfaces.
3. Run Jest test suite (`npm run test`) to verify 0 regressions across all consumer screens.
