# Mobile Reusable Component Catalog

> **AUTHORITATIVE CATALOG FOR DEVELOPERS & AI AGENTS**  
> **Target Folder**: `mobile/mobile-app/components/`  
> **Total Cataloged Components**: 117 Components across 12 Categories  
> **Mandate**: ALL developers and AI agents (Antigravity, Cursor, Windsurf, Copilot, etc.) MUST strictly reuse these components when building mobile views and screens. Inline re-creation of UI primitives is strictly forbidden.

---

## Quick Navigation & Category Overview

| Category Directory | Count | Key Purpose & Responsibilities | Import Path Alias & Barrel Export |
| :--- | :---: | :--- | :--- |
| **`components/ui/`** | 23 | Atomic UI primitives, list cards, status badges, screen shells | `@/components/ui` or `@/components` |
| **`components/common/`** | 25 | Generic reusable components (Buttons, Avatars, Modals, Pickers) | `@/components/common` or `@/components` |
| **`components/forms/`** | 10 | Form input fields, selects, sliders, toggles, OTP inputs | `@/components/forms` or `@/components` |
| **`components/feedback/`** | 8 | Action sheets, alert dialogs, empty states, loader skeletons | `@/components/feedback` or `@/components` |
| **`components/layout/`** | 8 | Safe area wrappers, keyboard avoiding shells, grid rows, spacers | `@/components/layout` or `@/components` |
| **`components/navigation/`** | 6 | Headers, context switchers (Org, Villa, Role, Profile modals) | `@/components/navigation` or `@/components` |
| **`components/hardware/`** | 5 | Device hardware integration UI (QR Scanner, NFC, Printer, Torch) | `@/components/hardware` or `@/components` |
| **`components/data/`** | 8 | Data visualization grids, audit timelines, virtualized lists | `@/components/data` or `@/components` |
| **`components/dashboard/`** | 8 | Hero banners, action tiles, customizable deck zones, quick grids | `@/components/dashboard` or `@/components` |
| **`components/auth/`** | 5 | Biometric login buttons, password strength meters, OTP inputs | `@/components/auth` or `@/components` |
| **`components/analytics/`** | 4 | Real-time metric charts, heatmaps, conversion funnel views | `@/components/analytics` or `@/components` |
| **`components/settings/`** | 7 | Theme toggles, language pickers, diagnostic viewers, storage | `@/components/settings` or `@/components` |

---

## Architecture & Styling Rules

1. **Barrel Exports**: Every component folder contains an `index.ts` barrel export file. You can import components individually, by category (`@/components/ui`), or centrally from the root (`@/components`).
2. **RTL & Logical Spacing**: ALL components enforce NativeWind logical spacing utility classes (`me-`, `ms-`, `pe-`, `ps-`, `text-start`) instead of directional physical classes (`mr-`, `ml-`, `pr-`, `pl-`) to ensure seamless Arabic/English RTL/LTR support.
3. **NativeWind Theme Tokens**: Components use theme design tokens (`bg-card`, `bg-muted`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) rather than hardcoded slate colors (`bg-slate-50`, `text-slate-900`) for complete Light and Dark Mode compatibility.
4. **Strict Reuse Mandate**: Components must build upon existing primitives (`SkeletonLoader` wraps `Skeleton`, `ConfirmationDialog` reuses `Button` and `Modal`). Inline duplicated primitives are prohibited.

---

