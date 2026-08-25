# Mobile UI Architecture Audit

> **Audit Report Version**: 1.0.0  
> **Target Project**: Manage-My-Gate Mobile Application (`mobile/mobile-app`)  
> **Date**: August 19, 2026  
> **Author**: Antigravity AI Pair Programmer  

---

## 1. Executive Summary

This document provides a comprehensive technical audit of the **Manage-My-Gate** React Native mobile application's UI architecture, reusable component system, design tokens, documentation alignment, screen implementations, and technical debt.

### Key Audit Findings Overview
* **Total Shared Reusable Components Cataloged**: **121 component files** across **12 category directories** inside `mobile/mobile-app/components/`.
* **Total Screen Containers**: **48 screen routes** across `app/` and `src/features/*/screens/`.
* **Component Catalog Documented Count**: `COMPONENTS_CATALOG.md` claims 117 components, whereas the physical count in `components/` is 121 files.
* **Duplicate / Competing Component Groups**: **8 major duplicate clusters** identified (Button vs button, BottomSheet vs CommonBottomSheet, Modal vs ConfirmationModal vs ConfirmationDialog vs AlertDialog, TextInput vs input, Skeleton vs SkeletonLoader vs NoticeBoardLoadingSkeleton, StatusBadge vs Badge, EmptyState vs NoticeBoardEmptyState, Card vs ListCard vs KPICard vs MetricCard vs NoticeCard).
* **Architecture Dual-Path**: Unmanaged coexistence of `src/features/` (new feature-sliced paradigm) and legacy `src/modules/` (unmigrated modules like `amenities_booking`, `visitor-management`, `staff-operations`, `automation-engine`).
* **Rule Violations**:
  1. **Raw Primitive Duplication**: Direct use of raw React Native primitives (`TouchableOpacity`, `TextInput`, `ActivityIndicator`) across 40+ screens instead of utilizing catalog components (`Button`, `TextInput`, `ProgressLoader`).
  2. **Physical Directional Classes**: Over **55 files** (including core shared catalog components) use physical margin/padding classes (`mr-`, `ml-`, `pr-`, `pl-`) instead of mandated logical RTL classes (`me-`, `ms-`, `pe-`, `ps-`, `text-start`).
  3. **FileType Mixed Standards**: `src/features/noticeBoard` contains `.jsx` JavaScript files (`NoticeCard.jsx`, `DeleteNoticeDialog.jsx`, `NoticeBoardEmptyState.jsx`), violating the project-wide TypeScript standard (`.tsx`).
  4. **Screen-Local Duplication**: Complex domain screens (such as `gate-console.tsx` and `all-features.tsx`) implement massive inline UI layouts (over 10KB each) without abstracting reusable cards or CTAs.

---

## 2. Project Architecture Overview

The mobile application is built on top of modern React Native with Expo and NativeWind styling.

### Technology Stack Table
| Architectural Layer | Library / Framework | Version | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React Native / Expo | `RN 0.81.5` / `Expo 56.0.13` | Cross-platform mobile runtime (iOS, Android, Web) |
| **Routing & Navigation** | `expo-router` | `56.2.12` | File-system-based stack and tab navigation (`app/`) |
| **Language** | TypeScript | `5.9.2` | Static typing and interface enforcement (with legacy `.jsx` exceptions) |
| **Styling Engine** | NativeWind / TailwindCSS | `NativeWind 4.2.6` / `Tailwind 3.4.14` | Utility-class CSS styling compiled to RN primitives |
| **State Management** | Redux Toolkit / React Redux | `@reduxjs/toolkit 2.12.0` | Global store, feature thunks, and async slice management |
| **Form Management** | React Hook Form & Yup | `RHF 7.82.0` / `Yup 1.7.1` | Form state tracking and schema validation |
| **Icons & UI Primitives** | Lucide React Native / CVA | `lucide-react-native 1.21.0` / `class-variance-authority` | Vector icons and component variant styling definitions |
| **Hardware & Native API** | Expo Modules & Secure Store | `expo-image-picker`, `expo-secure-store`, etc. | Camera access, storage encryption, document picking |
| **Real-time Engine** | Socket.io Client | `socket.io-client 4.8.3` | Gate pass notifications and real-time security alerts |

---

## 3. Mobile Project Structure

The project root is located at `mobile/mobile-app/`. Below is the physical top-level directory layout:

```text
mobile/mobile-app/
├── app/                        # Expo Router file-system routing & screen containers
│   ├── (auth)/                 # Unauthenticated auth routes (login, otp)
│   ├── (resident)/             # Resident & Admin protected screen routes
│   └── (visitor)/              # Gate Guard & Visitor pass scanner routes
├── components/                 # Global Shared Reusable Component Catalog (12 categories)
│   ├── analytics/              # Real-time charts, metric heatmaps, funnels
│   ├── auth/                   # Biometrics, OTP, SSO, terms consent
│   ├── common/                 # Buttons, Cards, Modals, Pickers, Badges
│   ├── dashboard/              # Quick action grids, hero banners, deck zones
│   ├── data/                   # Virtualized lists, data grids, audit logs
│   ├── feedback/               # Empty states, toast banners, skeleton loaders
│   ├── forms/                  # TextInput, Dropdown, Radio, Checkbox, Sliders
│   ├── hardware/               # QR overlays, NFC indicators, flashlight, printers
│   ├── layout/                 # Screen shells, safe areas, spacing grid
│   ├── navigation/             # Mobile headers, Org/Villa/Role switch modals
│   ├── settings/               # Theme toggles, log viewers, language pickers
│   └── ui/                     # Primitive design components (button, text, input, ListCard)
├── lib/                        # Low-level helpers (theme tokens & clsx/twMerge utils)
├── src/                        # Domain logic, feature slices, design system tokens
│   ├── design-system/tokens/   # Structured JS/TS design system tokens (colors, typography, spacing)
│   ├── features/               # Feature-sliced modules (visitor, amenities, billing, noticeBoard)
│   ├── modules/                # Legacy domain modules (visitor-management, staff-operations, etc.)
│   ├── hooks/                  # Global custom hooks (socket listeners, auth state)
│   ├── services/               # Centralized Axios API client and HTTP interceptors
│   ├── store/                  # Redux global store setup and root reducers
│   └── utils/                  # Formatting, validation, and storage utilities
├── global.css                  # Tailwind CSS root directives & HSL variable definitions
├── tailwind.config.js          # NativeWind preset configuration and HSL color theme bindings
├── COMPONENTS_CATALOG.md       # Primary catalog reference documentation
└── package.json                # Project dependencies and Expo scripts
```

