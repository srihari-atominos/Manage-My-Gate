# Implementation Plan: Unified Auth & Community Invitations (mobile + backend)

Source: "User Story — Community Admin & User Invitation Flow" (Stories 1–11, Business Rules 1–25).
Scope: `mobile/mobile-app` and `backend/src`. The web app is a separate track; backend changes must not break it until Phase 8.

## How to work (every phase)

1. **Audit first.** Read the current code for the phase and note what exists, what is missing and what conflicts with this plan, with `file:line` references.
2. **Change only what the phase needs.** No refactors or renames outside its scope.
3. **Test.** Add or update tests for every acceptance item. Run backend tests and the mobile Jest suite.
4. **Report** before the next phase: completed items, deferred items and why, blockers, test results (pass/fail counts), and any API change the mobile or web app depends on.
5. **Commit once per phase** on the feature branch.

## Rules that apply to every phase

- One authentication system: **Email OTP, Phone OTP or SSO. No passwords.**
- Login only proves identity; access comes from server-side membership + role permissions.
- Never trust the client for role, community, membership, activation status or permissions.
- The community always comes from the admin's verified context, never a request field.
- Activate only the exact invitation being accepted. Never "first pending", never an update without both user and community.
- Expired, revoked or used invitations never activate anything.
- Never create a duplicate User.

## Phase 0 — Close the security holes (backend)

- `/auth/setup-account-password`: require a signed, single-use setup token issued in the provisioning email.
- `/auth/accept-invite`: token mandatory; remove the find-by-email branch.
- `/auth/reject-invite`: token mandatory, validator, rate limit.
- `orgMembership.repository.updateStatus`: throw when user or community is missing.
- `getScopedTokenPayload`: delete the fallback that promotes Pending/Rejected memberships to Active.
- `/users/invite`, bulk invite, `/villas/bulk-upload`: require `users:create`; enforce the role ceiling (invited role's permissions ⊆ inviter's).
- `/onboarding/*`: permission check; ignore `req.body.orgId`.
- Done when a regression test reproduces each original attack and shows it fails.

## Phase 1 — OTP security (backend)

- Expiry 5 min, checked in code. Single use via atomic consume; a new request invalidates earlier codes.
- 3 attempts then dead (Firebase path counts too). Resend cooldown 25 s per identifier. 5 requests/hour per identifier, then 15-min lock. Keep per-IP limiter.
- Error codes: `OTP_INVALID {attemptsRemaining}`, `OTP_EXPIRED`, `OTP_EXHAUSTED`, `OTP_COOLDOWN {retryAfterSeconds}`, `OTP_LOCKED {retryAfterSeconds}`.
- Codes go to existing users or identifiers with a pending, unexpired invitation; identical response either way.
- Never return a code in an API response (server log only, behind `OTP_DEBUG`).

## Phase 2 — Invitation model and creating invites (backend)

- New `Invitation` collection: `orgId, email, phone (E.164), roleId, unitId?, invitedBy, tokenHash, status (Pending/Accepted/Declined/Revoked/Expired), expiresAt (7 days), userId?, membershipId?`.
- Email, phone, role mandatory; unit optional; community from the admin's verified context.
- Role ceiling → 403 `ROLE_NOT_ASSIGNABLE`.
- Existing user (by email or phone) → reuse, create Pending membership linked to the invitation. No match → invitation only, no User. Email→A, phone→B → `IDENTITY_CONFLICT`. Already Active → `ALREADY_MEMBER`. Pending invite exists → `ALREADY_INVITED`.
- Bulk: same rules per row, in-file duplicates, `{ accepted[], rejected[{row, reason}] }`.
- Resend issues a new token (old one dies); revoke → Revoked (+ linked membership Rejected).
- Email: community name, email, phone, role; CTA "Step Into Your Community" → `https://<domain>/invite/<token>`; no password, code or temp credentials.
- Admin user lists show invitations as "Invited" with resend/revoke.

## Phase 3 — Acceptance and login result (backend)