## 1. UI Primitives (`components/ui/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`ScreenShell`** | `ScreenShell.tsx` | Standard outer screen wrapper. Includes back button, title, subtitle, loading state, error banner, and headerRight slots. |
| **`StatusBadge`** | `StatusBadge.tsx` | Status pill component. Accepts `variant` (`success`, `warning`, `danger`, `info`, `neutral`, `critical`) and optional pulsing `dot`. |
| **`ListCard`** | `ListCard.tsx` | Card container for items in list screens. Supports title, subtitle, icon, status badge, action buttons, and touch handlers. |
| **`PaginatedList`** | `PaginatedList.tsx` | High-performance list renderer with built-in pull-to-refresh, pagination, and empty state support. |
| **`KPICard`** | `KPICard.tsx` | Card displaying key performance indicators, numbers, trend arrows, and icon highlights. |
| **`KPIRow`** | `KPIRow.tsx` | Horizontally aligned row container for grouping multiple KPICards. |
| **`DetailSection`** | `DetailSection.tsx` | Card or container grouping detailed key-value metadata rows. |
| **`DetailRow`** | `DetailRow.tsx` | Label and value key-pair display row with copy action support. |
| **`ActionBar`** | `ActionBar.tsx` | Sticky or floating bottom bar for primary CTA buttons (e.g. Approve/Reject, Save/Cancel). |
| **`AttachmentPicker`**| `AttachmentPicker.tsx` | File/image attachment selector supporting gallery, camera, and document picker. |
| **`BottomSheet`** | `BottomSheet.tsx` | Native bottom sheet modal container for contextual popups and action menus. |
| **`ConfirmationModal`**| `ConfirmationModal.tsx` | Modal dialog for critical confirmation flows (e.g. Revoke, Delete, Cancel). |
| **`DateRangePicker`** | `DateRangePicker.tsx` | Calendar selector for selecting start and end date ranges. |
| **`FAB`** | `FAB.tsx` | Floating Action Button for primary screen actions. |
| **`FeatureIcon`** | `FeatureIcon.tsx` | Icon container wrapper with background colors matching feature domains. |
| **`SearchFilterBar`** | `SearchFilterBar.tsx` | Search bar combined with filter chip toggles and modal triggers. |
| **`Skeleton`** | `Skeleton.tsx` | Skeleton loading placeholder matching list items, cards, and text rows. |
| **`TabBar`** | `TabBar.tsx` | Segmented horizontal tab selection bar. |
| **`TimelineItem`** | `TimelineItem.tsx` | Vertical audit trail or process timeline item component. |
| **`button`** | `button.tsx` | Primitive button variant wrapper supporting CVA variants. |
| **`icon`** | `icon.tsx` | Primitive Lucide icon wrapper with size and color styling properties. |
| **`input`** | `input.tsx` | Primitive input field wrapper. |
| **`text`** | `text.tsx` | Primitive typography wrapper handling theme color and text variants. |

---

## 2. Common Components (`components/common/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`Button`** | `Button.tsx` | Standard interactive button with primary, secondary, outline, and destructive variants. |
| **`Badge`** | `Badge.tsx` | General purpose tag/badge indicator. |
| **`Avatar`** | `Avatar.tsx` | User profile avatar with initials fallback and online status indicator. |
| **`Card`** | `Card.tsx` | Elevated container box with header, body, and footer slots. |
| **`Chip`** | `Chip.tsx` | Interactive filter chip or tag pill with dismiss/check actions. |
| **`ConfirmationDialog`**| `ConfirmationDialog.tsx` | Reusable popup modal for quick confirm/cancel prompts. |
| **`DatePicker`** | `DatePicker.tsx` | Single date selection input modal. |
| **`TimePicker`** | `TimePicker.tsx` | Time picker input modal (12h/24h formats). |
| **`Calendar`** | `Calendar.tsx` | Month view calendar for selecting dates. |
| **`Divider`** | `Divider.tsx` | Visual separator line (horizontal or vertical). |
| **`IconButton`** | `IconButton.tsx` | Circular or square button containing an icon only. |
| **`ImageCarousel`** | `ImageCarousel.tsx` | Swipeable image gallery carousel with pagination dots. |
| **`ImagePreview`** | `ImagePreview.tsx` | Full-screen image preview overlay with zoom support. |
| **`ListItem`** | `ListItem.tsx` | Standard list row with left icon, title, subtitle, and right accessory/chevron. |
| **`Modal`** | `Modal.tsx` | Generic full screen or popup modal overlay. |
| **`Pagination`** | `Pagination.tsx` | Page numbers and prev/next controls for tables and lists. |
| **`ProgressBar`** | `ProgressBar.tsx` | Linear progress bar with percentage indicator. |
| **`PullToRefresh`** | `PullToRefresh.tsx` | Refresh control wrapper for scroll views. |
| **`QuantitySelector`** | `QuantitySelector.tsx` | Incremental (+ / -) count selector for tickets or items. |
| **`Rating`** | `Rating.tsx` | Star rating display and interactive rating selector. |
| **`SectionHeader`** | `SectionHeader.tsx` | Section title header with optional "See All" action button. |
| **`SegmentedControl`** | `SegmentedControl.tsx` | iOS/Android style dual/triple option toggle switch. |
| **`SwipeableRow`** | `SwipeableRow.tsx` | List row supporting left/right swipe action triggers (e.g. Delete, Edit). |
| **`Tabs`** | `Tabs.tsx` | Multi-tab view container. |
| **`CommonBottomSheet`** | `BottomSheet.tsx` | Common bottom sheet modal popup. |

