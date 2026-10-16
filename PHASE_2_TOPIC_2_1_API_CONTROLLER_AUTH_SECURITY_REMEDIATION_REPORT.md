# Phase 2 — Topic 2.1: API / Controller Security Gap Closure & Authentication Verification Audit Report

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Primary Scope:** API / Controller Tenant Isolation, BOLA/IDOR, Authentication & Email Verification  
**Branch:** `security/phase2-repository-tenant-isolation`  
**Reported Baseline Commit:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e`  
**Actual Audited HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef` (`HEAD~1` is `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e`)  
**Audit Date:** 2026-10-13  

---

## 1. Executive Summary

This report documents the evidence-based source code audit, security gap closure, and executable regression verification for **Phase 2 — Topic 2.1: API / Controller Security Gap Closure & Authentication Verification Audit**.

Rather than relying on prior status reports, every in-scope controller, service, repository, authentication flow, and SSO provider was audited directly against the checked-out codebase and verified through automated integration and unit test suites.

### Key Outcomes
1. **Phase A (Previously Reported API/Controller Fixes):** Audited all 8 reported enforcement areas (`invoice.controller.js`, `workspace.controller.js`, `auth.controller.js`, `visitorLog.controller.js`, `blacklist.controller.js`, workspace module toggle/delete, reconciliation operations, and visitor-pass service/repository operations). Identified and closed remaining partial gaps in workspace repository mutation filters, reconciliation tenant resolution, and visitor-pass service/repository tenant enforcement.
2. **Phase B (Reconciliation Financial BOLA/IDOR):** Hardened `resolveTenantOrgId` in `reconciliation.controller.js` so that when `req.tenant` is populated by `verifyTenantContext`, platform status is read strictly from `req.tenant.isPlatform` rather than unverified JWT flags, client-supplied `orgId`/`communityId` overrides are ignored for non-platform callers, and missing tenant context fails closed with HTTP `400`. Verified across all 6 endpoints (`getDashboard`, `uploadStatement`, `runAutoMatch`, `confirmMatch`, `flagDiscrepancy`, `runReconciliation`).
3. **Phase C (Visitor-Pass Service/Repository Tenant Context):** Enforced mandatory `orgId` (`requireOrgId`) across `visitorPass.service.js` and `visitorPass.repository.js` (`create`, `findById`, `findByIdWithParties`, `updateStatus`, `update`, `expireEndedPasses`, `consumeForEntry`), fixed cross-feature caller argument ordering in `visitorLog.service.js`, `visitorLog.controller.js`, and `complaint.service.js`, and updated `getPublicPass` (`GET /api/v1/visitors/passes/public/:tokenCode`) to resolve the token's `orgId` from `VisitorPassToken` when `req.tenant` is absent on public routes. Removed debug `console.log` statements from `visitorPass.router.js` and `visitorPassToken.repository.js`.
4. **Phase D (Independent Verification of Email-Verification Remediation):** Audited all 7 areas (`D1–D7`). Identified and remediated 6 concrete bypasses/bugs in the initial email-verification implementation:
   - **D1/D3 (Reused Invite Token Login Bypass):** Blocked already-accepted (`status === 'Active'`) `inviteToken` payloads from re-verifying or re-activating an unverified account during `POST /api/v1/auth/login`.
   - **D1/D5 (SSO `wasPendingVerification` Ordering Bug):** Fixed a time-of-check/time-of-mutation bug in `loginWithGoogle` and `_handleSsoAuthentication` where `_updateExistingSsoUser()` mutated `user.status = 'Active'` before `wasPendingVerification` was evaluated, which had suppressed `OrgMembership` activation and welcome emails. Added explicit post-processing enforcement (`if (user.status !== 'Active' || user.emailVerified === false) throw new HttpError(403, ...)`).
   - **D1 (`setup-account-password` Pre-Auth Takeover / Verification Bypass):** Hardened `setupAccountPassword` so accounts that already have a password or are self-registered (`status === 'Pending Verification'` without a valid `Invited` status or `inviteToken`) cannot use `/api/v1/auth/setup-account-password` to overwrite credentials or self-activate without email verification.
   - **D3 (Invite Handoff Hardening):** Added `user.emailVerified === false` rejection in `createInviteHandoff` and `exchangeInviteHandoff`, and added `deleteAllByIdentifier` to `otpService` so email changes cleanly purge all outstanding OTPs.
   - **D5 (Strict SSO `email_verified` / `xms_edov` Claim Validation):** Hardened `google.provider.js`, `apple.provider.js`, and `microsoft.provider.js` to fail closed on `false`, `'false'`, `null`, or malformed verification claims.
   - **D1 (`isAuthenticated` Middleware Status Precedence):** Ordered the `user.status === 'Pending Verification' || user.emailVerified === false` check before the generic `user.status !== 'Active'` check in `auth.middleware.js` so unverified users consistently receive `403 Email verification required`.

