# Login Screen UI Migration Audit

## 1. Executive Summary

This document presents the UI consistency pre-migration audit for `app/(auth)/login.tsx` as part of Mobile UI Consistency Phase 2.7A.

The objective of this audit is to evaluate raw primitive usages (`TouchableOpacity`, `Pressable`, `TextInput`, `ActivityIndicator`), assess compliance with canonical component standards (`Button`, `Input`, `SegmentedControl`, `ErrorBanner`), inspect authentication and navigation flows, and define a zero-risk migration sequence for Phase 2.7B.

### Key Audit Findings:
1. **Submit CTAs**: `login.tsx` already uses the canonical `Button` component (`@/components/ui/button`) for both "Sign In" and "Get OTP Code" actions.
2. **Form Inputs**: `login.tsx` already uses the canonical `Input` component (`@/components/ui/input`) for Email/Username, Password, and Mobile Number fields.
3. **Tab Switcher**: `login.tsx` contains **2 raw `TouchableOpacity` controls** forming a tab switcher between Password Login and Phone OTP modes. These can be migrated to `SegmentedControl` (`@/components/common/SegmentedControl`).
4. **Error Banners**: Inline `View` containers with custom Tailwind styling are used for global error feedback instead of the canonical `ErrorBanner` (`@/components/feedback/ErrorBanner`).
5. **Loading States**: 0 explicit `ActivityIndicator` instances exist in `login.tsx` (button loading state is handled internally by `<Button loading={loading}>`).
6. **Authentication & Navigation**: Form state management (`react-hook-form` + `yupResolver`), `useAuth` hook interactions, and `expo-router` navigation paths are well-decoupled and will remain 100% untouched.

---

## 2. Current Component Inventory

The table below lists all components and hooks imported in `app/(auth)/login.tsx`:

| Component / Module | Source Path | Usage in `login.tsx` | Status |
|---|---|---|---|
| `Button` | `@/components/ui/button` | Submit CTAs ("Sign In", "Get OTP Code") | Canonical UI Component |
| `Text` | `@/components/ui/text` | Typography (Headers, labels, tab text) | Canonical UI Component |
| `Input` | `@/components/ui/input` | Text inputs (Email/Username, Password, Phone) | Canonical UI Component |
| `Stack`, `router` | `expo-router` | Screen header options & navigation routing | Navigation Framework |
| `ShieldCheck`, `Mail`, `Lock`, `Phone` | `lucide-react-native` | Decorative field & brand icons | Icon Library |
| `View`, `ScrollView`, `TouchableOpacity` | `react-native` | Layout containers & raw tab switcher | Primitive UI Components |
| `useForm`, `Controller` | `react-hook-form` | Form state and field binding | Form Management |
| `yupResolver` | `@hookform/resolvers/yup` | Schema validation binding | Validation |
| `useAuth` | `../../src/features/auth/hooks/useAuth` | Auth state, login handler, OTP thunks | Domain Hook |

---

## 3. Interactive Control Inventory

Below is the complete inventory of all interactive controls in `login.tsx`:

### Control 1: Password Login Tab Button
- **Location**: `app/(auth)/login.tsx` (Lines 120–134)
- **Component**: `TouchableOpacity`
- **Purpose**: Toggle active authentication mode to `'basic'` (Password Login)
- **Callback**: `onPress={() => setAuthMode('basic')}`
- **Disabled Condition**: None
- **Loading Condition**: None
- **`accessibilityRole`**: Missing
- **`accessibilityLabel`**: Missing
- **Visual Variant**: Custom tab pill (`bg-card shadow-sm` when active, transparent when inactive)
- **Children**: `<Text>` "Password Login"
- **Classification**: Specialized toggle control (Tab Switcher) -> Candidate for `SegmentedControl`

### Control 2: Phone OTP Tab Button
- **Location**: `app/(auth)/login.tsx` (Lines 136–150)
- **Component**: `TouchableOpacity`
- **Purpose**: Toggle active authentication mode to `'phone'` (Phone OTP)
- **Callback**: `onPress={() => setAuthMode('phone')}`
- **Disabled Condition**: None
- **Loading Condition**: None
- **`accessibilityRole`**: Missing
- **`accessibilityLabel`**: Missing
- **Visual Variant**: Custom tab pill (`bg-card shadow-sm` when active, transparent when inactive)
- **Children**: `<Text>` "Phone OTP"
- **Classification**: Specialized toggle control (Tab Switcher) -> Candidate for `SegmentedControl`

### Control 3: "Sign In" Submit Button
- **Location**: `app/(auth)/login.tsx` (Lines 203–210)
- **Component**: `<Button>` (`@/components/ui/button`)
- **Purpose**: Submit basic email/username + password credentials
- **Callback**: `onPress={basicForm.handleSubmit(onBasicSubmit)}`
- **Disabled Condition**: `loading` (handled internally by `Button`)
- **Loading Condition**: `loading={loading}` (from `useAuth`)
- **`accessibilityRole`**: `"button"` (handled inside `Button`)
- **`accessibilityLabel`**: Derived from child string ("Sign In")
- **Visual Variant**: Primary action button (`className="mt-2 h-12 bg-primary rounded-xl"`)
- **Children**: Text "Sign In"
- **Classification**: Submit CTA -> **Already Canonical**

