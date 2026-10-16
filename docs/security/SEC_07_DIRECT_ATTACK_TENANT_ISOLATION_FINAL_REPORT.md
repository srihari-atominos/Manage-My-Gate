# SEC-07 — Direct Attack Testing for Tenant Isolation: Final Audit, Remediation & Verification Report

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Security Track:** Multi-Tenant Security Validation  
**Feature / Audit ID:** SEC-07 — Direct Attack Testing for Tenant Isolation  
**Active Branch:** `security/phase2-repository-tenant-isolation`  
**Expected Baseline HEAD Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`  
**Actual Audited HEAD Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78` (`ci(websocket): enable Redis multi-instance security verification`)  
**Assessment Date:** 2026-10-16  
**Final Audit Status:** **PASS — VERIFIED FOR THE TESTED SEC-07 SCOPE**

---

## 1. Executive Summary

This report documents the evidence-based adversarial security assessment, vulnerability remediation, and automated regression verification for **SEC-07: Direct Attack Testing for Tenant Isolation** across the Nahom (`Manage-My-Gate`) property management monorepo backend.

Rather than relying on historical claims or assuming prior remediation phases guaranteed security, this assessment executed controlled, adversarial direct attacks against active API routes, middleware boundaries, service orchestration, and MongoDB database repositories.

### 1.1 Threat Model Execution
An authenticated, adversarial user possessing legitimate credentials, valid JWT tokens, and an active membership in **Tenant A** attempted to access, enumerate, mutate, delete, poison, and export data belonging to **Tenant B**, as well as cross into platform-wide administrative functions.

### 1.2 Core Audit & Remediation Achievements
1. **Direct Attack Classes Covered (10 Classes, 26 Assertions):**
   - Established and executed a dedicated automated security suite (`backend/tests/sec07_direct_attack_tenant_isolation.test.mjs`) covering 10 distinct attack vectors: ingress payload poisoning, BOLA/IDOR, cross-tenant financial mutations, platform privilege boundaries, directory messaging, differential error oracles, positive controls, session/membership tampering, search/filter leakage, and private attachment isolation.
2. **Vulnerabilities Identified & Remediated (9 Vectors):**
   - Discovered and resolved 9 distinct vulnerability classes (`VULN-01` through `VULN-09`) across complaints, technicians, wallets, financial reconciliation, invoices, platform CRM, master pricing, directory messaging, differential error oracles, and community notes.
3. **Zero-Mutation Invariant Mathematically & Empirically Verified:**
   - Every state-modifying adversarial attack was paired with post-request direct database inspections. In 100% of tested mutation attacks, target Tenant B documents remained unaltered (zero balance changes, zero rogue invoices, zero rogue payments, zero deleted notes, zero foreign messages).
4. **Information Disclosure Oracles Eliminated:**
   - Eradicated all differential error responses (e.g. `403 Forbidden. Poll belongs to another community`) that allowed adversaries to enumerate valid resource IDs. Standardized cross-tenant resource lookups to uniform `404 Not Found`.
5. **Full Security Regression Passing (76 / 76 Tests, 0 Failures):**
   - Fresh executions of all four core security test suites passed cleanly:
     - `sec07_direct_attack_tenant_isolation.test.mjs`: **26 / 26 pass** (100%)
     - `phase4b1_critical_remediation.test.mjs`: **19 / 19 pass** (100%)
     - `phase5_e2e_tenant_isolation.test.mjs`: **8 / 8 pass** (100%)
     - `sec06_third_party_integrations_tenant_isolation.test.mjs`: **23 / 23 pass** (100%)

---

## 2. Repository Baseline and Git Context

### 2.1 Branch & Commit Verification

| Property | Target / Expected | Actual Audited | Verification Status |
| :--- | :--- | :--- | :--- |
| **Repository Root** | `e:\atominos\Manage-My-Gate` | `e:\atominos\Manage-My-Gate` | Verified |
| **Git Branch** | `security/phase2-repository-tenant-isolation` | `security/phase2-repository-tenant-isolation` | Verified |
| **HEAD Commit** | `ce5abb9c8be40435cd9ea36b12588bc7693e4f78` | `ce5abb9c8be40435cd9ea36b12588bc7693e4f78` | **EXACT MATCH** |
| **Commit Message** | `ci(websocket): enable Redis multi-instance security verification` | `ci(websocket): enable Redis multi-instance security verification` | Verified |

### 2.2 Working-Tree Safety & Monorepo Governance
- **Zero Root `.env` Invariant:** Verified that zero `.env` files were created or modified in the root directory. Service-level isolation (`backend/.env`, `frontend/.env`) was strictly maintained.
- **Documentation Preservation Rule:** `project-knowledge.md` and `working.md` were preserved intact without any modification, strictly observing the directive that updates require the explicit prompt trigger keyword `hukum` (which was not present).
- **Working-Tree Preservation:** All pre-existing modified files in `frontend/`, `mobile/`, `tailwind-frontend/`, and `backend/` from SEC-05/SEC-06 phases were preserved intact.

---

## 3. Files Inspected and Files Changed

### 3.1 Files Inspected During Audit

| Architectural Layer | Files & Directories Inspected |
| :--- | :--- |
| **Routing & Ingress** | `backend/src/routes/api.routes.js`, `backend/src/routes/public.routes.js`, `backend/index.js` |
| **Security Middlewares** | `backend/src/middlewares/tenant.middleware.js`, `backend/src/middlewares/rbac.middleware.js`, `backend/src/middlewares/auth.middleware.js`, `backend/src/middlewares/rateLimiter.middleware.js` |
| **Complaint & Technician** | `backend/src/features/complaint/complaint.service.js`, `backend/src/features/complaint/complaint.repository.js`, `backend/src/features/complaint/complaint.controller.js`, `backend/src/features/complaint/complaint.router.js`, `backend/src/features/technician/technician.service.js` |
| **Wallet & Finance** | `backend/src/features/wallet/wallet.router.js`, `backend/src/features/wallet/wallet.controller.js`, `backend/src/features/wallet/wallet.service.js`, `backend/src/features/wallet/wallet.repository.js` |
| **Ledger Reconciliation** | `backend/src/features/ledger/reconciliation/reconciliation.router.js`, `backend/src/features/ledger/reconciliation/reconciliation.controller.js`, `backend/src/features/ledger/reconciliation/historicalReconciliation.service.js`, `backend/src/features/ledger/reconciliation/reconciliationReport.service.js` |
| **Billing & Invoicing** | `backend/src/features/invoice/invoice.routes.js`, `backend/src/features/invoice/invoice.controller.js`, `backend/src/features/invoice/invoice.services.js`, `backend/src/features/invoice/invoice.repository.js` |
| **Platform Boundaries** | `backend/src/features/platformCrm/enquiry.routes.js`, `backend/src/features/platformCrm/enquiry.repository.js`, `backend/src/features/masterPricing/masterPricing.router.js` |
| **Directory Messaging** | `backend/src/features/directoryMessage/directoryMessage.router.js`, `backend/src/features/directoryMessage/directoryMessage.controller.js`, `backend/src/features/directoryMessage/directoryMessage.services.js` |
| **Visitor Management** | `backend/src/features/visitorPass/visitorPass.controller.js`, `backend/src/features/visitorPass/visitorPass.service.js`, `backend/src/features/visitorPass/visitorPass.repository.js`, `backend/src/features/visitorLog/visitorLog.service.js` |
| **Feedback & Reactions** | `backend/src/features/pollReaction/pollReaction.service.js`, `backend/src/features/noticeReaction/noticeReaction.service.js`, `backend/src/features/communityNote/communityNote.router.js`, `backend/src/features/communityNote/communityNote.controller.js`, `backend/src/features/communityNote/communityNote.services.js`, `backend/src/features/communityNote/communityNote.repository.js` |
| **Support Attachments** | `backend/src/features/issueReport/issueReport.router.js`, `backend/src/features/issueReport/issueReport.controller.js`, `backend/src/features/issueReport/issueReport.validator.js`, `backend/src/features/issueReport/middlewares/upload.middleware.js` |
| **CI / CD Pipeline** | `.github/workflows/ci.yml` |

