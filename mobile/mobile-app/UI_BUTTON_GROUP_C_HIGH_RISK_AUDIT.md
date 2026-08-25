# Group C High-Risk Button Migration Audit

**Audit Date**: 2026-08-19  
**Status**: AUDIT ONLY — NO SOURCE CODE MODIFIED  

---

## 1. Current State Verification

- **Original Legacy Button Consumers**: 17
- **Group A Completed**: 6/6
- **Group B Completed**: 6/6
- **Group C Completed**: 0/5
- **Remaining Legacy Button Import Statements**: 5 files (12 total JSX Button instances across Group C)

### Verification Query Result
`import { Button } from '@/components/common/Button';` exists in exactly **5 files**:
1. `src/features/billing/components/PaymentCheckoutSheet.tsx`
2. `src/features/billing/screens/PaymentResultScreen.tsx`
3. `src/features/billing/screens/ResidentMyDuesScreen.tsx`
4. `src/features/billing/screens/ResidentPaymentHistoryScreen.tsx`
5. `src/features/billing/screens/WalletScreen.tsx`

---

## 2. Comprehensive Group C Inspection & Callback Chains

### Component 1: `src/features/billing/components/PaymentCheckoutSheet.tsx`
- **File Risk Level**: HIGH RISK / CRITICAL
- **Legacy Button Imports**: 1
- **Legacy Button Usages**: 1 instance

#### Button 1: Primary Payment Action Button
- **Location**: Lines 342–356
- **Label**: `Pay ₹{amountToPay} via Wallet` OR `Proceed to Razorpay (₹{amountToPay})`
- **Variant**: `default` | **Size**: `lg`
- **State Dependencies**: `disabled={isPaymentDisabled || isAmountInvalid || isWalletInsufficient || isGlobalSettling}`, `loading={isGlobalSettling}`
- **Callback Chain**:
  `onPress={handleInitiatePayment}`
  ↓
  `handleInitiatePayment`
  ↓
  - **Wallet Path**: `setShowWalletConfirmModal(true)` → User confirms → `processWalletPayment(invoice._id, amount)` → API POST `/billing/pay-wallet` → `loadResidentDues()` → State refresh & Success Alert.
  - **Razorpay Path**: `handleProcessRazorpay()` → `initiateRazorpayPayment(invoice._id, amount)` → API POST `/billing/create-razorpay-order` → `setRazorpayOptions(...)` → `RazorpayCheckoutModal` (WebView/SDK) → Signature Verification API → State refresh.
- **Side Effects**: Wallet balance deduction, Razorpay payment order generation, backend database transaction mutation.
- **Classification**: B — Payment execution & D — Wallet/payment balance
- **Risk Level**: **CRITICAL**
- **Canonical Button API Compatibility**: Fully compatible with `@/components/ui/button.tsx` without modifying payment business logic.

---

### Component 2: `src/features/billing/screens/PaymentResultScreen.tsx`
- **File Risk Level**: MEDIUM RISK
- **Legacy Button Imports**: 1
- **Legacy Button Usages**: 3 instances

#### Button 1: Share Digital Receipt
- **Location**: Lines 206–216
- **Label**: `Share Digital Receipt`
- **Variant**: `default` | **Size**: `lg`
- **Callback Chain**: `onPress={handleShareReceipt}` → `Share.share({...})` (OS Native Sharing API).
- **Side Effects**: Invokes React Native OS `Share` dialog with formatted receipt text.
- **Classification**: E — Receipt/share action
- **Risk Level**: **MEDIUM RISK**

#### Button 2: View Invoice Details
- **Location**: Lines 220–230
- **Label**: `View Invoice Details`
- **Variant**: `outline` | **Size**: `lg`
- **Callback Chain**: `onPress={() => router.push('/(resident)/billing/invoice/' + invoiceId)}`.
- **Side Effects**: Expo Router navigation.
- **Classification**: B — Navigation control
- **Risk Level**: **MEDIUM RISK**