- One function `acceptInvitationForVerifiedIdentity(identity, invitation)`, one transaction: invitation Pending & unexpired → verified email/phone equals the invitation's → find or create User (only place an invited User is created), Active + verified flag → create/activate only that community's membership with the stored role/unit → invitation Accepted.
- OTP and SSO verify accept optional `inviteToken` and call the function with that exact invitation.
- No token: existing user logs in normally; no User but pending invitations → short-lived identity ticket + invitation list; `POST /invitations/accept { ticket | session, invitationId }` accepts the chosen one.
- `GET /invitations/pending`, `POST /invitations/accept`, `POST /invitations/decline`.
- SSO links by email only when the provider marks it verified; Apple private relay links only via invite token; status checks on every path.
- One login result for every method: `token, refreshToken, user, memberships[], pendingInvitations[], landing`.
- `landing` (`platform | community_admin | member`) computed from server permissions, not role names; only picks the first screen.
- Old `/auth/accept-invite*` and `/auth/reject-invite` become wrappers for one release, then are deleted.

## Phase 4 — Platform Admin provisioning (backend)

- `POST /platform/communities` (platform only, via signed `isPlatform`): community + default roles + features in one transaction.
- `POST /platform/communities/:id/admins`: Phase 2 invite with the Community Admin role.
- Lock `POST /organizations/setup` to platform users. CRM conversion and payment provisioning call the same service.
- Feature→permission mapping: add `administration_security` and `polls`; keep admin core permissions on feature change.

## Phase 5 — Mobile login and acceptance

- Login: Email + code, Phone + code, SSO (Google, Apple on iOS, Microsoft). No password field.
- Code screen messages from Phase 1 error codes (attempts remaining, exhausted + Request New OTP, resend countdown).
- `/invite/[token]` and `/invite/handoff/*` keep the token in memory and open login; never log in. Token sent with OTP/SSO verify.
- No token → "Pending invitations" screen; user taps exactly one. No communities and no invitations → "Not part of a community yet".
- First screen from `landing`; `platform` → "Use the web console".
- Delete register, signup, setup-organization, onboarding select-features, forgot-password, accept-invite password.
- `GET /app/config` with `minSupportedVersion` + force-update screen (must ship before Phase 8).

## Phase 6 — Mobile invite management

- Invite form: email, phone (international), role mandatory; unit optional; no community selector; role picker shows assignable roles only.
- Bulk: CSV or multi-row → accepted/rejected results sheet with reasons.
- Invited list with resend/revoke.

## Phase 7 — Device routing and sessions

- `assetlinks.json` / AASA cover `/invite/*` on both domains; device matrix (Android/iOS installed & not, desktop).
- `/invite/:token` web page routes to app/Play Store/App Store/web login; never creates a session.
- Refresh keeps community/role/unit, rotates the refresh token, rate-limited.
- Logout sends the refresh token, unregisters push first, revokes the session.

## Phase 8 — Remove passwords and migrate data

- `AUTH_PASSWORD_ENABLED=false` once web is on OTP and old app versions are forced to update.
- Delete password login, register, forgot/reset, setup-account-password; password fields after one release.
- Migration: list users with no deliverable email (`@community.local`) and no phone; back-fill memberships for imported users; leftover `Pending Verification` users without membership → Invitation records.
- Update seed scripts, fixtures, test-credentials sheet.

## Phase 9 — End-to-end tests and rollout

- E2E for every story's criteria, every Phase 0 attack, OTP limits, expired/revoked/used invitations, role ceiling, identity conflict, and the multi-community case (A Active + B Pending → both Active, other Pending unchanged).
- Rollout: Phase 0 hotfix → backend 1–4 (compatible with current app) → mobile 5–7 + force update → web migration → Phase 8 switch-off → remove old code.

## Story → phase map

| Story | Phases |
|---|---|
| 1. Platform Admin creates community | 0, 4 |
| 2. Community Admin login | 3, 5 |
| 3–4. Single and bulk invite | 0, 2, 6 |
| 5. Invite email | 2 |
| 6. Device routing | 5, 7 |
| 7. OTP login | 1, 5 |
| 8. New user activation | 3, 5 |
| 9–10. Existing user, multiple communities | 2, 3 |
| 11. Server-side authorization | 0, 3, 7 |
| Rule 25. No passwords | 5, 8 |

## Progress log

_Each phase appends: date, commit, completed, deferred, blockers, tests._

### Phase 0 — 2026-10-08