---

## 2. Git Baseline and Working-Tree Inventory

### 2.1 Branch & Commit Baseline
- **Current Branch:** `security/phase2-repository-tenant-isolation`
- **Actual HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef` (`feat(security): enforce backend email verification and block spam email login`)
- **Reported Baseline Commit:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e` (`HEAD~1`, parent commit of `HEAD`)
- **Explanation of Difference:** Commit `9423be17a1f3e92f846e20263d7504f3f0818aef` was committed directly on top of `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e` on branch `security/phase2-repository-tenant-isolation`. Per Section 2.9 of the instructions, the repository was not reset or forced back; the current checked-out code was audited directly.

### 2.2 Working-Tree Summary Before Audit Changes
At the start of the audit, the working tree contained pre-existing unstaged modifications across 135 tracked files and 29 untracked files/directories (including Phase 2/3/4 security remediation work, mobile app updates, and prior reports). All pre-existing modifications and untracked files were preserved intact.

---

## 3. Phase A Audit Matrix: Previously Reported API/Controller Fixes

| Area | Files Inspected | Audit Classification | Evidence & Explanation |
| :--- | :--- | :--- | :--- |
| **1. `invoice.controller.js` Tenant Override Prevention** | `backend/src/features/invoice/invoice.controller.js`, `backend/src/features/invoice/invoice.services.js`, `backend/src/features/invoice/invoice.repository.js` | **VERIFIED FIXED** | `resolveInvoiceScope` (lines 7–16) reads `req.tenant?.orgId` and `req.tenant?.isPlatform === true`. Non-platform users cannot override `orgId` via `req.query.communityId` or `req.body.communityId`. Verified by `tests/phase4b1_critical_remediation.test.mjs` (`Area 2: Invoice Cross-Tenant Read & Financial Mutation Protection`, subtests `B.1–B.7`). |
| **2. `workspace.controller.js` Trusted Context & Platform Authorization** | `backend/src/features/workspace/workspace.controller.js`, `backend/src/features/workspace/workspace.service.js`, `backend/src/features/workspace/workspace.repository.js` | **PARTIALLY FIXED → REMEDIATED** | `workspace.controller.js` (`resolveWorkspaceContext`, lines 7–31) properly restricted `organizationId` override to platform users. However, in `workspace.repository.js`, `update`, `delete`, `addModule`, `updateModule`, `deleteModule`, and `reorderModules` queried solely by `{ _id: id }` without `organizationId: orgId`, and `workspace.service.js` (`getWorkspaceById`, `getWorkspaces`) did not fail closed if `!isPlatform && !orgId`. Remediated in `workspace.repository.js` and `workspace.service.js` and verified via `tests/phase4b1_critical_remediation.test.mjs` (`A.1–A.11`). |
| **3. `auth.controller.js` Pre-Authentication Context Validation** | `backend/src/features/auth/auth.controller.js`, `backend/src/features/auth/auth.services.js` | **PARTIALLY FIXED → REMEDIATED** | `auth.controller.js` delegates pre-auth flows to `auth.services.js`, which validates invitation tokens, email match, and organization membership. However, `login()`, `setupAccountPassword()`, and SSO flows had edge-case email-verification bypasses (documented in Section 6) that were remediated during this audit. |
| **4. `visitorLog.controller.js` Route Parameter & Payload Isolation** | `backend/src/features/visitorLog/visitorLog.controller.js`, `backend/src/features/visitorLog/visitorLog.service.js`, `backend/src/features/visitorLog/visitorLog.repository.js` | **PARTIALLY FIXED → REMEDIATED** | `visitorLog.controller.js` enforced `req.tenant.orgId`, strip-guarded `req.body.orgId`, and validated `:orgId` route params against `req.tenant.orgId`. However, `visitorLog.controller.js` (`resolveWalkIn`) passed `(id, decision, req.user, req.tenant?.orgId)` in the wrong parameter order to `visitorLogService.resolveWalkInRequest(logId, orgId, action, resolvedByUserId, notes)`, and `visitorLog.service.js` called `visitorPassService.verifyPassForEntry`, `usePass`, and `updatePassStatus` with swapped arguments. Remediated across `visitorLog.controller.js`, `visitorLog.service.js`, and `visitorLog.repository.js`. |
| **5. `blacklist.controller.js` Forged `orgId` Prevention** | `backend/src/features/security/blacklist.controller.js`, `backend/src/features/security/blacklist.service.js`, `backend/src/features/security/blacklist.repository.js` | **VERIFIED FIXED** | `blacklist.controller.js` extracts `const orgId = req.tenant?.orgId` and passes `{ ...req.body, orgId }` (overwriting any forged `req.body.orgId`), while `getAll`, `check`, and `remove` strictly enforce `req.tenant?.orgId`. Verified by `tests/phase4c_low_remediation.test.mjs` (`B.1–B.4`). |
| **6. Workspace Module Toggle & Delete Scoping** | `backend/src/features/workspace/workspace.controller.js`, `backend/src/features/workspace/workspace.service.js`, `backend/src/features/workspace/workspace.repository.js` | **PARTIALLY FIXED → REMEDIATED** | Service layer checked `workspace.organizationId !== orgId` prior to mutation, but repository methods (`addModule`, `updateModule`, `deleteModule`, `reorderModules`, `update`, `delete`) did not include `organizationId: orgId` in the MongoDB filter (`_idFilter(id, orgId)`). Remediated in `workspace.repository.js` and `workspace.service.js`. |
| **7. Reconciliation Operations Ownership** | `backend/src/features/ledger/reconciliation/reconciliation.controller.js`, `backend/src/features/ledger/reconciliation/reconciliationReport.service.js`, `backend/src/features/ledger/reconciliation/historicalReconciliation.service.js` | **PARTIALLY FIXED → REMEDIATED** | Service methods enforced `orgId` ownership on `BankStatement` and `BankTransaction`, but `resolveTenantOrgId` in `reconciliation.controller.js` checked `req.user?.isPlatform` fallback even when `req.tenant` was present and could fall back to `req.user?.orgId` when `req.tenant` was missing. Remediated in Phase B (Section 4). |
| **8. Visitor-Pass Service & Repository Tenant Scope** | `backend/src/features/visitorPass/visitorPass.controller.js`, `backend/src/features/visitorPass/visitorPass.service.js`, `backend/src/features/visitorPass/visitorPass.repository.js` | **PARTIALLY FIXED → REMEDIATED** | `visitorPass.repository.js` had optional `if (orgId)` guards and unscoped `create`, `updateStatus`, `update`, and `expireEndedPasses`. `visitorPass.service.js` did not enforce `requireOrgId` in `createPass`, `getPassById`, `updatePassStatus`, `revokePass`, `verifyPassForEntry`, `usePass`, or `getActivePasses`. Remediated in Phase C (Section 5). |

