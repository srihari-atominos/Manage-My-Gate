# SEC-05.4 — Sensitive Attachment Cache Isolation Remediation Report

**Project:** Nahom / Connect Harmony  
**Repository:** Manage-My-Gate  
**Parent Audit:** SEC-05.1 Cache Layer Tenant Isolation Security Audit  
**Finding Addressed:** SEC-05.1-F05 — Sensitive Support Attachment Browser/Proxy Caching  
**Severity:** Medium  
**Date:** 2026-10-15  
**Execution Mode:** Targeted remediation with comprehensive regression testing  
**Branch:** `security/phase2-repository-tenant-isolation`  
**Status:** RESOLVED & VERIFIED  

---

## 1. Executive Summary

During the **SEC-05.1** Cache Layer Tenant Isolation Security Audit, finding **SEC-05.1-F05** identified a critical HTTP caching vulnerability in the issue report attachment delivery controller (`backend/src/features/issueReport/issueReport.controller.js`):
- The `getAttachment` endpoint explicitly emitted `Cache-Control: private, max-age=300`, allowing web browsers, corporate forward proxies, shared web views, and mobile device HTTP caches to persist sensitive screenshots, incident photographs, and resident PII for up to 5 minutes.
- The response omitted surrogate and reverse-proxy anti-caching directives (`Pragma: no-cache`, `Expires: 0`, and `Surrogate-Control: no-store`), leaving attachments susceptible to retention in intermediate caching layers.
- The underlying `res.sendFile(filePath)` call was executed without explicit caching options, permitting the generation of `Last-Modified` timestamps and conditional `304 Not Modified` responses.
- In `issueReport.service.js`, tenant scope extraction did not validate the format of the tenant organization ID (`orgId`) against MongoDB `ObjectId` specifications prior to repository queries.

Under **SEC-05.4**, the sensitive attachment delivery pipeline was comprehensively overhauled. All changes were verified through a dedicated 12-point regression suite (`backend/tests/sec05_4_sensitive_attachment_cache_isolation.test.mjs`), with all parent security test suites (SEC-05.2-A, SEC-05.2-B, SEC-05.3, and governance schedulers) maintaining a 100% clean pass rate.

---

## 2. Root Cause & Original Weakness Analysis (SEC-05.1-F05)

### 2.1 The Vulnerability
In `backend/src/features/issueReport/issueReport.controller.js`, the attachment streaming endpoint previously implemented:
```javascript
  async getAttachment(req, res, next) {
    try {
      const { filePath, mimeType } = await issueReportService.getAttachmentFile(req.params.filename, req.tenant);
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300'); // <--- VULNERABILITY
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) next(err);
      });
    } catch (error) {
      next(error);
    }
  }
```

### 2.2 Security Impacts
1. **Local Disk & Browser Cache Residue:** Support attachments frequently contain sensitive incident evidence: private resident identification, door access logs, vehicular license plates, unit floorplans, and security guard camera captures. With `max-age=300`, this data remained readable in browser disk caches and mobile app webview caches after user logout or session termination.
2. **Intermediary / Shared Proxy Retention:** In corporate or residential shared network configurations, forward web caches and reverse-proxy accelerators could retain files with positive `max-age` directives.
3. **Overriding Global Anti-Caching Policy:** In `backend/index.js`, the global middleware configured `Cache-Control: no-store, no-cache, must-revalidate, private` on all `/api/*` routes. However, the controller's local `res.setHeader('Cache-Control', 'private, max-age=300')` directly negated this defense-in-depth protection.

---

## 3. Architecture & Implemented Remediation Controls

### 3.1 Strict Anti-Caching Header Enforcement
`backend/src/features/issueReport/issueReport.controller.js` was updated to enforce strict, multi-layered anti-caching directives:
```javascript
  async getAttachment(req, res, next) {
    try {
      const { filePath, mimeType } = await issueReportService.getAttachmentFile(req.params.filename, req.tenant);
      
      // Enforce strict anti-caching and security headers for sensitive support attachments (SEC-05.1-F05)
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      const sendOptions = {
        dotfiles: 'deny',
        lastModified: false,
        etag: false,
        cacheControl: false,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      };

      res.sendFile(filePath, sendOptions, (err) => {
        if (err && !res.headersSent) next(err);
      });
    } catch (error) {
      next(error);
    }
  }
```

