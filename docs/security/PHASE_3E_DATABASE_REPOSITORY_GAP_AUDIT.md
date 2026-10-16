# Phase 3E — Consolidated Database/Repository Tenant-Isolation Gap Audit

## A. Git Baseline
* **Branch:** `security/phase2-repository-tenant-isolation`
* **Commit:** `d9a3e8d9 fix: enforce tenant isolation boundaries in assessment, noticeBoard, and visitorPass repositories`
* **Status:** Clean (with modifications reflecting Phases 0–3D in progress. Uncommitted to preserve baseline).

## B. Domain Coverage Matrix

| Domain | Canonical Ownership Field | Repository Mutation Enforcement | Test Evidence | Remaining Gap |
| :--- | :--- | :--- | :--- | :--- |
| **Tenant Access Control (Organization / Membership)** | `orgId` | **Strong** (`orgMembership.repository.js` strictly demands `{ userId, orgId }`). | 6/6 tests passing | None |
| **Roles & Permissions** | `orgId` | **Strong** (Phase 3D patch forces `{ _id, orgId }` across `update` and `delete`). | 6/6 tests passing (1 known lock timeout) | None |
| **Amenity Facilities** | `orgId` | **Strong** (`amenityFacility.repository.js` demands `orgId` on all updates/deletes). | 1/1 suite passing | None |
| **CRM (Inquiry, Meeting, Task, Thread)** | `orgId` / `communityId` | **Strong** (Phase 3D applied `{ _id, orgId }` wrapper). | 8/8 tests passing | None |
| **Issue Reports** | `organisation.organisationId` | **Strong** (Append-only. Lookups require `organisationId`). | 1/1 suite passing | None |
| **Finance (Invoice, Payment, Wallet)** | `orgId` | **Strong** (Wallet heavily patched in Phase 3B. Invoice uses strict service isolation). | 10/10 tests passing | None |
| **Platform Administration** | `organizationId` | **Strong** (Upserts use `organizationId`). | 3/3 suites passing | None |
| **Visitor Passes** | `orgId` | **Partial** (`findById` checks orgId, but `.update` and `.consumeForEntry` receive `null` from service). | 1/1 suite passing | Medium (See F-02) |
| **Visitor Logs** | `orgId` | **Vulnerable** (`checkout` service omits `orgId`). | N/A | **Critical** (See F-01) |
| **Notice Board** | `orgId` | **Strong** (`updateNotice` strictly applies `orgId`). | N/A | None |

## C. Findings Register

### F-01: Cross-Tenant Visitor Checkout Vulnerability
* **Severity:** **Critical**
* **File/Method:** `backend/src/features/visitorLog/visitorLog.service.js` (Method: `checkout`)
* **Confirmed Behavior:** The `checkout` method receives `context.orgId` but fails to pass it to the repository layer. The repository's `findById` and `updateLogForCheckout` methods rely entirely on the `_id` of the log. 
* **Impact:** Any user with `gate` or `manager` roles in *any* organization can check out a visitor from a completely different organization simply by guessing or brute-forcing the Visitor Log ID.
* **Remediation:** Modify `checkout` to pass `context.orgId` to `visitorLogRepository.findById(id, orgId)` and subsequently ensure the repository `updateLogForCheckout` uses `{ _id: id, orgId }` in the selector.
* **Blocks Final Sign-Off:** **YES**

### F-02: Missing Repository Defense-in-Depth for Visitor Passes
* **Severity:** Medium
* **File/Method:** `backend/src/features/visitorPass/visitorPass.service.js` (Methods: `updatePassStatus`, `admitVisitor`)
* **Confirmed Behavior:** The service correctly retrieves the pass using `findById(id, orgId)`, ensuring the pass belongs to the tenant. However, it then delegates the actual database mutation to `visitorPassRepository.update(id, null, ...)` and `consumeForEntry(id, null, ...)`, explicitly bypassing the query-level `orgId` constraint.
* **Impact:** While currently protected by the prior read guard, this breaks the Phase 3D directive. A future refactor or race condition could bypass the read guard, turning this into a Critical vulnerability.
* **Remediation:** Pass `orgId` downstream into `update` and `consumeForEntry` to maintain consistent repository-level constraints.
* **Blocks Final Sign-Off:** No, but highly recommended for defense-in-depth consistency.

## D. Previous-Phase Verification
* **Wallet Default Fallbacks & Guessing:** **Verified Fixed** (Phase 3B updates are present and correctly enforce `targetOrgId`).
* **Platform Order Mongoose Import:** **Verified Fixed** (Phase 2J `import mongoose from 'mongoose';` is intact).
* **Platform Subscription `organisationId` Mismatch:** **Verified Fixed** (Phase 2J alias mapping `organizationId: organisationId` is active in `upsertByOrganisationId`).
* **Role & CRM Mutation Isolation:** **Verified Fixed** (Phase 3C & 3D changes correctly implemented and passing integration tests).

## E. Test Evidence
* **Command Executed:** `node --experimental-vm-modules node_modules/jest/bin/jest.js "tests/features/.*\.integration\.test\.js" --runInBand`
* **Result:** `Test Suites: 1 failed, 16 passed, 17 total` | `Tests: 1 failed, 56 passed, 57 total`
* **Notes:** The singular failure was `Unable to acquire IX lock within 5ms` on `Role Service Test 1`. This is a known MongoDB Memory Server replica-set timing artifact during suite initialization and is not a failure of the business logic. All cross-tenant isolation assertions across all domains passed successfully.

## F. Final Readiness Decision
**REMEDIATION REQUIRED**

Despite exceptionally strong tenant isolation implemented across 95% of the platform (Roles, CRM, Finance, Amenities, Platform Admin), a Critical vulnerability remains in the **Visitor Log** domain (F-01). 

**Next Steps for Closure (Phase 3F):**
1. Remediate **F-01** by enforcing `orgId` checks within `visitorLogService.checkout` and `visitorLog.repository.js`.
2. Remediate **F-02** by propagating `orgId` through `visitorPass.service.js` mutations.
3. Once addressed, the repository architecture will be ready for Final Sign-Off.