---

## 4. Phase B Remediation: Reconciliation Financial BOLA/IDOR

### 4.1 Findings Audited
In `backend/src/features/ledger/reconciliation/reconciliation.controller.js`, `resolveTenantOrgId(req)` previously computed:
```js
const isPlatform = Boolean(req.tenant?.isPlatform || req.user?.isPlatform);
const tenantOrgId = req.tenant?.orgId || req.user?.orgId;
```
When `verifyTenantContext` middleware ran (`req.tenant` present), falling back to `req.user?.isPlatform` could allow a stale JWT flag to bypass contextual downgrading (`req.tenant.isPlatform === false`), and when `req.tenant` was absent in direct controller invocations, falling back to `req.user?.orgId` bypassed `verifyTenantContext`.

### 4.2 Code Remediation Implemented
1. **`backend/src/features/ledger/reconciliation/reconciliation.controller.js`:**
   - Updated `resolveTenantOrgId(req)` (lines 9–28) so that:
     - When `req.tenant` is present, platform status is derived strictly from `req.tenant.isPlatform === true` and tenant scope from `req.tenant.orgId`.
     - Non-platform callers ALWAYS use `req.tenant.orgId`; any `req.body.orgId`, `req.body.communityId`, `req.query.orgId`, or `req.query.communityId` is ignored.
     - Platform callers (`isPlatform === true`) may target an explicit `requestedOrgId` (validated as a 24-hex ObjectId) or default to `tenantOrgId`.
     - Missing or malformed `orgId` fails closed with `HttpError(400, 'Valid tenant organization context is required for reconciliation operations')`.
   - Enforced `resolveTenantOrgId(req)` across all 6 endpoints:
     - `getDashboard`
     - `uploadStatement`
     - `runAutoMatch`
     - `confirmMatch`
     - `flagDiscrepancy`
     - `runReconciliation`
