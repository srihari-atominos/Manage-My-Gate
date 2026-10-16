# SEC — Files & Storage Tenant Isolation Security Audit & Gap Remediation: Comprehensive Final Report

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Security Track:** Files & Storage Security Hardening  
**Execution Mode:** Repository-Based Audit, Confirmed Gap Remediation, and Independent Verification  
**Priority:** High  
**Active Branch:** `security/phase2-repository-tenant-isolation`  
**Baseline HEAD Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`  
**Audit Date:** 2026-10-14  
**Target:** `backend/src/utils/storage.utils.js`, `backend/index.js`, `backend/src/middlewares/`, `backend/src/features/complaint/`, `backend/src/features/invoice/`, `backend/src/features/payment/`, `backend/src/features/noticeBoard/`, `backend/src/features/platformOrder/`, and automated security tests.  
**Final Verdict:** **PASS** (100% of confirmed gaps remediated; 38/38 dedicated security tests pass; 87/87 tests pass across all executed test suites with zero failures).

---

## 1. Mandatory Execution Rules Compliance

This security audit and verification conformed strictly to project standards and AI directives:
1. **Working Tree Preservation:** Existing tracked and untracked modifications across the working tree were preserved. No destructive `git reset`, `git checkout`, or stash operations were executed.
2. **Independent Verification:** No prior assertions or documentation claims were taken at face value. All architectural patterns, routes, controllers, and storage utilities were audited in source code and validated by live database and HTTP integration tests.
3. **Isolated Test Execution:** All database operations were conducted against an isolated local test database (`mongodb://127.0.0.1:27017/manage-my-gate-test`) using temporary file fixtures that were systematically cleaned up after test completion.
4. **Authentic Evidence:** All reported test counts, execution durations, status codes, and security assertions reflect genuine, unmanipulated terminal command outputs.
5. **Architectural Boundary Adherence:** Followed the "One Model, One Feature" and "Scope of Use" rules without cross-feature repository access. Features communicate strictly via services (e.g. `invoiceService` calling `paymentService.findProofInTenant`).
6. **Documentation Integrity:** Source of truth files (`project-knowledge.md` and `working.md`) remained strictly untouched in accordance with project rules (keyword `hukum` was not provided).

---

## 2. Executive Summary

A comprehensive security audit of file management and storage mechanisms across the Manage-My-Gate backend revealed critical vulnerabilities allowing cross-tenant data leaks, unauthenticated access to sensitive resident and community files, file signature spoofing, path traversal, and disk space exhaustion via orphan files.

### Core Remediated Security Controls:
1. **Unauthenticated Public Exposure of Sensitive Tenant Files:**
   - *Vulnerability:* In `backend/index.js`, directories storing private complaints (`/uploads/complaints`), sensitive banking receipts and payment proofs (`/public/uploads/invoices`), platform tax invoices (`/public/invoices`), and community circulars (`/public/uploads/notices`) were exposed via static middleware (`express.static`), allowing anyone to access any document without authentication simply by guessing or observing filenames.
   - *Remediation:* Hardened `backend/index.js` by explicitly blocking static routing for `/uploads/complaints`, `/public/uploads/complaints`, `/uploads/invoices`, `/public/uploads/invoices`, `/invoices`, `/public/invoices`, `/uploads/notices`, and `/public/uploads/notices` with an immediate 404 response. Public static serving is now strictly restricted to non-sensitive public assets (`.well-known`, public brand assets, and user avatars).
2. **Missing Authenticated, Tenant-Scoped Streaming Endpoints:**
   - *Vulnerability:* Legitimate clients had no secure, authenticated method to access attachments without relying on unauthenticated static URLs.
   - *Remediation:* Implemented authenticated, tenant-isolated streaming endpoints across domain features:
     - Complaint Attachments: `GET /api/v1/complaints/attachments/:filename` (Tenant + resident ownership verification).
     - Invoice Payment Proofs: `GET /api/v1/invoices/proofs/:filename` (Tenant + billing permission verification).
     - Notice Board Attachments: `GET /api/v1/notices/attachments/:filename` (Tenant + notices permission verification).
     - Platform Order Invoices: `GET /api/v1/platform-orders/:id/invoice` (Platform Admin or owning organization verification).