### Control 4: "Get OTP Code" Submit Button
- **Location**: `app/(auth)/login.tsx` (Lines 240–247)
- **Component**: `<Button>` (`@/components/ui/button`)
- **Purpose**: Submit mobile phone number for OTP dispatch
- **Callback**: `onPress={phoneForm.handleSubmit(onPhoneSubmit)}`
- **Disabled Condition**: `loading` (handled internally by `Button`)
- **Loading Condition**: `loading={loading}` (from `useAuth`)
- **`accessibilityRole`**: `"button"` (handled inside `Button`)
- **`accessibilityLabel`**: Derived from child string ("Get OTP Code")
- **Visual Variant**: Primary action button (`className="mt-2 h-12 bg-primary rounded-xl"`)
- **Children**: Text "Get OTP Code"
- **Classification**: Submit CTA -> **Already Canonical**

---

## 4. Canonical Button Compatibility

| Current Control | Current Impl | Canonical Component | Props Required | Compatible? | Migration Notes |
|---|---|---|---|---|---|
| Password Login Tab | `TouchableOpacity` | `SegmentedControl` | `segments`, `activeSegment`, `onChange` | **YES** | Migrate pair to `SegmentedControl` |
| Phone OTP Tab | `TouchableOpacity` | `SegmentedControl` | `segments`, `activeSegment`, `onChange` | **YES** | Migrate pair to `SegmentedControl` |
| "Sign In" CTA | `<Button>` | `@/components/ui/button` | `onPress`, `loading`, `className` | **100% CANONICAL** | Retain existing `<Button>` |
| "Get OTP Code" CTA | `<Button>` | `@/components/ui/button` | `onPress`, `loading`, `className` | **100% CANONICAL** | Retain existing `<Button>` |

---

## 5. Input Compatibility

An audit of all input fields in `login.tsx` reveals:

1. **Email or Username Field** (Line 162): Renders `<Input label="Email or Username" ... />` from `@/components/ui/input`.
2. **Password Field** (Line 181): Renders `<Input label="Password" isPassword ... />` from `@/components/ui/input`.
3. **Mobile Number Field** (Line 219): Renders `<Input label="Mobile Number" ... />` from `@/components/ui/input`.

### Component Comparison (`@/components/ui/input` vs `@/components/forms/TextInput`):
- Both components wrap React Native's `TextInput` and accept standard `TextInputProps`.
- `@/components/ui/input` includes native password toggle functionality (`isPassword` prop renders `Eye`/`EyeOff` toggle button), left icon support (`leftIcon`), and dark mode colors.
- `login.tsx` is already fully integrated with `@/components/ui/input`. No input migration is necessary or recommended.

---

## 6. Segment Control Analysis

The active mode switcher in `login.tsx` (Lines 118–151) currently uses two `TouchableOpacity` controls inside a container `View`.

### Comparison with Canonical `SegmentedControl` (`@/components/common/SegmentedControl.tsx`):

| Feature | Current Custom Implementation | Canonical `SegmentedControl` |
|---|---|---|
| **Animation** | Static background toggle | Smooth sliding pill via `react-native-reanimated` |
| **Accessibility** | Raw `TouchableOpacity` without ARIA roles | Standard `Pressable` targets |
| **API Interface** | Manual state setting per button | Unified `onChange(key)` callback |
| **Dark Mode** | Hardcoded conditional classes | Built-in `slate-100` / `slate-800` theme classes |

**Recommendation**: Replace the custom tab switcher with `SegmentedControl`:
```tsx
<SegmentedControl
  segments={[
    { key: 'basic', label: 'Password Login' },
    { key: 'phone', label: 'Phone OTP' },
  ]}
  activeSegment={authMode}
  onChange={(key) => setAuthMode(key as 'basic' | 'phone')}
/>
```

---

## 7. Loading State Analysis

- **Raw `ActivityIndicator` Instances**: 0
- Submission loading states are bound to `useAuth()`'s `loading` boolean and passed directly to `<Button loading={loading}>`.
- `<Button>` internally handles rendering the spinner and disabling touch interactions when `loading` is true.
- No `ProgressLoader` component is needed for form submission.

---

## 8. Authentication Flow

The complete authentication execution path in `login.tsx`:

