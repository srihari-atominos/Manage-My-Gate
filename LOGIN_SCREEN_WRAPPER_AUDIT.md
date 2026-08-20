# Login Screen Wrapper & Keyboard Architecture Audit

## 1. Current Architecture

The outer screen layout of `app/(auth)/login.tsx` currently consists of:

```tsx
return (
  <>
    <Stack.Screen options={{ title: 'Sign In' }} />
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">
      <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">
        {/* Brand Header */}
        {/* Tab Switcher (SegmentedControl) */}
        {/* Form Container (View bg-card) */}
      </View>
    </ScrollView>
  </>
);
```

### Component Hierarchy:
```
LoginScreen
 └── Fragment (<>)
      ├── Stack.Screen (title: "Sign In") ──► Native Expo Router Header
      └── ScrollView (flexGrow: 1, bg-background p-6)
           └── View (max-w-sm, flex-1, justify-center, py-8)
                ├── Brand Header (ShieldCheck + Title + Subtitle)
                ├── Tab Switcher (SegmentedControl)
                └── Form Container (Basic / Phone Form Inputs & CTAs)
```

---

## 2. Project Rules

According to the project rule files (`.agents/rules/mobile-workflow-rules.md` Section IV and `mobile-component-catalog.md` Rule 2):

1. **Top-Level Screen Containers**: Top-level route pages MUST wrap content in standard layout components (`<ScreenShell>` or `<SafeAreaWrapper>` + `<KeyboardAvoidingShell>`).
2. **Catalog Lookup First**: Developers must inspect existing catalog layout components before creating custom inline wrappers.
3. **Avoid Primitive Duplication**: Un-wrapped raw primitives (`ScrollView`, `View`) should be evaluated for canonical shell encapsulation.

---

## 3. ScreenShell Analysis (`components/ui/ScreenShell.tsx`)

### Implementation Details:
- **Header**: Renders a custom top header row with back button (`ChevronLeft`), title, subtitle, and `headerRight` slot.
- **Top Inset**: Applies `paddingTop: Math.max(insets.top, 12)` using `useSafeAreaInsets()`.
- **Content Container**: Renders a static `<View className="flex-1 bg-background">{children}</View>`. Does **NOT** contain a `ScrollView` or `KeyboardAvoidingView`.

### Evaluation for `login.tsx`:
- **Double Header Bug**: `login.tsx` uses Expo Router's `<Stack.Screen options={{ title: 'Sign In' }} />`, which renders a native header bar. Wrapping `login.tsx` in `ScreenShell` would display **TWO stacked header bars** (native Expo header + `ScreenShell` header row).
- **Missing Scroll & Keyboard Avoidance**: `ScreenShell` does not scroll internally. Content inside `login.tsx` requires vertical scrolling when software keyboards open on mobile screens.
- **Conclusion**: `ScreenShell` is **NOT SUITABLE** for `app/(auth)/login.tsx`.

---

## 4. SafeAreaWrapper Analysis (`components/layout/SafeAreaWrapper.tsx`)

### Implementation Details:
- Applies padding for safe area insets (`top`, `bottom`, `left`, `right`) using `useSafeAreaInsets()`.
- Renders an outer `<View className="flex-1 bg-white dark:bg-slate-950">`.

### Evaluation for `login.tsx`:
- **Redundant Top Inset**: Expo Router's native `<Stack>` navigation header already consumes the status bar top inset (`insets.top`). Applying `SafeAreaWrapper` would introduce an unnecessary extra 44px+ white space gap above the brand logo.
- **Conclusion**: `SafeAreaWrapper` is **NOT RECOMMENDED** for `login.tsx` when a native header bar is active.

---

## 5. KeyboardAvoidingShell Analysis (`components/layout/KeyboardAvoidingShell.tsx`)

### Implementation Details:
- **Outer Shell**: `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`
- **Internal ScrollView**: Renders `<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>` when `scrollable={true}` (default).
- **Theme**: Default `bg-white dark:bg-slate-950` (overridable via `className`).

### Evaluation for `login.tsx`:
- **iOS Keyboard Compensation**: Automatically adjusts container height on iOS when software keyboard opens, preventing password and submit controls from being obscured.
- **Android Compatibility**: Uses `behavior={undefined}` on Android to work harmoniously with Android's native window resize mode (`softwareKeyboardLayoutMode: "resize"`).
- **Tap Persistence**: `keyboardShouldPersistTaps="handled"` allows users to tap "Sign In" directly without needing to tap the screen first to dismiss the keyboard.
- **Conclusion**: `KeyboardAvoidingShell` is the **BEST CANONICAL MATCH** for `app/(auth)/login.tsx`.

---

## 6. Current Keyboard Behavior