---

## 3. Form Input Controls (`components/forms/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`TextInput`** | `TextInput.tsx` | Labelled text input field with error messaging, icon support, and focus rings. |
| **`PasswordInput`** | `PasswordInput.tsx` | Secure text field with visibility toggle eye icon. |
| **`DropdownSelect`**| `DropdownSelect.tsx` | Single/multi select picker modal with search filtering. |
| **`FileUploadField`**| `FileUploadField.tsx` | File uploader box with progress bar and thumbnail preview. |
| **`PinCodeInput`** | `PinCodeInput.tsx` | 4 or 6 digit PIN passcode entry box. |
| **`RadioGroup`** | `RadioGroup.tsx` | Single choice radio selection option group. |
| **`Checkbox`** | `Checkbox.tsx` | Checkbox form input with label and helper text. |
| **`ToggleSwitch`** | `ToggleSwitch.tsx` | On/Off boolean toggle switch with smooth animation. |
| **`SliderInput`** | `SliderInput.tsx` | Range slider control for numeric values. |
| **`SearchBar`** | `SearchBar.tsx` | Standalone search input box with clear button. |

---

## 4. Feedback & Status Overlay (`components/feedback/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`EmptyState`** | `EmptyState.tsx` | Illustrated placeholder when data lists or searches return 0 records. |
| **`ErrorBanner`** | `ErrorBanner.tsx` | Warning/Error alert notification banner. |
| **`SuccessToast`** | `SuccessToast.tsx` | Toast alert notification for completed actions. |
| **`ActionSheet`** | `ActionSheet.tsx` | Bottom action list picker sheet. |
| **`AlertDialog`** | `AlertDialog.tsx` | Critical modal dialog box. |
| **`OfflineBanner`** | `OfflineBanner.tsx` | Network connectivity offline notification bar. |
| **`ProgressLoader`** | `ProgressLoader.tsx` | Spinner loader with message text. |
| **`SkeletonLoader`** | `SkeletonLoader.tsx` | Skeleton placeholder loader built on top of Skeleton UI primitive. |

---

## 5. Layout & Shell Helpers (`components/layout/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`SafeAreaWrapper`**| `SafeAreaWrapper.tsx` | Wraps screens to avoid status bar and gesture navigation bars. |
| **`KeyboardAvoidingShell`**| `KeyboardAvoidingShell.tsx` | Prevents input fields from being covered by on-screen software keyboards. |
| **`ScrollContainer`**| `ScrollContainer.tsx` | Scrollable container with padding and pull-to-refresh integration. |
| **`Typography`** | `Typography.tsx` | Standardized headings, body text, subtext, and caption elements. |
| **`GridRow`** | `GridRow.tsx` | Flexbox row layout container. |
| **`Spacer`** | `Spacer.tsx` | Vertical or horizontal spacing element. |
| **`SectionDivider`**| `SectionDivider.tsx` | Styled divider for separating content sections. |
| **`AbsoluteOverlay`**| `AbsoluteOverlay.tsx` | Full-bleed absolute overlay backdrop for modal views. |

---

## 6. App Navigation & Context Switching (`components/navigation/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`MobileHeader`** | `MobileHeader.tsx` | Main application top bar with tenant logo, search trigger, and notifications. |
| **`OrgSwitchModal`**| `OrgSwitchModal.tsx` | Modal pop-up to switch current organization context. |
| **`VillaSwitchModal`**| `VillaSwitchModal.tsx` | Modal pop-up to switch active villa or unit context. |
| **`RoleSwitchModal`**| `RoleSwitchModal.tsx` | Modal pop-up to switch active user role (e.g. Resident -> Guard -> Admin). |
| **`ProfileModal`** | `ProfileModal.tsx` | User profile avatar menu modal. |
| **`NotificationSheetModal`**| `NotificationSheetModal.tsx` | Slide-up notifications list drawer. |

