# Phase 3C — Tenant-Scoped Service Mutations Report

## 1. Executive Summary
Phase 3C aimed to audit and remediate ID-based service mutations (e.g., `update`, `delete`, `findByIdAndUpdate`) across the platform to ensure they strictly enforce resource ownership. The primary goal was to prevent Cross-Tenant Data Modification (CTDM) where a user supplying a valid MongoDB ID could manipulate a record belonging to another organization.

The audit verified and successfully patched six distinct business domains. The tenant validation checks were shifted from purely controller-based defense to **service-level native enforcement**.

## 2. Methodology & Architectural Shift
Instead of relying strictly on Express controllers to validate `req.tenant.orgId`, we introduced a `contextOrgId` parameter into the Service Layer's primary query methods.

By patching the lowest-level generic getter (e.g., `getInquiryById(id, contextOrgId)`), all downstream service mutations—which internally call this getter before updating—automatically inherit strict cross-tenant validation.

### Defense Mechanism
```javascript
// Example of the patched service-level isolation enforcement:
if (contextOrgId && entity.orgId && String(entity.orgId) !== String(contextOrgId)) {
  throw new HttpError(403, 'Forbidden. This resource belongs to another community.');
}
```

## 3. Scope & Findings by Domain

### 3.1 Roles (Completed & Tested)
- **Vulnerability:** `updateRole` and `deleteRole` originally did not validate the target role's `orgId`.
- **Remediation:** Enforced `contextOrgId` in `updateRole` and `deleteRole` service methods.
- **Verification:** Created `roleService.integration.test.js` validating the tenant-scoped mutations. Tests pass successfully in isolation.

### 3.2 CRM Records (Inquiries, Meetings, Tasks, Threads)
- **Vulnerability:** All CRM entities accepted ID-based payloads in `update` and `delete` handlers without checking if the target entity belonged to `req.tenant.orgId`.
- **Remediation (crmInquiry.service.js):** Pushed `contextOrgId` into `getInquiryById`. Automatically secured `transitionInquiryStatus`, `updateInquiry`, `assignInquiry`, `archiveInquiry`, and `deleteInquiry`.
- **Remediation (crmMeeting.service.js):** Pushed `contextOrgId` into `getMeetingById`. Refactored `updateMeeting` and `deleteMeeting` to utilize this protected getter.
- **Remediation (crmTask.service.js):** Pushed `contextOrgId` into `getTaskById`. Refactored mutations to leverage the protected getter. Validated cross-feature dependencies (Inquiry fetching).
- **Remediation (crmThread.service.js):** Patched `getThreadById` and `deleteThread`.

### 3.3 Invoicing & Finance
- **Vulnerability:** Manual payment approvals and rejections (`approveOfflinePayment`, `rejectOfflinePayment`, `recordCashPayment`, `settleOfflinePayment`) fetched the invoice via `Invoice.findById(id)` unconditionally.
- **Remediation:** Pushed `contextOrgId` checks directly into the mutation flow inside `invoice.services.js`. The controllers were updated to pass `req.tenant.orgId` down to these methods.

### 3.4 Amenity Reservations (Verified Safe)
- **Finding:** The reservation feature already natively enforced tenant boundaries. The `_executeCancelReservation` internal service method validates `reservation.orgId.toString() !== orgId.toString()` before proceeding. No patch was necessary.

### 3.5 Issue Reports (Verified Safe)
- **Finding:** The `issueReport` domain is strictly append-only (Submit) and read-only (Get/List). There are no ID-based modification or deletion endpoints that could be exploited. No patch was necessary.

## 4. Test Environment Fix
During Phase 3C testing, it was discovered that `MongoMemoryServer` (used for integration tests) failed when executing Mongoose `.startTransaction()` since it was running in standalone mode. 

**Fix Applied:** We migrated `backend/tests/features/db.setup.js` to use `MongoMemoryReplSet` natively, unlocking fully capable distributed transactions for all future Jest integration tests.

## 5. Next Steps (Recommendations)
1. **Repository Rollout:** Future phases should propagate this `contextOrgId` parameter down into the actual Mongoose queries inside `.repository.js` files (e.g., `Model.findOneAndUpdate({ _id: id, orgId: contextOrgId })`) for database-level assurance.
2. **Phase Complete:** The critical ID-based mutation vulnerabilities have been successfully remediated at the service layer across the prescribed domains.
