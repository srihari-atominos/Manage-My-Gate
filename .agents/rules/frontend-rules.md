---
trigger: always_on
---

# Frontend Workflow & Architecture Rules

## I. Architectural Boundaries & Encapsulation
* **Feature-Based Structure:** Group code by feature inside `src/features/` rather than by type (e.g., keep the API, Slice, and UI components for a feature together).
* **The "Scope of Use" Rule:**
  * Feature-specific hooks, utilities, and generic components MUST live inside that feature's directory.
  * Only utilities or components shared across *multiple* features belong in the global `src/utils/` or `src/components/` directories.
* **The UI Request Flow:** `UI Component → Custom Hook → Redux Thunk/Action → Feature API Service → Backend`.

## II. Layer Responsibilities
* **Components (The Canvas):** Strictly for UI rendering and capturing user events. **MUST NEVER** call Axios or Fetch directly.
* **Redux Feature Slices (The Engine):** * **Individual State:** EVERY feature MUST possess its own isolated Redux Toolkit slice (e.g., `src/features/userManagement/userSlice.js`). Feature data, default states, and mock data reside exclusively here.
  * **Global Registration:** Every feature slice MUST be explicitly registered in the global Redux store (e.g., `src/store/store.js`) under a dedicated key matching the feature name.

## III. Observability & Error Handling
* **API Interception:** The global API client must automatically inject the `X-Request-ID` header into every outgoing request and catch all 4xx/5xx responses for central logging.
* **Client Logging:** Use a custom logger utility to suppress `info` and `debug` logs in `production`.
* **Resilience:** Wrap all major feature modules in React Error Boundaries.

## IV. Component Architecture (Strict Modularity)
* **One Component Per File:** You must NEVER define multiple React components within a single file. Sub-components, Modals, and Toolbars must be abstracted into their own files.
* **Directory Structure:** Feature-specific UI components belong in `src/features/[featureName]/components/`. Generic components belong in `src/components/common/`.
* **No Inline Styles:** Avoid dumping large `<style>` blocks or heavy inline `style={{}}` objects into components. Use standard utility classes.

## V. State & Logic Architecture (The "Thin View" Pattern)
* **Redux First for Data:** Do not use `useState` for data arrays or persistent filters. All feature-level data MUST live in the Redux store.
* **Custom Hooks as Controllers:** UI Components must remain purely visual. All interaction logic, `useDispatch` calls, and `useSelector` mapping MUST be extracted into a custom hook (e.g., `useUserFeature.js`). This hook acts as the sole bridge between the UI and Redux.
* **Data Utilities:** Complex data transformations or heavy formatting must be offloaded to isolated utility files in the feature's `/utils` directory.

## VI. Routing & Performance
* **Code Splitting:** All top-level feature routes MUST be dynamically imported using `React.lazy()` and wrapped in a `<Suspense>` boundary with a generic loading skeleton.
* **Route Protection:** Secure routes must be wrapped in an `<AuthGuard>` component that verifies the Redux session state before rendering the lazy-loaded feature.

## VII. Forms & Data Validation
* **Form Management:** Do not use heavy `useState` hooks for complex forms. Forms must be managed using `React Hook Form` to minimize re-renders.
* **Schema Validation:** All form inputs must be validated against a strict schema (e.g., `Yup` or `Zod`) before the data is passed to the custom feature hook. 

## VIII. Authorization & UI Access Control (RBAC)
* **No Hardcoded Roles:** UI Components MUST NEVER check raw role strings (e.g., `if (role === 'Admin')`).

## IX. Internationalization (i18n) & RTL
* **No Hardcoded Strings:** UI components MUST NEVER contain hardcoded English text. All user-facing strings must be routed through an i18n library (e.g., `react-i18next`).
* **Logical CSS Properties:** Because the application must support Arabic (RTL), you MUST use logical utility classes (e.g., `ms-3` for margin-start, `pe-2` for padding-end) instead of directional physical classes (`ml-3`, `pr-2`).

## X. Testing & Quality Assurance
* **Test the Engine, Not the Paint:** Focus unit testing (Jest/Vitest) on the Custom Hooks, Redux Reducers, and Utility functions. 
* **Component Testing:** Use React Testing Library to ensure components render correctly and that accessibility (ARIA) attributes are present. Do not test implementation details (like whether a specific `div` is present), test user behaviors (like whether the "Invite" button fires the click handler).