---

## 7. Device Hardware Integrations (`components/hardware/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`QRScannerOverlay`**| `QRScannerOverlay.tsx` | Camera viewfinder overlay for scanning visitor QR passes. |
| **`NFCScanIndicator`**| `NFCScanIndicator.tsx` | Animated ripple indicator for scanning NFC guard patrol tags. |
| **`PrinterStatusBadge`**| `PrinterStatusBadge.tsx` | Thermal receipt printer connection status badge. |
| **`FlashlightToggle`**| `FlashlightToggle.tsx` | Camera flash / torch toggle button. |
| **`ConceptualImageReference`**| `ConceptualImageReference.tsx` | Image capture reference placeholder for guard inspection photos. |

---

## 8. Data Visualization & Tracking (`components/data/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`OptimizedDataGrid`**| `OptimizedDataGrid.tsx` | High-performance grid table for tabular records. |
| **`VirtualizedList`**| `VirtualizedList.tsx` | Virtualized list renderer for extra large datasets. |
| **`MetricCard`** | `MetricCard.tsx` | Metric summary card with progress rings and subtext. |
| **`ExpandableCardList`**| `ExpandableCardList.tsx` | Accordion-style list item with collapsible detail view. |
| **`AuditTrailTimeline`**| `AuditTrailTimeline.tsx` | Chronological audit log timeline tree view. |
| **`AgenticStateTracker`**| `AgenticStateTracker.tsx` | State tracker component for AI background processing states. |
| **`RawPayrollTable`**| `RawPayrollTable.tsx` | Staff salary and payroll table layout. |
| **`WorkflowTriggerLog`**| `WorkflowTriggerLog.tsx` | Automated workflow execution log entry display. |

---

## 9. Dashboard Components (`components/dashboard/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`HeroBanner`** | `HeroBanner.tsx` | Top feature banner card with call to action. |
| **`QuickActionsGrid`**| `QuickActionsGrid.tsx` | 2x4 or 3x3 shortcut grid for frequent actions (Add Visitor, Book Slot, Pay Bill). |
| **`QuickActionsAllModal`**| `QuickActionsAllModal.tsx` | Full screen drawer listing all available feature shortcuts. |
| **`ActionTile`** | `ActionTile.tsx` | Action tile item inside shortcut grids. |
| **`FeatureDetailScreen`**| `FeatureDetailScreen.tsx` | Reusable generic view for feature details. |
| **`CustomiseSheetModal`**| `CustomiseSheetModal.tsx` | Dashboard widget customization sheet. |
| **`CustomiseDeckZone`**| `CustomiseDeckZone.tsx` | Customizable dashboard card zone. |
| **`CustomiseAvailableZone`**| `CustomiseAvailableZone.tsx` | Zone containing available widget tiles. |

---

## 10. Authentication & Security UI (`components/auth/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`BiometricUnlockButton`**| `BiometricUnlockButton.tsx` | Touch ID / Face ID quick unlock trigger button. |
| **`OtpInputField`** | `OtpInputField.tsx` | Multi-digit SMS OTP verification input box. |
| **`PasswordStrengthIndicator`**| `PasswordStrengthIndicator.tsx` | Real-time visual password strength bar (Weak, Medium, Strong). |
| **`SocialAuthButton`**| `SocialAuthButton.tsx` | Google / Apple SSO authentication button. |
| **`TermsConsentCheckbox`**| `TermsConsentCheckbox.tsx` | Terms of Service agreement checkbox line. |

---

## 11. Analytics & Reports (`components/analytics/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`RealtimeMetricChart`**| `RealtimeMetricChart.tsx` | Live updating chart widget for foot traffic and entries. |
| **`ActivityHeatmap`**| `ActivityHeatmap.tsx` | Weekly activity density heatmap. |
| **`ConversionFunnelView`**| `ConversionFunnelView.tsx` | Step-by-step funnel visualization. |
| **`ExportReportButton`**| `ExportReportButton.tsx` | PDF / Excel report export trigger button. |

---

