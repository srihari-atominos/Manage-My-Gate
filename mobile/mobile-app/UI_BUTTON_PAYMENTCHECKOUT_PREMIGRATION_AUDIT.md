# PaymentCheckoutSheet Final Button Pre-Migration Audit

**Audit Date**: 2026-08-19  
**Status**: AUDIT ONLY — NO APPLICATION CODE MODIFIED  

---

## 1. Final Legacy Button Consumer Verification

- **Target File**: `src/features/billing/components/PaymentCheckoutSheet.tsx`
- **Legacy Import**: `import { Button } from '@/components/common/Button';` (Line 8)
- **Legacy JSX Instances**: Exactly **1** instance (Lines 342–356)

### Verified Legacy JSX Code
```tsx
<Button
  variant="default"
  size="lg"
  className="w-full flex-row items-center justify-center mt-2"
  disabled={isPaymentDisabled || isAmountInvalid || (selectedMethod === 'WALLET' && isWalletInsufficient) || isGlobalSettling}
  loading={isGlobalSettling}
  onPress={handleInitiatePayment}
  accessibilityRole="button"
  accessibilityLabel={`Confirm and Pay ₹${amountToPay.toLocaleString('en-IN')}`}
>
  <Text className="font-bold text-base text-primary-foreground me-1">
    {selectedMethod === 'WALLET' ? `Pay ₹${amountToPay.toLocaleString('en-IN')} via Wallet` : `Proceed to Razorpay (₹${amountToPay.toLocaleString('en-IN')})`}
  </Text>
  <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
</Button>
```

---

## 2. Complete Button Prop Inventory & Canonical Compatibility

| Prop | Legacy Button Expression | Canonical Button (`@/components/ui/button`) | Compatibility Status | Migration Action |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `"default"` | `buttonVariants` (`"default"`) | **DIRECTLY COMPATIBLE** | Retain `"default"` |
| `size` | `"lg"` | `buttonVariants` (`"lg"`) | **DIRECTLY COMPATIBLE** | Retain `"lg"` |
| `className` | `"w-full flex-row items-center justify-center mt-2"` | `cn(...)` utility merging | **DIRECTLY COMPATIBLE** | Retain class string |
| `disabled` | `isPaymentDisabled \|\| isAmountInvalid \|\| (selectedMethod === 'WALLET' && isWalletInsufficient) \|\| isGlobalSettling` | `isDisabled = disabled \|\| loading` on `Pressable` | **DIRECTLY COMPATIBLE** | Retain condition |
| `loading` | `isGlobalSettling` | `ActivityIndicator` toggle & press lock | **DIRECTLY COMPATIBLE** | Retain condition |
| `onPress` | `handleInitiatePayment` | Forwarded to `Pressable.onPress` | **DIRECTLY COMPATIBLE** | Retain handler |
| `accessibilityRole` | `"button"` | Pass-through to `Pressable` (`role="button"`) | **DIRECTLY COMPATIBLE** | Retain prop |
| `accessibilityLabel` | Dynamic template string | Pass-through to `Pressable` | **DIRECTLY COMPATIBLE** | Retain prop |
| `children` | `<Text>` label + `<Icon as={ChevronRight}>` | Flexible React element child rendering | **DIRECTLY COMPATIBLE** | Retain JSX children |

---

## 3. End-to-End Payment Callback Tracing

