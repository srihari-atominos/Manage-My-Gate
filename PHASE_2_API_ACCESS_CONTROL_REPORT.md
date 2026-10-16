# Phase 2 — API & Access Control Security Audit Report

## 1. Git and Branch Status
- **Current Branch:** `security/phase2-repository-tenant-isolation`
- **Commit SHA:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e` (fix: enforce tenant isolation boundaries in assessment, noticeBoard, and visitorPass repositories)
- **Working-Tree Status:** The working tree contains 30 tracked modified files, 1 deleted file, and ~70 untracked test/script files.

## 2. Executive Summary
**Phase 2 verification result: PASS WITH FINDINGS**

**Justification:** The vast majority of Phase 1 controller BOLA vulnerabilities have been successfully remediated. Controllers correctly verify `req.tenant?.isPlatform` before accepting client-supplied tenant identifiers, and ordinary requests successfully fall back to the trusted `req.tenant.orgId`. The authentication service enforces strict membership validation preventing arbitrary token scoping. 

However, meaningful security gaps remain at the **Service Layer**. Specifically, the historical reconciliation service and visitor pass service fail to assert tenant ownership during `update` and `get` operations, relying solely on controller-level enforcement or lacking enforcement entirely. Since the audit rules mandate isolating the service layer from caller manipulation, these missing service-level checks constitute findings that must be addressed before Phase 2 can be marked strictly complete.

## 3. Audit Coverage
- **Routes / Controllers:** `invoice`, `workspace`, `visitorLog`, `visitorPass`, `blacklist`, `reconciliation`, `auth`.
- **Services:** `noticeBoard`, `amenityFacility`, `visitorLog`, `visitorPass`, `blacklist`, `historicalReconciliation`, `auth`, `workspace`.
- **Resources:** `VisitorPass`, `VisitorLog`, `NoticeBoard`, `Blacklist`, `ReconciliationException`, `AmenityFacility`.
- **Roles:** Explored `getScopedTokenPayload` for membership bounds and role extraction. 
- **Tests:** `backend/tests/phase1-bola.test.mjs` was executed and inspected.

## 4. Topic-by-Topic Status

### A. API / Controller: PASS
Controllers successfully defend against client-supplied tenant overrides. Endpoints that accept `orgId` or `communityId` via body, query, or params safely drop them for ordinary users, explicitly falling back to `req.tenant.orgId`. Platform Admin cross-tenant access is protected by strict boolean checks against `req.tenant?.isPlatform`.

### B. Service Layer: FAIL (Findings Present)
While some services (`noticeBoard`, `amenityFacility`, `visitorLog.checkout`) enforce `orgId` internally, others do not.
- `visitorPassService.getPassById(id)` and `updatePassStatus(id, status)` omit `orgId` entirely, relying on the controller to catch cross-tenant accesses. 
- `historicalReconciliation.service.js` performs `updateException` strictly by `exceptionId` without demanding the `orgId`, representing a direct service-level BOLA vulnerability. 
Services must strictly enforce tenant boundaries independently of their callers.

### C. CRUD Ownership: PARTIAL
Most Read, Update, and Delete operations check the target document's `orgId` against the active context. However, reconciliation exception updates and run report reads fail to assert this ownership at both the controller and service layers.

### D. Roles & Permissions (RBAC): PASS
`AuthService.getScopedTokenPayload` robustly evaluates permissions in the active organization context. It uses explicit `.filter()` checks against the user's memberships to build a distinct list of role permissions mapped solely to `targetOrgId`. A user holding 'Community Admin' in one tenant correctly yields 'Resident' or 'None' in another.

### E. Platform Admin: PASS
Platform admin exceptions are securely guarded. The system validates `req.tenant?.isPlatform` strictly derived from a trusted server-side JWT signature, entirely ignoring untrusted client headers.

## 5. Findings Table

| Severity | Affected File & Function | Vulnerability / Gap | Evidence | Potential Impact | Recommended Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HIGH** | `reconciliation.controller.js` & `historicalReconciliation.service.js` (`updateException`) | **BOLA / IDOR (Missing Ownership Check)** | `updateException` takes only `exceptionId`, `status`, `notes`. It calls `findByIdAndUpdate` without asserting `orgId`. The controller also fails to verify `orgId`. | Any authenticated user could update or resolve reconciliation exceptions belonging to another community by guessing the `exceptionId`. | Inject `orgId` into `updateException` signature and add `{ _id: exceptionId, orgId }` to the repository query filter. |
| **HIGH** | `reconciliation.controller.js` & `reconciliationReport.service.js` (`getRunReport`) | **BOLA / IDOR (Missing Ownership Check)** | `getRunReport` fetches `HistoricalMigrationRun` strictly by `runId`. Neither service nor controller asserts `orgId` ownership. | An attacker could view financial migration reports and exceptions from another tenant using a known `runId`. | Pass `orgId` to `getRunReport` and verify `run.orgId === orgId`. |
| **MEDIUM** | `visitorPass.service.js` (`getPassById`, `updatePassStatus`) | **Service-Layer Encapsulation Gap** | `getPassById` calls `visitorPassRepository.findByIdWithParties(id, null, session)`. It explicitly passes `null` for the `orgId` filter. | While `visitorPass.controller.js` catches this, any internal background worker or new route using this service is vulnerable to cross-tenant pass manipulation. | Update service signatures to require `orgId` and pass it down to `visitorPassRepository`. |

## 6. Test Results
- **Command Executed:** `node --test backend/tests/phase1-bola.test.mjs`
- **Results:** 
  - **Passed:** 9 tests 
  - **Failed:** 0
  - **Skipped:** 0
  - **Duration:** ~26 seconds
- **Observations:** The tests successfully prove that `req.body.orgId`, `req.query.communityId`, and `req.params.orgId` are dropped or securely overridden for standard users across `InvoiceController`, `WorkspaceController`, `VisitorLogController`, and `BlacklistController`.

## 7. Previously Reported Findings
- `invoice.controller.js` (client-supplied `communityId`): **Resolved**. Drops `req.query.communityId` unless `isPlatform`.
- `workspace.controller.js` (`organizationId` creation): **Resolved**. Enforces `req.tenant.orgId` unless `isPlatform`.
- `auth.controller.js` (pre-auth flows): **Resolved**. `getScopedTokenPayload` requires a verified active DB membership matching the requested `targetOrgId`.
- `visitorLog.controller.js` (route param overrides): **Resolved**. Route params are ignored for ordinary users.
- Blacklist operations: **Resolved**. Scoped strictly to `orgId` at controller and repository levels.
- Workspace module toggle/delete: **Resolved**. Scopes to `orgId` internally at `getWorkspaceById`.
- Phase 1 Tests: **Resolved/Verifiable**. Tests are present and executing cleanly.

## 8. Remaining Work (Prioritized)
1. **Fix Reconciliation Exceptions:** Update `updateException` and `getRunReport` controllers and services to strictly require and enforce `req.tenant.orgId`.
2. **Harden Service Layers:** Refactor `visitorPass.service.js` to accept `orgId` on `getPassById` and `updatePassStatus`, delegating the filter to the repository to prevent bypasses from internal worker invocations.
3. **Re-Audit Missing Routes:** Ensure that background event listeners (like Socket or worker queues) enforce tenant validation when handling asynchronous tasks.

## 9. Scope Limitations
- **Not Evaluated:** WebSocket emissions and internal `.events.js` buses were not deeply traced for cross-tenant data leaks. Background workers (`amenityManagement/workers`) were not inspected.
- **Limitation:** This was a strict read-only audit. Fixes were purposefully deferred to respect audit boundaries.
