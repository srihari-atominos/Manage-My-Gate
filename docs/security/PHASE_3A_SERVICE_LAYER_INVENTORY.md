# Phase 3A — Service-Layer Architecture and Test-Coverage Inventory

## 1. Git Baseline and Preservation
- **Branch:** `security/phase2-repository-tenant-isolation`
- **State:** Pure read-only inspection. No production files, configuration, or test suites were modified. All data collection was conducted exclusively via file queries (`cat` and `Get-ChildItem`).

## 2. Service Directory and Domain Inventory
The service layer (`backend/src/features/**/*.service(s).js`) is expansive, consisting of approximately 90 distinct service files reflecting the diverse SaaS multi-tenant capabilities. Prominent domains include:

- **Tenant Access Control & Identity:** `organization.services.js`, `orgMembership.services.js`, `role.services.js`, `permission.services.js`, `user.services.js`, `tenant/migration.service.js`.
- **Amenity Management:** Segmented into deep domain-driven services (e.g., `availability.service.js`, `resourceMutex.service.js`, `amenityReservation.service.js`, `amenityQuotaAllocation.service.js`, `amenityFacility.service.js`).
- **Visitor Management:** `visitorPass.service.js`, `visitorLog.service.js`.
- **Finance and Ledger:** `wallet.service.js`, `invoice.services.js`, `payment.service.js`, `ledger/financialLedger.service.js`, `ledger/reconciliation/*.service.js`.
- **Platform Administration (B2B):** `platformSubscription.service.js`, `platformOrder.service.js`, `platformEntitlement.service.js`, `platformInvoice.service.js`.
- **CRM & Issue Reporting:** `crmInquiry.service.js`, `crmTask.service.js`, `issueReport.service.js`.

## 3. Service-to-Repository Flow Summaries

The prevailing design pattern mandates Controllers invoking Services, which then orchestrate Repositories or Models. However, architectural enforcement of this flow is inconsistent:

1. **Trusted Context Derivation (`issueReport.service.js`)**
   - **Flow:** `submitReport(authenticatedUser, tenantContext, reportPayload)` 
   - **Observation:** Represents the idealized model. It extracts context from the trusted Express middleware (`req.tenant`) rather than relying on potentially tampered request bodies.
2. **Cross-Domain Entanglement (`organization.services.js`)**
   - **Flow:** `updateFeatures` directly imports `OrgMembership` model (`(await import('../orgMembership/orgMembership.model.js')).default;`).
   - **Observation:** This bypasses the established repository layer of the `orgMembership` domain, executing a cross-feature `findOne()` directly.
3. **Implicit ID-Based Trust (`role.services.js`)**
   - **Flow:** `updateRole(id, updateData)` and `deleteRole(id)` do not ingest the requesting user's `orgId`.
   - **Observation:** They query strictly by object ID and rely entirely on the Controller (`role.controller.js`) to have already manually verified that the role's parent `orgId` matches the session.

## 4. Tenant-Context Propagation Anomalies (Critical Findings)

During tracing, significant anomalies in how tenant context (`orgId`) is handled were uncovered:

- **CRITICAL - Wallet Default Tenant Leak (`wallet.service.js - addMoney`)**
  - **Path:** `addMoney(userId, orgId, amount, paymentMethod)`
  - **Behavior:** If `targetOrgId` evaluates to null (e.g., if omitted in a payload and the user has no existing wallet), the service attempts a fatal fallback:
    `const defaultOrg = (await Organization.findOne({ status: 'Active' })) || (await Organization.findOne({}));`
  - **Impact:** It arbitrarily credits the **very first active organization** returned by the database. If a user maliciously or accidentally strips `orgId` from a wallet-creation/recharge path, their funds (or administrative adjustments) leak into another tenant's ledger.

## 5. Existing Test Inventory and Verified Execution
A scan for `.test.js` and `.spec.js` files at the service tier (`backend/tests/features/`) revealed practically **zero direct service-layer test coverage** for core domains:

- **Discovered Files:**
  - `features/noticeBoard/noticeGovernance.service.test.js`
  - `features/outbox/governanceOutbox.service.test.js`
  - `features/poll/pollGovernance.service.test.js`
  - `features/poll/pollScheduling.service.test.js`
- **Missing Coverage:** The vast majority of business logic resides in untested service files. The integration tests created in Phase 2 bypass the service layer entirely, mocking payloads directly into the repositories. Core logic involving payments, tenant cross-checking, and wallet deductions are currently validated only implicitly by E2E or not at all.

## 6. Prioritized Areas Requiring Further Review
1. **Wallet & Ledger Services:** Immediate mitigation design for the `targetOrgId` fallback mechanism in `addMoney`.
2. **Role Modification Methods:** Reviewing all ID-based lookup mutations (Update/Delete) across the service layer to ensure controllers consistently execute ownership checks, or ideally pushing tenant verification down into the service method itself.
3. **Cross-Feature Communication:** Identifying and mapping instances where a service executes dynamic `import()` of foreign models instead of going through the designated foreign service/repository.

## 7. Limitations and Recommended Next Steps
**Limitations:**
- This phase was purely a static code review.
- Vulnerabilities highlighted (like the Wallet orgId leak) were verified in code logic but not deliberately exploited in a live runtime against mock user data during this phase.

**Next Steps:**
- **Phase 3B:** Proceed with testing/patching the identified severe `WalletService.addMoney` fallback vulnerability.
- Author service-level unit tests for critical transactional points (Roles, Auth, Wallet).
- Standardize a context-injection wrapper so services inherently execute operations constrained to the `tenantContext`.

## Final Status
**PASS** 
The service layer has been successfully inventoried, flow paths analyzed, test coverage confirmed as non-existent outside of governance modules, and a critical tenant-context leak logic identified.
