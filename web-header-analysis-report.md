# Web Frontend Main Top Navigation Header (`AppHeader.jsx`) Detailed Technical Breakdown

This document provides a technical audit and breakdown of the main top navigation component in the Manage-My-Gate web frontend (`frontend/src/components/AppHeader.jsx`).

---

## 1. Overview & Component Architecture

The main top navigation bar is implemented in **[`AppHeader.jsx`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/components/AppHeader.jsx)** and composes three child header components:

```
AppHeader.jsx
 ├── CHeaderToggler (Sidebar collapse/expand)
 ├── WorkspaceSwitcher.jsx (Organization / Community switcher)
 ├── NotificationBell.jsx (Notification count & popover drawer)
 ├── ThemeSwitcher Dropdown (Light / Dark / Auto mode toggle)
 └── AppHeaderDropdown.jsx (User Profile avatar, Role switcher, Org switcher, Logout)
```

---

## 2. Redux Slices & Custom Hooks Consumed

### Custom Controller Hooks
* **`useAuth()`** ([`src/features/auth/hooks/useAuth.js`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/features/auth/hooks/useAuth.js)): Accesses current user profile data (`currentUser`), authentication status (`isAuthenticated`), and dispatches `performLogout()`.
* **`useWorkspace()`** ([`src/features/workspace/hooks/useWorkspace.js`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/features/workspace/hooks/useWorkspace.js)): Accesses active organization ID, active role, platform flag, and organization name.
* **`useWorkspaceSwitcher()`** ([`src/features/workspace/hooks/useWorkspaceSwitcher.js`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/features/workspace/hooks/useWorkspaceSwitcher.js)): Controller hook for workspace switching; selects available organizations and dispatches `switchWorkspaceContext(targetOrgId)`.
* **`useNotifications()`** ([`src/features/notification/hooks/useNotifications.js`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/features/notification/hooks/useNotifications.js)): Accesses unread notification count (`unreadCount`), notification items, and dispatches `getNotifications()`.
* **`useNotificationSocket(userId)`** ([`src/features/notification/hooks/useNotificationSocket.js`](file:///d:/Atominos%20Consulting/web%20app/Manage-My-Gate/frontend/src/features/notification/hooks/useNotificationSocket.js)): Socket.io listener hook listening for `INCOMING_NOTIFICATION` events on room `user:${userId}` to dispatch `addRealTimeNotification`.
* **`useColorModes()`** (CoreUI Hook): Manages light/dark/auto UI themes.
* **`useMediaQuery('(max-width: 767px)')`**: Determines viewport size to render desktop notification popover vs mobile route navigation.

---

## 3. Internationalization (i18n) Implementation

* **Library:** `react-i18next` via the `useTranslation()` hook.
* **Header Translation Keys Consumed:**
  * `t('header.dropdown.profile', { defaultValue: 'Profile' })`
  * `t('header.dropdown.switchRole', { defaultValue: 'Switch Role' })`
  * `t('header.dropdown.switchOrg', { defaultValue: 'Switch Organization' })`
  * `t('header.dropdown.globalPlatform', { defaultValue: 'Global Platform' })`
  * `t('header.dropdown.noActiveWorkspace', { defaultValue: 'No active workspace' })`
  * `t('header.dropdown.logout', { defaultValue: 'Logout' })`
  * `t('workspace.defaultName', { defaultValue: 'Select Workspace' })`
  * `t('workspace.platformBadge', { defaultValue: 'Platform' })`
  * `t('notification.bellTitle')`
  * Relative timestamp formatting using `i18n.language`.

---

## 4. Organization/Community Display & Context-Switch Dropdown Structure

### Displaying Active Community / Organization
* **Top Navigation Bar:** Displayed via `<WorkspaceSwitcher />` with a building icon (`cilBuilding`) and the active organization's name (`state.workspace.organizationName`).
* **User Profile Menu:** Also displayed inside `<AppHeaderDropdown />` under the **"Switch Organization"** header section.

### Context-Switch Dropdown Structure
1. **`<WorkspaceSwitcher />` Dropdown:**
   * Hidden automatically if user belongs to ≤ 1 organization.
   * Maps `state.workspace.availableWorkspaces`.
   * Displays organization `name`, user's `roleName`, and a `"Platform"` badge for platform orgs (`ws.isPlatform`).
   * Clicking an item dispatches `switchWorkspaceContext(targetOrgId)` thunk (from `authSlice.js`), navigates to `#/dashboard`, and reloads the page to re-scope API queries.
2. **`<AppHeaderDropdown />` Context Options:**
   * **Switch Role Section:** Maps assigned user roles (`currentUser.roles`), highlights active role with a checkmark SVG icon, and dispatches `switchWorkspaceContext({ targetOrgId, targetRole })`.
   * **Switch Organization Section:** Alternative organization list mapping `availableWorkspaces`.

---

## 5. Action Icons Present in Web Header

1. ☰ **Sidebar Toggler Icon (`cilMenu`):** Collapses / expands sidebar layout.
2. 🏢 **Workspace Icon (`cilBuilding`):** Triggers `<WorkspaceSwitcher />` dropdown.
3. 🔔 **Notification Bell Icon (`cilBell`):** Interactive bell with a dynamic `<span className="unread-badge">` showing unread count (`99+`). Opens notification popover or redirects on mobile.
4. ☀️/🌙/🌓 **Theme Switcher Toggle Icon (`cilSun` / `cilMoon` / `cilContrast`):** Swatches between Light, Dark, and System Auto themes.
5. 👤 **User Avatar / Initial Badge:** Displays backend profile avatar or user initial (`avatarLetter`), opening the `<AppHeaderDropdown />` menu (Profile modal, Role Switcher, Org Switcher, Logout).

---

## 6. Exact Redux State Variables Accessed

```js
// UI State
state.ui.sidebarShow

// Auth State (state.auth)
state.auth.user                      // currentUser (username, avatar, role, roles, permissions)
state.auth.isAuthenticated           // Boolean auth status
state.auth.token                     // JWT Access Token
state.auth.loading                   // Auth operation loading state
state.auth.error                     // Auth error string
state.auth.successMsg                // Auth success message
state.auth.otpSent                   // OTP state flag

// Workspace / Tenant State (state.workspace)
state.workspace.activeOrganizationId // Currently active Tenant/Org MongoDB ID
state.workspace.activeRole           // Active role context name
state.workspace.organizationName     // Currently active organization name
state.workspace.isPlatform           // Boolean indicating if active context is global platform
state.workspace.allowedFeatures      // Array of feature permissions for active context
state.workspace.availableWorkspaces  // Array of org objects [{ orgId, name, roleName, isPlatform }]
state.workspace.loading              // Workspace loading state
state.workspace.error                // Workspace error state

// Notification State (state.notifications)
state.notifications.items            // Array of notification items
state.notifications.unreadCount       // Counter of unread notifications
state.notifications.status           // Notification fetch status
state.notifications.pagination       // Pagination object { currentPage, totalPages }
state.notifications.error            // Notification error state
```
