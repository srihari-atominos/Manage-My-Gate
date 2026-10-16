# Phase 6.4 — Critical & High-Severity Tenant Isolation Remediation Report

**Project:** Nahom / Manage-My-Gate Monorepo  
**Branch:** `security/phase2-repository-tenant-isolation`  
**Baseline HEAD SHA:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e`  
**Execution Timestamp:** 2026-10-12T17:21:00+05:30  
**Status:** Completed & Fully Verified  

---

## 1. Executive Summary

Phase 6.4 executed targeted remediations for the three Critical and High-Severity tenant-isolation vulnerabilities uncovered during the Phase 6.3 Residual Audit:

1. **FIND-6.3-R01 (Critical):** `InvoiceService.rejectOfflinePayment` runtime crash on undeclared `contextOrgId` variable (`ReferenceError`), missing tenant parameter injection in `InvoiceController.rejectPayment`, and potential cross-tenant status mutation.
2. **FIND-6.3-R02 (High):** `WalletService.verifyPaymentSignature` payment reuse vulnerability, missing authoritative payment binding to `orgId`, `userId`, currency, and gateway order IDs, and permissive cross-organization replay vulnerability.
3. **FIND-6.3-R03 (High):** `DirectoryRepository.getPaginatedDirectory` cross-community villa/unit leakage, unconstrained `$lookup` query against `villas`, and unprotected regular expression search input.

All three defects were remediated with strict tenant-isolation boundaries, fail-closed access checks, and schema-level validation. A dedicated automated test suite (`backend/tests/phase6_4_critical_high_remediation.test.mjs`) was authored and passed with **100% pass rate (19/19 passing tests)**. Regression suites from Phases 6.2A, 6.2B, and 6.2C were executed with zero regressions.

---

## 2. Git Safety & Baseline Verification

Before and throughout all changes, mandatory Git safety rules were enforced:

- **Active Branch:** `security/phase2-repository-tenant-isolation` (verified via `git branch --show-current`).
- **HEAD Commit SHA:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e` (verified via `git rev-parse HEAD`).
- **Working Tree Integrity:** All pre-existing modified and untracked files from earlier phases were preserved intact. No destructive commands (`git reset`, `git clean`, `git checkout .`, `git stash`) were executed.
- **Documentation Safety:** `project-knowledge.md` and `working.md` were left strictly unmodified (no `hukum` trigger provided).
- **Scope Containment:** Scope was strictly bounded to FIND-6.3-R01, FIND-6.3-R02, and FIND-6.3-R03. Findings R04–R10 were not modified.

---

## 3. Remediation Details

### 3.1 FIND-6.3-R01 — Invoice Offline Payment Rejection Scope & ReferenceError Closure

#### Root Cause Analysis
In `backend/src/features/invoice/invoice.services.js`, `rejectOfflinePayment` contained code referencing `contextOrgId` to check `if (!isPlatform && contextOrgId && ...)`. However, `contextOrgId` was never declared or passed into the function signature. When an admin attempted to reject an offline payment, JavaScript threw a fatal `ReferenceError: contextOrgId is not defined`, crashing the request thread.
Furthermore, `invoice.controller.js` did not extract `req.tenant?.orgId` or pass tenant context down to `invoiceService.rejectOfflinePayment`, creating an unverified pathway where community admins could mutate payments for foreign communities.

#### Implemented Remediation
1. **Controller Layer (`backend/src/features/invoice/invoice.controller.js`):**
   - Extracted `const orgId = req.tenant?.orgId;` and `const isPlatform = Boolean(req.tenant?.isPlatform);`.
   - Added fail-closed check: `if (!isPlatform && !orgId) throw new HttpError(403, 'Tenant context is required');`.
   - Passed `orgId` and `isPlatform` into `invoiceService.rejectOfflinePayment(id, adminUserId, rejectionReason, orgId, isPlatform)`.
   - Also reinforced tenant boundaries in `settleOffline`, `recordCashPayment`, `getCashCollections`, `getDashboardKPIs`, `getAllInvoices`, and `getInvoiceById`.