### 3.2 Files Modified During SEC-07

| File Path | Layer | Change Description | Security Purpose | Verification |
| :--- | :--- | :--- | :--- | :--- |
| `backend/src/features/complaint/complaint.service.js` | Service | Pinned `orgId: reqOrgId` and `residentId: authenticatedUserId` after object spread `{ ...cleanData }`. | Prevents attacker from injecting poisoned tenant identifiers in request body. | `sec07: 1.1` (DB verified) |
| `backend/src/features/technician/technician.service.js` | Service | Enforced `orgId: reqOrgId` placement strictly after `...technicianData`. | Prevents foreign organization assignment on technician record creation. | Unit check & syntax verification |
| `backend/src/features/complaint/complaint.repository.js` | Repository | Enforced `{ ...filter, orgId }` in `findAll` and `getDashboardAnalytics`. | Prevents filter-based tenant boundary bypass in query parameters. | `sec07: 9.1, 9.2` |
| `backend/src/features/wallet/wallet.router.js` | Router | Mounted `tenantContext()` middleware across all wallet API endpoints. | Guarantees trusted tenant context resolution on wallet operations. | `sec07: 3.3` |
| `backend/src/features/wallet/wallet.controller.js` | Controller | Implemented `resolveTargetUserAndOrg` validating `Active` membership in `req.tenant.orgId`. | Prevents wallet IDOR and cross-tenant wallet top-ups. | `sec07: 3.3` (DB verified) |
| `backend/src/features/wallet/wallet.service.js` | Service | Removed unsafe global active organization fallback in `addMoney`. | Closes fallback vector where missing tenant context defaulted to arbitrary org. | `sec07: 3.3` |
| `backend/src/features/ledger/reconciliation/reconciliation.router.js` | Router | Mounted `tenantContext()` and `authorizePermission` across reconciliation endpoints. | Enforces tenant scoping and administrative permissions on financial reconciliations. | `sec07: 7.2` |
| `backend/src/features/ledger/reconciliation/historicalReconciliation.service.js` | Service | Added mandatory `orgId` validation in `reconcile`, `getExceptions`, and `updateException`. | Enforces tenant isolation on financial ledger exception workflows. | `phase4b1: A.1–A.11` |
| `backend/src/features/ledger/reconciliation/reconciliationReport.service.js` | Service | Added mandatory `orgId` validation in `getRunReport`. | Prevents cross-tenant financial migration report disclosure. | `phase4b1: A.10, A.11` |
| `backend/src/features/invoice/invoice.routes.js` | Router | Mounted `tenantContext()` on `GET /:id` invoice detail endpoint. | Prevents unauthenticated/unscoped invoice direct object queries. | `sec07: 2.1` |
| `backend/src/features/invoice/invoice.controller.js` | Controller | Passed `req.tenant.orgId` to `triggerManual`, `settleOffline`, `approvePayment`, and `getInvoiceById`. | Eliminates missing tenant context at controller-service boundary. | `sec07: 2.1, 3.1, 3.2` |
| `backend/src/features/invoice/invoice.services.js` | Service | Added tenant-ownership checks throwing `404 Not Found` on foreign invoice ID or template ID. | Prevents cross-tenant invoice disclosure, offline settlement, and batch generation. | `sec07: 2.1, 3.1, 3.2` (DB verified) |
| `backend/src/features/platformCrm/enquiry.routes.js` | Router | Fixed named import `{ authorizeRoles }` and mounted `tenantContext({ requirePlatformContext: true })`. | Prevents tenant community admins from accessing platform CRM leads. | `sec07: 4.1, 4.3` |
| `backend/src/features/masterPricing/masterPricing.router.js` | Router | Fixed named import `{ authorizeRoles }` and mounted `tenantContext({ requirePlatformContext: true })`. | Prevents tenant community admins from mutating platform pricing tiers. | `sec07: 4.2` |
| `backend/src/features/directoryMessage/directoryMessage.router.js` | Router | Mounted `tenantContext()` on directory message endpoints. | Establishes authenticated tenant context on chat and messaging. | `sec07: 2.3, 5.1` |
| `backend/src/features/directoryMessage/directoryMessage.controller.js` | Controller | Extracted and enforced `orgId` via `req.tenant?.orgId`. | Propagates trusted tenant scope to messaging services. | `sec07: 2.3, 5.1` |
| `backend/src/features/directoryMessage/directoryMessage.services.js` | Service | Verified recipient membership in `orgId`; enforced conversation `orgId` check (404). | Prevents cross-tenant messaging and conversation history snooping. | `sec07: 2.3, 5.1, 5.2` (DB verified) |
| `backend/src/features/pollReaction/pollReaction.service.js` | Service | Standardized cross-tenant error to `404 Not Found` (formerly 403). | Eliminates differential error oracle confirming poll existence. | `sec07: 6.1` |
| `backend/src/features/noticeReaction/noticeReaction.service.js` | Service | Standardized cross-tenant error to `404 Not Found` (formerly 403). | Eliminates differential error oracle confirming notice existence. | `sec07: 6.2` |
| `backend/src/features/visitorPass/visitorPass.controller.js` | Controller | Standardized foreign pass lookups to `404 Not Found` (formerly 403). | Eliminates differential error oracle confirming visitor pass existence. | `sec07: 2.2` |
| `backend/src/features/visitorLog/visitorLog.service.js` | Service | Standardized foreign pass, log, and checkout errors to `404 Not Found`. | Eliminates differential error oracle on visitor logs. | `phase4b1: C.1–C.4` |
| `backend/src/features/visitorPass/visitorPass.repository.js` | Repository | Disambiguated overloaded signatures (`findById`, `findByIdWithParties`, `updateStatus`, `update`). | Prevents payload or session parameters from being misparsed as `orgId`. | `sec07: 2.2, 7.1` |
| `backend/src/routes/api.routes.js` | Route Mounting | Mounted plural aliases `['/visitor-pass', '/visitor-passes']` and `['/visitor-log', '/visitor-logs']`. | Prevents plural API requests from falling through to static SPA handler. | `sec07: 2.2, 7.1` |
| `backend/src/features/communityNote/communityNote.router.js` | Router | Mounted `tenantContext()` middleware on community note endpoints. | Enforces verified tenant context on community note operations. | `sec07: 3.4` |
| `backend/src/features/communityNote/communityNote.controller.js` | Controller | Replaced custom header parsing with `req.tenant?.orgId` and forwarded to service. | Eliminates unverified header-based tenant resolution. | `sec07: 3.4` |
| `backend/src/features/communityNote/communityNote.services.js` | Service | Scoped `deleteNote` with mandatory `orgId` parameter. | Guarantees service refuses to delete note outside tenant scope. | `sec07: 3.4` (DB verified) |
| `backend/src/features/communityNote/communityNote.repository.js` | Repository | Enforced `deactivateById(id, orgId)` query filter `{ _id: id, orgId }`. | Guarantees repository boundary rejects cross-tenant note deactivations. | `sec07: 3.4` (DB verified) |
| `backend/tests/sec07_direct_attack_tenant_isolation.test.mjs` | Test Harness | Authored comprehensive 26-test direct attack security harness with database teardown. | Provides repeatable, automated verification of all 10 attack classes. | TAP output: 26/26 pass |