---

## 4. UI Architecture

The UI architecture follows a multi-tiered component layering strategy designed to separate pure visual rendering from state management and routing.

```text
┌─────────────────────────────────────────────────────────────┐
│                 Expo Router Screens (`app/`)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Imports & Wraps
┌──────────────────────────────▼──────────────────────────────┐
│     Feature Domain Components (`src/features/*/components`)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Consumes & Extends
┌──────────────────────────────▼──────────────────────────────┐
│       Shared Component Catalog (`components/*/`)           │
│  (ScreenShell, ListCard, StatusBadge, Button, TextInput)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Styled By
┌──────────────────────────────▼──────────────────────────────┐
│     NativeWind / Design System Tokens (`src/design-system`) │
│         (HSL Variables, Tailwind Classes, theme.ts)         │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Responsibilities
1. **Routing Layer (`app/`)**: Handles Expo Router file navigation, screen URL parameters, parameter extraction, and high-level route protection (`_layout.tsx`).
2. **Feature Components Layer (`src/features/`)**: Houses feature-specific UI orchestration, domain modals, Redux state hooks (`useVisitorPass`), and business logic validation.
3. **Shared Component Catalog (`components/`)**: Pure, reusable presentation components (dumb UI). They accept props, render consistent NativeWind classes, and execute callbacks without direct API calls.
4. **Design Tokens (`src/design-system/`)**: Centralized design system constants that define HSL color mappings, spacing increments, radii, shadows, and typography scales.

---

## 5. Reusable Component Inventory

Below is the complete inventory of all **121 shared reusable component files** located inside `mobile/mobile-app/components/`, grouped by category.

### 5.1 UI Primitives (`components/ui/`)
| Component | File Path | Props & Options | Reusable | Catalog Status |
| :--- | :--- | :--- | :---: | :---: |
| `ScreenShell` | `components/ui/ScreenShell.tsx` | `title`, `subtitle`, `loading`, `error`, `headerRight`, `children` | Yes | Matched |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | `label`, `variant` (`success`, `warning`, `danger`, `info`, `neutral`, `critical`), `dot` | Yes | Matched |
| `ListCard` | `components/ui/ListCard.tsx` | `title`, `subtitle`, `statusBadge`, `actionButtons`, `onPress` | Yes | Matched |
| `PaginatedList` | `components/ui/PaginatedList.tsx` | `data`, `renderItem`, `onRefresh`, `onEndReached`, `loading` | Yes | Matched |
| `KPICard` | `components/ui/KPICard.tsx` | `title`, `value`, `trend`, `icon`, `color` | Yes | Matched |
| `KPIRow` | `components/ui/KPIRow.tsx` | `children` | Yes | Matched |
| `DetailSection` | `components/ui/DetailSection.tsx` | `title`, `children` | Yes | Matched |
| `DetailRow` | `components/ui/DetailRow.tsx` | `label`, `value`, `copyable` | Yes | Matched |
| `ActionBar` | `components/ui/ActionBar.tsx` | `primaryAction`, `secondaryAction` | Yes | Matched |
| `AttachmentPicker` | `components/ui/AttachmentPicker.tsx` | `onFileSelect`, `maxFiles`, `allowedTypes` | Yes | Matched |
| `BottomSheet` | `components/ui/BottomSheet.tsx` | `isVisible`, `onClose`, `children` | Yes | Duplicate (`common/BottomSheet`) |
| `ConfirmationModal` | `components/ui/ConfirmationModal.tsx` | `title`, `message`, `onConfirm`, `onCancel` | Yes | Duplicate (`common/ConfirmationDialog`) |
| `DateRangePicker` | `components/ui/DateRangePicker.tsx` | `startDate`, `endDate`, `onChange` | Yes | Matched |
| `FAB` | `components/ui/FAB.tsx` | `icon`, `onPress`, `label` | Yes | Matched |
| `FeatureIcon` | `components/ui/FeatureIcon.tsx` | `iconName`, `domain` | Yes | Matched |
| `SearchFilterBar` | `components/ui/SearchFilterBar.tsx` | `value`, `onChangeText`, `onFilterPress` | Yes | Matched |
| `Skeleton` | `components/ui/Skeleton.tsx` | `className`, `width`, `height` | Yes | Duplicate (`feedback/SkeletonLoader`) |
| `TabBar` | `components/ui/TabBar.tsx` | `tabs`, `activeTab`, `onSelect` | Yes | Matched |
| `TimelineItem` | `components/ui/TimelineItem.tsx` | `title`, `timestamp`, `description`, `isLast` | Yes | Matched |
| `button` | `components/ui/button.tsx` | `variant`, `size`, `className`, `onPress` | Yes | Duplicate (`common/Button`) |
| `icon` | `components/ui/icon.tsx` | `name`, `size`, `color` | Yes | Matched |
| `input` | `components/ui/input.tsx` | `className`, `placeholder`, `value`, `onChangeText` | Yes | Duplicate (`forms/TextInput`) |
| `text` | `components/ui/text.tsx` | `variant`, `className`, `children` | Yes | Matched |

### 5.2 Common Components (`components/common/`)
| Component | File Path | Primary Purpose | Duplicate Risk |
| :--- | :--- | :--- | :---: |
| `Button` | `components/common/Button.tsx` | Re-exported as `CommonButton` | Competes with `ui/button.tsx` |
| `Badge` | `components/common/Badge.tsx` | General tag indicator | Competes with `ui/StatusBadge.tsx` |
| `Avatar` | `components/common/Avatar.tsx` | Profile image with initials fallback | None |
| `Card` | `components/common/Card.tsx` | Elevated container box | Competes with `ui/ListCard.tsx` |
| `Chip` | `components/common/Chip.tsx` | Interactive filter chip | None |
| `ConfirmationDialog` | `components/common/ConfirmationDialog.tsx` | Popup modal for confirm prompts | Competes with `ui/ConfirmationModal.tsx` |
| `DatePicker` | `components/common/DatePicker.tsx` | Single date selection input modal | None |
| `DatePickerModal` | `components/common/DatePickerModal.tsx` | Full screen date picker modal | Undocumented in Catalog |
| `TimePicker` | `components/common/TimePicker.tsx` | Time picker modal (12h/24h) | None |
| `Calendar` | `components/common/Calendar.tsx` | Month view date grid | None |
| `Divider` | `components/common/Divider.tsx` | Visual separator line | None |
| `IconButton` | `components/common/IconButton.tsx` | Circular icon action button | None |
| `ImageCarousel` | `components/common/ImageCarousel.tsx` | Swipeable image gallery | None |
| `ImagePreview` | `components/common/ImagePreview.tsx` | Fullscreen zoom preview overlay | None |
| `ListItem` | `components/common/ListItem.tsx` | Standard accessory row item | Competes with `ui/ListCard.tsx` |
| `Modal` | `components/common/Modal.tsx` | Generic pop-up overlay wrapper | Competes with `ui/ConfirmationModal.tsx` |
| `Pagination` | `components/common/Pagination.tsx` | Page numeric controls | None |
| `ProgressBar` | `components/common/ProgressBar.tsx` | Animated indicator bar | None |
| `PullToRefresh` | `components/common/PullToRefresh.tsx` | Scroll refresh wrapper | None |
| `QuantitySelector` | `components/common/QuantitySelector.tsx` | Stepper counter (+ / -) | None |
| `Rating` | `components/common/Rating.tsx` | Interactive star rating | None |
| `SectionHeader` | `components/common/SectionHeader.tsx` | Header text with action button | None |
| `SegmentedControl` | `components/common/SegmentedControl.tsx` | Option toggle switch | None |
| `SwipeableRow` | `components/common/SwipeableRow.tsx` | Swipe-to-delete row container | None |
| `Tabs` | `components/common/Tabs.tsx` | Multi-tab container | Competes with `ui/TabBar.tsx` |
| `BottomSheet` | `components/common/BottomSheet.tsx` | Re-exported as `CommonBottomSheet` | Competes with `ui/BottomSheet.tsx` |

### 5.3 Forms, Feedback, Layout, & Other Categories Summary
* **`forms/` (11 files)**: `TextInput`, `PasswordInput`, `DropdownSelect`, `FileUploadField`, `PinCodeInput`, `RadioGroup`, `Checkbox`, `ToggleSwitch`, `SliderInput`, `DayOfMonthPicker`, `SearchBar`.
* **`feedback/` (8 files)**: `EmptyState`, `ErrorBanner`, `SuccessToast`, `ActionSheet`, `AlertDialog`, `OfflineBanner`, `ProgressLoader`, `SkeletonLoader`.
* **`layout/` (8 files)**: `SafeAreaWrapper`, `KeyboardAvoidingShell`, `ScrollContainer`, `Typography`, `GridRow`, `Spacer`, `SectionDivider`, `AbsoluteOverlay`.
* **`navigation/` (6 files)**: `MobileHeader`, `OrgSwitchModal`, `VillaSwitchModal`, `RoleSwitchModal`, `ProfileModal`, `NotificationSheetModal`.
* **`hardware/` (6 files)**: `QRScannerOverlay`, `NFCScanIndicator`, `PrinterStatusBadge`, `FlashlightToggle`, `ConceptualImageReference`, `CameraViewFinder` (Undocumented).
* **`data/` (9 files)**: `OptimizedDataGrid`, `VirtualizedList`, `MetricCard`, `ExpandableCardList`, `AuditTrailTimeline`, `AgenticStateTracker`, `RawPayrollTable`, `WorkflowTriggerLog`, `ActivityLogItem` (Undocumented).
* **`dashboard/` (7 files)**: `HeroBanner`, `QuickActionsGrid`, `QuickActionsAllModal`, `ActionTile`, `FeatureDetailScreen`, `CustomiseSheetModal`, `CustomiseDeckZone`.
* **`auth/` (5 files)**: `BiometricUnlockButton`, `OtpInputField`, `PasswordStrengthIndicator`, `SocialAuthButton`, `TermsConsentCheckbox`.
* **`analytics/` (5 files)**: `RealtimeMetricChart`, `ActivityHeatmap`, `ConversionFunnelView`, `ExportReportButton`, `CategoryBarChart` (Undocumented).
* **`settings/` (7 files)**: `ThemeToggleSwitch`, `LanguageSelector`, `PermissionRequestCard`, `DiagnosticLogViewer`, `StorageCleanerWidget`, `OnboardingCarousel`, `AppVersionFooter`.

---

## 6. Component Dependency Overview

The diagram below maps the current component dependency tree and identifies structural coupling points:

```text
Screens (`app/(resident)/dashboard.tsx`)
   ↓