**Completed**
- `setup-account-password` requires a signed, single-use setup token (`auth/accountSetupToken.js`, 72 h, own secret, used-jti recorded as `ACCOUNT_SETUP` Token). Provisioning email link carries it; web `SetPasswordPage` forwards it. Community comes from the token's `orgId`; the request's `orgName` is ignored (it previously attached the caller as admin of any community found by name). Rate-limited.
- `accept-invite`: token mandatory; email-only branch removed. Established accounts (Active + password) must be signed in as themselves and their credentials are never changed. Only the token's community membership is activated. Rate-limited.
- `reject-invite`: token mandatory, validator, rate limit; declines only that membership and only while Pending.
- `orgMembership.repository.updateStatus` throws without both user and community.
- `getScopedTokenPayload`: Pending/Rejected → Active fallback removed.
- Invites: `/users/invite` needs `users:create` or `villas:update` (was `villas:read`); role ceiling (`user/utils/roleAssignment.js`) on single invite, bulk invite and villa bulk upload; invite service only assigns the community's own roles (no global/system fallback). `/villas/bulk-upload` needs `villas:create` or `villas:update` (was any incl. read).
- `/onboarding/*` imports need `villas:create` + `users:create`; community only from tenant context.
- Mobile accept-invite keeps the invite token when redirecting to login.

**Found and fixed on the way**
- `setupAccountPassword` double-hashed new users' passwords (`createUser` hashes again), so brand-new provisioned customers could never log in.
- Web `SetPasswordPage` defaulted the email to a developer's address.

**Deferred / noted**
- `checkIsAdmin` treats any role whose name contains "admin" or "super" as a full admin (custom roles can bypass RBAC). Phase 3 replaces name-based checks with permissions.
- `GET /auth/check-account-status` is public and reveals account existence (Phase 1 enumeration work).
- Login with `inviteToken` (password path) still consumes the token outside a transaction; replaced in Phase 3.

**Tests**
- New `backend/tests/auth.phase0.security.test.mjs`: 19/19 (runs only against a DB named `*auth_test*`).
- Existing: google 7/7, apple 6/6, payment.security 4/4, phone.lifecycle 11/11, phone.international 6/6. multiOrgAuth 13/15, auth.integration 0/1, session.lifecycle 13/14 — identical failures on the pre-change baseline.
- Mobile `src/features/auth` Jest 8/8; `tsc` clean for accept-invite.

### Phase 1 — 2026-10-08

**Completed**
- `otp.services.js` rewritten: expiry checked in code; 3 attempts then the code is deleted; atomic single-use consume; a new code invalidates earlier ones; failed attempts recorded **outside** the caller's transaction; Firebase failures counted via `recordFailedAttempt`.
- New `OtpThrottle` collection (per email/phone): 25 s resend cooldown, 5 sends per hour then a 15-minute lock. Applies to unknown identifiers too.
- Error codes in `details.code`: `OTP_INVALID {attemptsRemaining}`, `OTP_EXPIRED`, `OTP_EXHAUSTED`, `OTP_COOLDOWN {retryAfterSeconds}`, `OTP_LOCKED {retryAfterSeconds}`. Messages use the story's wording.
- No enumeration: email-code, phone-code and forgot-password requests give the same response whether or not the account exists (nothing is sent for unknown ones); reset-code verification no longer checks the account first. `check-account-status` answers only signed-in inviters or a matching setup-token holder; everyone else gets `exists: false`.
- Codes never appear in responses or logs unless `OTP_DEBUG=true` (and never in production): auth service, profile verification and the OTP email/SMS listener.
- Duplicate `verifyResetPasswordOtp` removed (the later copy silently overrode the normalizing one).
- Per-IP limiters are now a backstop: OTP 30/15 min (was 5 — too strict behind carrier NAT/community Wi-Fi), auth 60/15 min; both overridable via `OTP_IP_RATE_LIMIT` / `AUTH_IP_RATE_LIMIT`.

**Found on the way**
- Register, phone login and profile verification checked codes inside a transaction, so every failed attempt was rolled back: unlimited guesses on those flows. Fixed by recording failures outside the transaction (test covers phone login).

**Deferred / noted**
- The User model still requires a password for Active users (Phase 8).
- Web `PublicCheckoutPage` used `check-account-status` anonymously; it now always gets `isAlreadyConfigured: false` (cosmetic: shows the "set password" state).
- The mobile code screen's attempts/cooldown UI is Phase 5; today it shows the server message.