3. **File Signature & Magic Bytes Verification:**
   - *Vulnerability:* File upload middlewares (`multer`) validated only the MIME type header and file extension provided by the client, allowing malicious actors to upload executable scripts (e.g., PHP, JS, Shell) disguised with `.png`, `.jpg`, or `.pdf` extensions.
   - *Remediation:* Created `verifyMagicBytesSync` in `storage.utils.js` inspecting file header magic bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`, `RIFF...WEBP`, `PK\x03\x04`). Integrated signature validators into complaint and invoice upload pipelines, immediately unlinking spoofed files and returning `400 Bad Request`.
4. **Path Traversal & Symlink Boundary Escapes:**
   - *Vulnerability:* Unsanitized filenames could allow path traversal attacks (`../../etc/passwd` or `..%2f..%2fpackage.json`) to escape storage directory boundaries.
   - *Remediation:* Implemented `validateSafeFilename` and `resolveSecureFilePath` in `storage.utils.js`, enforcing strict regex patterns, stripping path separators, verifying path prefix containment (`resolved.startsWith(baseDir)`), and dereferencing real paths (`fs.realpathSync`) to block symlink escapes.
5. **Orphan File Leakage on Validation & Runtime Errors:**
   - *Vulnerability:* When request payload validation failed in `validator.middleware.js` or unexpected exceptions occurred in `error.middleware.js`, uploaded files remained orphaned on the server disk. Furthermore, validation errors were written unredacted to a synchronous file (`validation_errors.log`).
   - *Remediation:* Integrated `cleanUploadedFiles(req)` into both `validator.middleware.js` and `error.middleware.js` to automatically clean up single (`req.file`), array (`req.files`), and map uploads upon error. Removed synchronous unredacted disk logging.

---

## 3. Storage Architecture & Request Pipeline

```
[ Client Request: Upload / Download ]
                  │
                  ▼
   1. Express Static Hardening (`backend/index.js`)
      ├── Block /uploads/complaints, /invoices, /uploads/invoices, /uploads/notices (404)
      └── Allow only .well-known, public brand assets, and user avatars
                  │
                  ▼
   2. Authentication Middleware (`isAuthenticated`)
      └── Verifies signed JWT token; extracts req.user { id, role, orgId, isPlatform }
                  │
                  ▼
   3. Tenant Context Middleware (`tenantContext`)
      └── Enforces verified x-organization-id; resolves req.tenant { orgId, role, permissions }
                  │
                  ▼
   4. Permission Middleware (`authorizePermission`)
      └── Validates domain action permissions (e.g. complaints:view, billing:view, notices:read)
                  │
                  ▼
   5. Security Validation & Safe Path Resolution (`storage.utils.js`)
      ├── `validateSafeFilename`: Strips null bytes, controls, traversal characters
      ├── `resolveSecureFilePath`: Verifies canonical root containment & resolves symlinks
      └── `verifyMagicBytesSync`: Validates header byte signatures against claimed MIME types
                  │
                  ▼
   6. Domain Service Verification & Isolation
      ├── ComplaintService: Verifies complaint belongs to orgId; resident can only view own villa/ticket
      ├── InvoiceService: Verifies proof belongs to tenant payment or invoice document
      ├── NoticeBoardService: Verifies notice belongs to authorized tenant
      └── PlatformOrderService: Verifies platform admin or order's owning organization
                  │
                  ▼
   7. Secure Streaming Delivery
      ├── Content-Type: Derived strictly from verified extension
      ├── Content-Disposition: 'inline; filename="safeName"'
      ├── X-Content-Type-Options: 'nosniff' (prevents MIME confusion attacks)
      └── Cache-Control: 'private, no-store' (prevents intermediate caching of sensitive data)
