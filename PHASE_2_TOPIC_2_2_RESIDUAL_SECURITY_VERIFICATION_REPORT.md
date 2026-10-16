# Phase 2 — Topic 2.2: Residual Security Verification & Regression Closure Report

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Branch:** `security/phase2-repository-tenant-isolation`  
**HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef`  
**Status:** **100% VERIFIED & CLOSED**

---

## 1. Executive Summary

An independent, code-first audit and regression verification was performed on the three residual limitations identified at the conclusion of Phase 2 Topic 2.1:

1. **Task A — Google SSO Regression:** Fixed the test/environment coupling in `tests/google.provider.test.mjs` and closed a fail-open claim check in `google.provider.js` where missing (`undefined`) `email_verified` claims were not rejected by `normalizeIdentity`. All **8 / 8** tests in `tests/google.provider.test.mjs` now pass.
2. **Task B — Legacy Email-Verification Security:** Replaced the implicit Mongoose schema default (`emailVerified` silently hydrating to `true` whenever `status === 'Active'`) with an explicit, centralized verification policy (`isUserEmailVerified(user)` in `user.model.js`) enforced across password login, SSO login, email/phone OTP login, token refresh, authenticated middleware (`authenticateToken`), workspace context switching (`switchContext`, `getCurrentContext`), and mobile handoff flows. Preserved legitimate access for active, credential-initialized legacy accounts (and auto-migrated them to `emailVerified: true` upon successful password authentication) while blocking uninitialized/stub records (`credentialStatus: 'NOT_INITIALIZED'`, missing password, or `@noemail.local` placeholder emails). Hardened `userService.updateUser` and `userService.updateProfile` so email changes revoke all active sessions in MongoDB, invalidate OTPs for both old and new email addresses, and transition unverified email changes to `Pending Verification`. All **19 / 19** tests in `tests/authSpamEmailVerification.test.mjs` now pass.
3. **Task C — Public Visitor-Pass Boundary (`GET /api/v1/visitor-pass/public/:token`):** Hardened `visitorPassToken.repository.js`, `visitorPass.service.js`, and `visitorPass.controller.js` (`getPublicPass`) to enforce strict token format validation (`^\d{6}$` or `^[a-fA-F0-9]{24}_\d{6}$`), runtime token expiration (`expiresAt: { $gt: new Date() }`), immediate token deletion upon `REVOKED`/`EXPIRED` status transitions in `updatePassStatus`, pass-level status/validity checks in `getPublicPass`, cross-tenant prefix rejection, and a strict bearer-safe field allowlist. All **17 / 17** tests in `tests/phase4c_low_remediation.test.mjs` now pass.
4. **Task D — Combined Regression Suite:** All 7 required suites (**85 total tests** across `node:test` and Jest) executed and passed with **0 failures**.

---

## 2. Git Baseline and Preserved Modifications

### 2.1 Active Branch & Commit Baseline
* **Active Branch:** `security/phase2-repository-tenant-isolation`
* **HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef`

### 2.2 Git Safety & Preservation Verification
* All pre-existing tracked and untracked changes across `backend/`, `frontend/`, `mobile/`, and root documentation were preserved intact.
* No `git reset`, `git clean`, `git stash`, branch switching, commits, pushes, or merges were executed.
* Only in-scope files for Tasks A, B, and C were modified.