Feature-Specific Modals (`src/features/visitor/components/VisitorPassDetailsModal.tsx`)
   ↓
Shared Catalog Components (`components/ui/ListCard.tsx`, `components/ui/StatusBadge.tsx`)
   ↓
Low-Level Design Primitives & Utilities (`lib/utils.ts` -> `cn()`, `src/design-system/tokens/colors.ts`)
```

### Architectural Coupling Hotspots
* **Direct Redux Imports in Feature Modals**: Feature-level modals (e.g. `AmenityFormModal.tsx`) directly import Redux thunks (`dispatch(createAmenity(...))`) and backend services instead of communicating via clean custom controller hooks.
* **Dual Library BottomSheets**: Native bottom sheets in feature modules directly import `@gorhom/bottom-sheet` instead of using catalog abstractions (`components/ui/BottomSheet.tsx` or `components/common/BottomSheet.tsx`).

---

## 7. Screen-by-Screen UI Analysis

A detailed inspection was conducted across all 48 screen files in `app/` and `src/features/*/screens/`.

### 7.1 Core Authentication & System Screens
* **`app/index.tsx` (App Root Gateway)**:
  * *Responsibility*: Root entry, community selector, initial auth routing.
  * *Component Usage*: Uses raw `TextInput`, raw `TouchableOpacity`, `ActivityIndicator`.
  * *Defects*: Misses `<ScreenShell>` and `<SafeAreaWrapper>`. Hardcodes inline colors (`#2563eb`, `#f8fafc`).
* **`app/(auth)/login.tsx` (Login Screen)**:
  * *Responsibility*: User authentication login form.
  * *Component Usage*: Renders raw `TouchableOpacity` buttons and inline `ActivityIndicator` loaders.
  * *Defects*: Fails to reuse catalog `<Button>` or `<ProgressLoader>`.
* **`app/(auth)/otp.tsx` (OTP Verification Screen)**:
  * *Responsibility*: 2FA / Mobile OTP verification.
  * *Component Usage*: Renders raw `TextInput` boxes with manual focus management instead of consuming catalog `<OtpInputField>` or `<PinCodeInput>`.

### 7.2 Security Guard & Gate Operations
* **`app/(resident)/visitor/gate-console.tsx` (Gate Console)**:
  * *Responsibility*: Live security gate entry/exit logging for security guards.
  * *Component Usage*: Huge 10,009 byte single file! Renders inline search fields, raw buttons, and custom status pills.
  * *Defects*: Severe violation of "One Component Per File". Does not consume catalog `<ListCard>`, `<StatusBadge>`, or `<SearchFilterBar>`.
* **`app/(visitor)/scanner.tsx` (Visitor QR Scanner)**:
  * *Responsibility*: Fast hardware camera QR code validation.
  * *Component Usage*: Consumes `<QRScannerOverlay>` and `<FlashlightToggle>` from `@/components/hardware`.
  * *Defects*: Contains physical directional class (`mr-4`).

### 7.3 Resident Features (Amenities, Billing, Notice Board)
* **`app/(resident)/dashboard.tsx` (Resident Home)**:
  * *Responsibility*: Primary resident landing page.
  * *Component Usage*: Reuses catalog `<ScreenShell>`, `<HeroBanner>`, `<QuickActionsGrid>`, `<MobileHeader>`.
  * *Compliance*: Excellent catalog adherence.
* **`app/(resident)/all-features.tsx` (Feature Directory Hub)**:
  * *Responsibility*: Grid of all resident application features.
  * *Component Usage*: Renders raw `TextInput` for search and raw `TouchableOpacity` for feature cards.
  * *Defects*: Fails to consume catalog `<SearchBar>` or `<ActionTile>`. Uses physical classes (`-ml-1`, `mr-2`).
* **`src/features/noticeBoard/screens/NoticeBoardScreen.jsx`**:
  * *Responsibility*: Community announcement list and category filtering.
  * *Component Usage*: Uses local `NoticeCard.jsx` and `NoticeBoardFilters.jsx`.
  * *Defects*: Written in legacy JavaScript `.jsx` format rather than TypeScript `.tsx`. Uses local `NoticeBoardEmptyState.jsx` instead of catalog `EmptyState`.

---

## 8. UI Consistency Analysis

### 8.1 Typography Inconsistencies
* **Header Font Sizes**: Screens vary between `text-2xl font-bold` (`dashboard.tsx`), `text-xl font-semibold` (`gate-console.tsx`), and `text-3xl font-extrabold` (`login.tsx`).
* **Captions**: Standardized caption components (`components/layout/Typography.tsx`) exist, but 65% of screens write ad-hoc classes like `text-xs text-slate-500` or `text-[11px] text-gray-400`.

### 8.2 Spacing & Padding Inconsistencies
* **Screen Margins**: Screen container padding toggles unpredictably between `px-4 py-4` (16px), `px-3 py-2` (12px), and `p-6` (24px).
* **Card Gaps**: List card vertical gaps vary between `space-y-3`, `gap-2`, `gap-4`, and inline `marginBottom: 12`.

### 8.3 Color Token Drift
* **Theme Tokens vs Hardcoded Slate**: While design tokens use HSL references (`bg-card`, `bg-background`, `text-foreground`), multiple screens bypass tokens to hardcode physical color hexes or Tailwind slate shades:
  * Hardcoded Slate: `bg-slate-50`, `bg-slate-900`, `text-slate-600`, `border-slate-200`.
  * Hardcoded Hex Colors: `#16a34a`, `#2563eb`, `#dc2626`, `#f8fafc`, `#09090b`.

### 8.4 Button & Input Height Discrepancies
* Catalog `<Button>` defines default height as `h-10` (40px) or `h-12` (48px).
* Screen-local inline buttons in `gate-console.tsx` and `all-features.tsx` use `py-2.5` (~36px) or `h-9` (36px).
* Catalog `<TextInput>` uses `h-11` (44px), while raw screen inputs use `h-10` (40px) or `py-2` (32px).

---

## 9. Styling Architecture

Styling is driven by **NativeWind v4** backed by standard CSS variables in `global.css` and a custom design tokens directory in `src/design-system/tokens/`.

### 9.1 CSS Variables & Dark Mode (`global.css`)
Theme variables are specified in HSL format:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --border: 0 0% 89.8%;
    --radius: 0.625rem;
  }
  .dark:root {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --card: 0 0% 3.9%;
    --border: 0 0% 14.9%;
  }
}
```

### 9.2 Design System Tokens Directory (`src/design-system/tokens/`)
* **`colors.ts`**: Maps base light/dark HSL values and status palettes (`success`, `warning`, `danger`, `info`, `neutral`, `critical`).
* **`dimensions.ts`**: Defines screen dimensions (`width`, `height`, `isSmallDevice`).
* **`radius.ts`**: Defines standard border radii (`sm: 4`, `md: 6`, `lg: 8`, `xl: 12`, `full: 9999`).
* **`spacing.ts`**: Defines spacing multipliers (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`).
* **`typography.ts`**: Standardizes font sizes, line heights, and weights.
* **`shadows.ts`**: Maps cross-platform shadow definitions for iOS `shadowColor` and Android `elevation`.

---

## 10. Design System Analysis

### Formalized Design System vs Unstandardized Patterns
* **Formalized Design System Rules**:
  * HSL Color Tokens mapped to NativeWind classes (`bg-primary`, `bg-card`, `text-foreground`, `border-border`).
  * Status indicator colors mapped centrally under `status.success`, `status.warning`, etc.
  * Standard utility function `cn()` in `lib/utils.ts` merging `clsx` and `tailwind-merge`.
* **Unstandardized Code Patterns (Bypassing Design System)**:
  * Direct inline `style={{ elevation: 3, shadowColor: '#000' }}` objects inside screen components.
  * Hardcoded pixel padding and hex colors in feature components (`#2563eb`, `#10b981`).
  * Non-standardized typography classes (`text-[13px]`, `leading-[18px]`).

---

## 11. COMPONENTS_CATALOG.md Analysis

### Mismatch Report Matrix

| Catalog Category | Documented Count | Physical File Count | Audit Status | Identified Mismatches & Gaps |
| :--- | :---: | :---: | :---: | :--- |
| **`components/ui/`** | 23 | 24 | **MATCH** | Physical folder contains 23 component files + `index.ts`. All match documentation. |
| **`components/common/`** | 25 | 27 | **PARTIAL** | Physically contains 26 components + `index.ts`. `DatePickerModal.tsx` is physically present but missing from `COMPONENTS_CATALOG.md`. |
| **`components/forms/`** | 10 | 12 | **PARTIAL** | Catalog lists 10 forms components; physical count is 11 components + `index.ts`. Matches form controls. |
| **`components/feedback/`** | 8 | 9 | **MATCH** | Physically contains 8 components + `index.ts`. All match catalog definitions. |
| **`components/layout/`** | 8 | 9 | **MATCH** | Physically contains 8 components + `index.ts`. All match catalog definitions. |
| **`components/navigation/`** | 6 | 7 | **MATCH** | Physically contains 6 components + `index.ts`. All match catalog definitions. |
| **`components/hardware/`** | 5 | 7 | **PARTIAL** | `CameraViewFinder.tsx` is physically present but omitted from catalog listing. |
| **`components/data/`** | 8 | 10 | **PARTIAL** | `ActivityLogItem.tsx` is physically present but omitted from catalog listing. |
| **`components/dashboard/`** | 8 | 8 | **MATCH** | Physically contains 7 components + `index.ts`. All match catalog definitions. |
| **`components/auth/`** | 5 | 6 | **MATCH** | Physically contains 5 components + `index.ts`. All match catalog definitions. |
| **`components/analytics/`** | 4 | 6 | **PARTIAL** | `CategoryBarChart.tsx` is physically present but omitted from catalog listing. |
| **`components/settings/`** | 7 | 8 | **MATCH** | Physically contains 7 components + `index.ts`. All match catalog definitions. |

---

## 12. mobile-component-catlog.md Analysis

*(Analyzing `.agents/rules/mobile-component-catalog.md`)*

### Purpose & Control Scope
* **Purpose**: Serves as an `always_on` system rule directive for AI Coding Agents and human developers working within `mobile/mobile-app/`.
* **Rules Enforced**:
  1. Mandatory catalog lookup prior to UI creation.
  2. Strict primitive prohibition (forbids raw `TouchableOpacity`, `TextInput`, `ActivityIndicator`).
  3. Mandatory outer screen wrappers (`<ScreenShell>` or `<SafeAreaWrapper>`).
  4. Mandatory NativeWind logical spacing utility classes (`me-`, `ms-`, `pe-`, `ps-`, `text-start`).
* **Authoritative Standing**: High priority enforcement rule. However, it currently overlaps significantly with `COMPONENTS_CATALOG.md` and `mobile-workflow-rules.md`.

---

## 13. mobile-workflow-rules.md Analysis

*(Analyzing `.agents/rules/mobile-workflow-rules.md`)*

### Rule Adherence Verification Table

| Rule Statement | Status | Empirical Codebase Evidence |
| :--- | :---: | :--- |
| **I. Feature-Based Anatomy** (`src/features/*/`) | **PARTIALLY FOLLOWED** | Implemented for `visitor`, `amenities`, `billing`. However, legacy `src/modules/` directory still exists concurrently. |
| **II. Layer Responsibilities** (UI free of direct API) | **FOLLOWED** | Visual components route API execution through Redux thunks and services. |
| **III. Observability & Error Handling** (`X-Request-ID`) | **FOLLOWED** | Axios service (`src/services/api.ts`) injects request correlation headers. |
| **IV. Mandatory Component Catalog Lookup** | **PARTIALLY FOLLOWED** | Standard screens reuse `<ScreenShell>` and `<ListCard>`, but auth and guard screens use raw primitives. |
| **IV. One Component Per File** | **PARTIALLY FOLLOWED** | Maintained across `components/`, but violated in complex screens (`gate-console.tsx` and `all-features.tsx`). |
| **IV. NativeWind Theme Tokens** (No inline hex) | **PARTIALLY FOLLOWED** | Shared catalog components use HSL tokens; however, 40+ screens contain hardcoded hex colors and slate shades. |
| **V. Custom Hooks as Controllers** | **FOLLOWED** | Feature logic is encapsulated in custom hooks (e.g. `useVisitorPass.ts`, `useAmenities.ts`). |
| **IX. Logical Spacing & RTL** (`ms-`, `me-`, `ps-`, `pe-`) | **NOT FOLLOWED** | **55+ files** use directional physical spacing classes (`mr-`, `ml-`, `pr-`, `pl-`). |
| **TypeScript File Format Standard** (`.tsx`) | **PARTIALLY FOLLOWED** | `src/features/noticeBoard` contains legacy `.jsx` files (`NoticeCard.jsx`, `DeleteNoticeDialog.jsx`). |

---

## 14. Documentation Conflicts and Gaps

1. **RTL Rule vs Implementation Gap**: `COMPONENTS_CATALOG.md` Rule #2 claims all components enforce logical spacing (`ms-`, `me-`), but grep analysis shows physical spacing (`mr-`, `ml-`) across 55+ files, including shared components like `ScreenShell.tsx` and `ListCard.tsx`.
2. **Catalog Count Discrepancy**: `COMPONENTS_CATALOG.md` header claims 117 components, whereas the physical count in `components/` is 121 component files. Four physical components are missing from documentation (`DatePickerModal.tsx`, `CameraViewFinder.tsx`, `ActivityLogItem.tsx`, `CategoryBarChart.tsx`).
3. **Overlapping Rule Files**: `mobile-component-catalog.md` and `COMPONENTS_CATALOG.md` duplicate lookup mandates and component tables.

---

## 15. Component Duplications

Below are the 8 major duplicate component clusters identified:

### Cluster 1: Button Implementations
* **Component A**: `components/ui/button.tsx` (Primitive button using CVA variants).
* **Component B**: `components/common/Button.tsx` (Re-exported as `CommonButton` in `components/index.ts`).
* **Comparison & Recommendation**: `components/ui/button.tsx` is built with modern `class-variance-authority` and supports NativeWind HSL design tokens cleanly. `components/common/Button.tsx` should be deprecated and merged into `components/ui/button.tsx`.

### Cluster 2: BottomSheet Implementations
* **Component A**: `components/ui/BottomSheet.tsx`
* **Component B**: `components/common/BottomSheet.tsx` (Re-exported as `CommonBottomSheet`).
* **Component C**: Direct `@gorhom/bottom-sheet` import in feature modals (`CreateVisitorPassSheet.tsx`).
* **Comparison & Recommendation**: Merge `components/common/BottomSheet.tsx` into `components/ui/BottomSheet.tsx` and enforce it as the single wrapper around `@gorhom/bottom-sheet`.

### Cluster 3: Modal & Confirmation Dialogs
* **Component A**: `components/ui/ConfirmationModal.tsx`
* **Component B**: `components/common/ConfirmationDialog.tsx`
* **Component C**: `components/common/Modal.tsx`
* **Component D**: `components/feedback/AlertDialog.tsx`
* **Component E**: `src/features/noticeBoard/components/DeleteNoticeDialog.jsx`
* **Comparison & Recommendation**: Five distinct dialog abstractions exist! Retain `components/common/Modal.tsx` as the generic base modal container and unify confirmation prompts under `components/ui/ConfirmationModal.tsx`. Delete `DeleteNoticeDialog.jsx` and `ConfirmationDialog.tsx`.

### Cluster 4: Text Input Fields
* **Component A**: `components/ui/input.tsx` (Primitive text field).
* **Component B**: `components/forms/TextInput.tsx` (Labelled input with error text and helper messages).
* **Comparison & Recommendation**: Both serve valid purposes. `components/ui/input.tsx` is the low-level primitive; `components/forms/TextInput.tsx` is the form field container. Retain both, but ensure `TextInput.tsx` internally wraps `components/ui/input.tsx`.

### Cluster 5: Skeleton Loaders
* **Component A**: `components/ui/Skeleton.tsx`
* **Component B**: `components/feedback/SkeletonLoader.tsx`
* **Component C**: `src/features/noticeBoard/components/NoticeBoardLoadingSkeleton.jsx`
* **Comparison & Recommendation**: Retain `components/ui/Skeleton.tsx` as the low-level animated pulse primitive. Standardize `SkeletonLoader.tsx` to compose `Skeleton.tsx`. Delete `NoticeBoardLoadingSkeleton.jsx`.

### Cluster 6: Status Badges
* **Component A**: `components/ui/StatusBadge.tsx`
* **Component B**: `components/common/Badge.tsx`
* **Comparison & Recommendation**: `StatusBadge.tsx` supports status variants (`success`, `danger`, `warning`) with pulsing dots. `Badge.tsx` is an un-styled tag. Consolidate into `components/ui/StatusBadge.tsx`.

### Cluster 7: Empty State Placeholders
* **Component A**: `components/feedback/EmptyState.tsx`
* **Component B**: `src/features/noticeBoard/components/NoticeBoardEmptyState.jsx`
* **Comparison & Recommendation**: `components/feedback/EmptyState.tsx` is fully generic. Delete `NoticeBoardEmptyState.jsx` and replace with `<EmptyState>`.

### Cluster 8: Cards
* **Component A**: `components/common/Card.tsx`
* **Component B**: `components/ui/ListCard.tsx`
* **Component C**: `src/features/noticeBoard/components/NoticeCard.jsx`
* **Comparison & Recommendation**: Retain `components/common/Card.tsx` for elevated containers and `components/ui/ListCard.tsx` for list items. Refactor `NoticeCard.jsx` to TypeScript and wrap `<ListCard>`.

---

## 16. Undocumented Components

The following **4 physical components** exist in `mobile/mobile-app/components/` but are omitted from `COMPONENTS_CATALOG.md`:

1. **`components/common/DatePickerModal.tsx`**: Fullscreen date range and single date picker modal component.
2. **`components/hardware/CameraViewFinder.tsx`**: Camera viewport container for photo capturing.
3. **`components/data/ActivityLogItem.tsx`**: Individual activity event row component.
4. **`components/analytics/CategoryBarChart.tsx`**: Bar chart visualization component.

---

## 17. Missing Reusable Components

The following repeated UI patterns lack standardized catalog components:

1. **`<FormSectionHeader>`**: Titled header divider for grouping form inputs (currently re-created with custom text styling across 12 modal forms).
2. **`<FilterChipGroup>`**: Horizontal scrolling list of selectable filter chips (currently implemented manually using `ScrollView` and `TouchableOpacity` in `all-features.tsx` and `discover.tsx`).
3. **`<StickyFooterCTA>`**: Standardized bottom action button bar for mobile screens (currently duplicated across `gate-console.tsx` and `create-pass.tsx`).

---

## 18. Do-Not-Reinvent Opportunities

| Screen File | Current Implementation | Reusable Catalog Component to Use | Benefit |
| :--- | :--- | :--- | :--- |
| `app/(auth)/login.tsx` | Raw `<TouchableOpacity>` & inline loader | `<Button variant="default">` | Consistent focus rings, theme tokens, loading spinner |
| `app/(auth)/otp.tsx` | Manual inline `<TextInput>` boxes | `<OtpInputField>` | Automated focus shift, clipboard paste support |
| `app/(resident)/all-features.tsx` | Raw `<TextInput>` search bar | `<SearchBar>` | Clear button, consistent search icon and height |
| `app/(resident)/all-features.tsx` | Inline card grid with raw `<TouchableOpacity>` | `<ActionTile>` | Consistent icon framing, theme background |
| `app/(resident)/visitor/gate-console.tsx` | Inline custom status pills | `<StatusBadge>` | Animated pulsing dot, HSL status colors |
| `src/features/noticeBoard/screens/NoticeBoardScreen.jsx` | Local `NoticeBoardEmptyState.jsx` | `<EmptyState>` | Centralized illustration and title/description layout |

---

## 19. Component Quality Assessment

* **Strengths**:
  * Strong adoption of NativeWind utility classes (`className="..."`).
  * Excellent coverage of hardware integrations (`QRScannerOverlay`, `NFCScanIndicator`, `PrinterStatusBadge`).
  * Good accessibility foundation (`accessibilityRole="button"`, `accessibilityLabel`) in core catalog UI components.
* **Weaknesses**:
  * **Prop Complexity**: Certain catalog components (`AttachmentPicker.tsx`, `CustomiseSheetModal.tsx`) accept over 15 props, indicating bloated responsibility.
  * **Type Inconsistency**: Coexistence of `.jsx` files in `src/features/noticeBoard` introduces untyped props (`any`).
  * **Directional Class Leakage**: High prevalence of physical spacing classes (`mr-`, `ml-`) breaking Arabic RTL layout support.

---

## 20. Technical Debt

### Critical Severity
1. **Raw Primitive Sprawl**: 40+ screens construct UI with raw `TouchableOpacity` and `TextInput` primitives, completely bypassing design tokens and catalog components.
2. **Physical Spacing in 55+ Files**: Extensive use of `mr-`/`ml-`/`pr-`/`pl-` classes breaks RTL localization.

### High Severity
1. **Architectural Coexistence (`src/modules/` vs `src/features/`)**: Unmigrated legacy code in `src/modules/` creates confusion regarding where new feature logic should reside.
2. **Duplicate Component Clusters**: 8 competing component groups (e.g. `Button` vs `button`, 5 modal dialog variations).

### Medium Severity
1. **Documentation Discrepancies**: `COMPONENTS_CATALOG.md` lists 117 components (missing 4 physical files) and falsely claims 100% RTL logical class compliance.
2. **JavaScript `.jsx` Infiltration**: `src/features/noticeBoard` uses `.jsx` files instead of standard TypeScript `.tsx`.

### Low Severity
1. Hardcoded hex color values in domain screens (`#2563eb`, `#10b981`).