## 12. App Settings & Maintenance (`components/settings/`)

| Component Name | File | Primary Purpose & Key Props |
| :--- | :--- | :--- |
| **`ThemeToggleSwitch`**| `ThemeToggleSwitch.tsx` | Dark / Light theme toggle switch. |
| **`LanguageSelector`**| `LanguageSelector.tsx` | Language picker (English / Arabic / Hindi). |
| **`PermissionRequestCard`**| `PermissionRequestCard.tsx` | Card prompting user for system permissions (Camera, Location, Push). |
| **`DiagnosticLogViewer`**| `DiagnosticLogViewer.tsx` | Embedded log viewer for mobile app troubleshooting. |
| **`StorageCleanerWidget`**| `StorageCleanerWidget.tsx` | Cache and offline storage cleanup widget. |
| **`OnboardingCarousel`**| `OnboardingCarousel.tsx` | Multi-slide feature onboarding carousel. |
| **`AppVersionFooter`**| `AppVersionFooter.tsx` | Footer text showing app build version and copyright. |

---

## Standard Barrel Import Usage Examples

```tsx
// Example: Creating a Visitor Pass List View using Barrel Exports
import React from 'react';
import {
  ScreenShell,
  ListCard,
  StatusBadge,
  Button,
  EmptyState,
} from '@/components';
import { Plus } from 'lucide-react-native';

export default function VisitorListScreen() {
  const visitors = [/* ... */];

  return (
    <ScreenShell
      title="Visitor Passes"
      subtitle="Manage expected and past visitors"
      iconName="UserCheck"
      headerRight={
        <Button variant="default" size="sm">
          New Pass
        </Button>
      }
    >
      {visitors.length === 0 ? (
        <EmptyState
          title="No Active Visitor Passes"
          description="Create a pass to allow guests easy access through the security gate."
        />
      ) : (
        visitors.map((item) => (
          <ListCard
            key={item.id}
            title={item.name}
            subtitle={`Pass Code: ${item.passCode}`}
            statusBadge={<StatusBadge label={item.status} variant="success" dot />}
          />
        ))
      )}
    </ScreenShell>
  );
}
```

---

## Reference Domain Architecture: Visitor Management Component Mapping

The Visitor Management module (`src/features/visitor/components/`) serves as the reference baseline for extending catalog primitives into domain-specific features:

| Visitor Domain Component | Physical Path | Primary Catalog Primitives Reused |
| :--- | :--- | :--- |
| **`VisitorPassCard`** | `src/features/visitor/components/VisitorPassCard.tsx` | `<ListCard>`, `<StatusBadge>`, `<Button>` |
| **`VisitorPassDetailsModal`** | `src/features/visitor/components/VisitorPassDetailsModal.tsx` | `<BottomSheet>`, `<DetailSection>`, `<DetailRow>`, `<StatusBadge>` |
| **`CreateVisitorPassSheet`** | `src/features/visitor/components/CreateVisitorPassSheet.tsx` | `<BottomSheet>`, `<TextInput>`, `<DropdownSelect>`, `<DatePicker>` |
| **`WalkInApprovalCard`** | `src/features/visitor/components/walkin/WalkInApprovalCard.tsx` | `<Card>`, `<StatusBadge>`, `<Button>` |
| **`GuardQRScannerModal`** | `src/features/visitor/components/guard/GuardQRScannerModal.tsx` | `<Modal>`, `<QRScannerOverlay>`, `<TextInput>`, `<Button>` |
| **`VisitorHistoryView`** | `src/features/visitor/components/history/VisitorHistoryView.tsx` | `<PaginatedList>`, `<SearchFilterBar>`, `<EmptyState>` |
| **`VisitorAnalyticsCard`** | `src/features/visitor/components/admin/VisitorAnalyticsCard.tsx` | `<KPICard>`, `<KPIRow>` |
| **`AdminBlacklistModal`** | `src/features/visitor/components/admin/AdminBlacklistModal.tsx` | `<Modal>`, `<TextInput>`, `<Button>` |
| **`VisitorPassWizard`** | `src/features/visitor/components/wizard/VisitorPassWizard.tsx` | `VisitorPassStepIndicator`, `VisitorPassFlowHeader`, `VisitorPassFlowFooter` |