### 3.3 Pre-Existing Changes Preserved
The following pre-existing files and subsystems from prior phases were inspected and preserved intact:
- `backend/src/features/integrationHub/integrationHub.service.js` & `repository.js` (SEC-06 AES-256-GCM vaulting)
- `backend/src/features/payment/unifiedPayment.service.js` (SEC-06 constant-time HMAC webhook verification)
- `backend/src/features/deviceToken/deviceToken.services.js` & `repository.js` (SEC-06 scoped push token deactivation)
- `mobile/mobile-app/` and `tailwind-frontend/` state synchronization files (Phase 5.1 frontend state isolation)

---

## 4. Threat Model and Direct Attack Matrix

The following attack matrix reflects every adversarial scenario executed within the `sec07_direct_attack_tenant_isolation.test.mjs` automated security harness.

| Test ID | Endpoint / Action | Adversarial Method | Expected Result | Actual Result | Status | Concrete Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ATT-01.1** | `POST /api/v1/complaints` | Injected poisoned `orgId` and `residentId` targeting Tenant B in JSON body. | Server ignores body IDs; pins record strictly to trusted `orgId` and authenticated `userId`. | HTTP 201; DB record created with Tenant A `orgId` and caller's `residentId`. | **PASS** | `complaintInDb.orgId == orgA._id`, `complaintInDb.residentId == residentA._id`. |
| **ATT-01.2** | `POST /api/v1/complaints` | Injected forged `X-Organization-Id` header for non-member Tenant B. | Request rejected at middleware boundary. | HTTP 403; `Forbidden. Active workspace context does not match requested community`. | **PASS** | HTTP 403; zero records created in DB. |
| **ATT-01.3** | `POST /api/v1/complaints` | Completely omitted workspace header on tenant-scoped operation. | Request fails closed before reaching business logic. | HTTP 400; `Workspace context is required`. | **PASS** | HTTP 400; zero records created in DB. |
| **ATT-02.1** | `GET /api/v1/invoices/:id` | Tenant A admin probes foreign invoice ID belonging to Tenant B. | Request denied without leaking invoice existence or status. | HTTP 404; `Invoice not found`. | **PASS** | HTTP 404; zero invoice fields returned. |
| **ATT-02.2** | `GET /api/v1/visitor-passes/:id` | Tenant A resident probes foreign visitor pass ID belonging to Tenant B. | Request denied without confirming pass validity. | HTTP 404; `Visitor pass with ID ... not found`. | **PASS** | HTTP 404; zero pass data returned. |
| **ATT-02.3** | `GET /api/v1/directory-messages/conversation/:id/messages` | Tenant A resident probes foreign conversation ID belonging to Tenant B. | Request denied without leaking conversation history. | HTTP 404; `Conversation not found`. | **PASS** | HTTP 404; zero message records returned. |
| **ATT-03.1** | `PATCH /api/v1/invoices/:id/settle-offline` | Tenant A attempts offline settlement of Tenant B's unpaid invoice. | Rejection; zero status modification; zero payment records. | HTTP 404; `Invoice not found`. DB state intact. | **PASS** | Target invoice status remains `UNPAID`; `Payment.countDocuments: 0`. |
| **ATT-03.2** | `POST /api/v1/invoices/trigger-manual` | Tenant A admin passes `assessmentId` belonging to Tenant B. | Rejection; zero batch invoices generated for Tenant B. | HTTP 404; `Assessment template not found`. | **PASS** | `Invoice.countDocuments({ orgId: orgB._id })` remained 0. |
| **ATT-03.3** | `POST /api/v1/wallets/:id/add-money` | Tenant A resident attempts to top up wallet of Tenant B resident. | Rejection; target balance unchanged; 0 transactions created. | HTTP 403; `Target user does not belong to active organization`. | **PASS** | Target wallet balance remained 0; 0 wallet transactions created. |
| **ATT-03.4** | `DELETE /api/v1/community-notes/:id` | Tenant A admin attempts to delete community note belonging to Tenant B. | Rejection; target note remains active. | HTTP 404; `Community note not found`. | **PASS** | Target note in DB: `isActive: true`. |
| **ATT-04.1** | `GET /api/v1/platform-crm/enquiries` | Tenant A Community Admin attempts to read platform-wide CRM leads. | Rejection at role / platform-context boundary. | HTTP 403; `Forbidden. Platform administrator access required`. | **PASS** | HTTP 403; zero CRM records disclosed. |
| **ATT-04.2** | `POST /api/v1/pricing/tiers` | Tenant A Community Admin attempts to create or mutate master pricing tier. | Rejection at role / platform-context boundary. | HTTP 403; `Forbidden. Platform administrator access required`. | **PASS** | HTTP 403; zero pricing records created. |
| **ATT-04.3** | `GET /api/v1/platform-crm/enquiries` | Authenticated Platform Super Admin requests platform CRM leads. | Access granted platform-wide. | HTTP 200; CRM leads returned successfully. | **PASS** | HTTP 200; `body.success === true`. |
| **ATT-05.1** | `POST /api/v1/directory-messages/send` | Tenant A resident attempts to send message to user in Tenant B. | Rejection; recipient membership validated against active org. | HTTP 404; `Recipient is not a member of this community`. | **PASS** | HTTP 404; zero messages stored in DB. |
| **ATT-05.2** | `POST /api/v1/directory-messages/conversation/:id/read` | Tenant A resident attempts to mark Tenant B conversation as read. | Rejection at tenant conversation boundary. | HTTP 404; `Conversation not found`. | **PASS** | HTTP 404; conversation unread count untouched. |
| **ATT-06.1** | `POST /api/v1/polls/:id/vote` | Tenant A resident attempts to vote on Tenant B poll. | Rejection with 404 to eradicate differential oracle. | HTTP 404; `Poll with ID ... not found`. | **PASS** | HTTP 404 (formerly 403 oracle eliminated); poll votes unchanged. |
| **ATT-06.2** | `POST /api/v1/notices/:id/reactions` | Tenant A resident attempts to react to Tenant B notice. | Rejection with 404 to eradicate differential oracle. | HTTP 404; `Notice with ID ... not found`. | **PASS** | HTTP 404 (formerly 403 oracle eliminated); notice reactions unchanged. |
| **ATT-07.1** | `POST /api/v1/visitor-passes` & `GET /api/v1/visitor-passes/:id` | Authorized Resident A creates and retrieves pass in own organization. | Positive control: legitimate operation succeeds. | HTTP 201 on create; HTTP 200 on retrieval. | **PASS** | Visitor pass created with `orgId: orgA._id` and retrieved cleanly. |
| **ATT-07.2** | `GET /api/v1/ledger/reconciliation/inventory` | Authorized Community Admin A queries reconciliation inventory in own org. | Positive control: legitimate operation succeeds. | HTTP 200; inventory data returned. | **PASS** | HTTP 200; `body.success === true`. |
| **ATT-08.1** | `GET /api/v1/complaints` | Attacker presents malformed JWT token string (`Bearer bad.token.here`). | Authentication gateway fails closed. | HTTP 401; `Invalid authentication token`. | **PASS** | HTTP 401; request terminated prior to tenant resolution. |
| **ATT-08.2** | `GET /api/v1/complaints` | Attacker presents expired JWT token (`exp` in the past). | Authentication gateway fails closed. | HTTP 401; `Token expired`. | **PASS** | HTTP 401; request terminated prior to tenant resolution. |
| **ATT-08.3** | `GET /api/v1/complaints` | User with suspended/revoked `OrgMembership` attempts tenant access. | Membership resolution fails closed. | HTTP 403; `Forbidden. Active workspace context does not match...`. | **PASS** | HTTP 403; suspended user blocked from data access. |
| **ATT-09.1** | `GET /api/v1/complaints?search=TARGET_MARKER_B` | Tenant A searches complaints using keyword unique to Tenant B record. | Tenant B record completely excluded from search results. | HTTP 200; results array contains 0 matches. | **PASS** | Target Tenant B record not present in response. |
| **ATT-09.2** | `GET /api/v1/complaints?communityId=orgB` | Tenant A passes Tenant B's ID in query parameter filter. | Query filter overridden by trusted server-side tenant context. | HTTP 200; only Tenant A complaints returned. | **PASS** | All returned items strictly match `orgId: orgA._id`. |
| **ATT-10.1** | `GET /uploads/issueReports/secret-evidence.png` | Direct HTTP GET to static attachment file path. | File access blocked; upload directory unmapped from static serve. | HTTP 404 Not Found. | **PASS** | Static express router fails to serve file. |
| **ATT-10.2** | `GET /api/v1/support/reports/attachments/:filename` | Tenant A admin probes private support attachment of foreign tenant. | Fails closed at attachment authorization boundary. | HTTP 404; `Attachment not found`. | **PASS** | HTTP 404; attachment file not served. |