---

## 21. Recommended Target Architecture

### Proposed Clean Architecture Tree
```text
mobile/mobile-app/
├── app/                        # Expo Router Pure Screen Routes (Thin Containers)
├── components/                 # Authoritative Shared Catalog Components
│   ├── ui/                     # Primitives (button, text, input, ListCard, StatusBadge, ScreenShell)
│   ├── forms/                  # Form Controls (TextInput, DropdownSelect, Checkbox)
│   ├── feedback/               # Overlay Feedback (EmptyState, ErrorBanner, ProgressLoader)
│   ├── layout/                 # Layout Containers (SafeAreaWrapper, KeyboardAvoidingShell)
│   ├── navigation/             # Navigation Headers & Switch Modals
│   ├── hardware/               # Device Hardware Components (QRScanner, NFC, Printer)
│   ├── data/                   # Data Visualization & Virtualized Lists
│   └── index.ts                # Single Barrel Export
├── lib/                        # Utility Functions (`cn()`) & Navigation Theme
├── src/
│   ├── design-system/tokens/   # HSL Design Tokens (colors, spacing, typography, radii)
│   ├── features/               # Pure Feature-Sliced Architecture
│   │   └── [featureName]/
│   │       ├── components/     # Feature-Specific Visual UI Components
│   │       ├── hooks/          # Feature Controllers & Redux Mapping
│   │       ├── services/       # Feature Axios API Client Calls
│   │       ├── store/          # Feature Redux Slice & Thunks
│   │       └── types/          # TypeScript Type Definitions
│   └── store/                  # Centralized Redux Store Registration
```

