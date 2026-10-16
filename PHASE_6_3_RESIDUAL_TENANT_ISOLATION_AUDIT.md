# Phase 6.3: Residual Tenant-Isolation Audit Report

**Project:** Nahom / Manage-My-Gate  
**Branch:** `security/phase2-repository-tenant-isolation`  
**Baseline Commit:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e`  
**Audit Date:** October 12, 2026  
**Mode:** Read-Only Security Audit & Verification  

---

## Executive Summary

Following the completion of **Phase 6.2A** (High-Severity), **Phase 6.2B** (Medium-Severity), and **Phase 6.2C** (Low-Severity) search, filter, and pagination tenant-isolation remediations, a comprehensive, read-only architectural and database audit was performed across the backend codebase.

The audit verified that the primary objectives of Phases 6.2A–6.2C were successfully implemented:
- Complaint export filtering properly enforces immutable tenant scoping.
- Unassigned invoices with missing `communityId` no longer leak across tenants.
- Community notes routes enforce mandatory `tenantContext` middleware.
- Assessment carry-forward balances strictly isolate previous dues to the current community.
- Digital wallet mutations require valid organizational context and verified memberships.
- User preferences and notifications enforce active workspace validation.
- Regular expression inputs across search, filter, and lookup endpoints are sanitized against ReDoS.

However, a deep trace across aggregation pipelines (`$lookup`, `$unionWith`, `$facet`), cross-feature service interactions, payment verification workflows, session lifecycles, and database indexes uncovered **10 residual findings**, ranging from **Critical** (runtime exceptions and service-level bypasses) to **Low** (index optimizations and test coverage gaps).

---

## Audit Matrix & Findings Summary

| Finding ID | Severity | Area / Feature | Root Cause | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **FIND-6.3-R01** | **CRITICAL** | Invoice Service (`rejectOfflinePayment`) | Undeclared variable `contextOrgId` in service method | Runtime `ReferenceError: contextOrgId is not defined` and missing service-level tenant isolation |
| **FIND-6.3-R02** | **HIGH** | Wallet Service (`verifyPaymentSignature`) | Unvalidated `paymentRecord.orgId` vs caller `orgId` | Cross-tenant credit tampering: payment created in Org A can fund wallet in Org B |
| **FIND-6.3-R03** | **HIGH** | Directory Repository (`getPaginatedDirectory`) | `$lookup` from `villas` matches `user.villaId` without `orgId` constraint | Foreign villa unit metadata (unit number, block) leaked across organizations |
| **FIND-6.3-R04** | **MEDIUM** | Session Service (`getUserSessions` / `revokeSession`) | Query matches `{ $or: [{ orgId }, { orgId: null }] }` | Pre-6.2C legacy sessions with `orgId: null` leaked and revokable across all orgs |
| **FIND-6.3-R05** | **MEDIUM** | Notification Service (`deleteNotification`) | Fallback single-write path skips `notification.orgId` checks | Tenant boundary bypassed if transaction fails under standalone MongoDB |
| **FIND-6.3-R06** | **MEDIUM** | Directory Message Service (`sendMessage`) | Notification created without `orgId` | In-app notification saved with `orgId: null`, omitted from workspace-scoped feeds |
| **FIND-6.3-R07** | **MEDIUM** | AuditLog & Session Models | Missing indexes on `targetId` and compound `{ userId, status, orgId }` | Full collection scans (`COLLSCAN`) under production query volumes |
| **FIND-6.3-R08** | **LOW** | Controllers (`complaint`, `wallet`, `userPref`, `notif`) | Direct ORM model imports and unscoped `Technician.findOne` | Architectural layer violation; potential cross-org phone leak in complaint details |
| **FIND-6.3-R09** | **LOW** | Booking Repository (`getOccupancyStats`) | Un-cast string `orgId` in raw aggregation `$match` | Mongoose raw aggregation does not cast string to ObjectId; returns empty metrics |
| **FIND-6.3-R10** | **LOW** | Test Suites (6.2A, 6.2B, 6.2C) | Missing negative test cases for cross-tenant edge cases | Regressions in edge cases (fallback writes, payment order substitution) undetected |

---

## Detailed Findings & Evidence

### FIND-6.3-R01: Undeclared Variable `contextOrgId` in `invoiceService.rejectOfflinePayment`

- **Severity:** **CRITICAL**
- **Affected Files:**
  - `backend/src/features/invoice/invoice.services.js` (Lines 842, 866–868)
  - `backend/src/features/invoice/invoice.controller.js` (Line 119)
- **Description:**
  In `backend/src/features/invoice/invoice.services.js`, the method `rejectOfflinePayment` defines its parameters as:
  ```javascript
  // Line 842
  async rejectOfflinePayment(invoiceId, adminUserIdOrReason = null, rejectionReasonParam = '')
  ```
  However, at line 866, the method attempts to evaluate:
  ```javascript
  // Lines 866-868
  if (contextOrgId && invoice.communityId && String(invoice.communityId) !== String(contextOrgId)) {
    throw new HttpError(403, "Forbidden. This Invoice belongs to another community.");
  }
  ```
  Because `contextOrgId` is neither declared as a parameter nor defined within the local function or module scope, any execution of `invoiceService.rejectOfflinePayment` crashes at runtime with:
  `ReferenceError: contextOrgId is not defined`
- **Secondary Isolation Defect:**
  In `invoice.controller.js` line 119:
  ```javascript
  const data = await invoiceService.rejectOfflinePayment(id, adminUserId, rejectionReason);
  ```
  `req.tenant.orgId` is NOT passed to `rejectOfflinePayment`. Furthermore, the guard checks `if (contextOrgId && invoice.communityId && ...)`. If an invoice has `orgId` set instead of `communityId` (or if `communityId` is null), the condition evaluates to `false`, completely bypassing tenant validation.
- **Reproduction Steps:**
  1. Authenticate as Community Admin for Organization A.
  2. Send `POST /api/v1/invoices/:id/reject-payment` with a valid offline invoice ID.
  3. Notice the server unhandled exception or 500 internal server error due to `ReferenceError: contextOrgId is not defined`.
- **Recommendation:**
  1. Update `rejectOfflinePayment(invoiceId, adminUserIdOrReason, rejectionReasonParam, contextOrgId = null)`.
  2. Update controller to pass `req.tenant.orgId`.
  3. Validate tenant against both `invoice.communityId` and `invoice.orgId`.

---

### FIND-6.3-R02: Cross-Tenant Payment Crediting in `walletService.verifyPaymentSignature`

- **Severity:** **HIGH**
- **Affected Files:**
  - `backend/src/features/wallet/wallet.service.js` (Lines 728–735, 774, 836–848)
- **Description:**
  In `verifyPaymentSignature(userId, orgId, paymentData)`, the service resolves the authoritative `Payment` record using:
  ```javascript
  // Lines 730-735
  if (paymentId && mongoose.isValidObjectId(paymentId)) {
    paymentRecord = await Payment.findById(paymentId);
  }
  if (!paymentRecord && razorpay_order_id) {
    paymentRecord = await Payment.findOne({ gatewayTransactionId: razorpay_order_id });
  }
  ```
  Critically, the service NEVER verifies that `paymentRecord.orgId` matches the caller's target `orgId`.
  Later, at line 836:
  ```javascript
  const updatedWallet = await walletRepository.updateBalance(userId, orgId, authorizedAmount, activeSession);
  ```
  The wallet credited is determined entirely by the caller-provided `orgId`.
- **Exploitation Vector:**
  1. Attacker is a member of Organization A and Organization B.
  2. Attacker initiates a legitimate payment/recharge in Organization A (`paymentRecord.orgId = OrgA`).
  3. Attacker calls `POST /api/v1/wallet/verify-payment` specifying `x-organization-id: OrgB` with `paymentId` from Org A.
  4. The gateway transaction passes verification, and Organization B's wallet is credited with Organization A's funds.
- **Recommendation:**
  Assert that `paymentRecord.orgId.toString() === orgId.toString()` before proceeding with signature verification or wallet balance increment:
  ```javascript
  if (paymentRecord && paymentRecord.orgId && String(paymentRecord.orgId) !== String(orgId)) {
    throw new HttpError(403, 'Forbidden. Payment transaction belongs to another organization.');
  }
  ```

---

### FIND-6.3-R03: Cross-Tenant Unit/Villa Metadata Leakage in Directory `$lookup` Pipeline

- **Severity:** **HIGH**
- **Affected Files:**
  - `backend/src/features/directory/directory.repository.js` (Lines 39–62)
- **Description:**
  In `directoryRepository.getPaginatedDirectory`, the aggregation pipeline queries `OrgMembership` for a specific community (`orgId: cleanOrgId`), then performs a `$lookup` against `villas`:
  ```javascript
  // Lines 39-55
  $lookup: {
    from: 'villas',
    let: { orgVillaId: '$villaId', userVillaId: '$user.villaId' },
    pipeline: [
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ['$_id', '$$orgVillaId'] },
              { $eq: ['$_id', '$$userVillaId'] },
            ],
          },
        },
      },
    ],
    as: 'villa',
  }
  ```
  Notice: The nested pipeline does NOT include `{ $eq: ['$orgId', cleanOrgId] }`.
  If a user has multiple memberships or previously belonged to Organization B, their `User.villaId` document property may reference a Villa located in Organization B.
  When querying Organization A's resident directory, if their `OrgMembership.villaId` is unset, the query falls back to `userVillaId` and joins the villa document from Organization B.
- **Impact:**
  Residents in Organization A can see unit numbers, block names, and floor details from Organization B in their community directory.
- **Recommendation:**
  Constrain the `$lookup` pipeline to match only villas that belong to `cleanOrgId`:
  ```javascript
  $match: {
    $expr: {
      $and: [
        { $eq: ['$orgId', cleanOrgId] },
        {
          $or: [
            { $eq: ['$_id', '$$orgVillaId'] },
            { $eq: ['$_id', '$$userVillaId'] },
          ],
        },
      ],
    },
  }
  ```

---

### FIND-6.3-R04: Legacy Session Cross-Tenant Visibility & Leakage in `getUserSessions` & `revokeSession`

- **Severity:** **MEDIUM**
- **Affected Files:**
  - `backend/src/features/session/session.services.js` (Lines 88–92, 132–136)
- **Description:**
  In `getUserSessions(userId, orgId)` and `revokeSession(sessionId, userId, orgId)`:
  ```javascript
  // Lines 134-136
  if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
    query.$or = [{ orgId: new mongoose.Types.ObjectId(orgId) }, { orgId: null }];
  }
  ```
  The clause `{ orgId: null }` was added as a backwards-compatibility measure for sessions created before Phase 6.2C.
  However, this causes all legacy sessions (or any session created during global authentication where `orgId` was not set) to be treated as globally visible across every organization the user accesses.
- **Impact:**
  When a user logs in to Organization B, all legacy sessions created under Organization A (which have `orgId: null`) appear in Organization B's active device list and can be manipulated or revoked across organizational boundaries.
- **Recommendation:**
  1. Implement a startup database migration script to backfill `orgId` on legacy sessions using the user's primary membership.
  2. Deprecate the `{ orgId: null }` fallback in tenant-scoped session queries.

---

### FIND-6.3-R05: Fallback Write Path Bypasses Tenant Isolation in `notificationService.deleteNotification`

- **Severity:** **MEDIUM**
- **Affected Files:**
  - `backend/src/features/notification/notification.service.js` (Lines 272–287)
- **Description:**
  In `notificationService.deleteNotification`:
  The primary transactional path at lines 240–254 correctly enforces:
  ```javascript
  if (notification.orgId) {
    const notifOrgIdStr = notification.orgId.toString();
    if (activeOrgId && notifOrgIdStr !== activeOrgId.toString()) {
      throw new HttpError(403, 'Forbidden. This notification belongs to another community.');
    }
    const membership = await OrgMembership.findOne({ userId, orgId: notifOrgIdStr, status: 'Active' });
    if (!membership) throw new HttpError(403, 'Forbidden...');
  }
  ```
  However, if the database transaction fails (e.g. standalone MongoDB environment throwing retryable write errors), the catch block enters `canUseSingleWriteFallback` (lines 272–287):
  ```javascript
  if (canUseSingleWriteFallback) {
    const notification = await notificationRepository.findById(id);
    if (!notification) throw new HttpError(404, `Notification with ID ${id} not found.`);
    if (notification.recipientId.toString() !== userId) {
      throw new HttpError(403, 'Access denied. You do not own this notification.');
    }
    const deleted = await notificationRepository.delete(id);
    return deleted;
  }
  ```
  Notice: The fallback path only checks `recipientId === userId` and **completely omits** the `activeOrgId` and `OrgMembership` checks.
- **Impact:**
  In standalone or non-replica deployments, a user can delete notifications belonging to a community they are no longer an active member of.
- **Recommendation:**
  Extract the authorization and organization validation logic into a shared helper function called by both the transactional and fallback execution branches.

---

### FIND-6.3-R06: Directory Message Notifications Dispatched Without `orgId` Scope

- **Severity:** **MEDIUM**
- **Affected Files:**
  - `backend/src/features/directoryMessage/directoryMessage.services.js` (Lines 118–129)
- **Description:**
  When a resident sends a direct message to another resident in `directoryMessageService.sendMessage`:
  ```javascript
  // Lines 118-126
  await notificationService.createNotification({
    recipientId: targetReceiverId,
    senderId,
    title: `Message from ${senderName}`,
    body: text.trim(),
    actionUrl: `/directory/conversation/${conversation._id}`,
    type: 'INFO',
  });
  ```
  Notice: `orgId` is NOT included in the payload passed to `createNotification`.
  Consequently, the created notification has `orgId: null`.
- **Impact:**
  When the recipient user views their notifications feed with an active workspace scope (`x-organization-id`), directory message notifications are either omitted or bypass organizational partitioning.
- **Recommendation:**
  Pass `orgId: conversation.orgId || orgId` to `notificationService.createNotification`.

---

### FIND-6.3-R07: Un-indexed Tenant Filters and Missing Compound Indexes in `AuditLog` and `Session`

- **Severity:** **MEDIUM**
- **Affected Files:**
  - `backend/src/features/auditLog/auditLog.model.js` (Lines 14–18)
  - `backend/src/features/session/session.model.js` (Lines 5–54)
- **Description:**
  1. In `auditLogSchema`, the field `targetId` (storing the organization ObjectId) has `index: false` (no index defined). Audit queries in `auditLog.repository.js` filter `{ targetId: orgId, createdAt: { $gte, $lte } }` and sort by `{ createdAt: -1 }`. Without an index on `targetId`, every tenant query triggers a full collection scan (`COLLSCAN`).
  2. In `sessionSchema`, indexes exist on `userId` and `orgId` individually. However, queries filter by `{ userId, status, orgId }` and sort by `{ lastActivity: -1 }`. In high-traffic environments, missing compound index `{ userId: 1, status: 1, orgId: 1, lastActivity: -1 }` causes inefficient index intersections.
- **Recommendation:**
  1. Add compound index to `AuditLog`: `auditLogSchema.index({ targetId: 1, createdAt: -1 });`.
  2. Add compound index to `Session`: `sessionSchema.index({ userId: 1, status: 1, orgId: 1, lastActivity: -1 });`.

---

### FIND-6.3-R08: Controller Architectural Layer Violations & Direct Model Access

- **Severity:** **LOW**
- **Affected Files:**
  - `backend/src/features/complaint/complaint.controller.js` (Lines 3, 43–53, 103)
  - `backend/src/features/wallet/wallet.controller.js` (Lines 24–32)
  - `backend/src/features/userPreference/userPreference.controller.js` (Lines 26–35)
  - `backend/src/features/notification/notification.controller.js` (Lines 14–22, 29–31)
- **Description:**
  Per the project architectural rules:
  > **Controllers (Traffic Cops):** MUST NOT call multiple services, access repositories, or touch ORM models.  
  > **Public API Request Flow:** `Router → Controller → Service → Repository → Database`.
  
  Multiple controllers directly import and query foreign ORM models:
  1. `complaint.controller.js` directly imports `technician.model.js` and executes `Technician.findOne({ userId: complaint.assignedTechnicianId._id })` (line 103) **without `orgId` scoping**. If a technician is registered across multiple communities, this can return phone numbers from another organization.
  2. `wallet.controller.js`, `userPreference.controller.js`, and `notification.controller.js` directly import `orgMembership.model.js` to query active memberships.
- **Recommendation:**
  Move membership checks into `orgMembershipService` and technician queries into `technicianService.getTechnicianByUserId(userId, orgId)`.

---

### FIND-6.3-R09: Raw String `orgId` in Mongoose Aggregation `$match` in `BookingRepository`

- **Severity:** **LOW**
- **Affected Files:**
  - `backend/src/features/booking/booking.repository.js` (Lines 77–79)
- **Description:**
  In `BookingRepository.getOccupancyStats(orgId)`:
  ```javascript
  const stats = await Booking.aggregate([
    { $match: { orgId, bookingStatus: { $in: ['Confirmed', 'Checked-In', 'Completed'] } } },
  ```
  In Mongoose, raw aggregation pipelines (`.aggregate()`) do NOT automatically cast string arguments to `mongoose.Types.ObjectId`. If `orgId` is passed as a string (from `req.tenant.orgId`), the `$match` fails to match BSON `ObjectId` fields in MongoDB, resulting in empty occupancy statistics.
- **Recommendation:**
  Cast `orgId` before constructing the aggregation pipeline:
  ```javascript
  const cleanOrgId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
  ```

---

### FIND-6.3-R10: Negative Test Coverage Gaps in Regression Suites

- **Severity:** **LOW**
- **Affected Files:**
  - `backend/tests/phase6_2a_high_remediation.test.mjs`
  - `backend/tests/phase6_2b_medium_remediation.test.mjs`
  - `backend/tests/phase6_2c_low_remediation.test.mjs`
- **Description:**
  While the test suites achieve 100% pass rates across existing scenarios (147 passing tests), the following critical edge cases lack test coverage:
  1. **Cross-Tenant Payment Reuse in Wallet:** No test verifies that `verifyPaymentSignature` fails when presenting a `paymentId` created under a different organization.
  2. **Multi-Tenant User Directory Villa Isolation:** No test verifies that a multi-organization user's villa from Organization B is suppressed when querying Organization A's directory.
  3. **Offline Payment Rejection Tenant Guard:** No test exercises `invoiceService.rejectOfflinePayment` with explicit cross-tenant parameters.
  4. **Single-Write Fallback Path in Notifications:** No unit test simulates a transaction failure to test tenant checks in the fallback write path.
- **Recommendation:**
  Add a dedicated negative test suite covering these multi-tenant edge cases in the next release hardening phase.

---

## Verification & Test Results Baseline

All pre-existing test suites continue to execute and pass against the active branch:

| Test Suite | Total Tests | Passed | Failed | Pass Rate |
| :--- | :--- | :--- | :--- | :--- |
| `phase4b1_critical_remediation.test.mjs` | 13 | 13 | 0 | 100% |
| `phase4b2_high_remediation.test.mjs` | 24 | 24 | 0 | 100% |
| `phase4b3_medium_remediation.test.mjs` | 21 | 21 | 0 | 100% |
| `phase4c_low_remediation.test.mjs` | 13 | 13 | 0 | 100% |
| `phase5_e2e_tenant_isolation.test.mjs` | 8 | 8 | 0 | 100% |
| `phase6_2a_high_remediation.test.mjs` | 14 | 14 | 0 | 100% |
| `phase6_2b_medium_remediation.test.mjs` | 22 | 22 | 0 | 100% |
| `phase6_2c_low_remediation.test.mjs` | 32 | 32 | 0 | 100% |
| **Total** | **147** | **147** | **0** | **100%** |

---

## Prioritized Remediation Roadmap

1. **Immediate (Critical / Hotfix):**
   - Fix `FIND-6.3-R01`: Declare `contextOrgId` in `rejectOfflinePayment`, pass `req.tenant.orgId` from controller, and enforce dual-field verification (`communityId` and `orgId`).
   - Fix `FIND-6.3-R02`: Add authoritative `paymentRecord.orgId === orgId` verification in `walletService.verifyPaymentSignature`.

2. **Sprint Hardening (High / Medium):**
   - Fix `FIND-6.3-R03`: Add `{ $eq: ['$orgId', cleanOrgId] }` to the `$lookup` pipeline for `villas` in `directory.repository.js`.
   - Fix `FIND-6.3-R04`: Backfill `orgId` on legacy sessions and remove `{ orgId: null }` fallback in session queries.
   - Fix `FIND-6.3-R05`: Ensure fallback single-write path in `notificationService.deleteNotification` enforces tenant checks.
   - Fix `FIND-6.3-R06`: Pass `orgId` when creating directory message notifications.
   - Fix `FIND-6.3-R07`: Add compound indexes to `AuditLog` (`{ targetId: 1, createdAt: -1 }`) and `Session` (`{ userId: 1, status: 1, orgId: 1, lastActivity: -1 }`).

3. **Architectural Clean-up & Defense-in-Depth (Low):**
   - Fix `FIND-6.3-R08`: Move direct model accesses out of controllers into their respective feature services.
   - Fix `FIND-6.3-R09`: Cast `orgId` to `ObjectId` in `BookingRepository.getOccupancyStats`.
   - Implement `FIND-6.3-R10`: Add comprehensive negative tests covering cross-tenant mutations and edge cases.