| File Modified in Topic 2.2 | Scope | Purpose |
| :--- | :--- | :--- |
| `backend/src/features/userIdentity/providerAdapters/google.provider.js` | Task A | Reject missing (`undefined`), `false`, `null`, and malformed `email_verified` claims in `normalizeIdentity`; expose `getValidAudiences()` helper |
| `backend/tests/google.provider.test.mjs` | Task A | Remove hardcoded fallback client ID expectation; assert against configured `config.sso` dynamically and test missing/malformed `email_verified` claims |
| `backend/src/features/user/user.model.js` | Task B | Prevent Mongoose from silently hydrating `emailVerified: true` on existing DB documents with missing `emailVerified`; export explicit `isUserEmailVerified(user)` policy helper |
| `backend/src/middlewares/auth.middleware.js` | Task B | Enforce `isUserEmailVerified(user)` in `authenticateToken` for existing sessions |
| `backend/src/features/session/session.controller.js` | Task B | Enforce `isUserEmailVerified(user)` in `refreshToken` and safely guard `req.cookies?.refreshToken` |
| `backend/src/features/user/user.services.js` | Task B | Unconditionally set `emailVerified = false` and `status = 'Pending Verification'`, clear old/new email OTPs, and revoke all active sessions on email change in `updateUser`; clear OTPs and revoke sessions on self-service email change in `updateProfile`; set `emailVerified: false` on passwordless `inviteUser` creations |
| `backend/src/features/auth/auth.services.js` | Task B | Enforce `isUserEmailVerified(user)` across `login`, `switchContext`, `getCurrentContext`, `loginWithGoogle`, `_handleSsoAuthentication`, `verifyPhoneLogin`, `initiateEmailOtpLogin`, `verifyEmailOtpLogin`, `createInviteHandoff`, and `exchangeInviteHandoff`; migrate eligible legacy accounts to `emailVerified: true` on password login |
| `backend/tests/authSpamEmailVerification.test.mjs` | Task B | Add Subtests 18 and 19 covering legacy accounts (`emailVerified` missing in DB), existing sessions, refresh tokens, `switchContext`, session revocation on email change, OTP invalidation, and phone OTP login bypass prevention |
| `backend/src/features/visitorPassToken/visitorPassToken.repository.js` | Task C | Enforce strict 6-digit / `orgId_shortKey` format validation, cross-tenant prefix validation, and runtime `expiresAt: { $gt: new Date() }` filtering in `findByCode`, `findByShortKey`, and `findByPassId` |
| `backend/src/features/visitorPass/visitorPass.service.js` | Task C | Delete `VisitorPassToken` when `updatePassStatus` transitions a pass to `REVOKED` or `EXPIRED` |
| `backend/src/features/visitorPass/visitorPass.controller.js` | Task C | Harden `getPublicPass` to validate token resolution, enforce pass status/validity expiry checks, and return only bearer-safe allowlisted fields |
| `backend/tests/phase4c_low_remediation.test.mjs` | Task C | Expand `A.10` and add `A.11` testing valid, expired, revoked, malformed, unknown, and cross-tenant public tokens and response field allowlisting |

---

## 3. Task A Findings and Fix — Google SSO Regression

### 3.1 Root Cause Analysis
1. **Environment vs. Test Fixture Mismatch:**
   * `backend/src/config/config.js` loads `backend/.env` via `dotenv.config`, which configures `GOOGLE_CLIENT_ID=691785946843-pbbuqms41e3cbdnprr3smoj8nd7a0i0i.apps.googleusercontent.com`.
   * However, `backend/tests/google.provider.test.mjs` (Subtests 1 and 2) had hardcoded assertions expecting the fallback constant `'610778456829-6g1bvqtplfrgva93sbdsvgbuqmkpr203.apps.googleusercontent.com'` when checking `config.sso.googleClientId` and `validAudiences`.
2. **Missing `email_verified` Claim Vulnerability in `google.provider.js`:**
   * In `backend/src/features/userIdentity/providerAdapters/google.provider.js` (`normalizeIdentity`), the check previously read:
     ```js
     if (
       payload.email_verified !== undefined &&
       payload.email_verified !== true &&
       payload.email_verified !== 'true'
     )
     ```
   * Because of `payload.email_verified !== undefined`, a payload where `email_verified` was **missing (`undefined`)** bypassed the check in `normalizeIdentity`.

### 3.2 Remediation Implemented
* **`backend/src/features/userIdentity/providerAdapters/google.provider.js`:**
  * Updated `normalizeIdentity(payload)` to require `const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true'; if (!isEmailVerified) throw new HttpError(403, 'Email address is not verified by Google.');` so missing (`undefined`), `false`, `'false'`, `null`, `0`, `1`, and malformed `email_verified` claims all fail closed with `403`.
  * Added `getValidAudiences(tokenAud, tokenAzp)` helper to encapsulate audience allowlist construction from `config.sso.googleClientId` and `config.sso.googleAndroidClientId`.
* **`backend/tests/google.provider.test.mjs`:**
  * Updated Subtests 1 and 2 to assert against the active `config.sso` configuration and `googleProvider.getValidAudiences()` without hardcoding environment-specific credentials.
  * Added Subtest 5 verifying that `normalizeIdentity` rejects `[undefined, false, 'false', null, 0, 1, 'yes', {}, []]` `email_verified` claims with `HttpError(403)`.