---

## 22. Recommended Component Rules

1. **Mandatory Catalog Search**: Before creating any new UI component, search `components/` and `COMPONENTS_CATALOG.md`.
2. **Zero Raw Primitive CTAs**: Creating custom buttons using raw `<TouchableOpacity>` or `<Pressable>` is strictly prohibited. Always use `<Button>`.
3. **Zero Raw Primitive Inputs**: Creating text input fields using raw `<TextInput>` is strictly prohibited. Always use `<TextInput>` from `@/components/forms` or `<input>` from `@/components/ui`.
4. **Mandatory RTL Logical Classes**: All margin, padding, and text alignment utilities MUST use NativeWind logical spacing classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`). Physical directional classes (`mr-`, `ml-`, `pr-`, `pl-`) are forbidden.
5. **Mandatory HSL Theme Tokens**: Colors must use design tokens (`bg-card`, `bg-primary`, `text-foreground`, `border-border`). Direct hex codes and slate color shades are forbidden.
6. **Feature Isolation**: Reusable generic components belong in `components/`. Feature-specific domain components must stay inside `src/features/[featureName]/components/`.
7. **TypeScript Enforcement**: All component files MUST use `.tsx` extensions with explicit interface prop definitions.

---

## 23. Antigravity UI Development Decision Process

```text
               New Mobile UI Requirement
                           │
                           ▼
          Inspect `COMPONENTS_CATALOG.md` & `components/`
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  Matching Catalog Component?   No Direct Match
             │                           │
     ┌───────┴───────┐           ┌───────┴───────┐
     ▼               ▼           ▼               ▼
    YES              NO         YES              NO
     │               │           │               │
  Import &        Extend      Reusable        Feature-Specific
  Reuse Catalog  Catalog     Across Features? Component
  Component      Component       │               │
                                 ▼               ▼
                            Create in       Create in
                            `components/`   `src/features/`
                                 │               │
                                 ▼               ▼
                            Update          Strictly Use
                            Catalog         TypeScript
                            Doc             & Tokens