```
User Action (Form Submission)
  │
  ▼
React Hook Form Validation (Yup Schema)
  │
  ├─ Valid ──► onBasicSubmit / onPhoneSubmit
  └─ Invalid ─► Render field error message (Input error prop)
        │
        ▼
useAuth Hook Action
  │
  ├─ Basic Auth: performLogin({ login, password }) ──► Redux loginUser thunk ──► API /auth/login
  └─ Phone OTP: requestOtp(phone, false) ────────────► Redux requestOtp thunk ─► API /auth/login/phone
        │
        ▼
Auth State Side Effects (useEffect)
  │
  ├─ isAuthenticated === true ──────────► router.replace('/(resident)/dashboard')
  ├─ otpSent === true && phone set ──────► router.push({ pathname: '/(auth)/otp', params: { phone } })
  └─ error !== null ─────────────────────► Render Global Error Banner
```

**Scope Constraint**: 100% of the above logic (form state, thunk dispatches, navigation side-effects) will remain untouched during UI migration.

---

## 9. Navigation Flow

- **Screen Header Configuration**: `<Stack.Screen options={{ title: 'Sign In' }} />`
- **Authenticated Redirect**: `router.replace('/(resident)/dashboard')`
- **OTP Screen Push**: `router.push({ pathname: '/(auth)/otp', params: { phone: submittedPhone } })`

Navigation routes and parameters are validated and operational.

---

## 10. Outer Screen Wrapper Analysis

- **Current Container**: `<ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">`
- **Rules Review**:
  - `mobile-component-catalog.md` Rule 2 requires top-level screens to wrap content in `<ScreenShell>` or `<SafeAreaWrapper>` + `<KeyboardAvoidingShell>`.
- **Recommendation for Phase 2.7B**: Evaluate wrapping `ScrollView` inside `ScreenShell` or maintaining the lightweight `ScrollView` container while ensuring proper keyboard avoidance for mobile devices.

---

## 11. Styling / RTL Violations

### Physical Spacing Audit:
- **`mr-` / `ml-` / `pr-` / `pl-`**: 0 instances in `login.tsx`. (100% compliant with logical spacing rules).

### Color Token Audit:
- Hardcoded hex colors found:
  - Line 108: `color="#03A9F4"` (`ShieldCheck` brand icon color)
  - Lines 165, 185, 222: `color="#888"` (Left icon gray color)
- **Recommendation**: Replace hardcoded gray `#888` with theme-aware icon colors (`#9ca3af` / `#6b7280` or NativeWind tokens).

---

## 12. Catalog Reuse Opportunities

1. **`SegmentedControl`**: Replace raw `TouchableOpacity` tab switcher pair (Lines 120–150).
2. **`ErrorBanner`**: Replace inline error box `View` (Lines 197–201 & 234–238) with `@/components/feedback/ErrorBanner`.
3. **Icon Color Harmonization**: Standardize hardcoded icon hex colors to theme tokens.

---

## 13. Migration Risk Classification

| Proposed Change | Target Code | Risk Level | Rationale |
|---|---|---|---|
| **Tab Switcher -> `SegmentedControl`** | Lines 118–151 | **SAFE** | Pure UI presentation state (`authMode`); no auth side effects |
| **Error Box -> `ErrorBanner`** | Lines 197–201, 234–238 | **SAFE** | Pure UI display of `error` string |
| **Icon Color Tokens** | Lines 165, 185, 222 | **SAFE** | Visual styling adjustment |

**Overall Migration Risk**: **LOW / SAFE**

---

## 14. Recommended Migration Sequence (Phase 2.7B)

1. **Replace Tab Switcher**: Import `SegmentedControl` from `@/components/common/SegmentedControl` and replace the two `TouchableOpacity` blocks.
2. **Replace Inline Error Boxes**: Import `ErrorBanner` from `@/components/feedback/ErrorBanner` and render it when `error` is present.
3. **Harmonize Icon Colors**: Update hardcoded `#888` color strings to theme-compatible tokens.
4. **TypeScript & Test Verification**: Run `cmd /c npx tsc --noEmit` to verify zero new type errors.

---

## 15. Verification Baseline

- **TypeScript Compilation (`cmd /c npx tsc --noEmit`)**:
  - Baseline Status: 3 pre-existing errors in `src/features/visitor/__tests__/VisitorPassCard.test.tsx` (`Property 'getByText' does not exist...`).
  - `app/(auth)/login.tsx` compilation status: **0 errors**.
- **Test Suite**: No dedicated `login.test.tsx` test file exists.

---

## 16. Required Summary

```text
Raw TouchableOpacity controls: 2
Raw Pressable controls: 0
Raw TextInput controls: 0
ActivityIndicator instances: 0

Canonical Button candidates: 0
Canonical TextInput candidates: 0
Canonical PasswordInput candidates: 0
Canonical SegmentedControl candidates: 1
Canonical ProgressLoader candidates: 0

Authentication logic changes required: 0
Navigation changes required: 0
API changes required: 0

Expected migration risk: LOW

Recommended first migration target: Replace raw TouchableOpacity tab switcher with SegmentedControl and replace inline error View with ErrorBanner

Known pre-existing issue:
VisitorPassCard.test.tsx — PRE-EXISTING — NOT INTRODUCED BY THIS CHANGE
```