Key guarantees provided:
- **`Cache-Control: no-store, no-cache, must-revalidate, private`**: Prevents any browser, webview, or intermediate proxy from storing any byte of the response on disk or in memory.
- **`Pragma: no-cache` & `Expires: 0`**: Ensures compatibility with HTTP/1.0 proxies and legacy user agents.
- **`Surrogate-Control: no-store`**: Directs reverse proxies, CDNs (e.g. Cloudflare, Fastly, Akamai), and ingress controllers to bypass caching entirely.
- **`cacheControl: false`, `etag: false`, `lastModified: false`**: Configures the underlying `send` stream in Express to disable automatic ETag and Last-Modified generation, guaranteeing that conditional GET requests (`If-None-Match`, `If-Modified-Since`) can never trigger a cached `304 Not Modified` response.

### 3.2 Tenant Isolation & Access Boundary Hardening
In `backend/src/features/issueReport/issueReport.service.js`:
- Verified that `tenant.isPlatform !== true` mandates a valid MongoDB `ObjectId` string in `tenant.orgId`.
- Queries `issueReportRepository.findAttachment(filename, orgScope)` where `orgScope` strictly scopes lookup to the verified active organization ID:
  ```javascript
  if (tenant.isPlatform !== true) {
    if (!tenant.orgId || !mongoose.Types.ObjectId.isValid(tenant.orgId)) {
      throw new HttpError(400, 'Valid workspace organization context is required.');
    }
  }
  const orgScope = tenant.isPlatform === true ? null : String(tenant.orgId);
  ```
- **Non-Disclosing Authorization Failures:** If an authenticated Community Admin in Organization B requests an attachment that belongs to an issue report in Organization A, the database filter fails to match and returns `null`. The service throws `HttpError(404, 'Attachment not found.')`, preventing cross-tenant existence enumeration.

### 3.3 Static File Serving Immunity
In `backend/index.js`, direct static access to issue report attachments remains blocked at the framework route level:
```javascript
app.use(['/uploads/issueReports', '/public/uploads/issueReports'], (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});
```
This guarantees that clients cannot bypass authenticated controller authorization by requesting static URLs directly.

---

## 4. Verification & Regression Testing

A targeted regression suite was created in `backend/tests/sec05_4_sensitive_attachment_cache_isolation.test.mjs` executing end-to-end HTTP tests against the real Express pipeline.

### 4.1 Test Suite Breakdown
```
SEC-05.4 — Sensitive Attachment Cache Isolation & Access Control Suite
  1. Sensitive Attachment Delivery & Cache Headers
    ✔ authorized Community Admin in Org A can stream attachment with strict anti-caching headers (223.81ms)
    ✔ conditional GET with If-None-Match or If-Modified-Since returns full 200 (never 304) (132.61ms)
  2. Cross-Tenant Isolation & Access Denial
    ✔ Community Admin from Org B cannot retrieve attachment belonging to Org A (fails closed with 404) (400.45ms)
    ✔ Org B Admin attempting to spoof Org A context via header is rejected by tenantContext (403 Forbidden) (22.94ms)
    ✔ user with non-privileged role (Resident in Org A) is denied access (403 Forbidden) (137.10ms)
  3. Authentication & Input Validation Integrity
    ✔ unauthenticated request without token is rejected with 401 Unauthorized (8.14ms)
    ✔ request with missing or invalid organization context fails closed with 400 (20.98ms)
    ✔ malformed filename (directory traversal attempt) is rejected with 400 (95.79ms)
    ✔ non-whitelisted file extension is rejected with 400 (126.84ms)
  4. Platform Super Admin & Storage Delivery Security
    ✔ Platform Super Admin can view attachment across organizations for support/auditing (77.31ms)
    ✔ direct static file access to /uploads/issueReports/:filename is blocked (404 Not Found) (5.35ms)
    ✔ direct static file access to /public/uploads/issueReports/:filename is also blocked (404 Not Found) (4.74ms)

12 passed, 0 failed, 0 skipped
```