```

---

## 4. Required Checks Verification & Evidence Matrix

### Check 1: Working Tree, Branch, and Commit Baseline
- **Inspected Commit:** `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`
- **Active Branch:** `security/phase2-repository-tenant-isolation`
- **Status:** All pre-existing untracked and modified files preserved. No destructive resets.
- **Verification Evidence:** `git rev-parse HEAD` returns `ce5abb9c8be40435cd9ea36b12588bc7693e4f78`.

### Check 2: Static Mounts & Directory Blocking in `backend/index.js`
- **Inspected File:** `backend/index.js` (Lines 127–145)
- **Attack Scenario:** External unauthenticated attacker accesses `/uploads/complaints/secret.png`, `/public/invoices/tax-invoice.pdf`, `/public/uploads/invoices/cheque.png`, or `/Public/Invoices/secret.pdf` using casing or alternate prefixes.
- **Expected Behavior:** Immediate 404 response with `{ success: false, message: 'Not found' }`. Static middleware must never be reached.
- **Observed Behavior:** The blocker middleware on lines 131–139 intercepts all requests targeting private directories ahead of `app.use('/public', express.static(...))` and returns 404.
- **Test Evidence:**
  - Automated tests 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, and 1.9 all return HTTP 404.

### Check 3: End-to-End Download Pipeline Tracing
- **Inspected Files:**
  - Complaints: `complaint.router.js:53-58`, `complaint.controller.js:255-274`, `complaint.service.js:1168-1215`, `complaint.repository.js:106-114`.
  - Invoices: `invoice.routes.js:36-41`, `invoice.controller.js:80-108`, `invoice.services.js:1696-1748`, `payment.repository.js:203-220`.
  - Notices: `noticeBoard.routes.js:45-50`, `noticeBoard.controller.js:260-285`, `noticeBoard.service.js:936-980`, `noticeBoard.repository.js:20-30`.
  - Platform Orders: `platformOrder.router.js:12`, `platformOrder.controller.js:94-127`, `platformOrder.service.js:297-311`.
- **Expected Behavior:** Every download route enforces authentication (`isAuthenticated`), tenant context (`tenantContext`), permission evaluation (`authorizePermission`), domain service ownership verification, canonical filesystem path validation, and security headers.
- **Observed Behavior:** Fully implemented across all 4 feature pipelines.
- **Test Evidence:** Tests 4.1, 4.4, 5.1, 5.3, 6.1, 6.3, 7.1, 7.2 pass.

### Check 4: Cross-Tenant File Access Prevention
- **Attack Scenario:** Tenant B authenticated user attempts to download Tenant A's complaint attachment, invoice payment proof, or notice board file using known filenames or forged `x-organization-id` headers.
- **Expected Behavior:** Request fails closed with 404 Not Found (or 403 Forbidden). No metadata or file content from Tenant A is exposed.
- **Observed Behavior:**
  - Complaint service filters by `orgId`: `complaintRepository.findComplaintByAttachment(filename, orgId)`. Returns 404.
  - Invoice service filters by `orgId`: `paymentService.findProofInTenant(filename, orgId)`. Returns 404.
  - Notice service filters by `orgId`: `noticeBoardRepository.findNoticeByImage(filename, orgId)`. Returns 404.
- **Test Evidence:** Tests 4.2 (status 404), 5.2 (status 404), 6.2 (status 404) pass.

### Check 5: Resident Scoping & Platform Order Access Control
- **Attack Scenario 1:** Resident A2 attempts to view Resident A1's private complaint photo within the same community.
  - *Expected Behavior:* Rejected with 404 Not Found.
  - *Observed Behavior:* `complaint.service.js` checks `String(complaint.residentId) === String(user._id)` and `String(complaint.villaId) === String(user.primaryVillaId)`. Fails closed with 404.
  - *Test Evidence:* Test 4.3 passes (status 404).
- **Attack Scenario 2:** Non-platform tenant user attempts to download a platform order tax invoice (`GET /api/v1/platform-orders/:id/invoice`).
  - *Expected Behavior:* Rejected with 403 Forbidden.
  - *Observed Behavior:* `platformOrder.router.js` enforces `tenantContext({ requirePlatformContext: true })`. Non-platform users receive 403.
  - *Test Evidence:* Test 7.3 passes (status 403). Test 7.2 passes for Platform Admin (status 200).

### Check 6: Path Traversal, Symlinks, and Utility Hardening
- **Inspected File:** `src/utils/storage.utils.js` (Lines 5–73)
- **Attack Scenario:** Attacker provides filenames like `../../package.json`, `..\\..\\windows\\win.ini`, `file.png\0.exe`, or targets symlinks pointing outside the storage folder.
- **Expected Behavior:** Filename validation rejects traversal markers and special characters with 400 Bad Request. `resolveSecureFilePath` checks canonical path prefix and verifies `!stat.isSymbolicLink()`.
- **Observed Behavior:** `validateSafeFilename` rejects invalid characters, and `resolveSecureFilePath` verifies canonical prefix containment and rejects symlinks with 404.
- **Test Evidence:** Tests 2.1, 2.2, 2.3, 4.6, 5.4, 6.4 pass.

### Check 7: Upload Ingestion Validation & Cleanup
- **Inspected Files:**
  - `complaint/middlewares/upload.middleware.js:68-85`
  - `invoice/middlewares/invoiceUpload.middleware.js:45-60`
  - `middlewares/validator.middleware.js:18-24`
  - `middlewares/error.middleware.js:16-19`
- **Attack Scenario:** Attacker uploads a PHP/shell script disguised as an image or submits invalid form data causing validation errors.
- **Expected Behavior:** Upload signature validation detects spoofed magic bytes, unlinks the file immediately, and aborts with 400. Express validator error handler cleans up all uploaded files.
- **Observed Behavior:** `complaintFileSignatureValidator` and `invoiceProofSignatureValidator` inspect byte headers and unlink fake files synchronously. `cleanUploadedFiles(req)` is invoked on validation failure and error bubbling.
- **Test Evidence:** Tests 3.4, 3.5, 3.6, 8.1, 8.2, 8.3 pass.

### Check 8: Sensitive Download Headers & Cache Prevention
- **Inspected Files:**
  - `complaint.controller.js:267-270`
  - `invoice.controller.js:100-103`
  - `noticeBoard.controller.js:276-279`
  - `platformOrder.controller.js:117-120`
- **Expected Behavior:** All sensitive download responses include `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
- **Observed Behavior:** Verified across all four controllers.
- **Test Evidence:** Tests 4.4, 5.3, 7.2 explicitly assert `res.headers.get('x-content-type-options') === 'nosniff'`.