- **Current Behavior**: `login.tsx` relies on a raw `<ScrollView contentContainerStyle={{ flexGrow: 1 }}>`.
- **Limitations**: On smaller iOS devices, raw `ScrollView` without `KeyboardAvoidingView` does not shrink the viewport height when the software keyboard opens, requiring manual scrolling to reach lower inputs or submit buttons.
- **Improvement with `KeyboardAvoidingShell`**: Wraps `KeyboardAvoidingView` (`behavior="padding"` on iOS) while preserving `ScrollView` flex-grow layout.

---

## 7. Safe Area Analysis

- `app/(auth)/_layout.tsx` wraps authentication routes in an Expo Router `<Stack>`.
- The native navigation bar handles top safe-area insets (`insets.top`).
- Bottom safe area is handled cleanly by `ScrollView` internal padding (`p-6` + `py-8`).

---

## 8. ScrollView Compatibility

| Component | Inner ScrollView | `flexGrow: 1` | `keyboardShouldPersistTaps` |
|---|---|---|---|
| Current `login.tsx` | YES (Raw `<ScrollView>`) | YES | NO (Default) |
| `KeyboardAvoidingShell` | YES (Built-in) | YES | YES (`"handled"`) |
| `ScreenShell` | NO | NO | N/A |
| `SafeAreaWrapper` | NO | NO | N/A |

`KeyboardAvoidingShell` retains 100% of `login.tsx`'s current layout properties while adding keyboard tap handling.

---

## 9. Visual Regression Risk

### Styling Tokens to Preserve:
- Outer background token: `bg-background` (Must override `KeyboardAvoidingShell`'s default `bg-white dark:bg-slate-950`).
- Padding token: `contentContainerClassName="p-6"`.
- Centered container layout: `<View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">`.

Passing `className="bg-background"` and `contentContainerClassName="p-6"` eliminates visual regression risks.

---

## 10. Authentication Safety

Wrapper migration is strictly structural layout refactoring:
- `basicForm` & `phoneForm` remain untouched.
- `onBasicSubmit` & `onPhoneSubmit` remain untouched.
- `performLogin` & `requestOtp` remain untouched.
- `useAuth` hook remains untouched.
- `router.replace` & `router.push` remain untouched.

---

## 11. Risk Classification

- **Classification**: **CONTROLLED**
- **Rationale**: Replaces raw `<ScrollView>` with canonical `<KeyboardAvoidingShell>`, which includes `<KeyboardAvoidingView>` and `<ScrollView>`. Requires explicit `bg-background` and `p-6` prop configuration to maintain exact visual alignment.

---

## 12. Recommendation

**Selected Option**: **Option B — Migrate to `KeyboardAvoidingShell`**

### Proposed Target JSX:
```tsx
<KeyboardAvoidingShell
  className="bg-background"
  contentContainerClassName="p-6"
>
  <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">
    {/* Brand Header */}
    {/* Tab Switcher (SegmentedControl) */}
    {/* Form Container (View bg-card) */}
  </View>
</KeyboardAvoidingShell>
```

---

## 13. Proposed Migration Scope

When Phase 2.7F is executed:
1. Import `KeyboardAvoidingShell` from `@/components/layout/KeyboardAvoidingShell`.
2. Replace outer raw `<ScrollView>` in `app/(auth)/login.tsx` with `<KeyboardAvoidingShell className="bg-background" contentContainerClassName="p-6">`.
3. Verify TypeScript baseline (`cmd /c npx tsc --noEmit`).

---

## 14. Verification Requirements

1. **TypeScript**: Zero new compilation errors.
2. **Layout**: Identical background color, padding, and centered card positioning.
3. **Keyboard Handling**: Clean scrolling on iOS and Android when inputs gain focus.

---

## 15. Required Summary

```text
Current root wrapper: ScrollView (contentContainerStyle={{ flexGrow: 1 }}, className="bg-background p-6")
Current safe-area behavior: Handled by Expo Router Stack navigation header bar
Current keyboard behavior: Basic ScrollView (panning on Android via window resize, standard scroll on iOS)
Current ScrollView behavior: Full-height flex-grow layout centered with max-w-sm container

ScreenShell compatibility: LOW (Incompatible: Causes double header with Stack.Screen and lacks ScrollView/KeyboardAvoidingView)
SafeAreaWrapper compatibility: MEDIUM (Causes redundant top inset padding below native Stack header bar)
KeyboardAvoidingShell compatibility: HIGH (Provides clean keyboard height compensation for iOS and retains ScrollView flex layout)

Double-wrapper risk: High if combined with ScreenShell or SafeAreaWrapper; Zero with KeyboardAvoidingShell alone
Keyboard regression risk: Low (KeyboardAvoidingShell uses Platform.OS === 'ios' ? 'padding' : undefined)
Visual regression risk: Low (Controlled by passing bg-background and p-6 padding)

Recommended option: Option B — Migrate to KeyboardAvoidingShell with bg-background and contentContainerClassName="p-6"
Migration risk: CONTROLLED

Authentication logic changes required: 0
Navigation changes required: 0
API changes required: 0

Known issue:

VisitorPassCard.test.tsx — PRE-EXISTING — NOT INTRODUCED BY THIS CHANGE
```