2. **`backend/src/features/ledger/reconciliation/reconciliationReport.service.js` & `historicalReconciliation.service.js`:**
   - Verified that `getStatementOrThrow(statementId, orgId)` queries `BankStatement.findOne({ _id: statementId, orgId })`, `getScopedTransactionOrThrow(bankTransactionId, orgId)` queries `BankTransaction.findOne({ _id: bankTransactionId, orgId })`, `confirmManualMatch` verifies invoice ownership (`String(invoice.communityId) !== String(orgId)` → `403 Cannot match bank transaction against an invoice from another organization`), and `reconcileLedger` requires `orgId` and scopes all `Invoice`, `Payment`, and `JournalEntry` queries to `orgId`.

### 4.3 Automated Verification
Verified in `backend/tests/financial.reconciliation.phase7.test.mjs` (**10 / 10 PASS**), covering:
- Upload statement & auto-match within Tenant A
- Manual match confirmation & discrepancy flagging within Tenant A
- Cross-tenant `runAutoMatch` rejection (`404 Bank statement not found`)
- Cross-tenant `confirmMatch` rejection (`404 Bank transaction not found`)
- Cross-tenant invoice injection on `confirmMatch` rejection (`403`)
- Cross-tenant `flagDiscrepancy` rejection (`404 Bank transaction not found`)
- Cross-tenant `orgId` body/query override resistance on `getDashboard` and `runReconciliation`
- Missing tenant context fail-closed (`400`) across all 6 controller methods

---

## 5. Phase C Remediation: Visitor-Pass Service/Repository Tenant Context

### 5.1 Findings Audited
1. **`visitorPass.repository.js`:**
   - `create(passData)` did not require `passData.orgId`.
   - `findById(id, orgId)` and `findByIdWithParties(id, orgId)` treated `orgId` as optional (`if (orgId) query.orgId = orgId`).
   - `updateStatus(id, status, session, extraFields)` and `update(id, updateData, session)` queried by `_id` only without `orgId`.
   - `expireEndedPasses(now)` ran `VisitorPass.updateMany` globally across all organizations when `orgId` was omitted.
   - `consumeForEntry(id, orgId, now, session)` treated `orgId` as optional (`if (orgId) filter.orgId = orgId`).
2. **`visitorPass.service.js`:**
   - `createPass`, `getPassById`, `updatePassStatus`, `revokePass`, `verifyPassForEntry`, `usePass`, and `getActivePasses` did not enforce a mandatory `orgId` check (`requireOrgId`) and did not pass `orgId` into `updateStatus`, `update`, and `expireEndedPasses`.
3. **Public Pass Route (`GET /api/v1/visitors/passes/public/:tokenCode`):**
   - `getPublicPass` in `visitorPass.controller.js` passed `req.tenant?.orgId` (which is `undefined` on the unauthenticated public route) into `visitorPassService.verifyPassForEntry(tokenCode, req.tenant?.orgId)`.
4. **Cross-Feature Caller Mismatches & Debug Logs:**
   - `visitorLog.service.js` (`logPreApprovedEntry`, `resolveWalkInRequest`, `checkout`), `visitorLog.controller.js` (`resolveWalkIn`), and `complaint.service.js` (`revokePass`) had mismatched parameter positions when calling `visitorPassService` / `visitorLogService`.
   - `visitorPass.router.js` and `visitorPassToken.repository.js` contained leftover debug `console.log` statements (`[DEBUG PASS]`, `[DEBUG TOKEN]`).

### 5.2 Code Remediation Implemented
1. **`backend/src/features/visitorPass/visitorPass.repository.js`:**
   - Added `requireOrgId(orgId, operation)` helper throwing `HttpError(400, ...)`.
   - Enforced `requireOrgId` and `{ _id: id, orgId: scopedOrgId }` on `create`, `findById`, `findByIdWithParties`, `updateStatus(id, orgId, status, session, extraFields)`, `update(id, orgId, updateData, session)`, `expireEndedPasses(orgId, now)`, and `consumeForEntry(id, orgId, now, session)`.
2. **`backend/src/features/visitorPass/visitorPass.service.js`:**
   - Added `requireOrgId(orgId, operation)` and enforced it in `createPass`, `getPassById`, `updatePassStatus`, `revokePass`, `verifyPassForEntry`, `usePass`, and `getActivePasses`.
   - Scoped `expireEndedPasses(scopedOrgId, now)` and `updateStatus(passId, scopedOrgId, ...)` to `scopedOrgId`.
