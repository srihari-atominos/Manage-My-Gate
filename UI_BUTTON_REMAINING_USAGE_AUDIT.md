# UI Button Remaining Usage Audit

## 1. Purpose

This document provides a comprehensive inventory and risk classification of all remaining consumers of the legacy Button component (`components/common/Button.tsx`) following the successful completion of Phase 2.3A through Phase 2.3F. It outlines the exact usage patterns, barrel export structure, deprecation preconditions, and recommended migration order for Phase 2.3H and beyond.

---

## 2. Current Legacy Button Usage

The legacy Button (`components/common/Button.tsx`) currently has **17 active consumers** across the codebase. Zero dead/unused consumers were identified.

* **Total remaining consumers**: 17
* **Direct imports**: 17
* **Aliased/Barrel imports**: 0
* **Indirect consumers**: 0

---

## 3. Complete Consumer Inventory

| # | File Path | Component / Screen | Button Props Used | Classification |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `components/feedback/AlertDialog.tsx` | `AlertDialog` | `variant="outline"`, `size="sm"`, `onPress`, `className` | **Group A — Safe** |
| 2 | `src/features/noticeBoard/components/ErrorBoundary.jsx` | `ErrorBoundary` | `onPress`, children text | **Group A — Safe** |
| 3 | `src/features/noticeBoard/components/NoticeCard.jsx` | `NoticeCard` | `variant="outline"`, `size="sm"`, `onPress` | **Group A — Safe** |
| 4 | `src/features/noticeBoard/screens/ManageNoticesScreen.jsx` | `ManageNoticesScreen` | `variant="default"`, `size="sm"`, `onPress`, `accessibilityLabel` | **Group A — Safe** |
| 5 | `src/features/billing/components/CreateAssessmentModal.tsx` | `CreateAssessmentModal` | `variant="outline"`, `variant="default"`, `size="lg"`, `loading`, `disabled` | **Group A — Safe** |
| 6 | `src/features/billing/components/wizard/AssessmentFlowFooter.tsx` | `AssessmentFlowFooter` | `variant="outline"`, `variant="default"`, `size="lg"`, `loading`, `disabled` | **Group A — Safe** |
| 7 | `src/features/billing/components/InvoiceActionsBottomSheet.tsx` | `InvoiceActionsBottomSheet` | `variant`, `size`, `onPress`, `loading`, `disabled` | **Group B — Controlled** |
| 8 | `src/features/billing/components/OfflineSettleSheet.tsx` | `OfflineSettleSheet` | `variant="default"`, `size="lg"`, `loading`, `onPress` | **Group B — Controlled** |
| 9 | `src/features/billing/screens/AdminBillingDashboardScreen.tsx` | `AdminBillingDashboardScreen` | `variant="default"`, `size="sm"`, `onPress` | **Group B — Controlled** |
| 10 | `src/features/billing/screens/AssessmentManagementScreen.tsx` | `AssessmentManagementScreen` | `variant="default"`, `size="sm"`, `onPress` | **Group B — Controlled** |
| 11 | `src/features/billing/screens/BillingLedgerScreen.tsx` | `BillingLedgerScreen` | `variant="outline"`, `size="sm"`, `onPress` | **Group B — Controlled** |
| 12 | `src/features/billing/screens/InvoiceDetailsScreen.tsx` | `InvoiceDetailsScreen` | `variant="default"`, `variant="outline"`, `onPress`, `loading` | **Group B — Controlled** |
| 13 | `src/features/billing/components/PaymentCheckoutSheet.tsx` | `PaymentCheckoutSheet` | `variant="default"`, `size="lg"`, `disabled`, `loading`, `onPress` | **Group C — High Risk** |
| 14 | `src/features/billing/screens/PaymentResultScreen.tsx` | `PaymentResultScreen` | `variant="default"`, `variant="outline"`, `size="lg"`, `onPress` | **Group C — High Risk** |
| 15 | `src/features/billing/screens/ResidentMyDuesScreen.tsx` | `ResidentMyDuesScreen` | `variant="default"`, `size="sm"`, `onPress`, `loading` | **Group C — High Risk** |
| 16 | `src/features/billing/screens/ResidentPaymentHistoryScreen.tsx` | `ResidentPaymentHistoryScreen` | `variant="outline"`, `size="sm"`, `onPress` | **Group C — High Risk** |
| 17 | `src/features/billing/screens/WalletScreen.tsx` | `WalletScreen` | `variant="default"`, `size="lg"`, `loading`, `onPress` | **Group C — High Risk** |

---

## 4. Group A — Safe (6 Consumers)

These low-risk UI components and standalone dialogs/headers use standard canonical Button props (`variant`, `size`, `onPress`, `disabled`, `loading`, children text) with no complex layout or state coupling:

1. `components/feedback/AlertDialog.tsx`
2. `src/features/noticeBoard/components/ErrorBoundary.jsx`
3. `src/features/noticeBoard/components/NoticeCard.jsx`
4. `src/features/noticeBoard/screens/ManageNoticesScreen.jsx`
5. `src/features/billing/components/CreateAssessmentModal.tsx`
6. `src/features/billing/components/wizard/AssessmentFlowFooter.tsx`

---

## 5. Group B — Controlled (6 Consumers)

These components require minor prop mapping (e.g. bottom sheet modal height alignment or action status triggers) but carry low business logic risk:

