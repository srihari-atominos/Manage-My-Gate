---
trigger: always_on
---

# Frontend Workflow & Architecture Rules

## I. Architectural Boundaries & Encapsulation
* **Feature-Based Structure:** Group code by feature inside `src/features/` rather than by type (e.g., keep the API, Slice, and UI components for a feature together).
* **The "Scope of Use" Rule:** 
  * Feature-specific hooks, utilities, and generic components MUST live inside that feature's directory (e.g., `src/features/auth/hooks/`).
  * Only utilities or components shared across *multiple* features belong in the global `src/utils/` or `src/components/` directories.
* **The UI Request Flow:** `UI Component → Custom Hook / Redux Thunk → Feature API Service → Backend`.

## II. Layer Responsibilities
* **Components (The Canvas):**
  * Strictly for UI rendering and capturing user events.
  * All pages and components must be fully responsive (mobile, tablet, laptop, desktop).
  * MUST NOT contain heavy business logic or data transformations.
  * **MUST NEVER** call Axios or Fetch directly.
* **State & API Layer (The Engine):**
  * All API communication must route through isolated feature services.
  * Global state is managed exclusively via Redux Toolkit.

## III. Observability & Error Handling
* **API Interception:** The global API client must automatically inject the `X-Request-ID` header into every outgoing request and catch all 4xx/5xx responses for central logging.
* **Client Logging:** Use a custom logger utility to suppress `info` and `debug` console logs in `production`. Route `error` logs to a monitoring service.
* **Resilience:** Wrap all major feature modules in React Error Boundaries to prevent full application crashes and display clean fallback UIs.

## IV. Configuration
* **Environment Variables:** Base URLs, configuration flags, and third-party keys must be loaded dynamically via environment variables.