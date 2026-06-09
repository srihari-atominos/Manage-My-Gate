# Secure User Management & RBAC Administration - System Architecture

This document provides a comprehensive overview of the design patterns, boundary rules, folder structures, and technical implementations governing the **Secure User Management & RBAC Administration** application.

The project is structured as a monorepo containing a modern React client (frontend) and an Express/Mongoose server (backend). Both components adhere to strict isolation and validation boundaries.

---

## Table of Contents

- [System Request Flow Diagrams](#system-request-flow-diagrams)
- [Frontend Architectural Blueprint](#1-frontend-architectural-blueprint)
  - [Directory Structure](#frontend-directory-structure)
  - [The "Thin View" Pattern](#the-thin-view-pattern)
  - [Redux State Architecture](#redux-state-architecture)
  - [Routing & Security Gates](#routing--security-gates)
  - [Axios API Client Layer](#axios-api-client-layer)
  - [Forms & Schemas](#forms--schemas)
  - [Styling & RTL Adaptations](#styling--rtl-adaptations)
- [Backend Architectural Blueprint](#2-backend-architectural-blueprint)
  - [Directory Structure](#backend-directory-structure)
  - [Request Flow Layers](#request-flow-layers)
  - [Strict Isolation Rules](#strict-isolation-rules)
  - [Observability & Error Bubbling](#observability--error-bubbling)
- [Security & Environment Architecture](#3-security--environment-architecture)
  - [Environment Variables](#environment-variables)
  - [Immutable Roles & Self-Lockout Controls](#immutable-roles--self-lockout-controls)
- [Testing & Quality Assurance](#4-testing--quality-assurance)

---

## System Request Flow Diagrams

### Frontend Layer Flow (Zero Hardcoding & Thin Views)
```
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  UI Component   │ ───>  │  Custom Hook / Control │ ───>  │  Redux Toolkit Thunk │
│ (Visual Canvas) │       │    (useUserList.js)    │       │   (userSlice.js)     │
└─────────────────┘       └────────────────────────┘       └──────────┬───────────┘
                                                                      │
┌─────────────────┐       ┌────────────────────────┐                  │
│     Backend     │ <───  │    Global API Client   │ <────────────────┘
│   API Route     │       │     (apiClient.js)     │
└─────────────────┘       └────────────────────────┘
```

### Backend Request Flow (Strict Layer Isolation)
```
┌──────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  Express Router  │ ───>  │   Express Validator    │ ───>  │      Controller      │
│  (role.router)   │       │   (role.validateRules) │       │  (role.controller)   │
└──────────────────┘       └────────────────────────┘       └──────────┬───────────┘
                                                                       │
┌──────────────────┐       ┌────────────────────────┐                  │
│  Mongoose Model  │ <───  │       Repository       │ <────────────────┘
│ (role.model.js)  │       │   (role.repository)    │
└──────────────────┘       └────────────────────────┘
```

---

## 1. Frontend Architectural Blueprint

The frontend is built on **React 19 (Vite)**, **Redux Toolkit**, and the **CoreUI** component library. It is designed around modular, self-contained feature structures.

### Frontend Directory Structure
All client-side code lives in the `/frontend` folder. Feature folders reside in `src/features/` and isolate their respective slices, views, and sub-components.

```
frontend/
├── public/                      # Static assets
└── src/
    ├── assets/                  # Core branding logos & images
    ├── components/              # Shared/common components
    │   ├── common/              # Reusable generic UI components (DataTable, etc.)
    │   └── AppContent.jsx       # Routing viewport with lazy suspense
    ├── features/                # Domain-driven features (strictly isolated)
    │   ├── auth/                # Auth components, slice, and AuthGuard
    │   ├── userManagement/      # User listing, invitation, and roles assignment
    │   └── roleBuilder/         # Role creation, CRUD, and permission mappings
    ├── hooks/                   # Global custom React hooks
    ├── routes.js                # Route mappings pointing to lazy components
    ├── services/                # Global API clients and configurations
    │   └── apiClient.js         # Core Axios client instance
    ├── store/                   # Global Redux configuration
    │   └── store.js             # Root store definition
    ├── utils/                   # Shared utility wrappers (logger, etc.)
    ├── App.jsx                  # Root router config and theme synchronizer
    └── index.jsx                # Web application entry point
```

### The "Thin View" Pattern
UI components in this application are purely visual canvases. They do not handle async processes, fetch data, or access Redux hooks directly.
* **UI Components**: Restricted to rendering JSX, utilizing styling classes, and binding visual interaction events.
* **Custom Hooks (Controllers)**: All state selection (`useSelector`), dispatch operations (`useDispatch`), form bindings, and logic transformations are written in custom feature hooks (e.g., [useUserList.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/features/userManagement/hooks/useUserList.js)).
* **Scope of Use**: If a component, hook, or styles sub-folder is only used within a single feature module, it **MUST** reside inside that feature's directory (e.g., `src/features/userManagement/hooks/`). Global promotion to `src/components/common/` or `src/hooks/` is reserved strictly for utilities shared by two or more feature modules.

### Redux State Architecture
Global state is managed via **Redux Toolkit**. 
* Every feature maintains its own slice (e.g., [userSlice.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/features/userManagement/userSlice.js)).
* Slices contain default state declarations, reducers, and async thunks.
* All slices are registered in the global store inside [store.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/store/store.js).
* In development mode, a custom `stateLoggerMiddleware` tracks actions and state changes directly to the console.

### Routing & Security Gates
Client-side routing uses React Router DOM HashRouter:
* **Lazy Loading**: Top-level routes are loaded dynamically using `React.lazy()` and encapsulated inside a `<Suspense>` boundary in [AppContent.jsx](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/components/AppContent.jsx).
* **Protected Routes**: Secure views (like `/users` or `/role-builder`) are wrapped in an [AuthGuard.jsx](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/features/auth/components/AuthGuard.jsx) component that evaluates session variables in the authentication slice.

### Axios API Client Layer
API requests flow through the centralized instance in [apiClient.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/services/apiClient.js) (with environment-aware logging inside [utils/apiClient.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/frontend/src/utils/apiClient.js)):
* **Request Interceptor**: Automatically attaches the authorization bearer token from `localStorage` and generates a unique UUID `X-Request-ID` correlation header.
* **Response Interceptor**: Automatically unwraps response data envelopes. It intercepts `401 Unauthorized` responses, dispatches a global `logout()` action, and routes the browser back to `#/login`.

### Forms & Schemas
Form state is managed using **React Hook Form** to optimize rendering performance.
* **Schema Validation**: Form values are validated against structural rules defined via **Yup** or **Zod** schema modules before submission.

### Styling & RTL Adaptations
Layout rules leverage CoreUI's utility variables and Bootstrap 5:
* **No Inline Styles**: Avoid placing inline style blocks directly into React components. Use theme utility classes.
* **Arabic RTL Compliance**: To support right-to-left layout orientations (e.g., Arabic language modes), physical spacing classes (such as `ml-*` or `pr-*`) are prohibited. Codebases **MUST** utilize logical utility classes (e.g., `ms-*` for margin-start, `pe-*` for padding-end).

---

## 2. Backend Architectural Blueprint

The backend is constructed using **Node.js**, **Express**, and **Mongoose**. It enforces modularity to achieve decoupling.

### Backend Directory Structure
```
backend/
├── src/
│   ├── config/                  # Server environments and connection configs
│   ├── middlewares/             # Global filter, logging, and auth middlewares
│   ├── routes/
│   │   └── api.routes.js        # Master Router matching URL namespaces
│   ├── utils/                   # Loggers and token generation helpers
│   └── features/                # Self-contained feature components
│       ├── auth/                # Login routes, controllers, services
│       ├── user/                # User CRUD and database persistence logic
│       └── role/                # Role schema definitions, controllers, validation
├── server.js                    # Initialization of connections and passport config
└── index.js                     # Express app setup and middleware registration
```

### Request Flow Layers
Data requests strictly follow a unidirectional pipeline:
1. **Router**: Intercepts HTTP endpoints and maps paths to specific controllers. Integrates auth checks (`isAuthenticated`), role verification (`authorizePermission`), and validation rules.
2. **Validator Rules**: Enforces input structure using `express-validator` at the router gate before controller entry (e.g., [role.router.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/backend/src/features/role/role.router.js#L40)).
3. **Controller**: Sanitizes parameters and extracts request details.
4. **Service**: Contains all business processes, validation, and workflow orchestration.
5. **Repository**: Interacts directly with Mongoose models to execute queries.

### Strict Isolation Rules
* **One Model, One Feature**: Each database collection/model must reside in its own features subdirectory (e.g., `/features/role/`). Packaged items remain private to that feature.
* **Controller Sandbox**: Controllers **MUST NOT** execute business logic, call databases, access repositories, or import services belonging to other features.
* **Service Boundaries**: Services manage feature business flows. A service may import repositories belonging to its *own* feature module or call services from *other* feature modules. A service **MUST NEVER** import a repository belonging to another feature.
* **Repository Privacy**: Repositories are strictly private utility layers. They are **NEVER** imported by external controllers or foreign services.

### Observability & Error Bubbling
* **Correlation Tracking**: The Express server attaches a unique correlation ID (`X-Request-ID`) to each inbound request. This ID is passed to the service layers and database logging streams to facilitate request tracing.
* **Structured Logging**: Console outputs are environment-aware. Raw JSON logs are streamed in production, while human-readable formatted logs are generated in development.
* **Error Propagation**: Controllers and services do not catch and swallow errors. Errors bubble up to [errorHandler.middleware.js](file:///d:/Personal%20Project/propmt%20testing%20Project%201/backend/src/middlewares/errorHandler.middleware.js), which logs the failure trace alongside its correlation ID and returns a unified JSON payload:
  ```json
  {
    "success": false,
    "message": "Sanitized error message description",
    "details": "Validation details or debug parameters (hidden in production)"
  }
  ```

---

## 3. Security & Environment Architecture

### Environment Variables
To prevent leakage and maintain loose coupling:
* **Zero Root `.env` Files**: The monorepo root directory must remain free of `.env` files.
* **Backend Isolation**: Sensitive server-side keys (database strings, password salts, JWT signing secrets) are strictly isolated inside `backend/.env`.
* **Frontend Isolation**: Client-facing values (such as API URLs) reside inside `frontend/.env` and are accessed in code using Vite's configuration scheme (`import.meta.env.VITE_`).

### Immutable Roles & Self-Lockout Controls
* **Preventing Self-Lockout**: Admins cannot modify or delete their own accounts. The user management grid enforces this by disabling the "Manage Roles" and "Delete" actions for the currently authenticated administrator.
* **Immutability of System Roles**: Essential roles (such as `Super Admin`) are protected from edits or deletion:
  * **Frontend**: Grid buttons for system roles are disabled, displaying the notice: `"System roles cannot be modified."`.
  * **Backend**: An explicit controller-level block validates resource properties and denies updates, returning a `403 Forbidden` response to prevent API tampering.

---

## 4. Testing & Quality Assurance

* **Engine Focus**: Unit testing focuses on functional components rather than styling layouts. Target custom hooks, Redux toolkit reducers, and helper/validator utilities.
* **Component Testing**: Uses React Testing Library to verify that UI components trigger callbacks and render elements matching layout structures. Avoid testing implementation details; focus on verified user interactions.