2. **Service Layer (`backend/src/features/invoice/invoice.services.js`):**
   - Updated signature: `async rejectOfflinePayment(invoiceId, adminUserIdOrReason, rejectionReasonParam, contextOrgId, isPlatform = false)`.
   - Normalised parameter parsing to support both positional and object call styles.
   - Evaluated canonical invoice organization identifier:
     `const targetOrgId = (invoice.communityId?._id || invoice.communityId || invoice.orgId?._id || invoice.orgId)?.toString();`
   - Enforced fail-closed behavior for non-platform admins:
     `if (!isPlatformAdmin && !contextOrgId) throw new HttpError(403, 'Tenant context is required to reject offline payments.');`
   - Enforced tenant matching:
     `if (!isPlatformAdmin && targetOrgId && String(contextOrgId) !== targetOrgId) throw new HttpError(403, 'Forbidden. This Invoice belongs to another community.');`
   - Added legacy invoice self-healing before persisting:
     `if (!invoice.communityId && invoice.orgId) invoice.communityId = invoice.orgId;`
     `if (!invoice.orgId && invoice.communityId) invoice.orgId = invoice.communityId;`

---

### 3.2 FIND-6.3-R02 — Wallet Payment Verification Binding & Cross-Tenant Replay Prevention

#### Root Cause Analysis
In `backend/src/features/wallet/wallet.service.js`, `verifyPaymentSignature` accepted `userId` and `orgId` but had two vulnerabilities:
1. Fallback logic in `addMoney` and `createPaymentOrder` fell back to a default organization from the database (`Organization.findOne({})`) or `process.env.PLATFORM_ORG_ID` if `orgId` was omitted, violating strict tenant isolation.
2. In `verifyPaymentSignature`, if a client presented an authoritative payment record or order ID from Organization A, it could be verified against Organization B because the payment record's `orgId` and `userId` were not strictly verified against the caller's session parameters.
3. In idempotency checks, a previously settled payment record could be replayed across different organizations without an explicit tenant mismatch check.

#### Implemented Remediation
1. **Removed Silent Fallbacks:**
   - In `walletService.addMoney`: Removed `Organization.findOne()` fallback; throws `HttpError(400, 'Valid Organization ID is required to process wallet transactions.')` immediately if `orgId` is missing.
   - In `walletService.createRechargeOrder`: Removed `defaultOrg` and `PLATFORM_ORG_ID` fallbacks; throws `HttpError(400, 'Valid Organization ID is required to process wallet transactions.')`.

2. **Strict Verification Binding in `verifyPaymentSignature`:**
   - Pre-validation fails closed if `!orgId` or `!userId` with `HttpError(400)`.
   - Authoritative Payment Record Validation:
     - **Tenant Scope:** `if (!paymentOrgId || paymentOrgId !== String(orgId)) throw new HttpError(403, 'Forbidden. Payment transaction belongs to another organization.');`
     - **User Scope:** `if (paymentUserId && paymentUserId !== String(userId)) throw new HttpError(403, 'Forbidden. Payment transaction was initiated by another user.');`
     - **Currency Validation:** `if (paymentRecord.currency && paymentRecord.currency !== 'INR') throw new HttpError(400, 'Invalid currency for wallet recharge.');`
     - **Order ID Consistency:** `if (razorpay_order_id && paymentRecord.gatewayTransactionId && paymentRecord.gatewayTransactionId !== razorpay_order_id) throw new HttpError(400, 'Gateway order ID does not match authoritative payment record.');`

3. **Cross-Tenant Replay Prevention in Idempotency Guards:**
   - Added tenant verification to both pre-session and in-session idempotency guards:
     `if (existingTxn.orgId && existingTxn.orgId.toString() !== String(orgId)) throw new HttpError(403, 'Forbidden. Transaction was settled in another organization.');`
   - Explicitly bound created `WalletTransaction` to authoritative `orgId: orgId`.