#### Button 3: Return to My Dues
- **Location**: Lines 232–241
- **Label**: `Return to My Dues`
- **Variant**: `secondary` | **Size**: `lg`
- **Callback Chain**: `onPress={() => router.push('/(resident)/billing/my-dues')}`.
- **Side Effects**: Expo Router navigation.
- **Classification**: B — Navigation control
- **Risk Level**: **MEDIUM RISK**

- **Canonical Button API Compatibility**: All 3 instances are fully compatible with `@/components/ui/button.tsx`.

---

### Component 3: `src/features/billing/screens/ResidentMyDuesScreen.tsx`
- **File Risk Level**: HIGH RISK
- **Legacy Button Imports**: 1
- **Legacy Button Usages**: 5 instances

#### Button 1: Digital Wallet Widget "View Wallet"
- **Location**: Lines 159–167
- **Label**: `View Wallet`
- **Variant**: `outline` | **Size**: `sm`
- **Callback Chain**: `onPress={handleOpenWalletScreen}` → `router.push('/(resident)/billing/wallet')`.
- **Side Effects**: Expo Router navigation.
- **Classification**: B — Navigation control
- **Risk Level**: **MEDIUM RISK**

#### Button 2: Invoice Card "Details" Button
- **Location**: Lines 280–286
- **Label**: `Details`
- **Variant**: `secondary` | **Size**: `sm`
- **Callback Chain**: `onPress={() => handleViewInvoiceDetails(invoiceId)}` → `router.push('/(resident)/billing/invoice/' + invoiceId)`.
- **Side Effects**: Expo Router navigation.
- **Classification**: B — Navigation control
- **Risk Level**: **MEDIUM RISK**

#### Button 3: Invoice Card "Pay Now" Button
- **Location**: Lines 289–295
- **Label**: `Pay Now`
- **Variant**: `default` | **Size**: `sm`
- **Callback Chain**: `onPress={() => setCheckoutInvoice(mappedInvoice)}` → Opens `PaymentCheckoutSheet`.
- **Side Effects**: Opens modal payment checkout sheet for specific invoice.
- **Classification**: C — Payment action (Checkout trigger)
- **Risk Level**: **HIGH RISK**

#### Button 4: Sticky Footer Primary "Pay Now" CTA
- **Location**: Lines 359–372
- **Label**: `Pay Now — ₹{totalPortfolioDue}`
- **Variant**: `default` | **Size**: `lg`
- **Callback Chain**: `onPress={handlePayNowPrimary}` → `findFirstUnpaidInvoice()` → `setCheckoutInvoice(targetInv)` → Opens `PaymentCheckoutSheet`.
- **Side Effects**: Opens modal payment checkout sheet for top portfolio due.
- **Classification**: C — Payment action (Primary portfolio checkout trigger)
- **Risk Level**: **HIGH RISK**

#### Button 5: Sticky Footer Secondary "Offline Cheque" CTA
- **Location**: Lines 375–383
- **Label**: `Offline Cheque`
- **Variant**: `outline` | **Size**: `lg`
- **Callback Chain**: `onPress={handleOfflineChequePrimary}` → `findFirstUnpaidInvoice()` → `setOfflineInvoice(targetInv)` → Opens `OfflineSettleSheet`.
- **Side Effects**: Opens offline cheque payment settlement sheet.
- **Classification**: D — Settlement action (Offline settlement trigger)
- **Risk Level**: **HIGH RISK**

- **Canonical Button API Compatibility**: All 5 instances are fully compatible with `@/components/ui/button.tsx`.

---

### Component 4: `src/features/billing/screens/ResidentPaymentHistoryScreen.tsx`
- **File Risk Level**: MEDIUM RISK
- **Legacy Button Imports**: 1
- **Legacy Button Usages**: 1 instance