3. **`backend/src/features/visitorPassToken/visitorPassToken.service.js` & `visitorPass.controller.js`:**
   - Added `resolveTokenByCode(tokenCode)` in `visitorPassToken.service.js` and updated `getPublicPass` in `visitorPass.controller.js` to resolve the token's `orgId` from `VisitorPassToken` when `req.tenant?.orgId` is absent on the public share link route.
   - Updated `createPass` in `visitorPass.controller.js` to strip any client-supplied `req.body.orgId` and strictly inject `req.tenant.orgId`.
4. **`backend/src/features/visitorLog/visitorLog.service.js`, `visitorLog.controller.js`, `visitorLog.repository.js`, and `complaint.service.js`:**
   - Fixed parameter order in `visitorLog.controller.js` (`resolveWalkIn`), `visitorLog.service.js` (`logPreApprovedEntry`, `resolveWalkInRequest`, `checkout`), `visitorLog.repository.js` (`findActiveLogByPassId`), and `complaint.service.js` (`revokePass`).
5. **Debug Logging Cleanup:**
   - Removed `[DEBUG PASS]` from `visitorPass.router.js` and `[DEBUG TOKEN]` from `visitorPassToken.repository.js`.

### 5.3 Automated Verification
- `backend/tests/phase4c_low_remediation.test.mjs`: **16 / 16 PASS** (including `A.1–A.10` covering HTTP cross-tenant isolation, service/repository fail-closed enforcement, cross-tenant `getPassById`/`updatePassStatus`/`usePass`/`revokePass`, scoped `expireEndedPasses`, and public token lookup `getPublicPass`).
- `backend/tests/features/visitorTenant.integration.test.js`: **6 / 6 PASS** (Jest replica-set integration suite covering `F-01: Visitor Log Checkout` and `F-02: Visitor Pass Mutations`).

---

## 6. Phase D Independent Verification: Email-Verification Remediation