7. `src/features/billing/components/InvoiceActionsBottomSheet.tsx`
8. `src/features/billing/components/OfflineSettleSheet.tsx`
9. `src/features/billing/screens/AdminBillingDashboardScreen.tsx`
10. `src/features/billing/screens/AssessmentManagementScreen.tsx`
11. `src/features/billing/screens/BillingLedgerScreen.tsx`
12. `src/features/billing/screens/InvoiceDetailsScreen.tsx`

---

## 6. Group C — High Risk (5 Consumers)

These screens and bottom sheets are tightly coupled with live financial payment gateway execution (Razorpay integration, digital wallet deductions, transaction receipt generation, and real-time state reconciliation):

13. `src/features/billing/components/PaymentCheckoutSheet.tsx`
14. `src/features/billing/screens/PaymentResultScreen.tsx`
15. `src/features/billing/screens/ResidentMyDuesScreen.tsx`
16. `src/features/billing/screens/ResidentPaymentHistoryScreen.tsx`
17. `src/features/billing/screens/WalletScreen.tsx`

---

## 7. Group D — Possibly Unused (0 Consumers)

Zero unused or dead consumers were found. All 17 remaining references are active.

---

## 8. Previously Migrated Consumer Verification

All 8 previously migrated consumers were inspected and confirmed clean of legacy Button dependencies:

| File Path | Status |
| :--- | :--- |
| `components/analytics/ExportReportButton.tsx` | **PASS (Clean)** |
| `components/settings/OnboardingCarousel.tsx` | **PASS (Clean)** |
| `components/settings/PermissionRequestCard.tsx` | **PASS (Clean)** |
| `components/settings/StorageCleanerWidget.tsx` | **PASS (Clean)** |
| `components/common/ConfirmationDialog.tsx` | **PASS (Clean)** |
| `app/(auth)/login.tsx` | **PASS (Clean)** |
| `app/(auth)/otp.tsx` | **PASS (Clean)** |
| `app/(resident)/all-features.tsx` | **PASS (Clean)** |

---

## 9. Barrel Export Analysis

1. `components/index.ts`:
   * Line 1: `export * from './ui'` — Exports canonical `Button` from `components/ui/button.tsx`.
   * Line 6: `Button as CommonButton` — Exports legacy `components/common/Button.tsx` under alias `CommonButton`.
2. `components/common/index.ts`:
   * Line 4: `export * from './Button'` — Re-exports legacy `Button` when importing from `./common`.
3. `components/ui/index.ts`:
   * Line 20: `export * from './button'` — Re-exports canonical `Button`.

---

## 10. Naming Ambiguity

* Importing `Button` from `@/components` or `@/components/ui/button` resolves to canonical `Button`.
* Importing `Button` from `@/components/common/Button` or `../common/Button` resolves to legacy `Button`.
* `CommonButton` is exported from `@/components` but currently has 0 active usages in screen or component code.

---

## 11. common/Button Removal Preconditions

Before `components/common/Button.tsx` can be safely deleted:

1. Zero active direct imports of `components/common/Button.tsx` or relative `../common/Button`.
2. Removal of `export * from './Button'` from `components/common/index.ts`.
3. Removal of `Button as CommonButton` from `components/index.ts`.
4. Full TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors in application code.
5. Verification of all 17 migrated consumers.

---

## 12. Recommended Migration Order

1. **Phase 2.3H — Notice Board & Standalone UI Components (Group A)**
   * `components/feedback/AlertDialog.tsx`
   * `src/features/noticeBoard/components/ErrorBoundary.jsx`
   * `src/features/noticeBoard/components/NoticeCard.jsx`
   * `src/features/noticeBoard/screens/ManageNoticesScreen.jsx`
2. **Phase 2.3I — Billing Assessment & Action Modals (Group A/B)**
   * `src/features/billing/components/CreateAssessmentModal.tsx`
   * `src/features/billing/components/wizard/AssessmentFlowFooter.tsx`
   * `src/features/billing/components/InvoiceActionsBottomSheet.tsx`
   * `src/features/billing/components/OfflineSettleSheet.tsx`
3. **Phase 2.3J — Billing Dashboard & Management Screens (Group B)**
   * `src/features/billing/screens/AdminBillingDashboardScreen.tsx`
   * `src/features/billing/screens/AssessmentManagementScreen.tsx`
   * `src/features/billing/screens/BillingLedgerScreen.tsx`
   * `src/features/billing/screens/InvoiceDetailsScreen.tsx`
4. **Phase 2.3K — Billing Payment & Wallet High-Risk Screens (Group C)**
   * `src/features/billing/components/PaymentCheckoutSheet.tsx`
   * `src/features/billing/screens/PaymentResultScreen.tsx`
   * `src/features/billing/screens/ResidentMyDuesScreen.tsx`
   * `src/features/billing/screens/ResidentPaymentHistoryScreen.tsx`
   * `src/features/billing/screens/WalletScreen.tsx`
5. **Phase 2.3L — Legacy Button Deprecation & Barrel Cleanup**
   * Remove `components/common/Button.tsx` and barrel references.

---

## 13. Protected / High-Risk Areas

* **Razorpay Payment Gateways**: `PaymentCheckoutSheet.tsx` and `PaymentResultScreen.tsx` handle real-time payment webviews, network reconciliation alerts, and signature confirmations.
* **Digital Wallet Operations**: `WalletScreen.tsx` and `ResidentMyDuesScreen.tsx` process balance deductions and top-up redirects.

---

## 14. Phase 2.3H Recommendation

Proceed with **Phase 2.3H: Migrate Notice Board & Standalone UI Components (Group A)**, covering `AlertDialog.tsx`, `ErrorBoundary.jsx`, `NoticeCard.jsx`, and `ManageNoticesScreen.jsx`.