---

### 3.3 FIND-6.3-R03 — Directory Villa Aggregation Pipeline Scope & Unit Leakage Prevention

#### Root Cause Analysis
In `backend/src/features/directory/directory.repository.js`, `getPaginatedDirectory` performed a `$lookup` into `villas` with an unconstrained `$or` condition:
```javascript
$lookup: {
  from: 'villas',
  let: { orgVillaId: '$villaId', userVillaId: '$user.villaId' },
  pipeline: [{
    $match: {
      $expr: {
        $or: [
          { $eq: ['$_id', '$$orgVillaId'] },
          { $eq: ['$_id', '$$userVillaId'] }
        ]
      }
    }
  }]
}
```
If a resident lived in multiple communities (e.g., owned Villa B in Org B, but had a resident membership in Org A), their global `user.villaId` pointing to Villa B would match the `$lookup` pipeline during an Org A query. Furthermore, the projection resolved `unitNumber` as:
`$ifNull: ['$villa.unitNumber', '$villa.name', '$user.unitNumber', '']`
This leaked the user's unit number from foreign communities into the Org A directory. Additionally, the `search` filter constructed a `new RegExp(search.trim(), 'i')` without escaping regex metacharacters, leaving the endpoint susceptible to regex injection / ReDoS.

#### Implemented Remediation
1. **Constrained `$lookup` Pipeline to Active Organization:**
   - Injected `targetOrgId: cleanOrgId` into `$lookup.let`.
   - Constrained `$lookup.pipeline.$match` with `$expr.$and`:
     ```javascript
     $expr: {
       $and: [
         { $eq: ['$orgId', '$$targetOrgId'] },
         {
           $or: [
             { $and: [{ $ne: [{ $ifNull: ['$$orgVillaId', null] }, null] }, { $eq: ['$_id', '$$orgVillaId'] }] },
             { $and: [{ $eq: [{ $ifNull: ['$$orgVillaId', null] }, null] }, { $ne: [{ $ifNull: ['$$userVillaId', null] }, null] }, { $eq: ['$_id', '$$userVillaId'] }] },
           ],
         },
       ],
     }
     ```
   - Villas without `orgId` matching the active community are completely excluded.

2. **Cleaned Field Projections:**
   - Changed `unitNumber` projection to:
     `unitNumber: { $ifNull: ['$villa.unitNumber', '$villa.name', ''] }`
   - Changed `intercomNumber` projection to:
     `intercomNumber: { $ifNull: ['$villa.unitNumber', '$villa.name', ''] }`
   - Removed fallback to `$user.unitNumber`, eliminating any cross-tenant leakage of global user address metadata.

3. **ReDoS / Special Character Protection:**
   - Imported `escapeRegex` from `../../utils/regex.utils.js`.
   - Sanitized search string prior to compiling `RegExp`:
     `const escapedSearch = escapeRegex(search.trim());`
     `const searchRegex = new RegExp(escapedSearch, 'i');`

---

## 4. Verification & Automated Test Results

### 4.1 Dedicated Phase 6.4 Test Suite
A dedicated automated test suite was constructed at `backend/tests/phase6_4_critical_high_remediation.test.mjs` verifying all edge cases:

```
Phase 6.4 Critical & High-Severity Tenant Isolation Remediation Suite
  Area 1: FIND-6.3-R01 — Invoice Offline Payment Rejection Scope
    ✔ 1.1 - Non-platform admin with matching orgId rejects offline payment successfully (200)
    ✔ 1.2 - Cross-tenant rejection attempt (Admin Org A rejecting Org B invoice) is rejected with 403 Forbidden
    ✔ 1.3 - Non-platform admin missing tenant context fails closed with 403
    ✔ 1.4 - Legacy invoice with only orgId is correctly validated and rejected if cross-tenant
    ✔ 1.5 - Former ReferenceError path no longer throws ReferenceError
    ✔ 1.6 - Platform super admin can reject offline payment without tenant constraint
  Area 2: FIND-6.3-R02 — Payment Verification Organization Scope
    ✔ 2.1 - Legitimate wallet recharge verification succeeds for same tenant (200)
    ✔ 2.2 - Cross-tenant payment reuse attempt (Org A payment presented to Org B) is rejected with 403 Forbidden
    ✔ 2.3 - Mismatched user ID on paymentRecord is rejected with 403 Forbidden
    ✔ 2.4 - Mismatched gateway order ID is rejected with 400
    ✔ 2.5 - Missing orgId or userId fails closed with 400
    ✔ 2.6 - Repeated verification is idempotent and does not credit wallet balance twice
    ✔ 2.7 - Replay of settled payment across organizations is rejected with 403 Forbidden
  Area 3: FIND-6.3-R03 — Directory Multi-Tenant Villa Lookup Isolation
    ✔ 3.1 - User belonging to Org A with villa in Org A correctly exposes unit details
    ✔ 3.2 - Multi-tenant user with villa in Org B does NOT leak unitNumber into Org A directory
    ✔ 3.3 - Directory in Org B correctly displays unit details for Org B residents
    ✔ 3.4 - Foreign membership villa ID belonging to Org B is suppressed when queried in Org A
    ✔ 3.5 - Villa records with null or missing orgId are not exposed
    ✔ 3.6 - Directory search with special regex characters executes safely without ReDoS

TOTAL: 19 tests, 19 passed, 0 failed (100% PASS RATE)
```

### 4.2 Full Regression Test Suite Execution
All preceding remediation test suites were executed to verify zero regression across the system:

| Test Suite | Scope | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `phase6_4_critical_high_remediation.test.mjs` | FIND-6.3-R01, R02, R03 | 19 | 19 | 0 | **PASS (100%)** |
| `phase6_2a_high_remediation.test.mjs` | FIND-6.1-H01 to H04 | 14 | 14 | 0 | **PASS (100%)** |
| `phase6_2b_medium_remediation.test.mjs` | FIND-6.1-M01 to M05 | 22 | 22 | 0 | **PASS (100%)** |
| `phase6_2c_low_remediation.test.mjs` | FIND-6.1-L01 to L05 | 18 | 18 | 0 | **PASS (100%)** |
| **Combined** | **Complete Phase 6 Security Program** | **73** | **73** | **0** | **100% GREEN** |

---

## 5. Architectural Compliance Verification

Against `.agents/rules/backend-rules.md` and `.agents/rules/global-rules.md`:

1. **One Model, One Feature:** All changes remained within their respective features (`invoice`, `wallet`, `directory`).
2. **Cross-Feature Communication:** Cross-feature calls route exclusively through service interfaces (e.g. `unifiedPaymentService` to `walletService`, `invoiceService` via service methods). No foreign repositories were accessed directly.
3. **No Direct Socket Emissions in Services:** Real-time communications emit events via Node EventEmitters (`walletEventEmitter`, `paymentEventEmitter`); transport handlers reside in `.socket.js`.
4. **No Hardcoded Credentials:** Gateway credentials dynamically resolve per organization via `integrationHubService` and `paymentConfigResolver`.
5. **No Root `.env` Usage:** Monorepo environment isolation preserved.

---

## 6. Git Status Summary

```
On branch security/phase2-repository-tenant-isolation
Your branch is up to date with 'origin/security/phase2-repository-tenant-isolation'.

Phase 6.4 Modified Files:
  M backend/src/features/directory/directory.repository.js
  M backend/src/features/invoice/invoice.controller.js
  M backend/src/features/invoice/invoice.services.js
  M backend/src/features/wallet/wallet.service.js
  ?? backend/tests/phase6_4_critical_high_remediation.test.mjs
  ?? PHASE_6_4_CRITICAL_HIGH_REMEDIATION_REPORT.md
```

All changes remain cleanly staged / unstaged in the active branch without any destructive Git operations, commits, or branch transitions.