| Sub-Task | Files Audited | Audit Status | Findings & Remediation |
| :--- | :--- | :--- | :--- |
| **D1. Registration & Login Verification Policy** | `auth.services.js`, `user.model.js`, `auth.middleware.js`, `session.services.js` | **PARTIALLY FIXED → REMEDIATED** | Self-registration sets `status: 'Pending Verification'` and `emailVerified: false`, and password login, OTP login, `refreshToken`, `switchOrganizationContext`, `getCurrentContext`, and `isAuthenticated` reject unverified users with `403`. **Gaps found & fixed:** (1) `login()` previously allowed a user with `status: 'Pending Verification'` to pass an already-accepted (`status === 'Active'`) `inviteToken` to re-verify their account; fixed by requiring `!invitationTokenProvided || membership.status === 'Invited'` and throwing `400 Invitation has already been accepted` when `membership.status === 'Active'`. (2) `setupAccountPassword()` previously allowed unauthenticated password overwrite or activation of self-registered `Pending Verification` users; fixed by rejecting accounts that already have a password or lack a valid `Invited` status/token. (3) `auth.middleware.js` checked `user.status !== 'Active'` (401) before `user.emailVerified === false` (403); reordered so `Pending Verification` and `emailVerified === false` consistently return `403`. |
| **D2. Verification Token / OTP Security** | `otp.services.js`, `otp.model.js`, `auth.services.js` | **VERIFIED FIXED** | OTP codes are generated with `crypto.randomInt(100000, 999999)`, bcrypt-hashed before storage, bound to lowercase `identifier` and `type: 'VERIFY'`, expire in 10 minutes (`expiresAt`), enforce a 3-attempt lockout (`attempts >= 3` deletes the OTP), and delete on success (single-use). |
| **D3. Invitation & OTP Flows** | `auth.services.js`, `user.services.js`, `otp.services.js` | **PARTIALLY FIXED → REMEDIATED** | Invitation acceptance (`acceptInvitation`, `setupAccountPassword`, `login` with pending `inviteToken`, `verifyLoginOTP` with pending `inviteToken`) requires exact email match against `membership.invitedEmail` or `user.email`. **Gaps found & fixed:** (1) `user.services.js` (`updateUserById`) called `otpService.deleteAllByIdentifier()`, which was missing on `OtpService`; implemented `deleteAllByIdentifier(identifier, session)` on `OtpService`. (2) Hardened `createInviteHandoff` and `exchangeInviteHandoff` to reject `user.emailVerified === false`. |
| **D4. Email Change Re-Verification** | `user.services.js`, `session.services.js`, `otp.services.js` | **PARTIALLY FIXED → REMEDIATED** | `user.services.js` (`updateUserById`) detects email changes (`normNewEmail !== normOldEmail`), sets `emailVerified = false`, `emailVerifiedAt = null`, `status = 'Pending Verification'`, revokes all active sessions via `sessionService.revokeAllUserSessions`, and clears OTPs via `otpService.deleteAllByIdentifier` for both old and new email addresses. With `otpService.deleteAllByIdentifier` implemented, Subtest 5 in `authSpamEmailVerification.test.mjs` passes completely. |
| **D5. Social / OAuth Provider Email Verification** | `google.provider.js`, `apple.provider.js`, `microsoft.provider.js`, `auth.services.js` | **PARTIALLY FIXED → REMEDIATED** | **Gaps found & fixed:** (1) In `auth.services.js` (`loginWithGoogle` and `_handleSsoAuthentication`), `wasPendingVerification` was evaluated *after* `_updateExistingSsoUser()` had already mutated `user.status = 'Active'`, making `wasPendingVerification` always `false` and skipping pending membership activation and welcome emails. Fixed by capturing `wasPendingVerification` *before* `_updateExistingSsoUser()` and enforcing `if (user.status !== 'Active' || user.emailVerified === false) throw new HttpError(403, ...)` before session creation. (2) Hardened `google.provider.js` (`rawPayload.email_verified === true`), `apple.provider.js` (`email_verified === true || email_verified === 'true'`), and `microsoft.provider.js` (strict boolean/string check on `email_verified` and `xms_edov`) to fail closed on `false`, `'false'`, `null`, or malformed values. |
| **D6. Disposable-Email Policy** | `auth.validateRules.js`, `auth.services.js` | **VERIFIED FIXED** | No brittle hardcoded domain blacklist is enforced; security relies on cryptographic proof of email ownership (OTP / invitation / verified OAuth provider claim), while preserving plus-addressing (`+tag`), subdomains, and custom TLDs. Verified by Subtests 9 and 10 in `authSpamEmailVerification.test.mjs`. |
| **D7. Frontend / Mobile Verification UX** | `frontend/src/features/auth/`, `mobile/mobile-app/app/(auth)/login.tsx`, `mobile/mobile-app/src/services/apiClient.ts` | **VERIFIED FIXED** | Frontend and mobile clients treat backend HTTP responses (`403` with `Email verification required`) as authoritative, surface the backend verification message, and never supply or trust client-side `emailVerified` flags. |

---

## 7. Additional In-Scope Security Findings and Remediations

1. **Workspace Repository Query-Level Tenant Scoping (`backend/src/features/workspace/workspace.repository.js`, `workspace.service.js`):**
   - Previously, `workspace.service.js` performed a read-before-write ownership check (`getWorkspaceById`), but the underlying repository write methods (`update`, `delete`, `addModule`, `updateModule`, `deleteModule`, `reorderModules`) executed `Workspace.findByIdAndUpdate(id, ...)` without `organizationId: orgId` in the query filter.
   - Remediated by introducing `_idFilter(id, orgId)` in `workspace.repository.js` and passing `orgId` from `workspace.service.js` into every repository mutation, plus failing closed in `getWorkspaceById` and `getWorkspaces` when `!isPlatform && !orgId`.
2. **Complaint Service Cross-Feature Visitor Pass Revocation (`backend/src/features/complaint/complaint.service.js`):**
   - `complaint.service.js` called `visitorPassService.revokePass(complaint.relatedPassId, userId, ...)` without passing `orgId` as the second argument. Updated to `visitorPassService.revokePass(complaint.relatedPassId, orgId, userId, ...)`.

---

## 8. Files Modified in This Task

The following files were modified specifically during this Phase 2 Topic 2.1 audit and remediation:

1. `backend/src/features/ledger/reconciliation/reconciliation.controller.js` — Strict `req.tenant` authority in `resolveTenantOrgId`, blocking client `orgId`/`communityId` overrides for non-platform users and failing closed on missing tenant context.
2. `backend/src/features/workspace/workspace.repository.js` — Added `_idFilter(id, orgId)` tenant scoping to `update`, `delete`, `addModule`, `updateModule`, `deleteModule`, and `reorderModules`.
3. `backend/src/features/workspace/workspace.service.js` — Enforced fail-closed `orgId` validation for non-platform callers in `getWorkspaces` and `getWorkspaceById`, and passed `orgId` to all repository mutation calls.
4. `backend/src/features/visitorPass/visitorPass.repository.js` — Enforced `requireOrgId` across `create`, `findById`, `findByIdWithParties`, `updateStatus`, `update`, `expireEndedPasses`, and `consumeForEntry`.
5. `backend/src/features/visitorPass/visitorPass.service.js` — Enforced `requireOrgId` across `createPass`, `getPassById`, `updatePassStatus`, `revokePass`, `verifyPassForEntry`, `usePass`, and `getActivePasses`, and propagated `scopedOrgId` to repository calls.
6. `backend/src/features/visitorPass/visitorPass.controller.js` — Enforced `req.tenant?.orgId` in `createPass` and resolved token `orgId` via `visitorPassTokenService.resolveTokenByCode` in `getPublicPass`.
7. `backend/src/features/visitorPass/visitorPass.router.js` — Removed debug `console.log` middleware.
8. `backend/src/features/visitorPassToken/visitorPassToken.repository.js` — Removed debug `console.log` statements.
9. `backend/src/features/visitorPassToken/visitorPassToken.service.js` — Added `resolveTokenByCode(tokenCode)` for public pass lookup tenant resolution.
10. `backend/src/features/visitorLog/visitorLog.controller.js` — Fixed argument order in `resolveWalkIn` (`resolveWalkInRequest`).
11. `backend/src/features/visitorLog/visitorLog.service.js` — Fixed argument order when calling `visitorPassService.verifyPassForEntry`, `usePass`, and `updatePassStatus`.
12. `backend/src/features/visitorLog/visitorLog.repository.js` — Required `orgId` in `findActiveLogByPassId(passId, orgId)`.
13. `backend/src/features/complaint/complaint.service.js` — Passed `orgId` to `visitorPassService.revokePass`.
14. `backend/src/features/auth/auth.services.js` — Fixed reused `inviteToken` login bypass, fixed `wasPendingVerification` ordering bug in `loginWithGoogle` and `_handleSsoAuthentication`, hardened `setupAccountPassword`, and hardened `createInviteHandoff` / `exchangeInviteHandoff`.
15. `backend/src/features/otp/otp.services.js` — Added `deleteAllByIdentifier(identifier, session)` to support full OTP invalidation upon email change.
16. `backend/src/features/userIdentity/providerAdapters/google.provider.js` — Enforced strict `rawPayload.email_verified === true` validation.
17. `backend/src/features/userIdentity/providerAdapters/apple.provider.js` — Enforced strict `email_verified` boolean/string validation (`true` / `'true'`) and rejected malformed values.
18. `backend/src/features/userIdentity/providerAdapters/microsoft.provider.js` — Enforced strict `email_verified` and `xms_edov` claim validation.
19. `backend/src/middlewares/auth.middleware.js` — Checked `user.status === 'Pending Verification' || user.emailVerified === false` (403) before generic `user.status !== 'Active'` (401).
20. `backend/tests/phase4b1_critical_remediation.test.mjs` — Added Workspace repository/service direct isolation tests (`A.10`, `A.11`).
21. `backend/tests/phase4c_low_remediation.test.mjs` — Added VisitorPass service/repository/public-pass tenant isolation tests (`A.8`, `A.9`, `A.10`).
22. `backend/tests/financial.reconciliation.phase7.test.mjs` — Added controller-level cross-tenant override and missing-context fail-closed tests (Tests 9 and 10).
23. `backend/tests/authSpamEmailVerification.test.mjs` — Added regression subtests 15, 16, and 17 covering reused `inviteToken` login rejection, `setup-account-password` protection, and strict SSO `email_verified` claim validation.

---

## 9. Preserved Pre-Existing Modified and Untracked Files

All pre-existing modified tracked files (135 files across `backend/`, `mobile/`, root `package.json`/`package-lock.json`, `patch.js`, `patch2.js`) and all pre-existing untracked files/directories (`PHASE_*.md`, `AUTHENTICATION_SPAM_EMAIL_FIX_REPORT.md`, `backend/tests/phase*.mjs`, `backend/src/features/security/`, `mobile/mobile-app/src/features/amenities/`, etc.) were preserved without any destructive git operations (`git reset`, `git clean`, `git checkout`, or `git stash` were never executed).

---

## 10. Automated Test Execution Results

