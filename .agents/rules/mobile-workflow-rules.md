---
trigger: always_on
---

# Mobile Workflow & Architecture Rules

## I. Architectural Boundaries & Encapsulation
* **Feature-Based Structure:** Group code by feature inside `src/features/` or `app/(feature)` rather than by type (e.g., keep the API, Slice, and UI components for a feature together).
* **Strict Feature Anatomy:** Every feature folder MUST strictly adhere to this internal subfolder structure. Files MUST NOT float in the root of the feature folder (except for an `index.js` export file):
  * `/services/` (for Axios API calls)
  * `/components/` (for dumb `.jsx` or `.tsx` React Native UI components)
  * `/screens/` (for top-level screen containers)
  * `/hooks/` (for custom logic and Redux mapping)
  * `/store/` (for the Redux slice and thunks)
* **The "Scope of Use" Rule:**
  * Feature-specific hooks, utilities, and generic components MUST live inside that feature's directory.
  * Reusable global components MUST be pulled directly from the catalog in `mobile/mobile-app/components/` (`COMPONENTS_CATALOG.md`).
* **The UI Request Flow:** `Screen Component → Custom Hook → Redux Thunk/Action → Feature API Service → Backend`.

## II. Layer Responsibilities
* **Screens & Components (The Canvas):** Strictly for UI rendering and capturing user events. **MUST NEVER** call Axios or Fetch directly.
* **Redux Feature Slices (The Engine):** 
  * **Individual State:** EVERY feature MUST possess its own isolated Redux Toolkit slice (e.g., `src/features/userManagement/store/userSlice.js`). Feature data, default states, and mock data reside exclusively here.
  * **Global Registration:** Every feature slice MUST be explicitly registered in the global Redux store (e.g., `src/store/store.js`) under a dedicated key matching the feature name.

## III. Observability & Error Handling
* **API Interception:** The global API client must automatically inject the `X-Request-ID` header and authentication tokens into every outgoing request and catch all 4xx/5xx responses for central logging and token refresh handling.
* **Client Logging:** Use a custom logger utility to suppress `info` and `debug` logs in `production` to prevent leaking sensitive variables into console output.
* **Resilience:** Wrap all major feature navigators and complex screens in React Error Boundaries to prevent full application crashes.

## IV. Component & Screen Architecture (Strict Modularity & Component Catalog Mandate)
* **Mandatory Component Catalog Lookup (Catalog First):** BEFORE creating any mobile screen, modal, list, or feature module component, you MUST inspect the authoritative catalog in `mobile/mobile-app/COMPONENTS_CATALOG.md` and check `mobile/mobile-app/components/`. If a matching component exists (`ScreenShell`, `ListCard`, `StatusBadge`, `Button`, `TextInput`, `DropdownSelect`, `EmptyState`, `BottomSheet`, `ConfirmationModal`, `MobileHeader`, `SkeletonLoader`, etc.), you MUST import and reuse it.
* **Barrel Export Imports:** Always import reusable components cleanly via barrel exports using `@/components` or category aliases like `@/components/ui`, `@/components/common`, `@/components/forms`, `@/components/feedback`, `@/components/navigation`, `@/components/hardware`.
* **Forbidden Primitive Duplication:** NEVER build inline custom buttons, text inputs, status badges, modal overlays, cards, or loading skeletons using raw React Native primitives (`View`, `Text`, `TouchableOpacity`, `TextInput`, `ActivityIndicator`) when a matching catalog component exists.
* **Screens vs. Components:** 
  * **Screens (The Containers):** Top-level route pages (e.g., `RoleBuilderListScreen.tsx` or `NotificationListScreen.tsx`) act as orchestrators. They MUST wrap content in `<ScreenShell>` or `<SafeAreaWrapper>` + `<KeyboardAvoidingShell>`.
  * **Components (The Canvas):** Smaller, feature-specific UI elements (e.g., `RoleFormModal.tsx`, `NotificationCard.tsx`) MUST reside inside `src/features/[featureName]/components/`.
