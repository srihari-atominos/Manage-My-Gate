# Independent Service Layer Architecture Compliance Audit Report

**Project:** Nahom / Connect Harmony  
**Repository:** Manage-My-Gate  
**Active Branch:** `security/phase2-repository-tenant-isolation`  
**HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef`  
**Execution Mode:** STRICT READ-ONLY AUDIT  
**Audit Date:** October 14, 2026  
**Final Verdict:** **FAIL**

---

## 1. Executive Summary & Verdict

This independent compliance audit assessed the backend codebase to verify whether the Service Layer Architecture adheres to the core rules:
- Public API Request Flow: `Router → Controller → Service → Repository → Database`
- Cross-Feature Communication: `Feature A Service → Feature B Service → Feature B Repository`
- Real-Time & Protocol Decoupling: Services must never import Socket.IO or execute direct socket emissions; they must use native event buses (`.events.js`) and room-isolated socket dispatchers (`.socket.js`).
- Strict Tenant Isolation: Every query and mutation must enforce organization scoping derived from authenticated tokens, preventing ingress tampering or cross-tenant data leakage.

### Final Verdict: **FAIL — one or more required architecture or security checks failed.**

### Key Verdict Justification:
1. **Targeted Remediations Verified:** The three specific blockers from the remediation phase (Missing Wallet Audit Methods, Notice Reaction Enrichment in Service Layer, and Controller Direct Model Access) were independently verified as correctly resolved and passing 100% of targeted tests (9/9).
2. **Critical Security Vulnerability in `complaint.service.js`:** In `createComplaint()`, `...data` (client-supplied body) is spread *after* `orgId`, allowing malicious callers to overwrite the authenticated tenant scope with an arbitrary `orgId`. This was verified dynamically by a failing end-to-end tenant isolation test in `tests/phase5_e2e_tenant_isolation.test.mjs` (Subtest 2.1).
3. **Runtime Crash in `complaint.service.js`:** `createComplaint()` calls `ComplaintSettings.updateOne()`, but `ComplaintSettings` is unimported, causing a `ReferenceError` on every complaint creation ticket.
4. **Foreign Model Violations Across Feature Services:** Multiple feature services (`complaint.service.js`, `directoryMessage.services.js`, `enquiry.service.js`, `migration.service.js`, and `outbox.service.js`) directly import or query Mongoose models belonging to other domains rather than communicating via public feature services.

---

## 2. Repository State at Audit Execution

- **Current Branch:** `security/phase2-repository-tenant-isolation`
- **Current HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef`
- **Working Tree Status:** All pre-existing user modifications and untracked files remained intact.
- **Staged Changes (`git diff --cached --stat`):** Empty (0 staged files).
- **Targeted Remediation Files:** Confirmed present in the working tree across all 9 modified source files and 1 targeted test file:
  - `backend/src/features/wallet/wallet.repository.js`
  - `backend/src/features/wallet/wallet.service.js`
  - `backend/src/features/noticeBoard/noticeBoard.service.js`
  - `backend/src/features/noticeBoard/noticeBoard.controller.js`
  - `backend/src/features/orgMembership/orgMembership.repository.js`
  - `backend/src/features/orgMembership/orgMembership.services.js`
  - `backend/src/features/wallet/wallet.controller.js`
  - `backend/src/features/notification/notification.controller.js`
  - `backend/src/features/userPreference/userPreference.controller.js`
  - `backend/tests/serviceLayerRemediationTargeted.test.mjs`

---

## 3. Independent Verification of Targeted Remediations

### A. Financial Integrity & Tenant Isolation
* **Files Inspected:**
  - `backend/src/features/ledger/financialIntegrity.service.js`
  - `backend/src/features/wallet/wallet.service.js`
  - `backend/src/features/wallet/wallet.repository.js`
* **Findings:**
  - **Interface Compliance:** Both `getWalletsForAudit(filterOrOrgId)` and `getTransactionsForAudit(filterOrOrgId)` are defined and exported on `walletService`.
  - **Invocation:** `financialIntegrityService.runIntegrityCheck(orgId)` invokes both methods cleanly without throwing `TypeError`.
  - **Scoping & Fail-Closed Behavior:** `walletService` validates `targetOrgId` using `mongoose.isValidObjectId(targetOrgId)`. If missing or invalid, it returns `[]` immediately, preventing unscoped cross-tenant results.
  - **Field & Type Preservation:** Projections preserve `_id`, `userId`, `balance`, `amount`, `paymentStatus`, and `transactionId` required by the double-entry reconciliation algorithm.
  - **Empty Array Handling Caveat:** In `financialIntegrity.service.js`, if an organization ID does not exist in the database, queries return `[]`. The checker evaluates 0 records and reports `status: 'PASS'` because 0 violations were detected. It does not verify upfront that the requested organization exists in `Organization` before evaluating financial rules.
  - **Test Reality:** In `backend/tests/serviceLayerRemediationTargeted.test.mjs`, tests 1.1–1.5 insert real MongoDB records and execute real database queries through the services and repositories rather than mocking methods.