### 3.3 Verification Result
* Command: `node --test tests/google.provider.test.mjs`
* Result: **8 / 8 PASS** (`0` failures).

---

## 4. Task B Findings, Policy, and Fix — Legacy Email-Verification Security

### 4.1 Trace & Risk Assessment of Missing `emailVerified`
Tracing `user.model.js`, registration, invitation acceptance, password login, OTP login, refresh tokens, `authenticateToken`, `switchContext`, `getCurrentContext`, SSO, and email changes revealed:
1. **Silent Hydration Risk in `user.model.js`:**
   * Previously, `userSchema` defined `emailVerified: { type: Boolean, default: function() { return this.status === 'Active'; } }`.
   * In Mongoose, a function `default` runs during document hydration whenever the field is absent (`undefined`) in MongoDB. Consequently, **any** database record missing `emailVerified` whose `status` was `'Active'`—including uninitialized `ADMIN_ANNOUNCEMENT` resident records (`credentialStatus: 'NOT_INITIALIZED'`, no password) or synthetic `@noemail.local` records—was silently hydrated in memory as `emailVerified: true`.
2. **Email Change Session & Bypass Gaps:**
   * `userService.updateUser` reset `emailVerified = false` when changing email, but did **not** revoke existing sessions in MongoDB or transition `status` to `'Pending Verification'`.
   * `userService.updateProfile` verified the new email OTP on self-service email change, but did **not** clear remaining OTPs for the old/new email or revoke other active sessions.
   * `authService.verifyPhoneLogin`, `authService.switchContext`, and `authService.getCurrentContext` checked `user.status !== 'Active'` but did **not** check `isUserEmailVerified(user)`.

### 4.2 Explicit Legacy Verification Policy (`isUserEmailVerified`)
We defined and exported `isUserEmailVerified(user)` in `backend/src/features/user/user.model.js`:
1. **`user.emailVerified === true`** $\rightarrow$ **Verified (`true`)**.
2. **`user.emailVerified === false`** $\rightarrow$ **Unverified (`false`)**.
3. **`user.emailVerified === undefined / null` (Legacy DB record):**
   * Treated as verified **only if** all of the following hold:
     * `user.status === 'Active'`
     * `Boolean(user.password && String(user.password).length > 0)` (credentials were initialized)
     * `user.credentialStatus !== 'NOT_INITIALIZED'`
     * `Boolean(user.email)` and `!String(user.email).toLowerCase().endsWith('@noemail.local')`
   * Otherwise $\rightarrow$ **Unverified (`false`)**.
   * **On-Login Migration:** When an eligible legacy user (`user.emailVerified === undefined && isUserEmailVerified(user)`) authenticates with their valid password in `authService.login`, the backend automatically persists `$set: { emailVerified: true }` in MongoDB.
   * **Hydration Preservation:** `userSchema` no longer overwrites `undefined` on hydrated documents (`if (!this.$isNew) return undefined;`), so legacy documents retain `emailVerified === undefined` until explicitly verified or migrated.

### 4.3 Verification Result
* Command: `node --test tests/authSpamEmailVerification.test.mjs`
* Result: **19 / 19 PASS** (`0` failures), including Subtests 18 and 19 covering eligible vs. uninitialized legacy accounts, existing sessions, refresh tokens, `switchContext`, email-change session revocation, OTP invalidation, and phone login bypass prevention.

---

## 5. Task C Findings and Fix — Public Visitor-Pass Boundary