```text
Button (Lines 342–356)
  ↓
onPress={handleInitiatePayment}
  ↓
handleInitiatePayment (Lines 94–106)
  ↓
[ Validation Check ]: (isPaymentDisabled || isAmountInvalid) ──► Abort if invalid
  ↓
  ├── Branch 1: selectedMethod === 'WALLET'
  │     ├── (isWalletInsufficient) ──► Alert('Insufficient Wallet Balance') & Abort
  │     └── setShowWalletConfirmModal(true)
  │           ↓
  │         ConfirmationModal onConfirm={handleConfirmWalletPayment} (Lines 108–121)
  │           ↓
  │         processWalletPayment(invoice._id, amountToPay) [API POST /billing/pay-wallet]
  │           ↓
  │         loadResidentDues() & onPaymentSuccess(result) & onClose()
  │
  └── Branch 2: selectedMethod === 'RAZORPAY'
        └── handleProcessRazorpay() (Lines 123–149)
              ↓
            initiateRazorpayPayment(invoice._id, amountToPay) [API POST /billing/create-razorpay-order]
              ↓
            setRazorpayOptions({ razorpayKeyId, orderId, paymentId, amount, currency, description, customerName })
              ↓
            RazorpayCheckoutModal (Lines 392–404) [WebView Gateway]
              ↓
            onSuccess={handleRazorpaySuccess} (Lines 151–166)
              ↓
            confirmRazorpayPayment(payload) [API POST /billing/verify-payment]
              ↓
            loadResidentDues() & onPaymentSuccess(verifyResult) & onClose()
```

---

## 4. Payment Gateway Boundaries

1. **UI & Validation Boundary**: Managed inside `PaymentCheckoutSheet.tsx` by `handleInitiatePayment`.
2. **Pre-Gateway Confirmation Boundary**: For Wallet payments, gated by `ConfirmationModal`.
3. **Gateway Order Boundary**: `initiateRazorpayPayment` calls backend API to acquire `orderId` and `razorpayKeyId`.
4. **Gateway Presentation Boundary**: `RazorpayCheckoutModal` renders the WebView overlay for card/UPI authentication.
5. **Backend Verification Boundary**: `handleRazorpaySuccess` forwards WebView signature payload to `confirmRazorpayPayment`.
6. **State Finalization Boundary**: `loadResidentDues()` updates Redux portfolio dues and invoice status.

---

## 5. Double-Submission & Concurrency Protection

- **State Guard**: `isGlobalSettling` is managed by the `useMobilePayment` hook and evaluates to `true` while any backend network request is in flight.
- **Button Lock**: The `disabled` expression includes `|| isGlobalSettling` and `loading={isGlobalSettling}`.
- **Primitive Behavior**: Canonical `@/components/ui/button.tsx` sets `disabled={isDisabled}` on the underlying React Native `Pressable`. When `disabled={true}`, React Native ignores all touch gestures, preventing duplicate taps or double order generation.

---

## 6. Error & Recovery Mechanics

- **Validation / Insufficient Balance**: Alert displayed; Button remains idle and active for user choice correction.
- **Order Creation Network Error**: Catches error, triggers `setShowUnknownStateAlert(true)`, resets loading state.
- **Gateway Cancellation**: WebView `onDismiss` fires; clears `razorpayOptions`, displays "Payment Cancelled" Alert. Button reactivates.
- **Verification Failure**: Catches error; displays "Signature Verification Failed" or unknown state reconciliation alert.

---

## 7. Payment State Machine Diagram

```text
               ┌───────────┐
               │   IDLE    │
               └─────┬─────┘
                     │ (User presses Button)
                     ▼
           ┌───────────────────┐
           │   VALIDATING      │
           └─────────┬─────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [ WALLET PATH ]         [ RAZORPAY PATH ]
         │                       │
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │ CONFIRM MODAL │       │ CREATE ORDER  │
 └───────┬───────┘       └───────┬───────┘
         │                       │
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │ EXECUTE DEDUCT│       │ GATEWAY WEBVIEW│
 └───────┬───────┘       └───────┬───────┘
         │                       │
         │                       ▼
         │               ┌───────────────┐
         │               │ VERIFY SIGN   │
         │               └───────┬───────┘
         │                       │
         └───────────┬───────────┘
                     ▼
             ┌───────────────┐
             │ REFRESH & DISMISS │
             └───────────────┘
```

---

## 8. Final Migration Readiness

- **Compatibility**: 100% Direct Compatibility with `@/components/ui/button.tsx`.
- **Prop Modifications Required**: 0.
- **Business Logic Modifications Required**: 0.
- **Risk Level**: High (Primary payment checkout trigger), but isolated to a single import line replacement.