**Tests**
- New `backend/tests/auth.phase1.otp.test.mjs`: 13/13. Phase 0 suite 19/19.
- Existing: phone.lifecycle 11/11, phone.international 6/6, google 7/7, apple 6/6, payment.security 4/4; multiOrgAuth 13/15 (same pre-existing failures).

### Phase 2 — 2026-10-08

**Decision (user, 2026-10-08):** keep creating a User record at invite time as a **locked placeholder** instead of deferring User creation to acceptance. Deferring would have removed pending invitees from the mobile/web user lists, broken technicians (placeholder `@staff.local` emails) and required web changes. The placeholder reuses the existing `Pending Verification` status (≈15 code paths already treat it as "invited, not set up"); what matters is that it cannot authenticate or be activated except through its exact invitation. The existing Token `INVITATION` documents serve as the invitation record (status lifecycle, inviter, community, hashed token, expiry, resend/revoke, list endpoint), so no separate `Invitation` collection was added.

**Completed**
- Single invite: email, phone and role mandatory (validator). Community from the admin's context only (a body `orgId` is ignored — covered by test).
- Conflicts carry codes: `ALREADY_MEMBER`, `IDENTITY_CONFLICT` (email and phone belong to different people). Existing users are reused, never duplicated; their other memberships are untouched.
- Bulk invite: per-row validation in the service (`MISSING_EMAIL`, `MISSING_PHONE`, `INVALID_PHONE`, `MISSING_ROLE`, `DUPLICATE_IN_FILE`, plus the role ceiling per row) → `{ successes[], failures[{row, code, error}] }`; valid rows still go through. Rows now pass their phone and name (they were dropped before).
- Villa bulk upload: resident invites need a phone (the unit is still created; the row reports why no invite went out).
- Invitation lifetime 7 days (was 24 h). Errors carry `INVITATION_EXPIRED / _REVOKED / _REJECTED / _USED / _INVALID`.
- Invite email: "Step Into Your Community" button; shows community, registered email, registered phone, unit and role; no credentials or codes; admin-entered values HTML-escaped; expiry text matches 7 days.
- Placeholder lock: SSO refuses a pending placeholder without its own invitation (`INVITATION_REQUIRED`), never consumes an invitation that belongs to another account (`INVITATION_MISMATCH`), and refuses suspended/blocked accounts on every path (the email-fallback path skipped this). Self-registration with an invited email is refused (`INVITATION_REQUIRED`).
- Mobile: invite form gains a mandatory phone field (with contact picker); resend passes the phone.
- Web (to keep it working with the stricter API): invite form gains a phone field; bulk CSV template and parser gain a Phone column; resend passes the phone.

**Deviations from the plan**
- Re-inviting a pending person still acts as "resend" (new link, old one invalid) instead of returning `ALREADY_INVITED`, because the mobile and web resend buttons call the invite endpoint.
- Technician invites (placeholder `@staff.local` emails, no role choice) are unchanged.

**Deferred**
- Older placeholder users without a phone can't be re-sent from the users list until a phone is added (the API now explains why).
- `listInvitations` search/recipient fields unchanged (placeholders still exist, so nothing broke).