| Test Suite | Command Executed | Total | Pass | Fail | Skip | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Phase 4B.1 Critical Remediation (`workspace`, `invoice`, `wallet`)** | `node --test tests/phase4b1_critical_remediation.test.mjs` | 19 | **19** | 0 | 0 | Includes new tests `A.10` & `A.11` for Workspace repository/service scoping |
| **Phase 4C Low Remediation (`visitorPass`, `blacklist`, `villa`, `masterPricing`)** | `node --test tests/phase4c_low_remediation.test.mjs` | 16 | **16** | 0 | 0 | Includes new tests `A.8`, `A.9`, `A.10` for VisitorPass service/repo/public route |
| **Financial Reconciliation Phase 7 (`reconciliation`)** | `node --test tests/financial.reconciliation.phase7.test.mjs` | 10 | **10** | 0 | 0 | Includes cross-tenant override & missing-context fail-closed tests |
| **Auth Spam Email & Verification Security (`D1–D7`)** | `node --test tests/authSpamEmailVerification.test.mjs` | 17 | **17** | 0 | 0 | All 17 subtests pass (including new subtests 15, 16, 17) |
| **Visitor Management Tenant Isolation (Jest Replica Set)** | `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/features/visitorTenant.integration.test.js` | 6 | **6** | 0 | 0 | `F-01: Visitor Log Checkout` (3/3) & `F-02: Visitor Pass Mutations` (3/3) |
| **Phase 4B.2 High Remediation (`notice`, `poll`, `facility`, `crm`)** | `node --test tests/phase4b2_high_remediation.test.mjs` | 20 | **20** | 0 | 0 | All 3 areas pass |
| **Phase 4B.3 Medium Remediation (`noticeComment`, `maintenance`, `platformCrm`)** | `node --test tests/phase4b3_medium_remediation.test.mjs` | 21 | **21** | 0 | 0 | All 3 areas pass |
| **Payment Security Suite** | `node --test tests/payment.security.test.mjs` | 4 | **4** | 0 | 0 | Mock payment environment restrictions & GCM tampering checks pass |
| **Apple Provider SSO Verification** | `node --test tests/apple.provider.test.mjs` | 6 | **6** | 0 | 0 | Audience, normalization, and malformed token rejection pass |
| **Google Provider SSO Verification** | `node --test tests/google.provider.test.mjs` | 7 | **5** | 2 | 0 | Subtests 3–7 pass; Subtests 1–2 assert hardcoded default `GOOGLE_CLIENT_ID` (`610778456829-...`) whereas `backend/.env` sets `GOOGLE_CLIENT_ID=691785946843-...` |

---

## 11. Residual Risks and Out-of-Scope Notes

1. **Environment-Dependent Assertion in `tests/google.provider.test.mjs`:**
   - Subtests 1 and 2 of `tests/google.provider.test.mjs` assert the fallback client ID string (`610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com`) from `src/config/config.js`, whereas `backend/.env` configures `GOOGLE_CLIENT_ID=691785946843-pbbuqms41e3cbdnprr3smoj8nd7a0i0i.apps.googleusercontent.com`. This is a test fixture expectation vs. local `.env` configuration difference, not a security defect in `google.provider.js`.
2. **Legacy Pre-Phase-2 Account Backfill:**
   - Existing legacy accounts in MongoDB that predate the `emailVerified` schema field (`emailVerified: undefined`) are treated as verified (`emailVerified !== false`) to prevent locking out existing production users, while all newly registered accounts or email-updated accounts explicitly receive `emailVerified: false` and `status: 'Pending Verification'`.

---

## 12. Final Security Verdict

**STATUS: PASS — ALL IN-SCOPE PHASE 2 TOPIC 2.1 API/CONTROLLER, RECONCILIATION, VISITOR-PASS, AND AUTHENTICATION EMAIL-VERIFICATION GAPS REMEDIATED AND VERIFIED.**

- **API/Controller Tenant Enforcement:** Verified & hardened (`invoice`, `workspace`, `visitorLog`, `blacklist`, `reconciliation`, `visitorPass`).
- **Reconciliation Financial BOLA/IDOR:** Closed (`resolveTenantOrgId` strictly honours `req.tenant` and blocks cross-tenant body/query overrides; **10/10** tests passing).
- **Visitor-Pass Service/Repository Isolation:** Closed (`requireOrgId` enforced across service and repository layers; **16/16** in `phase4c` and **6/6** in `visitorTenant.integration.test.js` passing).
- **Authentication & Email Verification (`D1–D7`):** Independently audited, 6 edge-case bypasses/bugs remediated, and **17/17** subtests in `tests/authSpamEmailVerification.test.mjs` passing.
