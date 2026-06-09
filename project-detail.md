# Project Detail: Secure User Management & RBAC Administration

This handoff document details the architecture, design choices, folder structure, completed integrations, and current project status for our secure User Management and Role-Based Access Control (RBAC) application.

---

## 1. Project Overview & Purpose

The purpose of this project is to build a secure, enterprise-grade User Management and Role Builder administration portal. 
* **Backend:** Built using Node.js, Express, and Mongoose (MongoDB). It enforces rigid boundaries, validation rules, error handling, correlation ID tracking (`X-Request-ID`), and standard success envelopes (`{ success, message, data }`).
* **Frontend:** Built using React.js (Vite), Redux Toolkit, and CoreUI. It features dynamic routing protection (`AuthGuard`), code splitting/lazy loading, custom controller hooks ("Thin View" pattern), and strict RBAC controls.

---

## 2. Architecture & Design

### Backend Layer flow (Strict Isolation)
`Public Route → Validator (Express-Validator) → Controller → Service → Repository → Mongoose Model`
* **Boundary Boundaries:** Controllers do not contain business logic. Services never access repositories of other feature modules directly; cross-module communication is done exclusively via services.
* **Global Error Handler:** Unifies error formats, strips stacks in production, and ensures consistent error logs with correlation IDs.

### Frontend Layer Flow (Zero Hardcoding & Thin Views)
`UI Component → Custom Hook (Controller) → Redux Toolkit Action/Thunk → Global API Client (Axios) → Backend`
* **API Client Unwrapping:** Global Axios client intercepts responses and resolves `response.data` (the envelope), automatically passing down error logs and attaching authentication bearer tokens.
* **Component Modularity:** One React component per file. Large style sheets or inline styles are avoided; all layouts leverage standard Bootstrap/CoreUI utility classes.

---

## 3. Folder Structure Map

```
├─ backend/
│  ├─ server.js                        # App startup, DB connection, permission syncing
│  ├─ index.js                         # Express setup, global middlewares, routes mounting
│  ├─ src/
│  │  ├─ config/                       # Host, port, session, DB, and environment configuration
│  │  ├─ middlewares/                  # Correlation ID, logger, responseHandler, and error middlewares
│  │  ├─ routes/
│  │  │  └─ api.routes.js              # Master API router mounting feature routes
│  │  ├─ utils/                        # JWT helpers, bcrypt, winston logger, permission syncing
│  │  └─ features/                     # Fully encapsulated feature modules
│  │     ├─ auth/                      # Login, registration, token generation, passport.js
│  │     ├─ user/                      # User management, invitations, role updates
│  │     ├─ role/                      # Role creation, metadata updates, and permission mappings
│  │     └─ rolePermission/            # Relationship mapping collection for roles and permissions
│  └─ .env                             # Backend private environment configuration
│
├─ frontend/
│  ├─ index.html                       # HTML entry point
│  ├─ vite.config.mjs                  # Vite compiler configurations
│  ├─ .env                             # Frontend public environment configuration
│  ├─ src/
│  │  ├─ store/
│  │  │  └─ store.js                   # Redux store registration for auth, user, and role features
│  │  ├─ services/
│  │  │  └─ apiClient.js               # Global Axios client matching backend envelope structure
│  │  ├─ routes.js                     # Lazy routing maps for AuthGuard wrapping
│  │  ├─ components/
│  │  │  ├─ AppContent.jsx             # Router outlet with Suspense lazy routes and AuthGuard
│  │  │  └─ common/                     # Reusable grid components (DataTable, ActionIconButton)
│  │  ├─ features/
│  │  │  ├─ auth/                      # authSlice, login/register UI, AuthGuard
│  │  │  ├─ userManagement/            # userSlice, useUserList hook, UserList view, modals
│  │  │  └─ roleBuilder/               # roleSlice, useRoles hook, RoleBuilderList, modals
│  │  └─ utils/
│  │     └─ apiClient.js               # Legacy/util Axios client (unified configuration)
```

---

## 4. Completed Features

### Core Authentication & Route Protection
* **Global API Client Integrations:** Request interceptors inject `Authorization: Bearer <token>` and `X-Request-ID` correlation headers. Auto-logout redirects to `/login` on `401 Unauthorized` responses.
* **AuthGuard Routing:** Lazy loads the administration grids only if authenticated.
* **API Envelope Unwrapping:** Aligned the thunks across `authSlice`, `userSlice`, and `roleSlice` to read data from nested `action.payload.data` envelopes.

### User Management Panel
* **CRUD Endpoints:** Full API routes (`GET /api/users`, `POST /api/users/invite`, `DELETE /api/users/:id`, `PUT /api/users/:id/roles`) are integrated.
* **Prevent Self-Lockout (Self-Modification):** Disables both the "Delete" and "Manage Roles" buttons on the logged-in user's own row in the grid, displaying the warning tooltip `"You cannot modify your own account."`.
* **Zero-Trust Onboarding Flow:** 
  * Inviting a user defaults their role to empty (no default role privileges assigned).
  * The frontend displays a light graybordered `"Unassigned"` status badge for users without assigned roles.
  * Defaults invited users' status to `"Pending"` (rendered with a yellow warning badge).
  * Allows admins to update the roles of `"Pending"` users to assign permissions before onboarding completes.

### Role Builder & Granular Mapping
* **CRUD & Relationship Syncing:** Exposes `PUT /api/roles/:id` and `DELETE /api/roles/:id`.
* **Super Admin Role Immutability:** Protects the system `'Super Admin'` role from changes.
  * **Frontend:** Disables Edit and Delete buttons on the row, displaying the tooltip `"System roles cannot be modified."`.
  * **Backend:** Adds a strict controller guard checking database names before updates/deletion. Throws a `403 Forbidden` response if anyone attempts to bypass the UI.

---

## 5. Current State & Next Steps

### Current State
* Both the backend and frontend are compile-safe and build successfully.
* The backend automatically boots, connects to MongoDB, syncs permissions, bootstraps the Super Admin account, and listens on port `5000`.
* The frontend successfully queries all active REST endpoints.

### Next Steps & Backlog
1. **Dynamic Form Permissions:**
   * In `RoleFormModal.jsx`, permissions are currently rendered using the hardcoded `AVAILABLE_PERMISSIONS` categories.
   * *Next Step:* Integrate a thunk/fetch to populate permissions dynamically from the backend `GET /api/roles/permissions` API endpoint.
2. **Backend Paginated Database Queries:**
   * The current grid lists retrieve all users/roles at once and perform page splits in memory (using `useUserList`).
   * *Next Step:* Implement database-level `skip` and `limit` queries in `user.repository.js` and pass page counts to the backend controller.
3. **Email Notification Service integration:**
   * Invited users receive a status of `"Pending"`.
   * *Next Step:* Hook up a real Nodemailer or SMTP connection in `user.services.js` inside `inviteUser()` to email the temporary login password and link to the user.