* **One Component Per File:** You must NEVER define multiple React Native components within a single file. Sub-components, Modals, and List Items must be abstracted into their own files.
* **NativeWind & Theme Tokens:** Use NativeWind (Tailwind classes) via the `className` prop. Use NativeWind design system tokens (`bg-primary`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`). Inline hardcoded hex colors or inline `style={{}}` objects are strictly prohibited.

## V. State & Logic Architecture (The "Thin View" Pattern)
* **Redux First for Data:** Do not use `useState` for data arrays or persistent filters. All feature-level data MUST live in the Redux store.
* **Server-Side Pagination:** Do not perform in-memory array splitting for large lists. Always rely on backend database-level pagination, passing `page` and `limit` via thunks, and storing the resulting pagination metadata in the Redux slice. Use `PaginatedList` or `FlatList` with `onEndReached` to trigger next page fetches.
* **Custom Hooks as Controllers:** UI Components and Screens must remain purely visual. All interaction logic, `useDispatch` calls, and `useSelector` mapping MUST be extracted into a custom hook (e.g., `useUserFeature.js`). This hook acts as the sole bridge between the UI and Redux.
* **Data Utilities:** Complex data transformations or heavy formatting must be offloaded to isolated utility files in the feature's `/utils` directory.

## VI. Routing & Performance
* **Centralized Navigation:** All routing must be handled through Expo Router (or React Navigation) inside `app/` or `src/navigation/`. Do not define standalone navigator instances scattered inside feature folders.
* **Route Protection:** Secure routes must be protected logically in the navigation tree. Verify the Redux session state and user roles before rendering protected navigators (e.g., rendering `AppNavigator` vs `AuthNavigator`).
* **List Performance:** Always use `PaginatedList`, `VirtualizedList`, or `FlatList` for rendering data arrays. Never use `ScrollView` with `.map()` for large datasets.

## VII. Forms & Data Validation
* **Form Management:** Do not use heavy `useState` hooks for complex forms. Forms must be managed using `React Hook Form` to minimize re-renders.
* **Schema Validation:** All form inputs must be validated against a strict schema (e.g., `Yup` or `Zod`) before the data is passed to the custom feature hook. Use `<TextInput>`, `<PasswordInput>`, `<DropdownSelect>`, and `<Checkbox>` from `@/components/forms`.

## VIII. Authorization & UI Access Control (RBAC)
* **No Hardcoded Roles:** UI Components MUST NEVER check raw role strings (e.g., `if (role === 'Admin')`). Always use centralized permission constants and role-checking utilities.

## IX. Internationalization (i18n) & RTL
* **No Hardcoded Strings:** UI components MUST NEVER contain hardcoded English text. All user-facing strings must be routed through an i18n library (e.g., `react-i18next`).
* **Logical Spacing Classes:** Because the application must support Arabic (RTL), you MUST use NativeWind logical spacing classes (`me-`, `ms-`, `pe-`, `ps-`, `text-start`, `items-start`) instead of directional physical classes (`mr-`, `ml-`, `pr-`, `pl-`).

## X. Testing & Quality Assurance
* **Test the Engine, Not the Paint:** Focus unit testing (Jest) on Custom Hooks, Redux Reducers, and Utility functions. 
* **Component Testing:** Use React Native Testing Library to ensure components render correctly and that accessibility props (`accessibilityLabel`, `accessibilityRole`) are present.

## XI. Real-Time Communication (WebSockets)
* **No Component-Level Instantiation:** You MUST NEVER instantiate `socket.io-client` directly inside a React Native screen or component. 
* **Hook-Based Management:** WebSocket connections and event listeners MUST be encapsulated within a custom hook (e.g., `use[Feature]Socket.js`). 
* **State Synchronization:** The socket hook must act as a silent background listener. When it receives a payload, it MUST immediately `dispatch` a Redux action to update the global store. 
* **Lifecycle Cleanup:** Every socket hook MUST explicitly disconnect or remove listeners in a `useEffect` cleanup function to prevent memory leaks when the screen is unmounted.