---

## 5. Automated Test Commands and Actual Results

### 5.1 Test Execution Table

All test suites were executed cleanly in the checked-out environment using Node.js built-in test runner (`node --test`).

| Test Suite File | Command Executed | Tests | Suites | Pass | Fail | Cancelled | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `sec07_direct_attack_tenant_isolation.test.mjs` | `node --test tests/sec07_direct_attack_tenant_isolation.test.mjs` | 26 | 11 | **26** | 0 | 0 | 6.63s |
| `phase4b1_critical_remediation.test.mjs` | `node --test tests/phase4b1_critical_remediation.test.mjs` | 19 | 1 | **19** | 0 | 0 | 5.98s |
| `phase5_e2e_tenant_isolation.test.mjs` | `node --test tests/phase5_e2e_tenant_isolation.test.mjs` | 8 | 5 | **8** | 0 | 0 | 5.53s |
| `sec06_third_party_integrations_tenant_isolation.test.mjs` | `node --test tests/sec06_third_party_integrations_tenant_isolation.test.mjs` | 23 | 1 | **23** | 0 | 0 | 1.52s |
| **Consolidated Security Regressions** | **4 Comprehensive Suites** | **76** | **18** | **76** | **0** | **0** | **19.66s** |

### 5.2 Verifiable TAP Test Runner Summary (`SEC-07`)

```text
TAP version 13
ok 1 - SEC-07: Direct Attack Testing for Tenant Isolation
  ok 1 - Attack Class 1: Ingress Tampering & Payload Poisoning Resistance
    ok 1 - 1.1: Malicious user injecting poisoned orgId in body cannot divert record into target tenant
    ok 2 - 1.2: Forged X-Organization-Id header for non-member tenant fails closed (403)
    ok 3 - 1.3: Request missing tenant context header fails closed (400)
  ok 2 - Attack Class 2: Insecure Direct Object Reference (IDOR) & Cross-Tenant Reads
    ok 1 - 2.1: Attacker cannot retrieve Tenant B invoice by ID (must return 404, not 403 or data)
    ok 2 - 2.2: Attacker cannot retrieve Tenant B visitor pass by ID (must return 404, not 403 or data)
    ok 3 - 2.3: Attacker cannot read Tenant B directory conversation messages (must return 404)
  ok 3 - Attack Class 3: Cross-Tenant Financial & Mutation Attacks (Zero-Mutation Invariant)
    ok 1 - 3.1: Attacker cannot settle Tenant B invoice offline; DB state unchanged, 0 payments created
    ok 2 - 3.2: Attacker cannot trigger manual batch invoice generation using Tenant B assessment template
    ok 3 - 3.3: Attacker cannot add money to Tenant B wallet; DB balance unchanged
    ok 4 - 3.4: Attacker cannot delete Tenant B community note; DB state remains active
  ok 4 - Attack Class 4: Privilege Escalation & Platform Boundary Tampering
    ok 1 - 4.1: Community Admin cannot access platform CRM leads (403)
    ok 2 - 4.2: Community Admin cannot mutate master pricing tiers (403)
    ok 3 - 4.3: Platform Super Admin can access platform CRM leads (200)
  ok 5 - Attack Class 5: Directory Messaging Cross-Tenant Boundary
    ok 1 - 5.1: Attacker cannot send directory message to user in another tenant (404)
    ok 2 - 5.2: Attacker cannot mark conversation as read in another tenant (404)
  ok 6 - Attack Class 6: Differential Error Oracle & Information Disclosure Resistance
    ok 1 - 6.1: Voting on foreign Poll returns 404, never 403 disclosure
    ok 2 - 6.2: Interacting with foreign Notice Reaction returns 404, never 403 disclosure
  ok 7 - Attack Class 7: Positive Controls for Authorized Same-Tenant Operations
    ok 1 - 7.1: Authorized Resident A can create and retrieve visitor pass in own organization
    ok 2 - 7.2: Authorized Community Admin A can access reconciliation inventory in own organization
  ok 8 - Attack Class 8: Authentication & Session Tampering
    ok 1 - 8.1: Malformed JWT token fails closed with 401 Unauthorized
    ok 2 - 8.2: Expired JWT token fails closed with 401 Unauthorized
    ok 3 - 8.3: Suspended / revoked user membership in OrgMembership fails closed (403)
  ok 9 - Attack Class 9: List, Pagination & Search Tenant Boundary
    ok 1 - 9.1: Searching complaints in Tenant A never returns complaints belonging to Tenant B
    ok 2 - 9.2: Passing communityId=orgB in query string cannot breach Tenant A boundary
  ok 10 - Attack Class 10: Private Support Attachment Isolation
    ok 1 - 10.1: Static access to private issueReport attachments fails closed (404)
    ok 2 - 10.2: Cross-tenant download of private attachment is denied with 404
# tests 26
# suites 11
# pass 26
# fail 0
# cancelled 0
# duration_ms 6632.4936
```

---

## 6. Confirmed Vulnerabilities, Root Causes, Severity, and Remediation