**Tests**
- New `backend/tests/auth.phase2.invite.test.mjs`: 16/16. Phase 0 (updated for mandatory phone and per-row bulk) 19/19, Phase 1 13/13.
- Existing suites unchanged (multiOrgAuth's 2 pre-existing failures). Mobile auth Jest 8/8; `tsc` clean for edited files; edited web files parse.

### Phase 3 — 2026-10-08

**Completed**
- `auth/invitationAcceptance.js`: the single acceptance path. Resolves the invitation by raw token or id, checks it belongs to the verified user and is usable, consumes it atomically, activates the placeholder user, marks email/phone verified, activates only that community's membership, assigns its units and technician record. Plus decline, pending-invitation listing and a 15-minute identity ticket (own secret, never an access token).
- Email-code and phone-code verification accept `inviteToken`. Password login, both SSO paths and the legacy `/auth/accept-invite` now use the shared acceptance (each had its own partial copy; SSO skipped unit assignment and never checked token ownership).
- Placeholder without a token: verification returns `{ requiresInvitationSelection, ticket, pendingInvitations, landing: 'pending_invitations' }` and no session/cookies. With no live invitation: 403 `INVITATION_REQUIRED`.
- New endpoints: `GET /auth/invitations/pending` (signed in), `POST /auth/invitations/accept` and `/decline` with `{ invitationId }` and either a session or the ticket.
- One login result for every method: `token, refreshToken, user (full), availableWorkspaces, pendingInvitations, landing`. Phone/email/SSO used to return a slim user.
- `landing` from server permissions (`*`, `users:create`, `roles:create`, `roles:update` → `community_admin`), `platform`, `member`, `pending_invitations`, `no_community`.
- SSO links an existing account by email only when the provider verified it: Google `email_verified`, Apple `email_verified`, Microsoft never (its email/UPN claims are unverified in multi-tenant directories).
- SSO for a user without a community no longer creates a session and then fails with 403; it returns `landing: 'no_community'`.
- Validation errors no longer write passwords, codes or tokens to the console, `validation_errors.log` or the response.

**Deviations**
- Endpoints live under `/auth/invitations/*` (not `/invitations/*`) to reuse the auth router, limiter and cookie helpers.
- `/auth/accept-invite/sso` is unchanged; it is legacy once the app sends `inviteToken` with SSO (Phase 5) and is deleted in Phase 8.

**Behaviour changes to watch**
- Existing Microsoft users whose identity was never linked can no longer be matched by email; they need an invitation link or an already-linked identity.
- The current app shows "Choose the invitation to accept" if a not-yet-accepted invitee signs in with a phone code; the selection screen arrives in Phase 5.

**Tests**
- New `backend/tests/auth.phase3.acceptance.test.mjs`: 16/16 (exact-invitation activation incl. multi-community John case, ticket flow, mismatch/expired/revoked, decline, password path, landing, SSO linking).
- Phase 0 19/19, Phase 1 13/13, Phase 2 16/16 (one assertion updated for the ticket result). google 8/8 and apple 6/6 (fixtures now carry `email_verified`; new unverified case). phone suites 17/17, payment.security 4/4, multiOrgAuth 13/15 (pre-existing). Mobile Jest 8/8.

### Phase 4 — 2026-10-08

**Completed**
- `OrganizationService._createCommunityWithDefaults` — one place that creates a community with its five default roles and permissions; used by self-serve setup, platform provisioning and CRM conversion.
- `POST /organizations/provision` (platform only): creates the community; the platform user does not join; optional `admin: { email, phone, name }` is invited as Community Admin through the normal invite flow. Duplicate name → 409 `COMMUNITY_NAME_TAKEN`. Protected fields in the body are stripped.
- `POST /organizations/:id/admins` (platform only): invite or re-invite a community's Community Admin; email and phone required.
- `POST /organizations/setup` is now platform-only (self-serve creation closed, story 1).
- Feature selection: `administration_security` maps to users/roles/villas/integrations/workspaces; users, roles, villas and workspaces are always kept for the admin role; `polls` is selectable; unknown feature keys are rejected (they used to be accepted and grant nothing).
- CRM enquiry conversion rewritten on the shared provisioning (it was broken: wrong field names/status values, a global `COMMUNITY_ADMIN` role, and it activated any existing account with the lead's email).

**Found and fixed on the way (security)**
- `platform-crm` and `master-pricing` imported `authorizeRoles` as the rbac module's *default* export, which is `authorizePermission`. The check therefore let through anyone whose role name contains "admin": every Community Admin could read all CRM leads, convert enquiries (create communities) and create/change/delete platform pricing plans. Both routers now use `tenantContext({ requirePlatformContext: true })` (signed `isPlatform` claim).

**Deviations**
- Endpoints are `/organizations/provision` and `/organizations/:id/admins` (not `/platform/communities`), next to the existing organization routes.
- Payment provisioning (`processCompleteProvisioningFlow`) still creates the community itself and sends the set-password email; it moves to provisioning + admin invitation when passwords are removed (Phase 8). CRM conversion no longer creates a trial subscription (the old code wrote invalid fields, so none was ever created).

**Behaviour change to watch**
- The current mobile "create community" screens now get 403 for non-platform users; they are removed in Phase 5.

**Tests**
- New `backend/tests/auth.phase4.platform.test.mjs`: 13/13 (incl. community admin locked out of CRM, pricing, provisioning and other communities' admins).
- Phases 0–3: 19, 13, 16, 16 all passing; phone 17/17, google 8/8, apple 6/6, payment.security 4/4; multiOrgAuth 13/15 (same pre-existing failures).

### Phase 5 — 2026-10-08

**Completed (mobile)**
- Login: Email + code, Phone + code, Google, Apple. No password field, no "Forgot?", no "Create Community" (replaced by "New here? Ask your community admin to invite you."). An invitation link's token is kept for the session (`auth/utils/inviteContext.ts`) and a banner explains which account to sign in with.
- Code screen: story messages driven by the server's codes — "Incorrect OTP. N attempts remaining.", "Request New OTP" once a code is used up or expired, "Didn't receive the OTP? Resend available in N seconds" (25 s, or the server's `retryAfterSeconds`). Sends the pending invite token with the code.
- `(auth)/pending-invitations`: choose exactly one invitation to accept or decline (with the identity ticket, or signed in). Also reachable from the community switcher ("Pending invitations", replacing "Create New Organization").
- `(auth)/no-community`: signed in with no community — check invitations or sign out.
- `(auth)/accept-invite` rebuilt (1,107 → ~200 lines) as the "Step Into Your Community" landing: validates the link, shows community/email/role/unit, then sends the person to the same sign-in (or accepts directly when already signed in); decline supported, including the email's reject link. The link never signs anyone in.
- SSO requests carry the pending invite token; Apple no longer uses the legacy accept-invite/sso endpoint; unknown SSO users get an "ask for an invitation" message instead of a sign-up screen.
- First screen from the server's `landing` (`auth/utils/landing.ts`), used by the start route and the root guard.
- Every sign-in path stores the same login result (`persistLoginResult`), including `landing`.
- Force update: `ForceUpdateGate` checks `GET /public/app/config` (`MOBILE_MIN_SUPPORTED_VERSION`) and blocks older builds with a store link; fails open.
- Removed: signup, register, register-otp, forgot-password, setup-organization, select-features screens; the organization (self-serve creation) feature and its store slice; unused Google/Microsoft button components.

**Completed (backend)**
- `/auth/invitations/accept|decline` also accept `inviteToken` (signed-in user answering a link).
- `GET /api/v1/public/app/config` with `minSupportedVersion` and store links.

**Deviations**
- Platform accounts still land on the dashboard (it already has platform tiles such as Organizations and Audit logs) instead of a "use the web console" screen; redirecting would have removed working features.
- Password-era thunks (`loginUser`, register, reset, `acceptInviteThunk`) remain in the auth slice but are unreachable from the UI; removed in Phase 8 with the endpoints.

**Found on the way**
- `npx tsc` never type-checked the app: `tsconfig.json` sets `ignoreDeprecations: "6.0"` but TypeScript 5.9 is installed, so tsc stops at a config error. Earlier phases' "tsc clean" notes were therefore not real checks. Checked here with a temporary config overriding only that option: no errors in changed files; 3 pre-existing errors elsewhere (`expo-location` missing, `expo-contacts` typing). Fixing the tsconfig/TypeScript version is left to the team.

**Tests**
- New mobile `auth/__tests__/invitationLogin.test.ts` (11: invite token passthrough, ticket result, attempts/cooldown details, accept/decline, landing routes, version compare, invite context) and `otpScreen.test.tsx` (5: countdown, attempts message, Request New OTP, invite hand-off, invitation choice). Mobile unit suite 699 passed / 29 failed — the 29 failures are 7 suites (amenities, roleBuilder, phone util) that fail identically on the pre-change code.
- Backend Phase 3 suite extended to 19/19 (link-token accept while signed in, app config). Phases 0, 1, 2, 4: 19, 13, 16, 13.
- Not covered: device testing (deep links, SSO on real devices) — Phase 7.

### Phase 6 — 2026-10-08

**Audit:** the app already had an invitations screen (`admin/invitations.tsx`, resend/revoke) and a bulk-invite form; the single invite form got its phone field in Phase 2.

**Completed**
- `GET /users/assignable-roles` (backend): the community roles the caller may assign, using the same ceiling as the invite endpoints. Single and bulk invite forms load roles from it, so the picker never offers a role the server would refuse.
- Bulk invite (mobile): phone column (mandatory, validated, duplicate check); CSV parsed by header so files without a Phone column still load (their rows are flagged); template updated; the results view shows real counts and each row that was not sent with its reason (it used to report every row as sent).

**Tests**
- Backend Phase 2 suite 18/18 (admin sees every role; a non-admin inviter only roles within their permissions). Mobile auth + user management Jest 24/24; type-check clean for changed files.
