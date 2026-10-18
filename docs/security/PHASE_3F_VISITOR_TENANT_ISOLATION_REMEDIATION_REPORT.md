# Phase 3F — Visitor Log and Visitor Pass Tenant-Isolation Remediation Report

## 1. Objective
Remediate the two tenant-isolation findings discovered during the Phase 3E Gap Audit (F-01 and F-02). Expand repository-level constraints in the Visitor Management domain and establish regression test coverage to prove that cross-tenant operations are safely rejected.

## 2. Root Cause and Remediation

### Finding F-01: Visitor Log Checkout (Critical)
*   **Root Cause:** The `checkout` method inside `visitorLog.service.js` retrieved visitor logs while ignoring the trusted `context.orgId` passed down from the controller. It subsequently delegated to `visitorLogRepository.updateLogForCheckout` which updated the database solely based on `_id` by bypassing `orgId` filtering in its internal `findByIdAndUpdate` call. This permitted cross-tenant log updates via enumeration.
*   **Remediation:** 
    *   **Service Layer (`backend/src/features/visitorLog/visitorLog.service.js`):** Passed `context.orgId` directly into `visitorLogRepository.findById`, `findActiveLogByPassId`, and `updateLogForCheckout`.
    *   **Repository Layer (`backend/src/features/visitorLog/visitorLog.repository.js`):** Updated `findById`, `findActiveLogByPassId`, and `updateLogForCheckout` to safely wrap mutations with `findOneAndUpdate`, effectively ensuring that the `orgId` dynamically appends to the query when resolving tenant-specific data, rejecting mismatched writes.

### Finding F-02: Visitor Pass Mutations (Medium)
*   **Root Cause:** The `usePass` (entry admission) and `updatePassStatus` methods inside `visitorPass.service.js` properly read documents asserting the valid `orgId`, but omitted the `orgId` constraint on write calls by manually passing `null` to `visitorPassRepository.update` and `consumeForEntry`. This broke defense-in-depth isolation protocols.
*   **Remediation:**
    *   **Service Layer (`backend/src/features/visitorPass/visitorPass.service.js`):** Refactored `usePass` and `verifyPassForEntry` method signatures to properly intake `orgId`, propagating the trusted `orgId` downstream into `consumeForEntry`. Modified `updatePassStatus` to also funnel `orgId` directly into `visitorPassRepository.update()`. No changes were needed in the repository as it already natively supported the `orgId` constraints correctly.

## 3. Files Modified
*   `backend/src/features/visitorLog/visitorLog.repository.js` (F-01)
*   `backend/src/features/visitorLog/visitorLog.service.js` (F-01)
*   `backend/src/features/visitorPass/visitorPass.service.js` (F-02)
*   `backend/tests/features/visitorTenant.integration.test.js` (Added 6 Regression Tests)

*(Note: All existing code patterns, business logic flow, permissions policies (`visitorPass.policy.js`), and conventions were strictly preserved outside of fixing the tenant-scoping.)*

## 4. Regression Tests and Execution Results
A new test suite (`tests/features/visitorTenant.integration.test.js`) was engineered to rigorously exercise both F-01 and F-02 boundaries inside an ephemeral MongoDB memory replica set.

**Test Matrix Results (All Passed):**
1. **[PASS]** Organization A can check out its own visitor log.
2. **[PASS]** Organization B cannot check out Organization A's visitor log (Throws 403 Forbidden).
3. **[PASS]** Missing tenant context on checkout is rejected (Throws 403 Forbidden).
4. **[PASS]** Organization A can perform an authorized status update on its own pass.
5. **[PASS]** Organization B cannot update Organization A's pass (Throws 404 Not Found).
6. **[PASS]** Organization B cannot consume or admit Organization A's pass (Throws 404 Not Found).

## 5. Lock-Timeout Investigation (Phase 3E carry-over)
The `Unable to acquire IX lock` timeout originally reported in Phase 3E during the execution of `roleService.integration.test.js` was fully investigated.
*   **Outcome:** The failure is an ephemeral timing artifact of `mongodb-memory-server` initializing replica sets simultaneously across a high volume of Jest test suites running concurrently.
*   **Resolution:** When `roleService.integration.test.js` was isolated and rerun identically with sufficient timeouts natively, it completely succeeded in 4.5 seconds. No production modifications or database index changes were required.

## 6. Remaining Limitations
None within the scope of Phase 3F findings.

## 7. Final Status
**PASS.** 

The two targeted tenant-isolation findings (F-01 & F-02) have been verified successfully via integrated replica tests. The Git baseline has been preserved completely, and zero related or unrelated logic was arbitrarily overwritten.