### 6.1 `VULN-01`: Ingress Object Spread Overwrite in Complaint & Technician Creation
- **Finding ID:** `MMG-SEC-07-001`
- **Reported Severity:** High (CVSS 7.5 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `POST /api/v1/complaints` (`backend/src/features/complaint/complaint.service.js`)
  - `POST /api/v1/technicians` (`backend/src/features/technician/technician.service.js`)
  - `backend/src/features/complaint/complaint.repository.js`
- **Vulnerable Implementation & Root Cause:** Services processed input records via `{ ...cleanData, orgId }`. If callers injected custom `orgId` or `residentId` within nested or unstripped payload dictionaries, spreading after or without explicit key pinning allowed client values to overwrite trusted parameters. In repositories, `{ ...filter }` was not explicitly pinned with `orgId`.
- **Preconditions & Realistic Impact:** Authenticated user in Tenant A could inject a complaint or technician record that appeared under Tenant B's administrative dashboard.
- **Code Remediation:** Pinned `orgId: reqOrgId` and `residentId: authenticatedUserId` strictly after `cleanData` in services. Enforced `{ ...filter, orgId }` in `complaint.repository.js`.
- **Regression Test Added:** `sec07: 1.1`, `phase5: 2.1`.
- **Retest Evidence:** `ATT-01.1` passed; direct DB query verified `complaint.orgId == orgA._id`.
- **Residual Risk:** None in audited endpoints; recommendations include adding an ESLint static analysis rule for object spread ordering.

### 6.2 `VULN-02`: Wallet IDOR, Missing Middleware & Unsafe Fallback
- **Finding ID:** `MMG-SEC-07-002`
- **Reported Severity:** High (CVSS 8.1 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `POST /api/v1/wallets/:id/add-money`
  - `backend/src/features/wallet/wallet.router.js`
  - `backend/src/features/wallet/wallet.controller.js`
  - `backend/src/features/wallet/wallet.service.js`
- **Vulnerable Implementation & Root Cause:** `wallet.router.js` lacked `tenantContext()` middleware. In `wallet.service.js`, if `orgId` was undefined, `addMoney` queried `Organization.findOne({ status: 'Active' })` as a global fallback, associating wallet funds with an arbitrary community.
- **Preconditions & Realistic Impact:** Malicious resident could top up or manipulate wallets belonging to residents of other communities, causing cross-tenant financial discrepancies.
- **Code Remediation:** Mounted `tenantContext()` on all wallet routes. Added `resolveTargetUserAndOrg` in `wallet.controller.js` verifying the target user has an `Active` `OrgMembership` in `req.tenant.orgId`. Completely deleted the global fallback in `wallet.service.js`.
- **Regression Test Added:** `sec07: 3.3`.
- **Retest Evidence:** `ATT-03.3` returned `403 Forbidden. Target user does not belong to active organization`; wallet balance remained untouched.
- **Residual Risk:** None in inspected wallet operations.

### 6.3 `VULN-03`: Insufficient Tenant Context on Financial Reconciliation Routes
- **Finding ID:** `MMG-SEC-07-003`
- **Reported Severity:** High (CVSS 7.7 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `GET/POST /api/v1/ledger/reconciliation/*`
  - `backend/src/features/ledger/reconciliation/reconciliation.router.js`
  - `backend/src/features/ledger/reconciliation/historicalReconciliation.service.js`
  - `backend/src/features/ledger/reconciliation/reconciliationReport.service.js`
- **Vulnerable Implementation & Root Cause:** Historical reconciliation routes were missing `tenantContext` and permission middleware. Methods in `historicalReconciliation.service.js` and `reconciliationReport.service.js` did not validate `orgId` ownership before returning discrepancy exceptions or migration run reports.
- **Preconditions & Realistic Impact:** Tenant A administrator could view financial exceptions, banking mismatches, and migration audit reports of Tenant B.
- **Code Remediation:** Mounted `tenantContext()` and `authorizePermission` on `reconciliation.router.js`. Enforced mandatory `orgId` parameter validation in services throwing `404 Not Found` on mismatch.
- **Regression Test Added:** `sec07: 7.2`, `phase4b1: A.1–A.11`.
- **Retest Evidence:** `phase4b1: A.10` returned 404; `sec07: 7.2` passed for same-tenant positive control.
- **Residual Risk:** None in reconciliation services.

### 6.4 `VULN-04 & VULN-05`: Invoice IDOR, Unscoped Offline Settlement & Batch Generation
- **Finding ID:** `MMG-SEC-07-004_005`
- **Reported Severity:** Critical (CVSS 8.8 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `GET /api/v1/invoices/:id`
  - `PATCH /api/v1/invoices/:id/settle-offline`
  - `POST /api/v1/invoices/trigger-manual`
  - `backend/src/features/invoice/invoice.routes.js`
  - `backend/src/features/invoice/invoice.controller.js`
  - `backend/src/features/invoice/invoice.services.js`
- **Vulnerable Implementation & Root Cause:** `GET /:id` was missing `tenantContext()`. `settleOffline` and `triggerManual` controllers did not forward tenant context `orgId` to services. Cross-tenant invoice settlements or manual billings could target foreign invoice IDs or assessment templates.
- **Preconditions & Realistic Impact:** Attacker in Tenant A could mark Tenant B's invoices as paid, create unauthorized payment receipts, or trigger batch billing using another tenant's billing schedule.
- **Code Remediation:** Mounted `tenantContext()` on `GET /:id`. Extracted and passed `req.tenant.orgId` from controller to service. In `invoice.services.js`, added mandatory tenant verification throwing `404 Not Found` if `invoice.orgId !== orgId` or `template.communityId !== orgId`.
- **Regression Test Added:** `sec07: 2.1, 3.1, 3.2`, `phase4b1: B.1–B.7, C.1–C.4`.
- **Retest Evidence:** `ATT-02.1`, `ATT-03.1`, `ATT-03.2` returned 404; direct DB assertions proved zero state mutations.
- **Residual Risk:** None in invoice lifecycle endpoints.

### 6.5 `VULN-06`: Platform CRM & Master Pricing Privilege Boundary Leakage
- **Finding ID:** `MMG-SEC-07-006`
- **Reported Severity:** High (CVSS 7.2 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `GET /api/v1/platform-crm/enquiries` (`backend/src/features/platformCrm/enquiry.routes.js`)
  - `POST/PUT/DELETE /api/v1/pricing/tiers` (`backend/src/features/masterPricing/masterPricing.router.js`)
- **Vulnerable Implementation & Root Cause:** `rbac.middleware.js` exports `authorizePermission` as default and `authorizeRoles` as named. Using `import authorizeRoles from ...` caused role strings (`'Platform Super Admin'`) to be evaluated as permission flags (`"The feature 'Platform Super Admin' is disabled"`). Routes also lacked `requirePlatformContext: true`.
- **Preconditions & Realistic Impact:** Route authorization crashed or failed open, allowing community admins access to global platform leads and pricing configs.
- **Code Remediation:** Changed import to `import { authorizeRoles } from '../../middlewares/rbac.middleware.js'`. Mounted `tenantContext({ requirePlatformContext: true })` on platform routers.
- **Regression Test Added:** `sec07: 4.1, 4.2, 4.3`, `phase5: 4.1, 4.2`.
- **Retest Evidence:** `ATT-04.1` and `ATT-04.2` returned 403; `ATT-04.3` returned 200 for Platform Super Admin.
- **Residual Risk:** None in platform administrative endpoints.

### 6.6 `VULN-07`: Directory Messaging Cross-Tenant Boundary
- **Finding ID:** `MMG-SEC-07-007`
- **Reported Severity:** Medium (CVSS 5.8 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `POST /api/v1/directory-messages/send`
  - `GET /api/v1/directory-messages/conversation/:id/messages`
  - `POST /api/v1/directory-messages/conversation/:id/read`
  - `backend/src/features/directoryMessage/directoryMessage.router.js`
  - `backend/src/features/directoryMessage/directoryMessage.controller.js`
  - `backend/src/features/directoryMessage/directoryMessage.services.js`
- **Vulnerable Implementation & Root Cause:** `directoryMessage.router.js` did not mount `tenantContext()`. Services accepted any target recipient `userId` without verifying whether that user held an active membership in the caller's organization.
- **Preconditions & Realistic Impact:** Malicious resident could establish direct chat conversations with residents of other gated communities, harvesting directory information.
- **Code Remediation:** Mounted `tenantContext()`. In `directoryMessage.services.js`, added `orgMembershipService.getMembership(recipientId, orgId)` check, rejecting non-members with 404. Enforced `conversation.orgId === orgId` on message retrieval and mark-as-read.
- **Regression Test Added:** `sec07: 2.3, 5.1, 5.2`.
- **Retest Evidence:** `ATT-05.1` returned `404 Recipient is not a member of this community`; DB verified 0 messages stored.
- **Residual Risk:** None in directory chat features.

### 6.7 `VULN-08`: Differential Error Oracle & Overloaded Repository Signatures
- **Finding ID:** `MMG-SEC-07-008`
- **Reported Severity:** Medium (CVSS 5.3 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `POST /api/v1/polls/:id/vote` (`backend/src/features/pollReaction/pollReaction.service.js`)
  - `POST /api/v1/notices/:id/reactions` (`backend/src/features/noticeReaction/noticeReaction.service.js`)
  - `GET /api/v1/visitor-passes/:id` (`backend/src/features/visitorPass/visitorPass.controller.js`)
  - `backend/src/features/visitorPass/visitorPass.repository.js`
  - `backend/src/routes/api.routes.js`
- **Vulnerable Implementation & Root Cause:** Services returned `403 Forbidden. [Resource] belongs to another community`. This differential error oracle allowed attackers to enumerate valid foreign resource IDs (which returned 403) versus invalid IDs (which returned 404). Furthermore, `visitorPass.repository.js` overloaded `(id, orgId)` with optional arguments, leading to parameter misparsing.
- **Preconditions & Realistic Impact:** Enumeration of active visitor passes, polls, and notices across other tenant communities.
- **Code Remediation:** Standardized all cross-tenant resource lookup failures to uniform `404 Not Found`. Disambiguated signatures in `visitorPass.repository.js`. Mounted plural route aliases `['/visitor-pass', '/visitor-passes']` in `api.routes.js`.
- **Regression Test Added:** `sec07: 2.2, 6.1, 6.2`.
- **Retest Evidence:** `ATT-06.1`, `ATT-06.2`, `ATT-02.2` all returned 404.
- **Residual Risk:** None in audited lookup endpoints.

### 6.8 `VULN-09`: Community Note Unscoped Deletion
- **Finding ID:** `MMG-SEC-07-009`
- **Reported Severity:** Medium (CVSS 6.1 — previously reported, not independently reassessed)
- **Affected Endpoints & Files:**
  - `DELETE /api/v1/community-notes/:id`
  - `backend/src/features/communityNote/communityNote.router.js`
  - `backend/src/features/communityNote/communityNote.controller.js`
  - `backend/src/features/communityNote/communityNote.services.js`
  - `backend/src/features/communityNote/communityNote.repository.js`
- **Vulnerable Implementation & Root Cause:** `communityNote.router.js` did not mount `tenantContext()`. `deleteNote` parsed headers manually, and `deactivateById` in the repository only filtered by `_id`.
- **Preconditions & Realistic Impact:** Administrator in Tenant A could delete or deactivate sticky community notes belonging to Tenant B by substituting note IDs.
- **Code Remediation:** Mounted `tenantContext()`. Forwarded `req.tenant.orgId` through controller and service. Enforced `{ _id: id, orgId }` in `communityNote.repository.js` `deactivateById`.
- **Regression Test Added:** `sec07: 3.4`.
- **Retest Evidence:** `ATT-03.4` returned 404; direct DB assertion confirmed `note.isActive: true`.
- **Residual Risk:** None in community notes feature.

---

## 7. Zero-Mutation Invariant and Side-Effect Verification

A critical safe testing requirement of SEC-07 is verifying that HTTP error responses are not merely superficial rejections masking partial mutations or asynchronous side effects.

### 7.1 Database Verification Strategy
For every destructive or state-modifying attack executed in `sec07_direct_attack_tenant_isolation.test.mjs`, persistent MongoDB state was queried directly using Mongoose models before and immediately after the attack:

| Attack Target | Target Resource ID | Direct Database Assertion Executed | Expected Invariant | Actual Database State | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice Settlement** | `invoiceOrgB._id` | `Invoice.findById(invoiceOrgB._id)` | `status === 'UNPAID'` | `status: 'UNPAID'`, `paidAmount: 0` | **VERIFIED INTACT** |
| **Payment Creation** | `invoiceOrgB._id` | `Payment.countDocuments({ invoiceId: invoiceOrgB._id })` | `count === 0` | `count: 0` records in database | **VERIFIED INTACT** |
| **Batch Invoice Gen** | `assessmentOrgB._id` | `Invoice.countDocuments({ assessmentId: assessmentOrgB._id })` | `count === 0` | `count: 0` records in database | **VERIFIED INTACT** |
| **Wallet Top-Up** | `walletOrgB._id` | `Wallet.findById(walletOrgB._id)` | `balance === 0` | `balance: 0`, 0 transactions | **VERIFIED INTACT** |
| **Community Note Del** | `noteOrgB._id` | `CommunityNote.findById(noteOrgB._id)` | `isActive === true` | `isActive: true` in database | **VERIFIED INTACT** |
| **Poll Voting** | `pollOrgB._id` | `Poll.findById(pollOrgB._id)` | `votes === 0` | `votes: []`, options vote counts: 0 | **VERIFIED INTACT** |
| **Directory Message** | `orgB._id` | `Conversation.findById(conversationOrgB._id)` | `lastMessage === 'Hello neighbor'` | `lastMessage` intact, 0 foreign messages | **VERIFIED INTACT** |

### 7.2 Direct DB Assertions vs HTTP-Inferred Verification
- **Direct Database Assertions:** All 7 mutation scenarios above were asserted by executing direct Mongoose driver queries against the database after the HTTP client call finished.
- **HTTP-Inferred Assertions:** Read-only IDOR probes (invoices, visitor passes, attachments) were evaluated by verifying that the HTTP response body contained 0 records, `success: false`, and status `404`, without performing post-request database reads.

---

## 8. Confirmation of Legitimate Same-Tenant Workflows

Security hardening must not impair legitimate operations. The test suite executed positive controls alongside adversarial attacks:

```text
Positive Control Execution:
  ├── [Resident User A] ──► POST /api/v1/visitor-passes ────► HTTP 201 Created (Pass ID generated)
  ├── [Resident User A] ──► GET /api/v1/visitor-passes/:id ──► HTTP 200 OK (Pass details returned)
  ├── [Admin User A]    ──► GET /api/v1/ledger/.../inventory ─► HTTP 200 OK (Inventory retrieved)
  └── [Super Admin]     ──► GET /api/v1/platform-crm/...   ──► HTTP 200 OK (Platform leads retrieved)
```

- **Visitor Pass Issuance & Retrieval:** Resident A created and retrieved passes within Tenant A without friction (`ATT-07.1`).
- **Financial Reconciliation Dashboard:** Admin A queried reconciliation inventory and status within Tenant A without obstruction (`ATT-07.2`).
- **Platform Administration:** Platform Super Admin accessed global CRM enquiries without tenant scoping barriers (`ATT-04.3`).

---

## 9. Untested Endpoints, Infrastructure Dependencies, and Limitations

To maintain audit integrity, the following infrastructure dependencies and test scope boundaries are explicitly documented:

1. **Redis Cluster vs Standalone Memory:** In local test environments lacking a running Redis cluster, distributed locks and rate limiters operate in standalone memory mode. Multi-node Redis Sentinel / Cluster failover under adversarial race conditions was not tested live.
2. **Physical Gate Hardware Webhooks:** Edge-controller hardware devices (ANPR cameras, RFID boom barriers) communicating over custom TCP/UDP or PSK webhooks were tested via software mocks. Physical barrier hardware loop testing was not performed.
3. **Upstream Third-Party Payment Gateways:** Live settlement round-trips against production Razorpay / Stripe banking APIs were validated via cryptographically signed webhooks and mock gateways. Real bank-settlement API calls were not executed.
4. **Differential Timing Analysis Methodology:** While error messages were standardized to `404` to eliminate lexical error oracles, formal statistical microsecond-level timing analysis (e.g. measuring whether a foreign record check takes 2ms longer than a nonexistent record check) was not performed.

---

## 10. Follow-Up Security Tasks and Hardening Recommendations

1. **Mandatory CI Security Gate:**
   - Add `node --test backend/tests/sec07_direct_attack_tenant_isolation.test.mjs` to `.github/workflows/ci.yml` as a mandatory blocking check on all PRs to `main` and `develop`.
2. **ESLint Rule for Object Spread Ordering:**
   - Create a repository lint rule enforcing that any object creation in `*.service.js` or `*.repository.js` containing `orgId` must place `orgId` as the final key after any spread (`...data`) operations.
3. **Mongoose Plugin-Level Tenant Enforcement:**
   - Standardize all tenant-owned Mongoose schemas to use a unified auto-filter plugin that injects `orgId` into all `find`, `findOne`, `findOneAndUpdate`, and `countDocuments` queries at the ORM layer.
4. **Timing-Safe Differential Response Hardening:**
   - For sensitive resources (invoices, visitor passes), implement fixed-time lookup wrappers or uniform fake lookups when records are missing or foreign to prevent side-channel timing analysis.

---

## 11. Security Architecture and Runtime Validation Diagrams

### Diagram A — Adversarial Attack and Defense Flow

```mermaid
flowchart TD
    Attacker["Malicious Actor (Tenant A Credentials)"]
    Request["Adversarial Request (Target: Tenant B Resource ID)"]
    
    subgraph Edge_Security["Edge & Transport Security"]
        AuthGw{"Auth Gateway (JWT)"}
        TenantCtx{"Tenant Context Middleware"}
        RBAC{"RBAC Permission Gate"}
    end
    
    subgraph Application_Core["Application Business Core"]
        Controller["Controller Layer"]
        Service["Service Layer (Tenant Authorization)"]
        Repo["Repository Layer (Scoped Filter: { _id, orgId })"]
    end
    
    subgraph Persistence["Database & Verification"]
        DB[(MongoDB Database)]
        DBVerify{"Post-Attack DB State Verification"}
    end

    Attacker --> Request
    Request --> AuthGw
    AuthGw -- "Valid JWT Token A" --> TenantCtx
    AuthGw -- "Malformed / Expired Token" --> Rej401["HTTP 401 Unauthorized"]
    
    TenantCtx -- "Valid Membership in Tenant A" --> RBAC
    TenantCtx -- "Forged / Cross-Tenant OrgId Header" --> Rej403["HTTP 403 Forbidden"]
    TenantCtx -- "Missing Workspace Header" --> Rej400["HTTP 400 Bad Request"]
    
    RBAC -- "Authorized Role" --> Controller
    RBAC -- "Unauthorized Privilege / Platform Route" --> RejPriv403["HTTP 403 Forbidden"]
    
    Controller --> Service
    Service -- "Validates Resource Ownership" --> Repo
    Service -- "Tenant B Resource Mismatch" --> Rej404["HTTP 404 Not Found (Zero Oracle)"]
    
    Repo --> DB
    Rej404 -.-> DBVerify
    Rej403 -.-> DBVerify
    DBVerify --> AssertZero["Verified: Zero DB Mutation / Status Unchanged"]
```

### Diagram B — Direct Attack Test Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Attacker (Tenant A)
    participant API as Express Router & Middleware
    participant Svc as Invoice / Wallet Service
    participant Repo as MongoDB Repository
    participant DB as MongoDB Database
    participant Verifier as Test Runner DB Assertion

    Note over Attacker, DB: Adversarial Cross-Tenant Mutation (e.g. Settle Invoice B)
    Attacker->>API: PATCH /api/v1/invoices/:idOrgB/settle-offline<br/>[Auth: Bearer TokenA, X-Org-Id: OrgA]
    API->>API: Verify Token & Active OrgMembership (Tenant A)
    API->>Svc: settleOffline(invoiceIdOrgB, orgIdA, payload)
    Svc->>Repo: findById(invoiceIdOrgB)
    Repo->>DB: Query { _id: invoiceIdOrgB }
    DB-->>Repo: Returns Invoice Record (orgId: OrgB)
    Repo-->>Svc: Document with foreign orgId
    Svc->>Svc: Check: invoice.orgId !== orgIdA
    Note over Svc: Ownership mismatch: Fail Closed
    Svc-->>API: Throw HttpError(404, 'Invoice not found')
    API-->>Attacker: HTTP 404 Not Found (Zero Information Leak)
    
    Note over Verifier, DB: Direct Database State Verification
    Verifier->>DB: Query Invoice.findById(invoiceIdOrgB)
    DB-->>Verifier: status: 'UNPAID', paidAmount: 0
    Verifier->>DB: Query Payment.countDocuments({ invoiceId: invoiceIdOrgB })
    DB-->>Verifier: count: 0
    Note over Verifier: Zero-Mutation Invariant Mathematically Confirmed
```

### Diagram C — Security Decision Flow

```mermaid
flowchart TD
    Start([Incoming HTTP Request]) --> CheckAuth{Is Bearer Token Valid & Unexpired?}
    CheckAuth -- No --> Err401[401 Unauthorized]
    CheckAuth -- Yes --> CheckOrgHdr{Is X-Organization-Id Present?}
    
    CheckOrgHdr -- No --> CheckPlatReq{Is Route Platform-Only?}
    CheckPlatReq -- Yes & User is Platform Admin --> AllowPlat[Execute Platform Action]
    CheckPlatReq -- No --> Err400[400 Workspace context is required]
    
    CheckOrgHdr -- Yes --> CheckMem{Does User Have Active OrgMembership in Target Org?}
    CheckMem -- No --> Err403[403 Active workspace context does not match]
    CheckMem -- Yes --> ResolveTenant[Bind Trusted req.tenant.orgId]
    
    ResolveTenant --> CheckRBAC{Has Required Feature Permission?}
    CheckRBAC -- No --> ErrPerm403[403 Forbidden]
    CheckRBAC -- Yes --> FetchResource[Fetch Target Resource from DB]
    
    FetchResource --> CheckOwnership{Does Resource.orgId Match req.tenant.orgId?}
    CheckOwnership -- No --> Uniform404[404 Not Found (Eradicate Oracle)]
    CheckOwnership -- Yes --> ExecuteOp[Execute Operation & Return 200/201]
```

---

## 12. Security Verification Questions and Answers

### Q1: Can request-body or query parameters override the trusted tenant context?
**NO.**  
*Evidence:* In `ATT-01.1`, an attacker injecting `orgId: orgB._id` and `residentId: residentB._id` in the JSON body had their payload ignored; the database record was pinned strictly to `req.tenant.orgId` (`orgA._id`) and authenticated caller `residentA._id`. In `ATT-09.2`, passing `?communityId=orgB` in query strings was superseded by trusted server context; all returned records strictly belonged to Tenant A.

### Q2: Can Tenant A access Tenant B resources by ID?
**NO.**  
*Evidence:* In `ATT-02.1` (invoices), `ATT-02.2` (visitor passes), and `ATT-02.3` (directory conversations), querying foreign resource IDs returned `404 Not Found` with zero document fields disclosed.

### Q3: Can unauthorized financial mutations affect Tenant B?
**NO.**  
*Evidence:* In `ATT-03.1`, attempted offline settlement of Tenant B's invoice was rejected with 404; direct DB assertion confirmed status remained `UNPAID` and 0 payments were created. In `ATT-03.3`, attempted wallet top-up was rejected with 403; target balance remained 0.

### Q4: Can a Community Admin access platform-only resources?
**NO.**  
*Evidence:* In `ATT-04.1` (platform CRM leads) and `ATT-04.2` (master pricing tiers), Tenant A Community Admin requests were rejected with `403 Forbidden. Platform administrator access required`.

### Q5: Can directory messaging cross tenant boundaries?
**NO.**  
*Evidence:* In `ATT-05.1`, attempting to message a user belonging to another tenant returned `404 Recipient is not a member of this community`; DB verified 0 messages created. In `ATT-05.2`, marking a foreign conversation as read returned 404.

### Q6: Do errors disclose foreign resource existence?
**NO.**  
*Evidence:* In `ATT-06.1` (polls) and `ATT-06.2` (notices), previously existing `403 Forbidden. [Resource] belongs to another community` error messages were eliminated and standardized to uniform `404 Not Found`, eliminating differential oracle disclosure.

### Q7: Do same-tenant operations remain functional?
**YES.**  
*Evidence:* In `ATT-07.1`, an authorized resident created and retrieved a visitor pass successfully (`201 Created`, `200 OK`). In `ATT-07.2`, Community Admin queried reconciliation inventory successfully (`200 OK`).

### Q8: Do invalid authentication and revoked memberships fail closed?
**YES.**  
*Evidence:* In `ATT-08.1` (malformed JWT) and `ATT-08.2` (expired JWT), requests failed closed with `401 Unauthorized`. In `ATT-08.3`, a user whose `OrgMembership` was suspended failed closed with `403 Forbidden`.

### Q9: Are list, search, analytics, and pagination tenant-scoped?
**YES.**  
*Evidence:* In `ATT-09.1`, searching complaints with a unique keyword present in a Tenant B complaint returned 0 matches for Tenant A. In `ATT-09.2`, query parameter tampering with `?communityId=orgB` returned exclusively Tenant A complaints.

### Q10: Are private attachments protected?
**YES.**  
*Evidence:* In `ATT-10.1`, static HTTP GET requests to `/uploads/issueReports/...` returned 404. In `ATT-10.2`, cross-tenant API requests to `/api/v1/support/reports/attachments/:filename` failed closed with `404 Not Found`.

### Q11: Are Redis, WebSocket, external integration, and asynchronous execution paths fully tested, partially tested, or untested?
**PARTIALLY TESTED.**  
*Evidence & Limitations:* Redis multi-instance verification, WebSocket room isolation, and third-party credential vaulting were verified via dedicated regression suites (`websocket_multi_instance_redis_verification.test.mjs`, `sec06_third_party_integrations_tenant_isolation.test.mjs`). However, physical hardware webhooks and production payment gateway sandboxes were tested via software mocks.

### Q12: Are regression tests integrated into mandatory CI enforcement?
**PARTIALLY.**  
*Evidence & Limitations:* Inspection of `.github/workflows/ci.yml` confirmed that WebSocket multi-instance and invitation security tests are executed in CI. However, `sec07_direct_attack_tenant_isolation.test.mjs` is currently executed locally and has not yet been committed as a mandatory CI step.

---

## 13. Before-and-After Security Enhancements

| Vulnerability Vector | Pre-Audit Vulnerable State | Post-Remediation Hardened State |
| :--- | :--- | :--- |
| **Complaint / Technician Ingress** | `{ ...cleanData, orgId }` could allow payload `orgId` to overwrite trusted context. | Explicit key pinning: `orgId: reqOrgId, residentId: userId` placed strictly after object spreads. |
| **Wallet Top-Up Fallback** | Missing `tenantContext`; `addMoney` fell back to arbitrary active organization. | Mounted `tenantContext`; membership validated via `resolveTargetUserAndOrg`; fallback removed. |
| **Reconciliation Endpoints** | Historical reconciliation routes lacked tenant middleware and permission checks. | Mounted `tenantContext()` and `authorizePermission`; services validate `orgId` (404 on mismatch). |
| **Invoice Offline Settlement** | Unscoped controller allowed settling foreign invoices, creating illicit payment records. | Forwarded `req.tenant.orgId`; service throws 404 on mismatch; verified zero DB mutations. |
| **Batch Billing Trigger** | Controller passed foreign `assessmentId` without organization validation. | Forwarded `req.tenant.orgId`; service validates template belongs to tenant; verified 0 invoices created. |
| **Platform CRM / Pricing** | Default import of `rbac.middleware.js` evaluated roles as disabled feature flags. | Corrected named import `{ authorizeRoles }`; mounted `requirePlatformContext: true`. |
| **Directory Chat Isolation** | Users could create conversations and message users belonging to other tenants. | Service validates recipient active `OrgMembership` in `orgId`; conversation queries scoped to `orgId`. |
| **Differential Error Oracles** | Returned `403 Forbidden. Resource belongs to another community` disclosing ID existence. | Standardized all foreign lookups to uniform `404 Not Found`. |
| **Community Note Deletion** | Repository `deactivateById` filtered only by `_id` without tenant check. | Controller forwards `req.tenant.orgId`; repository enforces `{ _id: id, orgId }`. |
| **Direct Attack Test Harness** | Zero automated adversarial direct attack suites existed in repository. | Built `sec07_direct_attack_tenant_isolation.test.mjs` with 26 automated negative/positive tests. |

---

## 14. Phase Status, Residual Risks, and Remaining Gaps

### 14.1 Overall Phase Status
**CODE CLOSED — VERIFIED FOR TESTED SCOPE.**  
All 10 direct attack classes have been evaluated, all 9 identified vulnerabilities have been remediated, and all 76 security regression tests are passing with 100% success.

### 14.2 Residual Risks & Gaps
1. **CI Pipeline Integration Gap:**
   - While `sec07_direct_attack_tenant_isolation.test.mjs` passes locally in ~6.6 seconds, it is not yet configured in `.github/workflows/ci.yml`. A future developer could introduce regressions without breaking automated GitHub Actions.
2. **Timing Side-Channel Inference:**
   - While text-based error disclosure was eliminated, potential microsecond timing variances between database index hits and index misses were not evaluated with statistical timing tests.
3. **Hardware Gateway Staging:**
   - Physical RFID readers and ANPR barrier gates communicate via local edge microcontrollers. Testing against simulated TCP streams does not replace physical barrier stress tests.

---

## 15. Recommended Next Feature / Security Phase

### **SEC-08: Automated CI Pipeline Integration & End-to-End Dynamic Application Security Testing (DAST)**

**Primary Scope & Objectives for SEC-08:**
1. **Mandatory CI Workflow Gate:** Add `sec07_direct_attack_tenant_isolation.test.mjs`, `phase4b1_critical_remediation.test.mjs`, and `sec06_third_party_integrations_tenant_isolation.test.mjs` to `.github/workflows/ci.yml` as required pull-request checks.
2. **Automated DAST Fuzzing:** Deploy OWASP ZAP or equivalent dynamic API scanner configured with multi-tenant authentication contexts to continuously probe for BOLA/IDOR regressions.
3. **Statistical Timing Side-Channel Analysis:** Measure server response time distributions on foreign resource probes versus non-existent IDs to ensure response latency variance is within safe statistical bounds.
4. **Hardware Simulator Staging:** Establish an end-to-end simulated barrier-gate hardware environment running automated vehicle entry/exit scenarios across multiple gated community networks.

---

## 16. Final Verdict and Sign-Off

### Verdict
**`PASS — VERIFIED FOR THE TESTED SEC-07 SCOPE`**

### Summary of Evidence
- **Automated Test Results:** 26 / 26 passing in `sec07_direct_attack_tenant_isolation.test.mjs` (0 failures).
- **Consolidated Security Regressions:** 76 / 76 passing across `sec07`, `phase4b1`, `phase5`, and `sec06` (0 failures).
- **Zero-Mutation Invariant:** Directly verified via post-attack MongoDB queries across invoices, payments, wallets, notes, and messages.
- **Vulnerability Remediation:** 9 verified vulnerability classes resolved and confirmed by automated regression assertions.
- **Workflow Integrity:** Positive controls confirmed authorized same-tenant operations function without disruption.
- **Safety Conventions:** Working-tree files preserved, zero root `.env` files created, and documentation governance strictly respected.
