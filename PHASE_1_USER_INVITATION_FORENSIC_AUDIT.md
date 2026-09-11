# PHASE 1 — FORENSIC AUDIT & CURRENT FLOW MAPPING

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Architecture:** Multi-Tenant Gated-Community SaaS  
**Subsystems Audited:** `backend/`, `frontend/`, `mobile/mobile-app/`  
**Audit Scope:** Forensic Inspection & Trace Only — No Production Code Modified  

---

## A. Executive Summary

This forensic audit evaluates the existing User Management, Invitation, Authentication, Organization Membership, and Multi-Tenant systems across the backend, web frontend, and mobile application.

### Key Audit Conclusions:
1. **Core Philosophy is Implemented:** The system fundamentally follows the target architecture:
   $$\text{One Person} \rightarrow \text{One Global User} \rightarrow \text{Many Organizations} \rightarrow \text{One OrgMembership per Org}$$
   When an existing user is invited to a new organization, the backend [`userService.inviteUser`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L250) reuses the existing global [`User`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.model.js) record and stages a localized [`OrgMembership`](file:///d:/atominos/GatedCommunity/backend/src/features/orgMembership/orgMembership.model.js) with `status: 'Pending'`. It does **not** create a duplicate user.
2. **Deferred Villa Occupancy is Already Enforced:** Inviting a user does **not** occupy a villa. The unit assignment is staged in [`OrgMembership.units`](file:///d:/atominos/GatedCommunity/backend/src/features/orgMembership/orgMembership.model.js#L41-L53). Physical occupancy and resident assignment ([`villaService.assignResidentToVilla`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L754-L770)) occur exclusively inside a database transaction upon explicit acceptance.
3. **Formal State Machine Exists:** Invitation tokens are tracked via the [`Token`](file:///d:/atominos/GatedCommunity/backend/src/features/token/token.model.js) entity supporting explicit states: `PENDING`, `ACCEPTED`, `REJECTED`, `REVOKED`, `EXPIRED`, and `EXCHANGED`.
4. **Universal Link Routing is Active:** Both Web ([`InviteHandler.jsx`](file:///d:/atominos/GatedCommunity/frontend/src/views/pages/invite/InviteHandler.jsx)) and Mobile ([`accept-invite.tsx`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app/(auth)/accept-invite.tsx)) consume canonical `/invite/:token` links with device detection and automated intent handling (Sign Up vs. Sign In vs. Direct Accept vs. Reject).
5. **Phase 2 Target Gaps Identified:**
   - In [`acceptInvitationWithSSO`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L1751), `getScopedTokenPayload(activatedUser)` is invoked **without** passing `orgId`, leading to non-deterministic initial workspace selection for multi-org SSO users.
   - On Mobile ([`accept-invite.tsx:286`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app/(auth)/accept-invite.tsx#L286)), completing password setup redirects to the login screen rather than seamlessly adopting the session and auto-navigating to the resident dashboard (as Web does).
   - In [`app.json`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app.json#L51-L76), Android Intent Filters register path prefixes `/invite/handoff` and `/invite/app`, but omit the canonical `/invite/:token` universal link directly on the production web host domain.
   - The root [`User`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.model.js) schema retains legacy single-tenant fields (`villaId`, `residencyType`, `roles`) which are kept in sync with the primary membership as fallbacks, rather than being strictly derived from the active `OrgMembership`.

---

## B. Backend Architecture

### 1. File & Component Inventory

| Layer | File Path | Primary Responsibilities |
| :--- | :--- | :--- |
| **Router** | [`backend/src/features/user/user.router.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.router.js) | Public deletion request; protected user list, single invite, bulk invite, invitations list, resend, revoke, roles update, profile update, email OTP, delete user. |
| **Controller** | [`backend/src/features/user/user.controller.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.controller.js) | Validates HTTP inputs, delegates to `user.services.js`, formats client responses, masks internal database schemas. |
| **Service** | [`backend/src/features/user/user.services.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js) | Core business logic: `inviteUser`, `bulkInviteUsers`, `deleteUserFromOrg`, `updateUserRoles`, `resendInvitation`, `revokeInvitation`, `deleteOwnAccount`, `requestAccountDeletion`. |
| **Repository** | [`backend/src/features/user/user.repository.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.repository.js) | Mongoose database interactions: `findByEmail`, `findByPhone`, `findByUsername`, `findAllPaginated` (via `$facet`), `anonymize`. |
| **Model** | [`backend/src/features/user/user.model.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.model.js) | Mongoose schema for global identity. Unique indexes on `email`, `username`, and sparse `phone`. |
| **Event Bus** | [`backend/src/features/user/user.events.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.events.js) | Node `EventEmitter` instance (`userEvents`) decoupling business logic from transports. |
| **Listeners** | [`backend/src/features/user/user.listeners.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js) | Handles `USER_INVITED`, `USER_ADDED`, `EMAIL_OTP_SENT`. Dispatches branded HTML emails via `messageTemplateService` + SMTP/Resend, and sends in-app notifications. |
| **Socket** | [`backend/src/features/user/user.socket.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.socket.js) | Emits room-isolated Socket.io events (`org:${orgId}`) for `RECORD_UPDATED` and `USER_UPDATED`. |
| **Cron** | [`backend/src/features/user/user.cron.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.cron.js) | Midnight cron job purging stale `Pending Verification` users older than 30 days. |
| **Membership Model** | [`backend/src/features/orgMembership/orgMembership.model.js`](file:///d:/atominos/GatedCommunity/backend/src/features/orgMembership/orgMembership.model.js) | Scoped membership linking `userId` and `orgId` with `roleIds`, `units`, and `status`. |
| **Token Model** | [`backend/src/features/token/token.model.js`](file:///d:/atominos/GatedCommunity/backend/src/features/token/token.model.js) | Stores hashed cryptographic invitation, reset, and mobile handoff tokens with status and TTL. |
| **Auth Service** | [`backend/src/features/auth/auth.services.js`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js) | Handles `validateInvite`, `acceptInvitation`, `rejectInvitation`, `acceptInvitationWithSSO`, `switchContext`, `getScopedTokenPayload`, `createInviteHandoff`, `exchangeInviteHandoff`. |

### 2. Middleware Stack
Requests hitting the User API traverse:
1. `isAuthenticated` ([`auth.middleware.js`](file:///d:/atominos/GatedCommunity/backend/src/middlewares/auth.middleware.js)): Verifies JWT bearer access token, extracts `req.user`.
2. `tenantContext` ([`tenant.middleware.js`](file:///d:/atominos/GatedCommunity/backend/src/middlewares/tenant.middleware.js)): Reads `x-organization-id` header or fallback `req.user.orgId`. If the requested org differs from the active token org, verifies active `OrgMembership` before attaching `req.tenant`.
3. `authorizePermission(resource, action)` ([`rbac.middleware.js`](file:///d:/atominos/GatedCommunity/backend/src/middlewares/rbac.middleware.js)): Verifies that `req.user.permissions` contains the required permission (e.g. `users:create`, `users:read`, `users:delete`).
4. `validate(rules)` ([`validator.middleware.js`](file:///d:/atominos/GatedCommunity/backend/src/middlewares/validator.middleware.js)): Express-validator sanitizer and schema validator.

---

## C. Invitation Lifecycle & State Machine

### 1. State Transitions in Code
```
              [ Admin Creates Invite ]
                         │
                         ▼
                     ┌─────────┐
                     │ PENDING │
                     └────┬────┘
         ┌────────────────┼────────────────┬────────────────┐
         │                │                │                │
(User Accepts)    (User Rejects)    (Admin Revokes)   (24h TTL Passes)
         ▼                ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ ACCEPTED │     │ REJECTED │     │ REVOKED  │     │ EXPIRED  │
   └──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                           │
                                                (Admin Resends)
                                                           │
                                                           ▼
                                                    [ New PENDING ]
```

### 2. Evidence-Based Verification
- **Creation (`user.services.js:429` & `token.services.js:47`):**
  - Stored with `status: 'PENDING'`, `used: false`, `expiresAt: Date.now() + 24h`.
  - Stored as SHA-256 hash (`token.services.js:37`), raw token returned to caller.
- **Validation (`auth.services.js:1781-1803` & `token.services.js:160-207`):**
  - Throws typed `HttpError(400)` if `status === 'EXPIRED'` or current time > `expiresAt`.
  - Throws typed `HttpError(400)` if `status === 'REVOKED'`: *"Invitation has been revoked by the administrator."*
  - Throws typed `HttpError(400)` if `status === 'REJECTED'`: *"Invitation has already been rejected."*
  - Throws typed `HttpError(400)` if `status === 'ACCEPTED'` or `used === true`: *"Invitation has already been accepted."*
- **Acceptance (`auth.services.js:725` & `token.services.js:214-235`):**
  - Atomically updates token document to `{ status: 'ACCEPTED', used: true, usedAt: new Date() }`.
- **Rejection (`auth.services.js:829` & `token.services.js:238-260`):**
  - Atomically updates token document to `{ status: 'REJECTED', used: true, usedAt: new Date() }`.
  - Updates `OrgMembership.status` to `'Rejected'`.
- **Revocation (`user.services.js:805` & `token.services.js:275-349`):**
  - Verifies admin belongs to the same organization (`tokenDoc.orgId === orgId`).
  - Guards against terminal states (cannot revoke `ACCEPTED`, `REJECTED`, `EXPIRED`, or already `REVOKED`).
  - Updates token to `{ status: 'REVOKED', used: true, usedAt: new Date() }`.
  - Updates `OrgMembership.status` to `'Rejected'` and unlinks villa.
- **Resend (`user.services.js:869-1015`):**
  - Atomic invalidation of old token: naturally expired becomes `EXPIRED`; pending becomes `REVOKED` via `tokenService.findAndInvalidateForResend`.
  - Generates a fresh 24-hour cryptographic token and re-triggers delivery.

---

## D. User + Membership Architecture

### 1. Global User Identity
- **File:** [`backend/src/features/user/user.model.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.model.js)
- **Identity Fields:**
  - `email`: `String`, unique, lowercase, trimmed.
  - `username`: `String`, unique, trimmed.
  - `phone`: `String`, unique, sparse index (allows null/empty while preventing duplicates across accounts).
  - `password`: Required **only** when `status === 'Active'`.
  - `status`: Enum: `['Pending Verification', 'Active', 'Suspended', 'Blocked', 'Deleted']`.

### 2. Organization Membership Entity
- **File:** [`backend/src/features/orgMembership/orgMembership.model.js`](file:///d:/atominos/GatedCommunity/backend/src/features/orgMembership/orgMembership.model.js)
- **Fields:**
  - `userId`: Ref `User` (required).
  - `orgId`: Ref `Organization` (required).
  - `roleIds`: Array of Ref `Role`.
  - `units`: Array of `{ villaId: Ref 'Villa', residentType: String }`.
  - `status`: Enum: `['Pending', 'Active', 'Rejected']`, default: `'Pending'`.
- **Compound Index:**
  ```javascript
  orgMembershipSchema.index({ userId: 1, orgId: 1, villaId: 1 }, { unique: true });
  ```

### 3. Multi-Organization Support Audit
- **Scenario:** User exists in Org A and is invited to Org B.
- **Evidence (`user.services.js:255-278`):**
  ```javascript
  const trimmedEmail = email.trim().toLowerCase();
  const existing = await userRepository.findByEmail(trimmedEmail, session);
  ...
  let user = existing;
  if (!existing) {
    // create new User with status 'Pending Verification'
  } else {
    // REUSE existing user! Only update phone/name if missing
  }
  ```
- **Finding:** The system **correctly reuses** the existing global `User` document.
- **Duplicate Protection (`user.services.js:264-266`):**
  ```javascript
  if (existingMembership && existingMembership.status === 'Active') {
    throw new HttpError(409, `User with email '${trimmedEmail}' is already an active member of this community.`);
  }
  ```
  If the user is already active in the target organization, a `409 Conflict` is thrown.
- **Legacy Fallback Debt:** The `User` model continues to carry `villaId`, `residencyType`, and `roles`. In [`user.services.js:417`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L417) and [`deleteUserFromOrg`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L226), these root fields are synchronized to whichever organization was touched last. While runtime JWT authorization relies on `OrgMembership`, these root fields represent architectural debt.

---

## E. Web Flow Audit

### 1. Route & Component Architecture
- **Canonical Route:** `/invite/:token` $\rightarrow$ [`frontend/src/views/pages/invite/InviteHandler.jsx`](file:///d:/atominos/GatedCommunity/frontend/src/views/pages/invite/InviteHandler.jsx)
- **Legacy Backward Compatibility:**
  - `/accept-invite/:token` $\rightarrow$ [`AcceptInvitePage.jsx`](file:///d:/atominos/GatedCommunity/frontend/src/views/pages/acceptInvite/AcceptInvitePage.jsx): Redirects to `/invite/:token`.
  - `/invite/web/:token` $\rightarrow$ [`WebInviteHandler.jsx`](file:///d:/atominos/GatedCommunity/frontend/src/views/pages/invite/WebInviteHandler.jsx): Mounts `InviteHandlerContent`.

### 2. End-to-End Web Sequence
1. User navigates to `/invite/:token` (or `/invite/:token?action=reject`).
2. On mount, `InviteHandlerContent` evaluates params:
   - If `action === 'reject'`: Calls `handleRejectInvitation({ token, email })`.
   - Otherwise: Calls `GET /api/v1/auth/validate-invite?token=:token`.
3. Backend returns validation metadata: `{ valid, isExisting, isAlreadyMemberInOrg, email, orgName, villa, role, invitationSource }`.
4. Dynamic Presentation:
   - **Case 1: User Already Authenticated with Matching Account:** Renders confirmation card with one-click *"Accept Invitation as [Name]"*.
   - **Case 2: Existing Unauthenticated User (`isExisting === true`):** Automatically defaults to the **"Sign In"** tab. User enters credentials, backend logs them in, validates identity match, accepts invitation, and switches context.
   - **Case 3: New User (`isExisting === false`):** Automatically defaults to the **"Sign Up"** tab. User provides name, phone, and sets a password. Submits to `POST /api/v1/auth/accept-invite`.
   - **Case 4: SSO (Google / Microsoft):** Invitee clicks provider button. Triggers `POST /api/v1/auth/accept-invite/sso`.
5. Post-Acceptance:
   - If on desktop: Dispatches `setActiveWorkspace` in Redux and navigates to `/dashboard`.
   - If on mobile browser: Calls `createInviteHandoff()` and redirects to `managemygate://invite/handoff/:handoffId` or displays the handoff QR card.

---

## F. Mobile Flow Audit

### 1. App Configuration & Deep Linking Scheme
- **Configuration File:** [`mobile/mobile-app/app.json`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app.json#L8-L100)
- **Registered Schemes (`app.json:8-12`):**
  - `mobile-app`
  - `managemygate`
  - `com.atominosconsulting.nahom`
- **Android Package:** `com.atominosconsulting.nahom` (`versionCode: 13`)
- **iOS Bundle Identifier:** `com.atominosconsulting.nahom`
- **Android Intent Filters (`app.json:51-100`):**
  ```json
  [
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        { "scheme": "https", "host": "app.managemygate.com", "pathPrefix": "/invite/handoff" },
        { "scheme": "https", "host": "managemygate.e3esg.com", "pathPrefix": "/invite/handoff" },
        { "scheme": "https", "host": "managemygate.e3esg.com", "pathPrefix": "/invite/app" }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    },
    {
      "action": "VIEW",
      "data": [
        { "scheme": "managemygate", "host": "invite", "pathPrefix": "/handoff" },
        { "scheme": "managemygate", "host": "invite", "pathPrefix": "/app" },
        { "scheme": "managemygate", "host": "accept-invite" }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
  ```
- **Intent Filter Gap:** The intent filter covers `/invite/handoff` and `/invite/app`, but does **not** include `{ "scheme": "https", "host": "managemygate.e3esg.com", "pathPrefix": "/invite" }`. Therefore, clicking a canonical universal link (`https://managemygate.e3esg.com/invite/<token>`) opens in the mobile browser rather than triggering the native Android app directly.

### 2. Mobile Screens & Routing
- **Entry Router:** [`mobile/mobile-app/app/invite.tsx`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app/invite.tsx): Forwards incoming query params directly to `/(auth)/accept-invite`.
- **Accept Screen:** [`mobile/mobile-app/app/(auth)/accept-invite.tsx`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app/(auth)/accept-invite.tsx):
  - Consumes `<KeyboardAvoidingShell>`, `<PasswordStrengthIndicator>`, `<GoogleSignInButton>`, `<AppleSignInButton>`.
  - Token extraction: checks `searchParams.token`, `searchParams.code`, and regex parses `window.location.href`.
  - On mount: validates invite via `GET /auth/validate-invite`.
  - If authenticated resident on device matches invited email (`accept-invite.tsx:198`): auto-accepts invitation and navigates directly to `/(resident)/dashboard`.
  - If user is already active: alerts user and routes to `/(auth)/login`.
  - If new user: prompts password creation.
- **Mobile Navigation Gap (`accept-invite.tsx:286`):**
  Upon successfully submitting a new password, line 286 invokes:
  ```typescript
  handleNavigateToLogin(targetEmail);
  ```
  Even though `backend /auth/accept-invite` returns an active token and session, the mobile screen forces the user to log in again with their new password instead of auto-logging in.

---

## G. Mobile Handoff Audit

### 1. Implementation Architecture
- **Generation:** [`auth.services.js:createInviteHandoff`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L2149)
  - Requires authenticated session and active account (`user.status === 'Active'`).
  - Calls `tokenService.createMobileHandoffToken(userId, targetOrgId)`.
  - Generates 32-byte cryptographically secure random token (`crypto.randomBytes(32).toString('hex')`).
  - Stores SHA-256 hash in `Token` collection with `type: 'MOBILE_HANDOFF'`, `status: 'PENDING'`.
  - **Lifetime:** Strict 5-minute TTL (`Date.now() + 5 * 60 * 1000`).
  - Invalidates any prior pending handoffs for the user.
  - Generates deep link (`managemygate://invite/handoff/:id`), universal link, and Play Store URL with install referrer.
- **Recovery & Exchange:** [`auth.services.js:exchangeInviteHandoff`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L2189)
  - Atomically transitions token from `PENDING` $\rightarrow$ `EXCHANGED` using `tokenRepository.findOneAndUpdate` with `{ status: 'PENDING', used: false, expiresAt: { $gt: new Date() } }`.
  - Guarantees single-use; immune to replay or race conditions.
  - Creates a fresh mobile session and returns scoped JWT + refresh token.
- **Deferred Deep Link Recovery on Mobile:**
  - File: [`deferredDeepLinkService.ts`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/src/features/auth/services/deferredDeepLinkService.ts)
  - Screen: [`app/invite/handoff/[handoffId].tsx`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app/invite/handoff/[handoffId].tsx)
  - On first app launch, `app/_layout.tsx` checks install referrer for `handoffId`. If found, routes to `/invite/handoff/:id` and exchanges it for an active session.
- **Security Assessment:**
  - Token is stored hashed (SHA-256).
  - Single-use atomic update prevents double-consumption.
  - Short 5-minute TTL limits interception exposure.
  - **Verdict:** Safe and compliant with production security standards.

---

## H. Authentication / SSO Audit

### 1. Supported Providers
- **Google OAuth 2.0:** Verified via [`google.provider.js`](file:///d:/atominos/GatedCommunity/backend/src/features/userIdentity/providerAdapters/google.provider.js) (`google-auth-library` idToken verification).
- **Microsoft Entra ID / Azure AD:** Verified via [`microsoft.provider.js`](file:///d:/atominos/GatedCommunity/backend/src/features/userIdentity/providerAdapters/microsoft.provider.js) (JWKS RSA verification).

### 2. SSO Invitation Acceptance Flow
- **Endpoint:** `POST /api/v1/auth/accept-invite/sso` ([`auth.controller.js:92`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.controller.js#L92))
- **Service:** [`auth.services.js:acceptInvitationWithSSO`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L1664)
- **Workflow:**
  1. Validates SSO credential token with provider to extract verified `providerEmail` and `providerId`.
  2. Validates invitation token against `Token` entity.
  3. Verifies email ownership:
     ```javascript
     if (!user.email || ssoEmail.toLowerCase() !== user.email.toLowerCase()) {
       throw new HttpError(403, 'Email in SSO token does not match the invitation email.');
     }
     ```
  4. Consumes invitation token (`status: 'ACCEPTED'`).
  5. Links provider into `UserIdentity` collection.
  6. Updates `OrgMembership.status` to `'Active'` and finalizes villa assignment.
  7. Issues session and signs scoped JWT access token.
- **Target Gap Identified (`auth.services.js:1751`):**
  In `acceptInvitationWithSSO`, the token signing call is:
  ```javascript
  const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(activatedUser);
  ```
  It **omits** the `orgId` parameter. In contrast, standard `acceptInvitation` executes:
  ```javascript
  const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(user, orgId);
  ```
  **Impact:** If an existing user holding memberships in other communities accepts an SSO invitation for Community B, their resulting JWT token may be scoped to their prior community rather than Community B.

---

## I. Active Organization & Tenant Context

### 1. Context Resolution (`auth.services.js:getScopedTokenPayload`)
- Scans `OrgMembership` records where `status === 'Active'` and `orgId.status === 'Active'`.
- If `targetOrgId` is passed:
  - Verifies user has active membership in `targetOrgId` (throws 403 if absent).
  - Flattens permissions from assigned `roleIds` via `rolePermissionService`.
  - Injects `orgId`, `role`, `permissions`, `isPlatform`, and `availableWorkspaces` into the token payload.
- If `targetOrgId` is null:
  - Selects first active community workspace with a villa, or first active workspace.

### 2. Workspace Switching (`auth.services.js:switchContext`)
- **Route:** `POST /api/v1/auth/switch-context`
- Verifies user membership in target organization.
- Generates freshly signed JWT access token scoped to the target organization's roles and permissions.
- Frontend Redux ([`authSlice.js:271-290`](file:///d:/atominos/GatedCommunity/frontend/src/features/auth/store/authSlice.js#L271-L290)) captures the new token, updates `state.auth.user`, and dispatches `setActiveWorkspace`.
- Outgoing API calls automatically attach `x-organization-id: activeOrgId` via Axios request interceptors.

---

## J. Villa Assignment Lifecycle

### 1. Staging vs. Final Occupancy
| Lifecycle Event | `OrgMembership.units` | Physical `Villa` Document | Occupancy Status |
| :--- | :--- | :--- | :--- |
| **Admin Invites Resident** | Staged: `[{ villaId, residentType }]` | Untouched | `Vacant` |
| **Invitation Revoked / Expired** | Unlinked / Membership Rejected | Untouched | `Vacant` |
| **User Rejects Invitation** | Unlinked / Membership Rejected | Untouched | `Vacant` |
| **User Accepts Invitation** | Confirmed: `[{ villaId, residentType }]` | `primaryResidentId = user._id`<br>`residents.push(user._id)` | `Occupied` |

- **Evidence:** [`auth.services.js:753-770`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L753-L770):
  ```javascript
  if (orgId) {
    const membership = await orgMembershipService.getMembershipWithVilla(user._id, orgId, session);
    if (membership && membership.units && membership.units.length > 0) {
      for (const unit of membership.units) {
        await villaService.assignResidentToVilla(unit.villaId._id, user._id, unit.residentType, session, orgId);
      }
    }
  }
  ```
  Villa residency assignment is strictly deferred until acceptance.

---

## K. Event & Notification Architecture

### 1. Protocol Decoupling Compliance
- Features communicate via native Node `EventEmitter` instances:
  - [`userEvents`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.events.js) in `user.events.js`
  - [`authEvents`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.events.js) in `auth.events.js`
- Neither `user.services.js` nor `auth.services.js` imports `socket.io`.
- Transport handlers:
  - [`user.listeners.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js): Listens for `USER_INVITED`, `USER_ADDED`, `EMAIL_OTP_SENT`.
  - [`user.socket.js`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.socket.js): Listens for `USER_UPDATED` and emits to `io.to('org:orgId')`.

### 2. Branded Email Templates
- Email formatting checks `messageTemplateService.getTemplateByPurpose(orgId, 'email', 'user_invitation')`.
- If an organization has a customized template, it compiles variables (`{{community_name}}`, `{{invite_link}}`, `{{reject_link}}`).
- If no custom template exists, it falls back to a responsive HTML template with distinct **Accept** and **Reject** buttons.

---

## L. Security Findings

| Finding ID | Severity | File / Component | Observation | Risk / Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Medium** | [`user.controller.js:81-83`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.controller.js#L81) | `POST /users/invite` returns raw `invitationToken` and `inviteLink` in HTTP response payload. | Necessary for admin UI toast ("Copy link"), but exposes raw token to any caller with `users:create` permission. |
| **SEC-02** | **Low** | [`user.services.js:436`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L436) | `OutboxEvent` persists raw `invitationToken` in database `payload` field. | Database read access to outbox collection reveals unhashed tokens before consumption. |
| **SEC-03** | **Low** | [`token.services.js:75`](file:///d:/atominos/GatedCommunity/backend/src/features/token/token.services.js#L75) | Token lookup supports legacy fallback `$or: [{ token: hashedToken }, { token: unhashedToken }]`. | Backward compatibility artifact; should be phased out once all legacy tokens expire. |
| **SEC-04** | **Passed** | [`user.listeners.js:224`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js#L224) | Token logged as `token.slice(0, 6)...`. | Safe. Token is masked in centralized application logs. |
| **SEC-05** | **Passed** | [`auth.services.js:714-721`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L714) | Verifies `authenticatedUserId === user._id` and `email === user.email`. | Prevents wrong-user invitation interception attacks. |

---

## M. Test Coverage Audit

### 1. Existing Test Suites
- **`backend/tests/verify_invitation_flow.js` (514 lines):**
  Thorough end-to-end integration script executing 12 validation steps against real MongoDB:
  - Multi-tenant dual community setup (Community A & B).
  - Existing user in Org A invited to Org B.
  - Pre-acceptance state (Villa B vacant, membership pending, Org B blocked in context switcher).
  - Cross-tenant notification isolation.
  - Invitation acceptance, villa assignment, context switching.
  - Idempotency & double-acceptance blocking.
  - Expired token rejection.
  - Cross-tenant revocation protection and authorized revocation.
  - Rejection lifecycle (membership marked Rejected, user preserved).
- **`backend/tests/verify_phase2_flow.js` (215 lines):**
  Validates canonical URL generation, in-app notification attribution, `validateInvite` metadata enrichment, and credential protection.
- **`backend/tests/auth.integration.test.js`:**
  Covers SSO invitation mismatch (line 108: `403 error if provider email does not match invited email`).
- **`backend/tests/multiOrgAuth.test.js` (556 lines):**
  Validates multi-organization context switching, role permissions, and tenant isolation.

### 2. Test Coverage Gaps
- No automated unit tests for `mobile-app/app/(auth)/accept-invite.tsx` navigation transitions.
- No automated test verifying `authService.acceptInvitationWithSSO` scopes the JWT token to `orgId`.
- No automated test verifying bulk invitation partial failure isolation (e.g. 3 valid, 1 duplicate email).

---

## N. Target Gap Matrix

| Requirement | Existing Implementation | Status | Primary File(s) | Identified Gap | Required Phase |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **Global User Reuse** | `user.services.js:inviteUser` checks `findByEmail` and reuses `user`. | **Implemented** | [`user.services.js:255`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L255) | None. Correctly reuses global `User`. | Verified |
| **Multi-Org Membership** | `OrgMembership` created per org with `userId`, `orgId`, `roleIds`, `units`. | **Implemented** | [`orgMembership.model.js:6`](file:///d:/atominos/GatedCommunity/backend/src/features/orgMembership/orgMembership.model.js#L6) | Legacy fields on `User` root model need cleanup. | Phase 2 |
| **Invitation Creation** | Admin invites single or bulk; Mongoose transaction; generates `Token`. | **Implemented** | [`user.services.js:250`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L250) | None. | Verified |
| **Accept Invitation** | Validates pending token, activates membership, assigns villa, auto-logs in. | **Implemented** | [`auth.services.js:678`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L678) | Mobile client redirects to login instead of dashboard. | Phase 2 |
| **Reject Invitation** | Rejection endpoint sets token `REJECTED`, membership `Rejected`. | **Implemented** | [`auth.services.js:818`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L818) | None. User is preserved. | Verified |
| **Token Expiry (24h TTL)** | Stored in `Token.expiresAt`. Checked on validation/acceptance. | **Implemented** | [`token.services.js:171`](file:///d:/atominos/GatedCommunity/backend/src/features/token/token.services.js#L171) | None. | Verified |
| **Resend Invitation** | Invalidate old token (EXPIRED/REVOKED), generate new token, re-dispatch. | **Implemented** | [`user.services.js:869`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L869) | None. | Verified |
| **Revoke Invitation** | Validates org ownership, marks token `REVOKED`, unlinks pending villa. | **Implemented** | [`user.services.js:797`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.services.js#L797) | None. | Verified |
| **Web Universal Flow** | Canonical `/invite/:token` routes to `InviteHandler.jsx` with tabs. | **Implemented** | [`InviteHandler.jsx:36`](file:///d:/atominos/GatedCommunity/frontend/src/views/pages/invite/InviteHandler.jsx#L36) | None. | Verified |
| **Mobile Deep Link** | Schemes registered; `app/invite.tsx` routes to `accept-invite.tsx`. | **Partial** | [`app.json:51`](file:///d:/atominos/GatedCommunity/mobile/mobile-app/app.json#L51) | Android intent filter lacks `/invite` pathPrefix on web domain. | Phase 2 |
| **Play Store Handoff** | Generates Google Play URL with referrer `handoffId=...`. | **Implemented** | [`auth.services.js:2176`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L2176) | None. | Verified |
| **Mobile Handoff Exchange** | 5-min TTL, SHA-256 hash, single-use atomic exchange. | **Implemented** | [`token.services.js:441`](file:///d:/atominos/GatedCommunity/backend/src/features/token/token.services.js#L441) | None. | Verified |
| **SSO Acceptance** | Verifies Google/Microsoft ID token, links `UserIdentity`. | **Partial** | [`auth.services.js:1664`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L1664) | `getScopedTokenPayload` call omits `orgId` parameter. | Phase 2 |
| **Active Org Switch** | `POST /auth/switch-context` returns re-scoped JWT token. | **Implemented** | [`auth.services.js:639`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L639) | None. | Verified |
| **Deferred Villa Occupancy** | Villa occupancy strictly deferred until acceptance transaction. | **Implemented** | [`auth.services.js:753`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L753) | None. | Verified |
| **Tenant Isolation** | `tenantContext` middleware validates membership and attaches `req.tenant`. | **Implemented** | [`tenant.middleware.js:12`](file:///d:/atominos/GatedCommunity/backend/src/middlewares/tenant.middleware.js#L12) | None. | Verified |
| **Wrong-User Protection** | Identity verified: rejects if authenticated user $\neq$ invited user. | **Implemented** | [`auth.services.js:714`](file:///d:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js#L714) | None. | Verified |
| **Event Notifications** | Node `EventEmitter` emits events; listeners send emails & push. | **Implemented** | [`user.listeners.js:26`](file:///d:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js#L26) | None. | Verified |
| **Regression Tests** | Integration verification scripts cover 12 multi-tenant scenarios. | **Partial** | [`verify_invitation_flow.js`](file:///d:/atominos/GatedCommunity/backend/tests/verify_invitation_flow.js) | Needs Jest/Node test runner integration for CI. | Phase 2 |

---

## O. Recommended Phase 2 Action Plan

*(Note: In accordance with Phase 1 directives, NO production code was modified during this audit.)*

When approved to begin Phase 2, the following focused adjustments should be made:

1. **Fix `acceptInvitationWithSSO` Scoped Context (`backend/src/features/auth/auth.services.js:1751`):**
   Update the call to pass `orgId`:
   ```javascript
   // Change from:
   const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(activatedUser);
   // To:
   const { tokenPayload, permissions, availableWorkspaces } = await this.getScopedTokenPayload(activatedUser, orgId);
   ```
2. **Streamline Mobile New-User Onboarding (`mobile/mobile-app/app/(auth)/accept-invite.tsx:285`):**
   When a new user successfully submits their password, store the returned JWT token/session into Redux/SecureStore and route directly to `/(resident)/dashboard` (matching the seamless Web behavior) rather than kicking them back to the login screen.
3. **Align Android Universal Link Intent Filters (`mobile/mobile-app/app.json:51-75`):**
   Add `{ "scheme": "https", "host": "managemygate.e3esg.com", "pathPrefix": "/invite" }` to ensure canonical `/invite/:token` links trigger the native app when clicked on mobile devices.
4. **Clean up Deprecated Root Fields on `User` Model:**
   Gradually decouple remaining service dependencies on root `User.villaId` and `User.roles` in favor of reading exclusively from `OrgMembership`.
5. **Add Automated CI Regression Suite:**
   Integrate `verify_invitation_flow.js` into standard `npm test` script.