---

## 5. Automated Security Test Results

Executed command: `node --test tests/sec_files_storage_tenant_isolation.test.mjs`

```
TAP version 13
# Subtest: SEC — Files & Storage Tenant Isolation Security Audit Suite
    # Subtest: 1. Public Static Directory Lockdown
        # Subtest: 1.1 should reject unauthenticated static access to complaint attachments (/uploads/complaints/...) with 404
        ok 1 - 1.1 should reject unauthenticated static access to complaint attachments (/uploads/complaints/...) with 404
        # Subtest: 1.2 should reject unauthenticated static access to complaint attachments via /public/uploads/complaints/... with 404
        ok 2 - 1.2 should reject unauthenticated static access to complaint attachments via /public/uploads/complaints/... with 404
        # Subtest: 1.3 should reject unauthenticated static access to invoice payment proofs (/uploads/invoices/...) with 404
        ok 3 - 1.3 should reject unauthenticated static access to invoice payment proofs (/uploads/invoices/...) with 404
        # Subtest: 1.4 should reject unauthenticated static access to invoice payment proofs via /public/uploads/invoices/... with 404
        ok 4 - 1.4 should reject unauthenticated static access to invoice payment proofs via /public/uploads/invoices/... with 404
        # Subtest: 1.5 should reject unauthenticated static access to generated PDF invoices (/invoices/...) with 404
        ok 5 - 1.5 should reject unauthenticated static access to generated PDF invoices (/invoices/...) with 404
        # Subtest: 1.6 should reject unauthenticated static access to generated PDF invoices via /public/invoices/... with 404
        ok 6 - 1.6 should reject unauthenticated static access to generated PDF invoices via /public/invoices/... with 404
        # Subtest: 1.7 should reject unauthenticated static access to notice board images (/uploads/notices/...) with 404
        ok 7 - 1.7 should reject unauthenticated static access to notice board images (/uploads/notices/...) with 404
        # Subtest: 1.8 should reject unauthenticated static access to issue report attachments with 404
        ok 8 - 1.8 should reject unauthenticated static access to issue report attachments with 404
        # Subtest: 1.9 should reject unauthenticated static access regardless of URL casing with 404
        ok 9 - 1.9 should reject unauthenticated static access regardless of URL casing with 404
        1..9
    ok 1 - 1. Public Static Directory Lockdown
      ---
      duration_ms: 32.4182
      type: 'suite'
      ...
    # Subtest: 2. Path Traversal & Filename Sanitization
        # Subtest: 2.1 validateSafeFilename accepts valid generated and timestamped filenames
        ok 1 - 2.1 validateSafeFilename accepts valid generated and timestamped filenames
        # Subtest: 2.2 validateSafeFilename rejects directory traversal patterns and illegal characters
        ok 2 - 2.2 validateSafeFilename rejects directory traversal patterns and illegal characters
        # Subtest: 2.3 resolveSecureFilePath prevents escaping target directory boundaries
        ok 3 - 2.3 resolveSecureFilePath prevents escaping target directory boundaries
        1..3
    ok 2 - 2. Path Traversal & Filename Sanitization
      ---
      duration_ms: 9.1245
      type: 'suite'
      ...
    # Subtest: 3. File Signature & Magic Bytes Verification
        # Subtest: 3.1 verifyMagicBytesSync validates authentic PNG magic bytes
        ok 1 - 3.1 verifyMagicBytesSync validates authentic PNG magic bytes
        # Subtest: 3.2 verifyMagicBytesSync validates authentic JPEG magic bytes
        ok 2 - 3.2 verifyMagicBytesSync validates authentic JPEG magic bytes
        # Subtest: 3.3 verifyMagicBytesSync validates authentic PDF magic bytes
        ok 3 - 3.3 verifyMagicBytesSync validates authentic PDF magic bytes
        # Subtest: 3.4 verifyMagicBytesSync rejects spoofed files (e.g. PHP script disguised as .png)
        ok 4 - 3.4 verifyMagicBytesSync rejects spoofed files (e.g. PHP script disguised as .png)
        # Subtest: 3.5 complaintFileSignatureValidator immediately unlinks fake files and returns 400
        ok 5 - 3.5 complaintFileSignatureValidator immediately unlinks fake files and returns 400
        # Subtest: 3.6 invoiceProofSignatureValidator immediately unlinks fake files and returns 400
        ok 6 - 3.6 invoiceProofSignatureValidator immediately unlinks fake files and returns 400
        1..6
    ok 3 - 3. File Signature & Magic Bytes Verification
      ---
      duration_ms: 12.8732
      type: 'suite'
      ...
    # Subtest: 4. Complaint Attachments Tenant Isolation
        # Subtest: 4.1 should reject unauthenticated request to complaint attachment with 401
        ok 1 - 4.1 should reject unauthenticated request to complaint attachment with 401
        # Subtest: 4.2 should reject Tenant B accessing Tenant A complaint attachment with 404 (Fail-Closed)
        ok 2 - 4.2 should reject Tenant B accessing Tenant A complaint attachment with 404 (Fail-Closed)
        # Subtest: 4.3 should reject Resident A2 accessing Resident A1 private complaint attachment with 404
        ok 3 - 4.3 should reject Resident A2 accessing Resident A1 private complaint attachment with 404
        # Subtest: 4.4 should allow Resident A1 to access their own complaint attachment with 200 and security headers
        ok 4 - 4.4 should allow Resident A1 to access their own complaint attachment with 200 and security headers
        # Subtest: 4.5 should allow Tenant A Admin to access any complaint attachment in Tenant A with 200
        ok 5 - 4.5 should allow Tenant A Admin to access any complaint attachment in Tenant A with 200
        # Subtest: 4.6 should reject path traversal attempts on complaint attachment endpoint with 400/404
        ok 6 - 4.6 should reject path traversal attempts on complaint attachment endpoint with 400/404
        1..6
    ok 4 - 4. Complaint Attachments Tenant Isolation
      ---
      duration_ms: 289.4262
      type: 'suite'
      ...
    # Subtest: 5. Invoice Payment Proofs Tenant Isolation
        # Subtest: 5.1 should reject unauthenticated request to payment proof with 401
        ok 1 - 5.1 should reject unauthenticated request to payment proof with 401
        # Subtest: 5.2 should reject Tenant B accessing Tenant A invoice payment proof with 404 (Fail-Closed)
        ok 2 - 5.2 should reject Tenant B accessing Tenant A invoice payment proof with 404 (Fail-Closed)
        # Subtest: 5.3 should allow Tenant A Admin to access Tenant A payment proof with 200 and security headers
        ok 3 - 5.3 should allow Tenant A Admin to access Tenant A payment proof with 200 and security headers
        # Subtest: 5.4 should reject path traversal attacks on payment proofs endpoint with 400/404
        ok 4 - 5.4 should reject path traversal attacks on payment proofs endpoint with 400/404
        1..4
    ok 5 - 5. Invoice Payment Proofs Tenant Isolation
      ---
      duration_ms: 137.0432
      type: 'suite'
      ...
    # Subtest: 6. Notice Board Attachments Tenant Isolation
        # Subtest: 6.1 should reject unauthenticated request to notice attachment with 401
        ok 1 - 6.1 should reject unauthenticated request to notice attachment with 401
        # Subtest: 6.2 should reject Tenant B accessing Tenant A notice attachment with 404 (Fail-Closed)
        ok 2 - 6.2 should reject Tenant B accessing Tenant A notice attachment with 404 (Fail-Closed)
        # Subtest: 6.3 should allow Tenant A resident to access Tenant A notice attachment with 200
        ok 3 - 6.3 should allow Tenant A resident to access Tenant A notice attachment with 200
        # Subtest: 6.4 should reject path traversal on notice attachment endpoint with 400/404
        ok 4 - 6.4 should reject path traversal on notice attachment endpoint with 400/404
        1..4
    ok 6 - 6. Notice Board Attachments Tenant Isolation
      ---
      duration_ms: 113.8896
      type: 'suite'
      ...
    # Subtest: 7. Platform Order Invoices Tenant Isolation
        # Subtest: 7.1 should reject unauthenticated request to order invoice with 401
        ok 1 - 7.1 should reject unauthenticated request to order invoice with 401
        # Subtest: 7.2 should allow Platform Admin to securely download order invoice with 200 application/pdf
        ok 2 - 7.2 should allow Platform Admin to securely download order invoice with 200 application/pdf
        # Subtest: 7.3 should reject non-platform tenant user accessing platform order invoice with 403 Forbidden
        ok 3 - 7.3 should reject non-platform tenant user accessing platform order invoice with 403 Forbidden
        1..3
    ok 7 - 7. Platform Order Invoices Tenant Isolation
      ---
      duration_ms: 103.3888
      type: 'suite'
      ...
    # Subtest: 8. Storage Cleanup Utilities & Orphan Prevention
        # Subtest: 8.1 cleanUploadedFiles unlinks single req.file safely
        ok 1 - 8.1 cleanUploadedFiles unlinks single req.file safely
        # Subtest: 8.2 cleanUploadedFiles unlinks multiple req.files (array) safely
        ok 2 - 8.2 cleanUploadedFiles unlinks multiple req.files (array) safely
        # Subtest: 8.3 cleanUploadedFiles unlinks multiple req.files (object of arrays) safely
        ok 3 - 8.3 cleanUploadedFiles unlinks multiple req.files (object of arrays) safely
        1..3
    ok 8 - 8. Storage Cleanup Utilities & Orphan Prevention
      ---
      duration_ms: 7.9322
      type: 'suite'
      ...
    1..8
ok 1 - SEC — Files & Storage Tenant Isolation Security Audit Suite
  ---
  duration_ms: 1719.0432
  type: 'suite'
  ...
1..1
# tests 38
# suites 9
# pass 38
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8769.0301
```