### 4.2 Cross-Phase Security Test Suite Results

All security test suites across SEC-05 were re-run to confirm zero regressions:

| Test Suite | Focus Area | Result |
| :--- | :--- | :--- |
| `backend/tests/sec05_4_sensitive_attachment_cache_isolation.test.mjs` | Attachment Cache Directives & Tenant Boundaries | **12 / 12 PASS** |
| `backend/tests/issueReport.security.test.mjs` | Issue Report Domain Validation & Email Escaping | **17 / 17 PASS** |
| `backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs` | RBAC Tenant Scoping & Privilege Escalation | **14 / 14 PASS** |
| `backend/tests/sec05_2b_permission_cache_tenant_isolation.test.mjs` | Role-Permission Cache Cluster Invalidation | **13 / 13 PASS** |
| `backend/tests/sec05_3_slot_lock_ratelimiter_tenant_isolation.test.mjs` | SlotLockStore & Distributed Rate Limiting | **14 / 14 PASS** |
| `npm run test:governance` | Governance Schedulers, Crons, Outbox & RBAC | **115 / 115 PASS** |

---

## 5. Reverse Proxy, CDN & Infrastructure Guidance

While the application now emits strict HTTP anti-caching directives, upstream infrastructure must not override these headers:

1. **Cloudflare / CDN Edge Rules:**
   - Ensure Page Rules or Cache Rules for `/api/v1/support/reports/attachments/*` set **Cache Level: Bypass**.
   - Cloudflare by default caches `.png`, `.jpg`, and `.webp` based on file extension. A Cache Rule matching `http.request.uri.path contains "/attachments/"` with `cache: false` must be enforced in production CDN distributions.
2. **Nginx / Ingress Controller:**
   - In Nginx ingress configurations, ensure `proxy_buffering` does not cache sensitive API streaming:
     ```nginx
     location ~* ^/api/v1/support/reports/attachments/ {
         proxy_pass http://backend_upstream;
         proxy_ignore_headers X-Accel-Expires;
         proxy_no_cache 1;
         proxy_cache_bypass 1;
         add_header X-Content-Type-Options nosniff always;
     }
     ```
3. **Object Storage Migration Pre-requisites:**
   - Should the application transition from local disk storage (`uploads/issueReports/`) to Amazon S3, Google Cloud Storage, or Azure Blob Storage in a future phase:
     - Direct public bucket access MUST remain prohibited.
     - Attachments MUST be delivered either via backend proxy streaming with the headers above, or via pre-signed URLs with a maximum expiry of **60 seconds** (`expiresIn: 60`) generated exclusively after verified tenant and role authorization.

---

## 6. Modified Files Inventory

| File Path | Description of Changes |
| :--- | :--- |
| `backend/src/features/issueReport/issueReport.controller.js` | Replaced `Cache-Control: private, max-age=300` with `no-store, no-cache, must-revalidate, private`, added `Pragma: no-cache`, `Expires: 0`, and `Surrogate-Control: no-store`; configured `res.sendFile` options to disable ETag and Last-Modified generation. |
| `backend/src/features/issueReport/issueReport.service.js` | Added strict `mongoose.Types.ObjectId.isValid` validation for non-platform `tenant.orgId` in `getAttachmentFile`. |
| `backend/tests/sec05_4_sensitive_attachment_cache_isolation.test.mjs` | New end-to-end regression test suite covering attachment anti-caching directives, tenant isolation, role enforcement, static path denial, and input sanitization. |

---

## 7. Residual Risk Assessment & Final Closure

With the completion of **SEC-05.4**, finding **SEC-05.1-F05** is fully resolved:
- **Zero Browser/Proxy Retention:** Sensitive attachments cannot be persisted in browser caches, local proxies, or shared mobile webviews.
- **Complete Tenant Isolation:** Cross-tenant attachment retrieval fails closed with non-disclosing 404 responses.
- **Consistent Zero Regressions:** 185+ tests passing across the complete security and governance test suite.
