# Phase 1: Authentication, Invitation & Device Flow Audit Report

## A. Executive Summary
A comprehensive audit of the existing Nahom / Connect Harmony authentication and invitation flows was conducted. The current implementation relies on a robust `Token`-based invitation system and backend-enforced tenant isolation via `OrgMembership`. Currently, there is **no organization-level authentication configuration**; all workspaces default to the `EXISTING_SYSTEM` flow. Mobile device detection uses User-Agent sniffing and a web-based banner redirect rather than native Universal Links for the canonical invitation URL. Existing robust OTP infrastructure (`Otp` model) is already present and securely handles hashing, rate-limiting, and TTL, making it fully reusable for the upcoming `OTP_LOGIN` requirement.

## B. Current Architecture
**Frontend Web:**
* Entry Point: `InviteHandler.jsx` (`frontend/src/views/pages/invite/InviteHandler.jsx`).
* Renders a UI with "Sign Up" and "Sign In" tabs, passing the `inviteToken` to backend APIs.

**Mobile App:**
* Entry Point: `UniversalInviteTokenRedirectScreen` (`mobile/mobile-app/app/invite/[token].tsx`).
* Relies on a custom scheme (`managemygate://accept-invite`) and handoff links rather than a direct Universal Link match for the canonical `/invite/:token` path.

**Backend Services:**
* Controller: `auth.controller.js` and `user.controller.js`.
* Services: `user.services.js` (creates users/memberships), `token.services.js` (manages tokens), `auth.services.js` (handles login and token consumption).
* Database: MongoDB models (`User`, `Organization`, `OrgMembership`, `Token`, `Otp`).

## C. Existing System Flow
The current flow for `EXISTING_SYSTEM` operates exactly as follows:
1. User A invites User B via the admin panel.
2. The backend (`user.services.js`) creates an `OrgMembership` (status: `Pending`) and a `Token` (type: `INVITATION`).
3. User B receives an email containing the canonical link `https://managemygate.e3esg.com/invite/:token`.
4. User B clicks the link and lands on the Web `InviteHandler.jsx`.
5. User B does **not** have to explicitly click an "Accept" button first. The UI immediately displays the Sign In / Sign Up tabs.
6. The user submits their credentials alongside the `inviteToken`.
7. The backend `/auth/login` or `/auth/accept-invite` endpoint validates the credentials, consumes the token, activates the `OrgMembership`, and returns an authenticated session.

## D. OTP Flow
The application already contains a fully functional and secure OTP system.
* **Model (`otp.model.js`)**: Tracks `identifier`, `code` (hashed), `type`, `attempts`, and `expiresAt` (TTL index).
* **Service (`otp.services.js`)**: Generates 6-digit codes, hashes them securely via `bcrypt`, and limits verification to 3 attempts before invalidation.
* **Existing Types**: Supports `REGISTER`, `LOGIN`, `RESET`, `VERIFY`.
* **Endpoints (`auth.controller.js`)**: Endpoints like `initiateEmailOtpLogin` and `verifyEmailOtpLogin` are already built.
* **Conclusion**: This infrastructure is highly secure and **can be fully reused** for the `OTP_LOGIN` flow without architectural changes to the OTP engine itself.

## E. Invitation Flow
1. **Creation**: `inviteUser` determines if the invitee exists by Email/Phone.
2. **New User Handling**: A placeholder `User` is created with `status: 'Pending Verification'` and `credentialStatus: 'NOT_INITIALIZED'`.
3. **Existing User Handling**: The system locates the existing `User` document.
4. **Membership & Token**: An `OrgMembership` is created linking the `userId` to the `orgId` with `status: 'Pending'`. A `Token` is generated and saved.
5. **Acceptance**: Accomplished via `auth.services.js` -> `acceptInvitation()` (for New Users setting a password) or seamlessly intercepted during `auth.services.js` -> `login()` (for Existing Users), where the token is validated, deleted, and the membership is promoted to `Active`.

## F. Device / Deep-Link Flow
* **Detection Mechanism**: The backend uses `resolveInvitationSource()` looking at `x-client-type`, origin ports, and User-Agents. The frontend `InviteHandler.jsx` uses `isMobileDevice()` (checking `navigator.userAgent`).
* **Web-to-App Handoff**: If a mobile device is detected on the web, a banner is shown prompting the user to open the app via a custom scheme: `managemygate://accept-invite?token=...`.
* **Universal Links / App Links (`app.json`)**: iOS Universal Links and Android App Links are configured for `/invite/handoff` and `/billing`, but **not** for the canonical `/invite/:token` path. This means users clicking the email link on mobile are always forced into the web browser first, requiring them to click the banner to jump into the app.