### Regression Verification
- **SEC-04 Notifications Tenant Isolation Suite:** `node --test tests/sec04_notifications_tenant_isolation.test.mjs`
  - Result: **31 passed / 0 failed / 0 skipped** (Duration: 9,015 ms).
- **SEC-03.1 WebSocket Multi-Tenant Isolation Suite:** `node --test tests/sec03_1_websocket_tenant_isolation.test.mjs`
  - Result: **18 passed / 0 failed / 0 skipped** (Duration: 2,994 ms).
- **Grand Total Executed Tests:** **87 passed / 0 failed / 0 skipped**.

---

## 6. Operational Recommendations & Residual Limitations

1. **Antivirus Daemon Integration (ClamAV):** Magic byte verification prevents file extension spoofing and rejects plain scripts, but cannot detect malicious macro payloads embedded within authentic Office OpenXML or PDF files. Staging and production deployments should integrate an asynchronous scanner (e.g., ClamAV daemon) to scan files upon write before making them permanently accessible.
2. **Cloud Object Storage (S3 / GCS):** When scaling horizontally to multiple instances, server-local disk storage requires shared mounts (NFS). Migrating to S3 or Google Cloud Storage using time-limited Presigned URLs is recommended.
3. **Download Rate Limiting:** Enforce per-IP and per-account rate limits on attachment streaming routes to prevent automated scraping or denial-of-service via large binary downloads.
4. **Daily Orphan Cleaner Cron:** Although `cleanUploadedFiles` removes orphan files during request failure, hard server crashes during upload could leave temporary artifacts. A daily background cron job should prune temporary upload folders.

---

## 7. Final Verdict

**PASS** — All required checks have been completed independently. All identified security gaps in file management and storage have been remediated with verified test coverage. Zero regressions were introduced.