### 5.1 End-to-End Trace & Identified Gaps
Tracing `GET /api/v1/visitor-pass/public/:token` (`visitorPass.routes.js` $\rightarrow$ `visitorPass.controller.js#getPublicPass` $\rightarrow$ `visitorPassToken.service.js` $\rightarrow$ `visitorPassToken.repository.js` $\rightarrow$ `visitorPass.service.js#getPassById`) identified three security gaps:
1. **TTL Lag Window on Expired Tokens:** `VisitorPassToken` defines a MongoDB TTL index (`expiresAt: 1, expireAfterSeconds: 0`), which only runs once every ~60 seconds in the background. `visitorPassToken.repository.js` (`findByCode`, `findByShortKey`, `findByPassId`) did **not** filter `expiresAt: { $gt: new Date() }` at query time, allowing expired tokens to resolve during the TTL lag window.
2. **Permissive Suffix Regex in `findByCode`:** `findByCode` previously matched `{ passCode: { $regex: new RegExp(\`_${escapeRegex(clean)}$\`, 'i') } }` without validating that a prefixed token's `<orgId>_` prefix actually matched the token document's `orgId`, allowing a forged cross-tenant prefixed string `${orgB._id}_${orgAPass.shortKey}` to resolve `orgAPass`.
3. **Revocation via `updatePassStatus` & Pass-Level State Check in `getPublicPass`:** While `visitorPassService.revokePass` deleted the `VisitorPassToken`, `visitorPassService.updatePassStatus(id, 'REVOKED', orgId)` did not delete the token, and `getPublicPass` did not verify that the underlying `VisitorPass` was not `REVOKED`, `EXPIRED`, or past `validity.endDate`.

### 5.2 Remediation Implemented
1. **`visitorPassToken.repository.js`:**
   * Enforced runtime `expiresAt: { $gt: new Date() }` across `findByCode`, `findByShortKey`, and `findByPassId`.
   * Restricted `findByCode` to only accept either:
     * A valid prefixed code `^([a-fA-F0-9]{24})_(\d{6})$` where both `passCode` and `orgId: prefixOrgId` must match in MongoDB (blocking cross-tenant prefix spoofing), or
     * A valid 6-digit shortKey `^\d{6}$` (after stripping optional `PASS-` prefix), rejecting all malformed strings and raw 24-hex pass IDs with `null` $\rightarrow$ `404`.
2. **`visitorPass.service.js` (`updatePassStatus`):**
   * Automatically deletes the `VisitorPassToken` via `visitorPassTokenService.deleteTokenByPassId(id, scopedOrgId, session)` whenever a pass transitions to `'REVOKED'` or `'EXPIRED'`.
3. **`visitorPass.controller.js` (`getPublicPass`):**
   * Resolves the token via `visitorPassTokenService.resolveTokenByCode(token, null, req.tenant?.orgId || null)` and derives `orgId` strictly from `resolved.orgId` (or verified `req.tenant.orgId`), never from client query/body/header parameters.
   * Rejects passes where `status === 'REVOKED'`, `status === 'EXPIRED'`, or `validity.endDate <= new Date()` with `404`.
   * Returns only the strict bearer-safe field allowlist: `_id`, `shortKey`, `passType`, `status`, `purpose`, `visitorDetails.name`, `vehicleDetails.number`, and `validity.{startDate, endDate, timeWindowStart, timeWindowEnd}`.

### 5.3 Verification Result
* Command: `node --test tests/phase4c_low_remediation.test.mjs`
* Result: **17 / 17 PASS** (`0` failures), including `A.10` and `A.11`.

---

## 6. Task D Regression Matrix

| Test Suite | Runner | Total Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `tests/google.provider.test.mjs` | `node --test` | 8 | 8 | 0 | **PASS** |
| `tests/apple.provider.test.mjs` | `node --test` | 6 | 6 | 0 | **PASS** |
| `tests/authSpamEmailVerification.test.mjs` | `node --test` | 19 | 19 | 0 | **PASS** |
| `tests/financial.reconciliation.phase7.test.mjs` | `node --test` | 14 | 14 | 0 | **PASS** |
| `tests/phase4b1_critical_remediation.test.mjs` | `node --test` | 15 | 15 | 0 | **PASS** |
| `tests/phase4c_low_remediation.test.mjs` | `node --test` | 17 | 17 | 0 | **PASS** |
| `tests/features/visitorTenant.integration.test.js` | `Jest (ESM)` | 6 | 6 | 0 | **PASS** |
| **TOTAL** | **Combined** | **85** | **85** | **0** | **100% PASS** |

---

## 7. Final Verdict

All residual security items from Phase 2 Topic 2.1 (Google SSO configuration/claim verification, legacy email-verification policy and session/OTP lifecycle hardening, and public visitor-pass token boundary enforcement) have been remediated, verified against the live codebase, and confirmed with **85 / 85 passing automated regression tests**.