### B. Notice Reaction Enrichment
* **Files Inspected:**
  - `backend/src/features/noticeBoard/noticeBoard.controller.js`
  - `backend/src/features/noticeBoard/noticeBoard.service.js`
  - `backend/src/features/noticeReaction/noticeReaction.service.js`
* **Findings:**
  - **Controller Boundaries:** `noticeBoard.controller.js` no longer imports or calls `noticeReactionService`, nor does it catch `ReferenceError`. It strictly forwards `getAllNotices()` parameters to `noticeBoardService` and formats the HTTP response.
  - **Service Orchestration:** `noticeBoard.service.js` coordinates reaction enrichment via `await noticeReactionService.enrichNoticesWithReactions(mappedData, orgId, userId)`.
  - **Dependency Decoupling:** `noticeReaction.service.js` does not import `noticeBoard.service.js`, preventing circular dependencies.
  - **Resilience:** If reaction enrichment fails, the error is logged via `logger.error` with tenant context and un-enriched notices (`mappedData`) are safely returned, preventing notice board outages.

### C. OrgMembership Access in Controllers
* **Files Inspected:**
  - `backend/src/features/wallet/wallet.controller.js`
  - `backend/src/features/notification/notification.controller.js`
  - `backend/src/features/userPreference/userPreference.controller.js`
  - `backend/src/features/orgMembership/orgMembership.services.js`
  - `backend/src/features/orgMembership/orgMembership.repository.js`
* **Findings:**
  - **Direct Model Elimination:** None of the three controllers import `OrgMembership.model.js` or call `OrgMembership` directly.
  - **Service Interface:** All three controllers route queries through `orgMembershipService.getActiveMembership` and `orgMembershipService.getActiveOrgIdsForUser`.
  - **Repository Implementation:** `orgMembershipRepository.findActiveMembership` queries `{ userId, orgId, status: 'Active' }` and supports Mongoose `ClientSession` propagation. `findActiveOrgIdsByUserId` selects `orgId` for active memberships and returns an array of string identifiers.
  - **Authorization Enforcement:** In `notification.controller.js` and `userPreference.controller.js`, candidate `orgId` values are validated against active memberships; unauthorized requests fail closed with `HttpError(403)`. In `wallet.controller.js`, `resolveTargetUserId` rejects non-members with `HttpError(404)`.

---

## 4. Repository-Wide Architecture & Security Scan Findings

### Finding 1: Critical Ingress Tampering / Tenant Poisoning Vulnerability (FAIL)
* **Location:** `backend/src/features/complaint/complaint.service.js` (Lines 93–103)
* **Description:** In `createComplaint(orgId, residentId, residentName, data, metaData = {})`:
  ```javascript
  const newComplaint = {
    orgId, // Line 94: Authenticated tenant ID from req.tenant.orgId
    residentId,
    residentName,
    ...data, // Line 102: Client body spread AFTER orgId!
    priority,
    department,
    status: 'Open',
  };
  ```
  Because `...data` is spread **after** `orgId`, a client sending `{ orgId: 'poisonedOrgId' }` in the POST body **overwrites** the authenticated `orgId`.
* **Dynamic Test Failure:** In `tests/phase5_e2e_tenant_isolation.test.mjs`, Subtest 2.1 (`Client-supplied poisoned orgId in POST body is overridden by trusted context`) fails with:
  ```text
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual: '6acf1183ec881328c053b8e6' (Poisoned Org B)
  - expected: '6acf1183ec881328c053b8e5' (Authenticated Org A)
  ```

### Finding 2: Unhandled Runtime Crash & Missing Import in `complaint.service.js` (FAIL)
* **Location:** `backend/src/features/complaint/complaint.service.js` (Lines 166–175)
* **Description:** In `createComplaint`:
  ```javascript
  await ComplaintSettings.updateOne(
    { orgId, 'categories.name': data.category, 'categories.suggestedIssues.name': data.title },
    ...
  );
  ```
  `ComplaintSettings` is not imported anywhere in `complaint.service.js`, throwing `ReferenceError: ComplaintSettings is not defined` on complaint submissions. In addition, updating category usage counts belongs to the `complaintSettings` feature, violating feature boundary encapsulation.

