# SEC-05.2-A — Critical RBAC Tenant Isolation Remediation Report

**Project:** Nahom / Connect Harmony  
**Repository:** Manage-My-Gate  
**Parent Audit:** SEC-05.1  
**Finding Addressed:** SEC-05.1-F01 (Cross-Tenant Permission Bleed via Unscoped Legacy `user.roles` Cache)  
**Severity:** Critical (CVSS 9.1)  
**Status:** **RESOLVED**  
**Date:** October 15, 2026  
**Auditor / Engineer:** Antigravity Autonomous Security Agent  

---

## 1. Executive Summary

Under subphase **SEC-05.2-A**, a targeted security remediation was implemented in [`backend/src/middlewares/rbac.middleware.js`](file:///e:/atominos/Manage-My-Gate/backend/src/middlewares/rbac.middleware.js) to eliminate cross-tenant privilege escalation caused by resolving permissions from unscoped legacy role arrays (`user.roles`).

Prior to this fix, fallback role and permission resolution in `checkIsAdmin`, `getPermissionsForUser`, `authorizeRoles`, and `authorizePermission` failed to enforce strict organization boundaries on evaluated role IDs. A multi-tenant user who was an Administrator in Organization A and a standard Resident in Organization B could execute administrative actions against Organization B because legacy role IDs from Organization A were aggregated into their permission set.

The remediation enforces that **all roles and permissions are resolved exclusively from verified active `OrgMembership` records within the validated target organization**. Foreign-tenant role IDs are strictly rejected, unscoped legacy `user.roles` fallback has been completely excised from authorization pathways, and missing or inactive memberships fail closed.

The security boundary was verified via an end-to-end integration and API test suite ([`backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs`](file:///e:/atominos/Manage-My-Gate/backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs)) and the 115-test governance suite ([`tests/features/rbac/governanceRbac.test.js`](file:///e:/atominos/Manage-My-Gate/backend/tests/features/rbac/governanceRbac.test.js)), achieving **100% pass rates with zero regressions**.

---

## 2. Root Cause Analysis

In [`backend/src/middlewares/rbac.middleware.js`](file:///e:/atominos/Manage-My-Gate/backend/src/middlewares/rbac.middleware.js):
1. **Unscoped Legacy Role Array Bleed:** In `getPermissionsForUser`:
   ```javascript
   if (Array.isArray(user.roles)) {
     user.roles.forEach((id) => {
       if (id && mongoose.isValidObjectId(id) && !roleIds.includes(id.toString())) {
         roleIds.push(id.toString());
       }
     });
   }
   ```
   The `user.roles` array on the root `User` document is a flat historical array referencing roles assigned to the user across all organizations. When `getPermissionsForUser(user, targetOrgId)` was called, these role IDs were loaded without checking `role.orgId === targetOrgId`.
2. **Unpartitioned Membership Queries in `checkIsAdmin`:** If `currentOrgId` was missing or unvalidated, `checkIsAdmin` queried `OrgMembership.find({ userId, status: 'Active' })` across all organizations, granting administrative bypass across the entire platform if the user was an admin anywhere.
3. **Premature Role Trust in `checkIsAdmin`:** `checkIsAdmin` directly matched `req.user.roles` or `req.user.role` against admin role names before verifying the active tenant context.
4. **Offline Test Hang:** `checkIsAdmin` executed Mongoose model queries without asserting `mongoose.connection?.readyState === 1`, causing 10-second buffer timeouts during offline unit testing.

---

## 3. Remediation Details

### 3.1 Hardened `checkIsAdmin`
- **Global Platform Exemption:** Preserved legitimate global platform administration strictly via `req.user.isPlatform === true || req.tenant?.isPlatform === true`.
- **Target Organization Enforced:** Validates `targetOrgId = req.tenant?.orgId || req.orgId || req.headers['x-organization-id'] || req.user?.orgId`.
- **Tenant Context Verification:** If `req.tenantRole` was verified by `tenantContext` for `targetOrgId`, checks that role directly.
- **Fail-Closed DB Lookup:** If database is connected, queries `OrgMembership.findOne({ userId, orgId: targetOrgId, status: 'Active' })`. If no active membership in `targetOrgId` exists, returns `false`.
- **Unscoped `user.roles` Removed:** `req.user.roles` is never evaluated across organizations.

### 3.2 Hardened `getPermissionsForUser`
- **Mandatory Target Organization:** When DB is connected, requires valid `orgId`. Fails closed (`return []`) if `orgId` is missing or invalid.
- **Strict `OrgMembership` Scoping:** Queries `OrgMembership.findOne({ userId, orgId, status: 'Active' })`. If the user is not an active member of `orgId`, immediately returns `[]`.
- **Excised Legacy `user.roles`:** Removed all code pushing from `user.roles`.
- **Role Ownership Verification:** Validates candidate role IDs against the `Role` model using:
  ```javascript
  const safeRoles = await Role.find({
    _id: { $in: Array.from(candidateRoleIds) },
    $or: [
      { orgId: orgId },
      { orgId: null, isTenantRole: false }, // System template roles
    ],
  }).select('_id').lean();
  ```
  Any foreign-tenant role (`role.orgId !== orgId`) is discarded.
- **Platform Membership Resolution:** Supports active members of platform organizations (`orgId.isPlatform === true`) receiving wildcard (`['*']`) permissions.

### 3.3 Hardened `authorizeRoles` & `authorizePermission`
- **Header vs Token Mismatch Protection:** If a client passes an `X-Organization-Id` differing from `req.user.orgId` without verified `tenantContext` context, `authorizeRoles` throws HTTP 403 Forbidden.
- **Tenant-Scoped Permission Normalization:** Both `authorizePermission` and `authorizeAnyPermission` prioritize verified `req.tenantPermissions` matching `targetOrgId`, or fall back to tenant-scoped `getPermissionsForUser(req.user, targetOrgId)`.

---

## 4. Modified Files

| File Path | Description of Changes |
| :--- | :--- |
| [`backend/src/middlewares/rbac.middleware.js`](file:///e:/atominos/Manage-My-Gate/backend/src/middlewares/rbac.middleware.js) | Removed unscoped `user.roles` fallback, enforced target organization scoping on `checkIsAdmin`, `getPermissionsForUser`, `authorizeRoles`, and `authorizePermission`. |
| [`backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs`](file:///e:/atominos/Manage-My-Gate/backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs) | Created 12-test integration regression suite covering multi-tenant privilege escalation, membership lifecycle, role scoping, and cached permissions. |

---

## 5. Verification & Test Evidence

### 5.1 Targeted RBAC Regression Suite
```bash
node --test backend/tests/sec05_2a_rbac_tenant_isolation.test.mjs
```
**Results:**
```
TAP version 13
# Subtest: SEC-05.2-A — RBAC Tenant Isolation & Privilege Escalation Regression Suite
    # Subtest: 1. Cross-Tenant Privilege Escalation Prevention (SEC-05.1-F01)
        ok 1 - should deny an Admin of Org A attempting to perform an administrative action in Org B
        ok 2 - should allow legitimate Admin of Org B to create notices in Org B
        ok 3 - should allow multiTenantUser to create notices in Org A where they are legitimately an Admin
    ok 1 - 1. Cross-Tenant Privilege Escalation Prevention (SEC-05.1-F01)
    # Subtest: 2. Legacy user.roles Elimination & Role Scoping
        ok 1 - getPermissionsForUser should NOT resolve foreign tenant permissions even if user.roles contains foreign admin role ID
        ok 2 - checkIsAdmin should return false for Org B when user is only Admin in Org A
        ok 3 - checkIsAdmin should verify OrgMembership in DB if tenantRole is missing
    ok 2 - 2. Legacy user.roles Elimination & Role Scoping
    # Subtest: 3. Incomplete, Missing, and Inactive Membership Validation
        ok 1 - should deny privileged access to a user with empty role mapping (incompleteUser)
        ok 2 - should deny access to a user whose membership is Pending
        ok 3 - should deny access to a user who has no membership in the requested organization
        ok 4 - should fail closed when organization context is missing or invalid
    ok 3 - 3. Incomplete, Missing, and Inactive Membership Validation
    # Subtest: 4. Global Platform Admin Access Preservation
        ok 1 - checkIsAdmin should return true for platform super admin with isPlatform: true
        ok 2 - getPermissionsForUser should return full wildcard for platform super admin
        ok 3 - authorizeRoles should allow platform super admin to proceed
    ok 4 - 4. Global Platform Admin Access Preservation
    # Subtest: 5. Cached Permissions Consistency
        ok 1 - cached permissions in RolePermissionService for Org A role cannot grant privileges in Org B
    ok 5 - 5. Cached Permissions Consistency
ok 1 - SEC-05.2-A — RBAC Tenant Isolation & Privilege Escalation Regression Suite
# tests 12
# suites 5
# pass 12
# fail 0
# duration_ms 866.8914
```

### 5.2 Governance & Existing RBAC Test Suite
```bash
npm run test:governance
```
**Results:**
- Tests run: 115
- Suites: 59
- **Passed: 115**
- **Failed: 0**
- Duration: 14.4 seconds

---

## 6. Residual Risks & Audit Status

### Status of SEC-05.1-F01
- **Status:** **CLOSED / RESOLVED**
- **Evidence:** HTTP requests by multi-tenant administrators across organizations return HTTP 403 Forbidden. Direct calls to `getPermissionsForUser` and `checkIsAdmin` strictly restrict roles to the requested community.

### Residual Risks for Subsequent Phases
- **SEC-05.1-F02 (In-Memory Permission Cache):** `RolePermissionService.cache` remains process-local without cross-pod invalidation; scheduled for Redis backing in SEC-05.2-B.
- **SEC-05.1-F03 (Amenity Slot Lock Scan):** Blocking `KEYS` in `amenityBooking.socket.js` scheduled for cursor `SCAN` / Redis Set refactoring in SEC-05.2-C.
- **SEC-05.1-F04 (IP Rate Limiting):** `MemoryStore` rate limiters scheduled for Redis partitioning in SEC-05.2-D.
- **SEC-05.1-F05 (Browser Cache Headers):** Streaming attachments in `issueReport.controller.js` scheduled for `Cache-Control: no-store` in SEC-05.2-E.

---
*Report completed under subphase SEC-05.2-A. All requirements verified and passing.*