## G. Membership / Tenant Security
* **Tenant Isolation**: Backend-driven and secure. The client does not dictate the authorized organization.
* **Validation**: During authentication, `auth.services.js` -> `getScopedTokenPayload()` fetches `OrgMembership` documents for the authenticated user.
* **Enforcement**: If the `targetOrgId` (either requested or derived from the consumed invitation token) does not match an `Active` membership for that user, the backend throws a strict `403 Access Denied`.
* **Cross-Tenant Prevention**: Users cannot manipulate `organizationId` from the client to access workspaces they don't belong to.

## H. Existing User vs New User
* **Existing User**: The system maps the invitation to their existing `userId`. The web UI encourages them to "Sign In". Submitting their password alongside the `inviteToken` consumes the token and grants access.
* **New User**: The system creates a placeholder user. The web UI encourages them to "Sign Up". Submitting their details and a new password via `/auth/accept-invite` hashes the new password, activates their global user status, and activates their membership.

## I. Target Flow Comparison

| Area | Current Behavior | Target Behavior | Gap | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Existing System** | Defaults to standard Sign In/Sign Up with simultaneous token consumption. | Same as current. | None | Low |
| **OTP Login** | Global OTP login exists, but is not tied to an Organization-level configuration override. | Users in `OTP_LOGIN` orgs must be forced through OTP flow exclusively. | High | Medium |
| **Invitation** | Creates token, pending membership, and placeholder user. | Same as current. | None | Low |
| **Invitation acceptance** | Happens simultaneously with authentication (no explicit pre-accept step). | For `OTP_LOGIN`, users MUST explicitly accept *before* OTP verification. | High | Medium |
| **Device detection** | User-Agent sniffing on web; shows banner to open app. | Device detection must route appropriately. | Medium | Low |
| **Mobile deep link** | Relies on custom scheme web-bounce (`managemygate://`). | Direct canonical path support preferred. | Medium | Low |
| **Web routing** | `InviteHandler.jsx` shows Sign In/Sign Up tabs immediately. | Needs to fetch Org Auth Config first to determine which UI to show. | High | Medium |
| **OTP** | Robust system exists (`otp.model.js`). | Reuse existing system for `OTP_LOGIN`. | None | Low |
| **Membership** | Server-side validation via `OrgMembership`. | Same as current. | None | Low |
| **Tenant isolation**| Cryptographically secure via JWT and Server-side checks. | Same as current. | None | Low |

## J. Security Findings
* **Informational**: Tenant isolation is highly secure and relies on server-side `OrgMembership` checks rather than client-provided claims.
* **Informational**: OTP implementation is secure, utilizing bcrypt hashing and TTL expiry.
* **Low**: The lack of Universal Link configuration for the canonical `/invite/` path causes a web-bounce, which may result in poor UX or broken deep-linking on some restrictive mobile browsers.

## K. Exact Files To Change Later (Phase 2 & Beyond)
1. `backend/src/features/organization/organization.model.js` (To add `authenticationMethod` configuration)
2. `backend/src/features/auth/auth.controller.js` & `auth.services.js` (To enforce `OTP_LOGIN` restrictions and add endpoint to check config)
3. `frontend/src/views/pages/invite/InviteHandler.jsx` (To branch UI based on the Org's auth configuration)
4. `mobile/mobile-app/app.json` (To add Universal Link support for canonical `/invite/*`)
5. `mobile/mobile-app/app/invite/[token].tsx` & `mobile/mobile-app/app/(auth)/accept-invite.tsx` (To handle the new explicit accept flow on mobile)

## L. Phase 1 Recommendation
The audit is complete and confirms that the foundational security, OTP infrastructure, and existing system behaviors are intact and robust. 

**Recommendation for Phase 2:**
Proceed with updating the `Organization` schema to support the `authenticationMethod` enum (`EXISTING_SYSTEM`, `OTP_LOGIN`). Then, expose an unauthenticated backend endpoint (e.g., `/auth/invite/:token/config`) that the frontend `InviteHandler` can call to determine which UI flow (Sign In/Up Tabs vs Explicit Accept + OTP) to present to the user without exposing sensitive data.