### Finding 3: Direct Foreign Model Query in `complaint.service.js` (FAIL)
* **Location:** `backend/src/features/complaint/complaint.service.js` (Lines 448–455)
* **Description:** In `assignTechnician`:
  ```javascript
  const existingPass = await mongoose.model('VisitorPass').findOne({ 
    linkedComplaintId: id, 
    status: { $in: ['PENDING', 'ACTIVE'] } 
  }).session(session);
  ```
  The service bypasses `visitorPassService` and directly queries Mongoose model `VisitorPass`.

### Finding 4: Cross-Feature Direct Model Access Across Feature Services (FAIL)
1. **`directoryMessage.services.js` (Lines 3, 26):**
   - Directly imports `User` model (`import User from '../user/user.model.js'`) and queries `User.findById(receiverId)`.
   - Directly imports `OrgMembership` model (`await import('../orgMembership/orgMembership.model.js')`) and queries `OrgMembership.findOne(...)` instead of calling `userService` and `orgMembershipService`.
2. **`platformCrm/enquiry.service.js` (Lines 220–277):**
   - Directly calls `mongoose.model('Organization')`, `mongoose.model('User')`, `mongoose.model('Role')`, `mongoose.model('OrgMembership')`, and `mongoose.model('PlatformSubscription')` inside `provisionAccount()` to perform cross-feature database mutations rather than delegating to respective domain services.
3. **`tenant/migration.service.js` (Lines 4–7, 47, 59):**
   - Directly imports `PlatformSubscription`, `Unit` (villa), and `User` models and executes `.findOne()` and `.bulkWrite()` directly against them.
4. **`outbox/outbox.service.js` (Lines 4, 94):**
   - Directly imports `Notification` model and invokes `Notification.insertMany(notificationDocs)` instead of calling `notificationService`.

---

## 5. Comprehensive Test Execution Results

| Test Suite / Command | Total Tests | Passed | Failed | Exit Code | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `node --test tests/serviceLayerRemediationTargeted.test.mjs` | 9 | 9 | 0 | 0 | **PASS** |
| `npm run test:governance` | 115 | 115 | 0 | 0 | **PASS** |
| `node --test tests/financial.architecture.phase8.test.mjs tests/financial.reconciliation.phase7.test.mjs` | 20 | 20 | 0 | 0 | **PASS** |
| `node --test tests/phase5_e2e_tenant_isolation.test.mjs` | 9 | 8 | 1 | 1 | **FAIL** |

---

## 6. Exact Required Remediations

To close the architecture phase and reach full compliance:

### 1. Secure Complaint Ingress Against Tenant Poisoning
In `backend/src/features/complaint/complaint.service.js`, place `orgId` **after** `...data` so authenticated context takes precedence over client body parameters:
```javascript
// REQUIRED SECURE PATTERN:
const newComplaint = {
  ...data,
  orgId, // Authenticated orgId strictly overrides client-supplied orgId
  residentId,
  residentName,
  priority,
  department,
  status: 'Open',
};
```

### 2. Encapsulate Complaint Settings Increment
In `backend/src/features/complaint/complaint.service.js`, replace the unimported `ComplaintSettings.updateOne` with a service delegation:
```javascript
// In complaintSettings.service.js:
async incrementSuggestedIssueUsage(orgId, category, title) {
  return await complaintSettingsRepository.incrementSuggestedIssueUsage(orgId, category, title);
}

// In complaint.service.js:
await complaintSettingsService.incrementSuggestedIssueUsage(orgId, data.category, data.title);
```

### 3. Encapsulate Visitor Pass Queries
In `backend/src/features/complaint/complaint.service.js:448`, replace `mongoose.model('VisitorPass').findOne(...)` with:
```javascript
const existingPass = await visitorPassService.getActivePassByComplaintId(id, session);
```

### 4. Decouple Foreign Models in `directoryMessage`, `enquiry`, and `outbox` Services
Replace direct foreign model imports and `mongoose.model` calls with their respective feature service methods:
- In `directoryMessage.services.js`: Use `userService.getUserById(receiverId)` and `orgMembershipService.getActiveMembership(receiverId, orgId)`.
- In `enquiry.service.js`: Delegate account provisioning steps to `organizationService`, `userService`, `roleService`, `orgMembershipService`, and `platformSubscriptionService`.
- In `outbox.service.js`: Delegate notification batch persistence to `notificationService.createBulkNotifications(notificationDocs)`.
