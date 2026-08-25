---
trigger: always_on
---

# Mobile Component Catalog & Agent UI Rules

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS**  
> Every AI Agent (Antigravity, Cursor, Windsurf, Copilot, etc.) working on mobile app screens (`mobile/mobile-app/`) MUST strictly obey the component reuse mandate detailed below.

---

## I. Mandatory Catalog Lookup Prior to UI Creation
* **Rule 1.1 (Catalog First):** Before creating any new mobile screen, view, modal, or form component, you MUST inspect the component inventory in `mobile/mobile-app/COMPONENTS_CATALOG.md` and check the physical directory `mobile/mobile-app/components/`.
* **Rule 1.2 (Strict Reuse):** If a matching component exists in `mobile/mobile-app/components/` (e.g. `Button`, `Card`, `TextInput`, `StatusBadge`, `ScreenShell`, `EmptyState`, `BottomSheet`), you MUST import and reuse it.
* **Rule 1.3 (Barrel Exports):** Always import components cleanly via barrel exports using `@/components` or category aliases like `@/components/ui`, `@/components/forms`, `@/components/feedback`, `@/components/navigation`.

---

## II. Forbidden Anti-Patterns (Strictly Prohibited)

### ❌ Anti-Pattern 1: Raw Primitive Duplication
NEVER build custom inline buttons, custom text inputs, status badges, cards, or loading skeletons using raw React Native primitives (`View`, `Text`, `TouchableOpacity`, `TextInput`, `ActivityIndicator`) when a matching catalog component exists.
* **FORBIDDEN:**
  ```tsx
  <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
    <Text className="text-white font-semibold">Submit</Text>
  </TouchableOpacity>
  ```
* **REQUIRED:**
  ```tsx
  import { Button } from '@/components';
  <Button variant="default" onPress={handleSubmit}>Submit</Button>
  ```

### ❌ Anti-Pattern 2: Missing Outer Screen Shells
NEVER create floating pages without an outer layout container.
* **REQUIRED:** Wrap all top-level mobile screen routes in `<ScreenShell>` or `<SafeAreaWrapper>` + `<KeyboardAvoidingShell>`.

### ❌ Anti-Pattern 3: Hardcoded Inline Color Styles & Directional Margins
NEVER hardcode hex codes or physical margin classes (`mr-`, `ml-`, `pr-`, `pl-`).
* **REQUIRED:** Use NativeWind design system utility classes (`bg-primary`, `bg-card`, `bg-muted`, `text-foreground`, `border-border`) and logical spacing classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).

---

## III. Component Selection & Usage Hierarchy

| UI Requirement | Required Component Import | Preferred Barrel Import Path |
| :--- | :--- | :--- |
| Outer Screen Layout | `<ScreenShell>` | `@/components` or `@/components/ui` |
| Primary / Secondary Actions | `<Button>` | `@/components` or `@/components/common` |
| Text Input & Passwords | `<TextInput>`, `<PasswordInput>` | `@/components` or `@/components/forms` |
| Selection & Pickers | `<DropdownSelect>`, `<DatePicker>` | `@/components` or `@/components/forms` |
| Status Pill / State Badges | `<StatusBadge>` | `@/components` or `@/components/ui` |
| Data Lists & Cards | `<PaginatedList>`, `<ListCard>` | `@/components` or `@/components/ui` |
| Empty Results Placeholder | `<EmptyState>` | `@/components` or `@/components/feedback` |
| Skeleton Loading State | `<Skeleton>` or `<SkeletonLoader>` | `@/components` or `@/components/ui` |
| Bottom Popups & Sliders | `<BottomSheet>` | `@/components` or `@/components/ui` |
| Modal Confirmations | `<ConfirmationModal>` | `@/components` or `@/components/ui` |
| Hardware Scanning | `<QRScannerOverlay>`, `<NFCScanIndicator>` | `@/components` or `@/components/hardware` |
| User / Tenant Header | `<MobileHeader>`, `<VillaSwitchModal>` | `@/components` or `@/components/navigation` |
| Visitor Pass Cards | `<ListCard>` + `<StatusBadge>` | `@/components/ui` & `@/features/visitor/components` |
| Gate Approval CTAs | `<Button>` (Action Row) | `@/components/ui` & `@/features/visitor/components/walkin` |
| Multi-Step Pass Wizard | Step Indicators + Flow Header/Footer | `@/components/ui` & `@/features/visitor/components/shared` |

---

## IV. Quality & Accessibility Standards
1. **RTL Support:** Always use NativeWind logical spacing utility classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `items-start`) to support Arabic localization.
2. **Dark Mode Compatibility:** Ensure components use dark mode theme tokens (`bg-card`, `bg-muted`, `text-foreground`, `border-border`).
3. **Accessibility:** Ensure buttons and touchables set proper `accessibilityRole="button"` and `accessibilityLabel`.

---

## V. Dashboard Layout & Recent Activity Constraints
1. **Strict 3-Item Limit for Dashboard Activity Previews:** Top-level executive and resident dashboard screens MUST ONLY render a preview of at most 3 items (`.slice(0, 3)`) in their "Recent Activity" or queue snippet section. Never render full datasets, unbounded arrays, or more than 3 items directly on a dashboard screen. Full datasets belong in the dedicated sub-screen linked via `<SectionHeader actionLabel="View All">`.
2. **Scroll Containment & FAB Bottom Inset:** Every screen with a Floating Action Button (`<FAB>`) MUST configure its `<ScrollView>` with adequate bottom content padding (minimum `pb-28` in `contentContainerClassName` or `paddingBottom: 110` in `contentContainerStyle`) to prevent list items from scrolling beyond the visible container or getting clipped underneath the bottom FAB.

