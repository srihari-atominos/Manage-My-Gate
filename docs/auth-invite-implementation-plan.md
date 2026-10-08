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