#### Button 1: History Card "Receipt" / "Details" Button
- **Location**: Lines 219–227
- **Label**: `Receipt` (if paid) | `Details` (if unpaid/partial)
- **Variant**: `isPaid ? 'default' : 'secondary'` | **Size**: `sm`
- **Callback Chain**: `onPress={() => handleViewInvoiceDetails(invoiceId)}` → `router.push('/(resident)/billing/invoice/' + invoiceId)`.
- **Side Effects**: Expo Router navigation.
- **Classification**: B — Navigation control / E — Receipt view navigation
- **Risk Level**: **MEDIUM RISK**

- **Canonical Button API Compatibility**: Fully compatible with `@/components/ui/button.tsx`.

---

### Component 5: `src/features/billing/screens/WalletScreen.tsx`
- **File Risk Level**: HIGH RISK / CRITICAL
- **Legacy Button Imports**: 1
- **Legacy Button Usages**: 2 instances

#### Button 1: Available Wallet Balance "Add Money to Wallet" Hero CTA
- **Location**: Lines 154–164
- **Label**: `Add Money to Wallet`
- **Variant**: `default` | **Size**: `lg`
- **Callback Chain**: `onPress={() => setShowTopUpSheet(true)}`.
- **Side Effects**: Opens Top-Up BottomSheet modal.
- **Classification**: A — UI-only action
- **Risk Level**: **MEDIUM RISK**

#### Button 2: Top-Up BottomSheet "Proceed to Top-Up • ₹{topUpAmount}" Submit CTA
- **Location**: Lines 308–322
- **Label**: `Proceed to Top-Up • ₹{topUpAmount}`
- **Variant**: `default` | **Size**: `lg`
- **State Dependencies**: `disabled={isTopUpInvalid || isProcessingTopUp}`, `loading={isProcessingTopUp}`
- **Callback Chain**:
  `onPress={handleProceedTopUp}`
  ↓
  `handleProceedTopUp`
  ↓
  `dispatch(createWalletRazorpayOrder({ amount: topUpAmount }))`
  ↓
  API POST `/wallet/create-razorpay-order`
  ↓
  `setRazorpayOptions(...)` → `RazorpayCheckoutModal` (WebView)
  ↓
  `handleWalletRazorpaySuccess(payload)`
  ↓
  `dispatch(verifyWalletPayment(payload))`
  ↓
  API POST `/wallet/verify-payment` → `fetchWalletBalance()` Redux refresh.
- **Side Effects**: Razorpay order creation, payment gateway launch, wallet top-up signature verification, digital wallet balance credit mutation.
- **Classification**: B — Payment execution & D — Wallet balance credit mutation
- **Risk Level**: **CRITICAL**

- **Canonical Button API Compatibility**: Fully compatible with `@/components/ui/button.tsx`.

---

## 3. Risk Summary Matrix

| Component File | Legacy Consumers Count | Highest Risk Button | Overall Component Risk |
| :--- | :--- | :--- | :--- |
| `PaymentCheckoutSheet.tsx` | 1 instance | Payment Execution / Razorpay | **HIGH RISK / CRITICAL** |
| `PaymentResultScreen.tsx` | 3 instances | OS Receipt Share / Navigation | **MEDIUM RISK** |
| `ResidentMyDuesScreen.tsx` | 5 instances | Portfolio Checkout & Offline Triggers | **HIGH RISK** |
| `ResidentPaymentHistoryScreen.tsx` | 1 instance | History Receipt Details Navigation | **MEDIUM RISK** |
| `WalletScreen.tsx` | 2 instances | Wallet Recharge Order & Verification | **HIGH RISK / CRITICAL** |

---

## 4. Migration Strategy Recommendations for Group C

1. **Sequential Single-Screen Migration Strategy**:
   - Migrate low/medium risk screens first (`ResidentPaymentHistoryScreen.tsx`, then `PaymentResultScreen.tsx`).
   - Follow with trigger screens (`ResidentMyDuesScreen.tsx`).
   - Finish with core payment processing components (`WalletScreen.tsx` and `PaymentCheckoutSheet.tsx`).
2. **Zero Logic Refactoring**: Keep all thunk dispatches, payment state handlers, and WebView checkout modal interactions unchanged.
3. **Verification**: Run `npx tsc --noEmit` after each individual Group-C migration.