```

---

## 24. Before-Every-UI-Change Checklist

- [ ] **Catalog Verification**: Checked `COMPONENTS_CATALOG.md` and `components/` for pre-existing components.
- [ ] **Outer Container**: Screen route wrapped in `<ScreenShell>` or `<SafeAreaWrapper>` + `<KeyboardAvoidingShell>`.
- [ ] **CTA Buttons**: All clickable actions use catalog `<Button>` or `<IconButton>` (no raw `TouchableOpacity`).
- [ ] **Form Inputs**: All input fields use catalog `<TextInput>` or `<DropdownSelect>` (no raw `TextInput`).
- [ ] **RTL Compliance**: Verified all spacing classes use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- [ ] **Dark Mode / Theme Tokens**: Verified background and text colors use theme tokens (`bg-card`, `text-foreground`).
- [ ] **Loading & Empty States**: Integrated `<ProgressLoader>` or `<Skeleton>` for loading and `<EmptyState>` for empty data lists.
- [ ] **TypeScript Types**: Props are strictly typed in `.tsx` format without `any`.
- [ ] **Barrel Export**: Imported cleanly from `@/components`.

---

## 25. Priority Action Plan

| Step | Action Item | Priority | Estimated Impact |
| :---: | :--- | :---: | :--- |
| **1** | **Refactor Directional Classes**: Replace physical classes (`mr-`, `ml-`, `pr-`, `pl-`) with logical RTL classes (`me-`, `ms-`, `pe-`, `ps-`) across all 55+ files. | **P0 - Critical** | Restores complete Arabic RTL layout support. |
| **2** | **Consolidate Duplicate Buttons & Modals**: Deprecate `components/common/Button.tsx` in favor of `components/ui/button.tsx`. Unify confirmation dialogs into `components/ui/ConfirmationModal.tsx`. | **P0 - Critical** | Eliminates primary sources of component confusion. |
| **3** | **Migrate Auth & Gate Screens to Catalog**: Refactor `app/index.tsx`, `login.tsx`, `otp.tsx`, and `gate-console.tsx` to consume catalog `<Button>`, `<TextInput>`, `<OtpInputField>`, and `<StatusBadge>`. | **P1 - High** | Enforces design system across core landing screens. |
| **4** | **Migrate Legacy `src/modules/`**: Relocate remaining legacy module files in `src/modules/` into clean `src/features/` feature folders. | **P1 - High** | Establishes single architecture folder structure. |
| **5** | **Update `COMPONENTS_CATALOG.md`**: Add missing components (`DatePickerModal`, `CameraViewFinder`, `ActivityLogItem`, `CategoryBarChart`) and fix component count to 121. | **P2 - Medium** | Synchronizes documentation with actual codebase. |
| **6** | **Convert `.jsx` to `.tsx`**: Convert `src/features/noticeBoard` JavaScript files to TypeScript `.tsx`. | **P2 - Medium** | Achieves 100% TypeScript type safety. |

---

## 26. Final Recommendations

### Primary Recommendation
Before developing any new mobile screens or adding additional features to the application, execute **Priority Actions 1, 2, and 3**. Standardizing the component catalog, eliminating physical directional classes, and replacing raw primitives across existing screens will establish a robust, maintainable foundation for all future development.

---
