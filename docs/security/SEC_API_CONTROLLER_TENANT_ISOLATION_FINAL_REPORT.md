# SEC-02.1 API/Controller Tenant Isolation — Final Report

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Feature / Audit ID:** `SEC-02.1` — API/Controller Layer Tenant Isolation Audit & Remediation  
**Active Branch:** `security/phase2-repository-tenant-isolation`  
**Baseline HEAD Commit:** `9423be17a1f3e92f846e20263d7504f3f0818aef`  
**Audit Date:** 2026-10-13  
**Implementation Status:** **COMPLETE & VERIFIED**

---

## 1. Executive Summary

This report documents the end-to-end architectural audit, code-level remediation, and automated regression verification of the **API/Controller layer for multi-tenant isolation** across the Nahom (`Manage-My-Gate`) backend (`backend/src/`).

The Nahom platform implements a `One Person -> One Global Identity -> Many Isolated Memberships` security model. A single global `User` record can belong to zero, one, or multiple communities (organizations), with tenant-specific access governed strictly by active `OrgMembership` records. Consequently, the API and controller layers must enforce a strict boundary:
1. **Authentication (`auth.middleware.js`):** Verifies the caller's cryptographic JWT, confirms global `User.status === 'Active'` and `isUserEmailVerified(user) === true`, and cross-checks any explicit `x-organization-id` header against active `OrgMembership` records (`assertOrgHeaderAllowed`) when it differs from the token's `orgId`.
2. **Tenant Context Resolution (`tenant.middleware.js`):** Resolves the active community strictly from trusted sources (`x-organization-id` header or signed JWT `orgId`), verifies `Organization.status` and subscription state, confirms an `OrgMembership` with `status: 'Active'`, resolves tenant-scoped roles and permissions via `getPermissionsForUser`, and populates `req.tenant` (`{ orgId, isPlatform, roleId, roleName, villaId, permissions }`).
3. **Controller Enforcement (`*.controller.js`):** Controllers extract `orgId` exclusively from `req.tenant.orgId` (never from untrusted `req.body.orgId`, `req.query.orgId`, or `req.params.orgId` unless explicitly validated against `req.tenant.orgId` or executed under a verified `req.tenant.isPlatform === true` context) and pass `orgId` explicitly into service and repository layers.

### Key Outcomes of This Audit
- **Complete Route & Controller Coverage:** Audited all 50+ feature routers mounted in `backend/src/routes/api.routes.js` and `backend/index.js`, covering financial/billing, wallet, reconciliation, visitor management, amenities, complaints, notices/polls, directory/intercom, community notes, notifications, user preferences, RBAC/roles, villas/units, integration hub, onboarding wizard, and platform CRM/commercial routes.
- **Residual Controller Gaps Remediated During This Audit:**
  1. **`RoleController.getRolePermissions` & `RoleService.getRolePermissions` (`backend/src/features/role/role.controller.js`, `backend/src/features/role/role.services.js`):** Added explicit tenant-ownership verification (`String(existingRole.orgId) !== String(req.tenant.orgId)` -> `403 Forbidden`) and propagated `contextOrgId` into `RoleService.getRolePermissions` and `RoleService.syncRolePermissions` so an administrator in Organization A cannot inspect or synchronize permissions of a role belonging to Organization B via `GET/PUT /api/v1/roles/:id/permissions`.
  2. **`OnboardingWizardController.validateImport` & `executeImport` (`backend/src/features/onboardingWizard/onboardingWizard.controller.js`):** Replaced the fallback `req.tenant?.orgId || req.body?.organisationId || req.body?.orgId` with `resolveOnboardingOrgId(req)`, which rejects cross-tenant `req.body.organisationId` / `req.body.orgId` overrides with `403 Forbidden` for non-platform callers and binds imports strictly to `req.tenant.orgId`.
  3. **`VisitorPassController.getPublicPass` (`backend/src/features/visitorPass/visitorPass.controller.js`, `backend/src/features/visitorPassToken/visitorPassToken.repository.js`):** Verified and hardened the unauthenticated QR/short-code public pass lookup (`GET /api/v1/visitor-pass/public/:token`) so it resolves `{ passId, orgId }` strictly from revocable `VisitorPassToken` records, enforces format validation and runtime expiration checks, rejects raw pass MongoDB `_id` fallbacks, and returns a strict bearer-safe field allowlist.
- **Automated Verification:** Executed **215+ automated security and integration assertions** across Phases 4B, 4C, 6.2A, 6.2B, 6.2C, 6.4, Phase 7 Financial Reconciliation, Auth/Email Verification, and Jest integration suites with **0 failures**.

---

## 2. Files Changed

In accordance with repository safety rules, all pre-existing tracked modifications and untracked files in the working tree on branch `security/phase2-repository-tenant-isolation` (`HEAD` = `9423be17a1f3e92f846e20263d7504f3f0818aef`) were preserved intact.

### 2.1 Files Modified During This Audit Session

| File Path | Layer | Summary of Changes |
| :--- | :--- | :--- |
| `backend/src/features/role/role.controller.js` | Controller | Enforced tenant ownership check in `getRolePermissions` (`403 Forbidden` on cross-tenant role ID) and passed `req.tenant.orgId` into `roleService.getRolePermissions` and `roleService.syncRolePermissions`. |
| `backend/src/features/role/role.services.js` | Service | Updated `getRolePermissions(roleId, contextOrgId = null)` and `syncRolePermissions(roleId, permissionNames, contextOrgId = null)` to forward `contextOrgId` to `getRoleById(roleId, null, contextOrgId)`. |
| `backend/src/features/onboardingWizard/onboardingWizard.controller.js` | Controller | Added `resolveOnboardingOrgId(req)` to block non-platform callers from overriding `req.tenant.orgId` via `req.body.organisationId` or `req.body.orgId` (`403 Forbidden`) and removed untrusted body fallback. |
| `backend/src/features/visitorPass/visitorPass.controller.js` | Controller | Hardened `getPublicPass` to resolve `{ passId, orgId }` from `visitorPassTokenService.resolveTokenByCode`, enforce cross-tenant header mismatch rejection (`404`), and enforce runtime validity window checks (`validity.endDate <= now`). |
| `backend/src/features/visitorPass/visitorPass.service.js` | Service | Updated `getPassByCode` to resolve `{ passId, orgId }` from token metadata when called without an ambient `orgId` and verify pass expiration at runtime. |
| `backend/src/features/visitorPassToken/visitorPassToken.repository.js` | Repository | Hardened `findByCode` with strict regex validation (`/^(?:[A-Za-z0-9]{6}|[0-9a-fA-F]{24}_[A-Za-z0-9]{6})$/`), explicit `orgId` scoping when provided, and deterministic `createdAt: -1` sorting. |
| `backend/src/middlewares/auth.middleware.js` | Middleware | Enforced `isUserEmailVerified(user)` across `isAuthenticated` and `optionalAuth` so unverified or deactivated accounts cannot obtain `req.user` context. |
| `backend/src/features/userIdentity/providerAdapters/google.provider.js` | Auth Provider | Added dynamic `getGoogleClientIds()` resolution supporting comma-separated client IDs (`GOOGLE_CLIENT_IDS` / `GOOGLE_CLIENT_ID`) and strict `payload.email_verified !== true` rejection. |
| `backend/tests/phase6_2a_high_remediation.test.mjs` | Test Suite | Added Area 5 regression tests (`5.1` cross-tenant `GET /api/v1/roles/:id/permissions` rejection; `5.2` cross-tenant `POST /api/v1/onboarding/execute-import` `organisationId` override rejection). |
| `backend/tests/phase4c_low_remediation.test.mjs` | Test Suite | Added `A.10` and `A.11` regression tests for public visitor-pass token resolution, bearer-safe allowlist, and expired/revoked/malformed/cross-tenant token rejection. |
| `docs/security/SEC_API_CONTROLLER_TENANT_ISOLATION_FINAL_REPORT.md` | Documentation | Created this comprehensive 14-section API/Controller tenant isolation final report. |

### 2.2 Pre-Existing Working-Tree Tenant-Isolation Remediations Verified Intact

| Domain / Feature | Pre-Existing Modified Files Verified in Working Tree | Verification Status |
| :--- | :--- | :--- |
| **Core Middleware & Routing** | `backend/index.js`, `backend/src/routes/api.routes.js`, `backend/src/middlewares/auth.middleware.js`, `backend/src/middlewares/tenant.middleware.js` | Verified intact & tested |
| **Invoices & Assessments** | `backend/src/features/invoice/invoice.router.js`, `invoice.controller.js`, `invoice.services.js`, `invoice.repository.js`, `assessment.repository.js` | Verified intact & tested |
| **Wallet & Payments** | `backend/src/features/wallet/wallet.router.js`, `wallet.controller.js`, `wallet.service.js`, `wallet.repository.js`, `payment.controller.js`, `payment.service.js`, `payment.repository.js` | Verified intact & tested |
| **Financial Ledger & Reconciliation** | `backend/src/features/ledger/reconciliation/reconciliation.router.js`, `reconciliation.controller.js`, `historicalInventory.service.js`, `historicalReconciliation.service.js`, `reconciliationReport.service.js`, `financialIntegrity.service.js`, `financialMetrics.service.js` | Verified intact & tested |
| **Visitor Passes, Logs & Blacklist** | `backend/src/features/visitorPass/visitorPass.router.js`, `visitorPass.controller.js`, `visitorPass.policy.js`, `visitorPass.service.js`, `visitorPass.repository.js`, `visitorLog.controller.js`, `visitorLog.service.js`, `visitorLog.repository.js`, `blacklist.controller.js`, `blacklist.service.js`, `blacklist.repository.js` | Verified intact & tested |
| **Notices, Comments, Reactions & Polls** | `noticeBoard.controller.js`, `noticeBoard.service.js`, `noticeBoard.repository.js`, `noticeComment.controller.js`, `noticeReaction.controller.js`, `poll.router.js`, `poll.controller.js`, `poll.services.js`, `poll.repository.js`, `pollReaction.controller.js` | Verified intact & tested |
| **Amenities & Bookings** | `amenity.controller.js`, `amenity.services.js`, `amenity.repository.js`, `amenityBooking.controller.js`, `amenityBooking.services.js`, `amenityBooking.repository.js`, `amenityManagement.router.js`, `amenityManagement.controller.js`, `booking.service.js` | Verified intact & tested |
| **Complaints, Technicians & Issue Reports** | `complaint.controller.js`, `complaint.service.js`, `complaint.repository.js`, `complaintSettings.service.js`, `technician.controller.js`, `technician.service.js`, `issueReport.router.js`, `issueReport.controller.js`, `issueReport.service.js`, `issueReport.repository.js` | Verified intact & tested |
| **Directory, Intercom, Notes, Notifications & Preferences** | `directory.router.js`, `directory.controller.js`, `directory.services.js`, `directory.repository.js`, `directoryMessage.router.js`, `directoryMessage.controller.js`, `directoryMessage.services.js`, `communityNote.router.js`, `communityNote.controller.js`, `communityNote.service.js`, `notification.controller.js`, `notification.service.js`, `userPreference.controller.js`, `userPreference.service.js` | Verified intact & tested |
| **Workspaces, Villas, Users, Orgs & Platform CRM** | `workspace.controller.js`, `workspace.service.js`, `workspace.repository.js`, `villa.router.js`, `villa.controller.js`, `villa.services.js`, `villa.repository.js`, `user.controller.js`, `user.services.js`, `organization.router.js`, `organization.controller.js`, `platformCrm/enquiry.router.js`, `enquiry.controller.js`, `masterPricing.controller.js` | Verified intact & tested |

---

## 3. Validation Flow

The following text diagram illustrates the exact runtime request validation flow implemented across the Nahom backend (`backend/index.js` -> `api.routes.js` -> `auth.middleware.js` -> `tenant.middleware.js` -> `rbac.middleware.js` -> Controller -> Service -> Repository):

```text
Incoming HTTP Request
  │
  ├─► [1. Global Infrastructure Middleware (backend/index.js)]
  │     ├── correlationIdMiddleware (assigns/propagates X-Request-ID)
  │     ├── httpLoggerMiddleware (structured request trace with correlationId)
  │     ├── cors + helmet (CSP, HSTS, origin validation)
  │     ├── express.json / express.urlencoded (rawBody captured for HMAC webhooks)
  │     ├── sanitizeRequest (strips NoSQL operator keys starting with '$' or containing '.')
  │     └── apiLimiter (rate limiting on /api and /api/v1)
  │
  ├─► [2. Route Classification (backend/src/routes/api.routes.js)]
  │     │
  │     ├──► (A) PUBLIC / PRE-AUTH / WEBHOOK ROUTES (Explicit Exceptions)
  │     │      ├── /api/v1/public/* (public enquiry & marketing endpoints)
  │     │      ├── /api/v1/auth/login, /register, /verify-otp, /accept-invitation
  │     │      ├── /api/v1/webhooks/razorpay, /api/v1/invoices/webhook (HMAC-SHA256 verified)
  │     │      ├── /api/v1/billing-links/:token (signed payment link token verification)
  │     │      └── GET /api/v1/visitor-pass/public/:token
  │     │            └── Resolves { passId, orgId } strictly from revocable VisitorPassToken,
  │     │                validates runtime expiry & status, returns bearer-safe allowlist only.
  │     │
  │     ├──► (B) PLATFORM-WIDE ADMIN ROUTES (requirePlatformContext: true)
  │     │      ├── /api/v1/platform-orders, /platform-quotes, /platform-invoices,
  │     │      │   /platform-payments, /platform-provisioning-jobs, /platform-subscriptions,
  │     │      │   /crm/*, /audit-logs, /platform/reports, /organizations (platform ops)
  │     │      └── Flow:
  │     │            isAuthenticated
  │     │              └─► tenantContext({ requirePlatformContext: true })
  │     │                    ├── Checks req.user.isPlatform === true (cryptographically bound
  │     │                    │   in JWT at login only for active members of isPlatform: true org)
  │     │                    ├── If false ──► 403 Forbidden ("Platform Super Admin access required")
  │     │                    └── If true  ──► Sets req.tenant = { orgId: targetOrgId, isPlatform: true }
  │     │
  │     └──► (C) STANDARD TENANT-SCOPED ROUTES (All Community Feature Routers)
  │            │
  │            ├─► [Step 3: Authentication — isAuthenticated (auth.middleware.js)]
  │            │     ├── Extracts JWT from Authorization: Bearer <token> or accessToken cookie
  │            │     │     (if cookie-authenticated on state-changing method, enforces
  │            │     │      assertTrustedOriginForCookieAuth -> 403 on untrusted Origin)
  │            │     ├── Verifies JWT signature & expiration -> 401 if invalid/expired
  │            │     ├── Loads User from DB:
  │            │     │     ├── Rejects missing/Deleted/Inactive/Suspended user -> 401
  │            │     │     └── Enforces isUserEmailVerified(user) === true -> 403 EMAIL_NOT_VERIFIED
  │            │     └── Enforces assertOrgHeaderAllowed(req, decoded):
  │            │           └── If x-organization-id != decoded.orgId and !decoded.isPlatform:
  │            │                 Queries OrgMembership({ userId, orgId: headerOrgId, status: 'Active' })
  │            │                 If no active membership -> 403 Forbidden
  │            │
  │            ├─► [Step 4: Tenant Context Resolution — tenantContext (tenant.middleware.js)]
  │            │     ├── Resolves candidate orgId = req.headers['x-organization-id'] || req.user.orgId
  │            │     ├── Rejects missing orgId (for non-platform user) -> 400 ("Workspace context is required.")
  │            │     ├── Validates ObjectId syntax -> 400 ("Invalid workspace context identifier.")
  │            │     ├── Loads Organization via organizationService.getOrganizationById(orgId):
  │            │     │     ├── Missing org -> 404
  │            │     │     └── Deactivated / Suspended org -> 403
  │            │     ├── Queries OrgMembership({ userId, orgId, status: 'Active' }) (populated with role):
  │            │     │     ├── Missing or non-Active membership (for non-platform user) -> 403 Forbidden
  │            │     │     └── Enforces PlatformSubscription expiry check -> 403 SUBSCRIPTION_EXPIRED
  │            │     ├── Resolves tenant-scoped role & permissions via getPermissionsForUser()
  │            │     └── Attaches canonical context:
  │            │           req.tenant = { orgId, isPlatform, roleId, roleName, villaId, permissions }
  │            │           req.orgId = orgId
  │            │           req.user.orgId = orgId (overrides JWT default with verified active orgId)
  │            │
  │            ├─► [Step 5: RBAC & Input Validation]
  │            │     ├── authorizeRoles(...) / authorizePermission(feature, action) -> 403 if unauthorized
  │            │     └── validate(expressValidatorRules) -> 422 / 400 if payload invalid
  │            │
  │            ├─► [Step 6: Feature Controller (*.controller.js)]
  │            │     ├── Reads orgId strictly from req.tenant.orgId
  │            │     ├── Rejects any mismatched client-supplied orgId in params/query/body -> 403
  │            │     └── Invokes Feature Service with explicit (orgId, actorId, ...)
  │            │
  │            └─► [Step 7: Feature Service & Repository (*.service.js -> *.repository.js)]
  │                  ├── Service validates cross-entity ownership within orgId
  │                  └── Repository executes Mongoose query/aggregation with mandatory { orgId } filter
```

---

## 4. Architecture Diagram

```mermaid
flowchart TD
    Client["Client Application (Web / Mobile)"]
    
    subgraph ExpressPipeline["Express HTTP Pipeline (backend/index.js)"]
        CorrID["correlationIdMiddleware (X-Request-ID)"]
        Sanitize["sanitizeRequest (NoSQL Key Sanitizer)"]
        RateLimit["apiLimiter (Rate Limiter)"]
    end

    subgraph SecurityMiddlewares["Authentication & Tenant Isolation Middlewares"]
        AuthMW["isAuthenticated (auth.middleware.js)<br/>1. Verify JWT / Cookie Origin<br/>2. Check User Active + Email Verified<br/>3. assertOrgHeaderAllowed()"]
        TenantMW["tenantContext (tenant.middleware.js)<br/>1. Resolve x-organization-id or JWT orgId<br/>2. Verify Organization Active & Subscription<br/>3. Verify Active OrgMembership<br/>4. Populate req.tenant & Permissions"]
        RBACMW["authorizePermission / authorizeRoles (rbac.middleware.js)<br/>Enforce Tenant-Scoped RBAC"]
        ValidatorMW["validate (validator.middleware.js)<br/>Express-Validator Rules"]
    end

    subgraph FeatureLayer["Feature Module (src/features/[feature]/)"]
        Controller["Feature Controller (*.controller.js)<br/>Extracts orgId from req.tenant.orgId<br/>Rejects untrusted client orgId overrides"]
        Service["Feature Service (*.service.js)<br/>Enforces Domain & Cross-Entity Ownership"]
        Repo["Feature Repository (*.repository.js)<br/>Mandatory { orgId } Filter & Mongoose Session"]
    end

    subgraph DataLayer["MongoDB Persistence"]
        OrgCol[("organizations")]
        MemCol[("orgmemberships")]
        TenantCol[("Tenant-Scoped Collections<br/>(invoices, wallets, visitorpasses, etc.)")]
    end

    Client -->|"HTTP Request + Bearer JWT + X-Organization-Id"| CorrID
    CorrID --> Sanitize --> RateLimit --> AuthMW
    AuthMW -->|"Verify Membership on Header Override"| MemCol
    AuthMW --> TenantMW
    TenantMW -->|"Verify Org Status"| OrgCol
    TenantMW -->|"Verify Active Membership & Role"| MemCol
    TenantMW --> RBACMW --> ValidatorMW --> Controller
    Controller -->|"Pass trusted req.tenant.orgId"| Service
    Service -->|"Scoped Call (id, orgId)"| Repo
    Repo -->|"Query { _id: id, orgId }"| TenantCol
```

---

## 5. Request Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Resident / Admin)
    participant AuthMW as auth.middleware.js
    participant TenantMW as tenant.middleware.js
    participant RBACMW as rbac.middleware.js
    participant Ctrl as Feature Controller
    participant Svc as Feature Service
    participant Repo as Feature Repository
    participant DB as MongoDB

    Client->>AuthMW: HTTP Request (Authorization: Bearer <JWT>, X-Organization-Id: <orgId>)
    AuthMW->>AuthMW: Verify JWT signature & expiry
    AuthMW->>DB: User.findById(decoded.id)
    DB-->>AuthMW: User document (status: 'Active', emailVerified: true)
    alt X-Organization-Id differs from JWT orgId (and !decoded.isPlatform)
        AuthMW->>DB: OrgMembership.findOne({ userId, orgId: headerOrgId, status: 'Active' })
        alt No Active Membership
            DB-->>AuthMW: null
            AuthMW-->>Client: 403 Forbidden ("You do not have an active membership in the requested organization")
        end
    end
    AuthMW->>TenantMW: next() with req.user

    TenantMW->>TenantMW: Resolve orgId = req.headers['x-organization-id'] || req.user.orgId
    TenantMW->>DB: Organization.findById(orgId)
    DB-->>TenantMW: Organization (status: 'Active')
    TenantMW->>DB: OrgMembership.findOne({ userId: req.user.id, orgId, status: 'Active' }).populate('role')
    alt Membership missing or status !== 'Active'
        DB-->>TenantMW: null
        TenantMW-->>Client: 403 Forbidden ("You are not a member of the requested community")
    end
    DB-->>TenantMW: Active OrgMembership + Role
    TenantMW->>TenantMW: Populate req.tenant = { orgId, isPlatform, roleId, roleName, villaId, permissions }
    TenantMW->>RBACMW: next()

    RBACMW->>RBACMW: Verify req.user.permissions includes required feature:action
    alt Permission missing
        RBACMW-->>Client: 403 Forbidden ("Access denied. Missing required permission")
    end
    RBACMW->>Ctrl: next()

    Ctrl->>Ctrl: Extract orgId = req.tenant.orgId (reject cross-tenant body/param/query orgId)
    Ctrl->>Svc: Call serviceMethod(resourceId, payload, orgId, req.user)
    Svc->>Repo: Call repoMethod(resourceId, orgId, session)
    Repo->>DB: Execute query with { _id: resourceId, orgId }
    alt Resource belongs to another tenant or does not exist
        DB-->>Repo: null
        Repo-->>Svc: null
        Svc-->>Ctrl: throw HttpError(404 / 403)
        Ctrl-->>Client: 404 Not Found / 403 Forbidden (zero cross-tenant data leakage)
    end
    DB-->>Repo: Scoped Document
    Repo-->>Svc: Scoped Document
    Svc-->>Ctrl: Domain Result
    Ctrl-->>Client: 200 OK (res.success)
```

---

## 6. Validation Decision Flow

```mermaid
flowchart TD
    Start(["Incoming API Request"]) --> IsPublic{"Is Route Explicitly Public<br/>or Signature-Verified Webhook?"}
    
    IsPublic -->|"Yes (/public/*, /auth/login, /webhooks/*)"| PublicCheck{"Is Route<br/>/visitor-pass/public/:token?"}
    PublicCheck -->|"Yes"| TokenResolve["Resolve { passId, orgId } via VisitorPassToken<br/>Validate format, status & runtime expiry<br/>Return bearer-safe allowlist or 404"]
    PublicCheck -->|"No"| ExecutePublic["Execute Public / Webhook Handler<br/>(Verify HMAC / Token where applicable)"]

    IsPublic -->|"No (Protected Route)"| HasToken{"Valid JWT Present<br/>& Trusted Cookie Origin?"}
    HasToken -->|"No"| Err401["Return 401 Unauthorized"]
    HasToken -->|"Yes"| UserCheck{"User Active in DB &<br/>isUserEmailVerified(user)?"}
    UserCheck -->|"No (Deactivated/Deleted)"| Err401
    UserCheck -->|"No (Email Unverified)"| Err403Email["Return 403 Forbidden<br/>(EMAIL_NOT_VERIFIED)"]
    
    UserCheck -->|"Yes"| HeaderCheck{"x-organization-id Header<br/>Differs from JWT orgId?"}
    HeaderCheck -->|"Yes (and !isPlatform)"| EarlyMemCheck{"Active OrgMembership<br/>Exists for Header orgId?"}
    EarlyMemCheck -->|"No"| Err403Header["Return 403 Forbidden<br/>(assertOrgHeaderAllowed)"]
    EarlyMemCheck -->|"Yes"| PlatformRouteCheck
    HeaderCheck -->|"No"| PlatformRouteCheck{"Route Requires<br/>requirePlatformContext: true?"}

    PlatformRouteCheck -->|"Yes"| IsPlatformUser{"req.user.isPlatform === true?"}
    IsPlatformUser -->|"No"| Err403Platform["Return 403 Forbidden<br/>(Platform Super Admin Required)"]
    IsPlatformUser -->|"Yes"| SetPlatformCtx["Set req.tenant = { orgId, isPlatform: true }"]

    PlatformRouteCheck -->|"No (Standard Tenant Route)"| HasOrgId{"Resolved orgId Present<br/>& Valid 24-hex ObjectId?"}
    HasOrgId -->|"No"| Err400Org["Return 400 Bad Request<br/>(Workspace context required / Invalid ID)"]
    HasOrgId -->|"Yes"| OrgActive{"Organization Exists &<br/>Status is Active?"}
    OrgActive -->|"Not Found"| Err404Org["Return 404 Not Found"]
    OrgActive -->|"Deactivated / Suspended"| Err403Org["Return 403 Forbidden"]
    
    OrgActive -->|"Active"| ActiveMem{"Active OrgMembership<br/>in Requested orgId?"}
    ActiveMem -->|"No (and !isPlatform)"| Err403Mem["Return 403 Forbidden<br/>(Not a member of community)"]
    ActiveMem -->|"Yes"| SubCheck{"PlatformSubscription<br/>Expired?"}
    SubCheck -->|"Yes (Non-Exempt Route)"| Err403Sub["Return 403 Forbidden<br/>(SUBSCRIPTION_EXPIRED)"]
    SubCheck -->|"No"| PopulateTenant["Populate req.tenant = { orgId, roleId, permissions, ... }"]

    SetPlatformCtx --> RBACCheck{"Controller / RBAC Check:<br/>Does Client Param/Body orgId<br/>Conflict with req.tenant.orgId?"}
    PopulateTenant --> RBACCheck
    RBACCheck -->|"Yes (Mismatched orgId)"| Err403Mismatch["Return 403 Forbidden"]
    RBACCheck -->|"No"| ScopedQuery["Execute Service & Repository<br/>Strictly Scoped by req.tenant.orgId"]
```

---

## 7. Code-Level Explanation

### 7.1 Authentication & Header Cross-Check (`backend/src/middlewares/auth.middleware.js`)
- **`assertOrgHeaderAllowed(req, decoded)` (lines 42–60):** Before a request even reaches `tenant.middleware.js`, if the caller supplies an `x-organization-id` header that differs from the `orgId` embedded in the signed JWT (and `decoded.isPlatform !== true`), `auth.middleware.js` validates `mongoose.Types.ObjectId.isValid(headerOrgId)` (`400` if malformed) and queries `OrgMembership.exists({ userId, orgId: headerOrgId, status: 'Active' })`. If no active membership exists, the request is immediately rejected with `403 Forbidden`.
- **`isAuthenticated` (lines 62–144):** Verifies the JWT, queries `User.findById(userId)`, rejects inactive/suspended/deleted accounts (`401`), enforces `isUserEmailVerified(user)` (`403 EMAIL_NOT_VERIFIED`), enforces `assertTrustedOriginForCookieAuth(req)` for cookie-authenticated mutations, and attaches `req.user` with `isPlatform: Boolean(decoded.isPlatform)`.

### 7.2 Tenant Context Resolution (`backend/src/middlewares/tenant.middleware.js`)
- **`createTenantMiddleware(options)` (lines 11–208):**
  - Supports both standard `tenantContext(req, res, next)` and platform-restricted `tenantContext({ requirePlatformContext: true })`.
  - **Platform Context Enforcement (lines 28–30):** When `requirePlatformContext === true` and `!isPlatformSuperAdmin`, throws `new HttpError(403, 'Forbidden. Platform Super Admin access required.')`. Crucially, `isPlatformSuperAdmin` is computed strictly as `Boolean(req.user.isPlatform)` (line 20) — never from mutable tenant role names.
  - **Organization & Membership Validation (lines 49–113):** Validates `mongoose.Types.ObjectId.isValid(orgId)` (`400`), loads the organization via `organizationService.getOrganizationById(orgId)` (`404` if missing, `403` if `Deactivated`/`Suspended`), and queries `OrgMembership.findOne({ userId, orgId, status: 'Active' }).populate('role')`. If a non-platform user lacks an `Active` membership, throws `new HttpError(403, 'Forbidden. You are not a member of the requested community.')`.
  - **Subscription Lockout & Context Population (lines 115–201):** Verifies that the community's `PlatformSubscription` is not expired (`403 SUBSCRIPTION_EXPIRED` for non-exempt routes), resolves tenant-specific permissions via `getPermissionsForUser`, and populates `req.tenant = { orgId, isPlatform, roleId, roleName, villaId, permissions }`, `req.orgId = orgId`, and `req.user.orgId = orgId`.

### 7.3 Financial, Billing, Wallet & Reconciliation Controllers
- **`InvoiceController` (`backend/src/features/invoice/invoice.controller.js`):**
  - `getMyDues` (lines 9–19), `triggerManual` (lines 24–35), `triggerWhatsApp` (lines 40–49), `settleOffline` (lines 54–69), `approvePayment` (lines 89–107), `rejectPayment` (lines 112–127), `recordCashPayment` (lines 132–147), `searchCashEligible` (lines 152–161), `getCashCollections` (lines 166–178), `getDashboardKPIs` (lines 183–194), `getAllInvoices` (lines 199–210), `getInvoiceById` (lines 262–276), `sendInvoiceReminder` (lines 312–322), `notifyResidentPortfolio` (lines 327–336): All methods bind `orgId` strictly from `req.tenant.orgId` (only allowing `req.query.communityId` when `req.tenant?.isPlatform === true`) and verify invoice community ownership (`403` / `404` on cross-tenant access).
- **`WalletController` (`backend/src/features/wallet/wallet.controller.js`):**
  - `getValidatedWalletOrgId(req)` (lines 4–13): Returns `req.tenant.orgId` (or `req.query.orgId` only if `req.user?.isPlatform === true`), failing closed with `400` if missing.
  - `resolveTargetUserId(req, requestedUserId, orgId, isFullAdmin)` (lines 15–34): Prevents a tenant admin in Organization A from accessing or crediting the wallet of a user in Organization B by verifying `OrgMembership.findOne({ userId: requestedUserId, orgId, status: 'Active' })` (`404` if not an active member of `orgId`).
- **`ReconciliationController` (`backend/src/features/ledger/reconciliation/reconciliation.controller.js`):**
  - `resolveTenantOrgId(req)` (lines 8–17): Resolves `orgId` strictly from `req.tenant?.orgId` for tenant admins (only allowing `req.query.orgId` / `req.body.orgId` when `isPlatform === true`), failing closed with `400` if missing. Used across all 8 endpoints (`getIntegrity`, `getMetrics`, `getInventory`, `runReconciliation`, `verifyInvariants`, `getRunReport`, `getExceptions`, `updateException`).

### 7.4 Visitor Management, Gate Operations & Public Token Boundary
- **`VisitorPassController` (`backend/src/features/visitorPass/visitorPass.controller.js`):**
  - `create` (lines 16–35): Enforces `assertVisitorPermission(['resident', 'manager'], req.user)`, rejects `req.body.orgId !== req.tenant.orgId` (`403`), enforces `assertResidentOwnsVilla` for residents, and sets `orgId: req.tenant.orgId`.
  - `getById` (lines 40–49) & `updateStatus` (lines 54–80): Pass `req.tenant.orgId` to `visitorPassService.getPassById(id, req.tenant.orgId)` and enforce `assertPassAccess(existing, req.user)`.
  - `getByOrgPaginated` (lines 85–120): Rejects `String(req.tenant.orgId) !== String(req.params.orgId)` with `403 Forbidden`, bounds `limit` to `[1, 100]`, and scopes resident queries to `{ createdById: getActorId(req.user) }`.
  - `getPublicPass` (lines 148–195): Resolves `{ passId, orgId }` via `visitorPassTokenService.resolveTokenByCode`, rejects cross-tenant `req.tenant?.orgId` mismatches (`404`), checks `data.status` and `data.validity.endDate <= now` (`404`), and returns only bearer-safe fields (`_id`, `shortKey`, `passType`, `status`, `purpose`, `visitorDetails.name`, `vehicleDetails.number`, `validity`).

### 7.5 Community Governance, Amenities, Complaints, Roles & Onboarding
- **`ComplaintController` (`backend/src/features/complaint/complaint.controller.js`):**
  - All 18 controller methods extract `orgId = req.tenant.orgId`. `exportComplaints` (lines 207–305) explicitly whitelists query filters (stripping any client-supplied `orgId`) and enforces resident/technician RBAC scoping so non-admin residents can only export their own complaints.
- **`RoleController` (`backend/src/features/role/role.controller.js`):**
  - `getAllRoles`, `createRole`, `updateRole`, `deleteRole`, `getRolePermissions`, and `syncRolePermissions` all enforce `req.tenant.orgId` ownership (`403 Forbidden` if `String(existingRole.orgId) !== String(req.tenant.orgId)`) and block tenant creation/modification of reserved platform role names (`RESERVED_PLATFORM_ROLE_NAMES` in `role.services.js`).
- **`OnboardingWizardController` (`backend/src/features/onboardingWizard/onboardingWizard.controller.js`):**
  - `resolveOnboardingOrgId(req)` (lines 4–15) rejects cross-tenant `req.body.organisationId` / `req.body.orgId` overrides with `403 Forbidden` and binds CSV/XLSX validation and bulk import execution strictly to `req.tenant.orgId`.
- **`NotificationController` (`backend/src/features/notification/notification.controller.js`) & `UserPreferenceController` (`backend/src/features/userPreference/userPreference.controller.js`):**
  - Because `/notifications` and `/users/preferences` support both workspace-specific and combined/user-global modes without mandatory router-level `tenantContext`, their controllers explicitly validate `OrgMembership.findOne({ userId, orgId: candidateOrgId, status: 'Active' })` (`403 Forbidden` if unauthorized) before reading or mutating any organization-scoped state.

---

## 8. Error Handling

| Scenario / Failure Condition | HTTP Status | Error Code / Message | Implementation Location | Automated Test Coverage |
| :--- | :---: | :--- | :--- | :--- |
| Missing, malformed, or expired JWT on protected endpoint | `401` | `Authentication required.` / `Invalid or expired token.` | `auth.middleware.js` (lines 72–97) | `authSpamEmailVerification.test.mjs`, `phase4b1_critical_remediation.test.mjs` |
| Deactivated, suspended, or deleted `User` account | `401` | `Account is not active. Access denied.` | `auth.middleware.js` (lines 99–113) | `authSpamEmailVerification.test.mjs` |
| Authenticated user with `emailVerified: false` | `403` | `EMAIL_NOT_VERIFIED` (`Please verify your email address before continuing.`) | `auth.middleware.js` (lines 115–121) | `authSpamEmailVerification.test.mjs` (19/19 PASS) |
| Untrusted `Origin` / `Referer` on cookie-authenticated state-changing request | `403` | `Untrusted request origin.` | `auth.middleware.js` (lines 14–40) | `authSpamEmailVerification.test.mjs` |
| Forged `X-Organization-Id` header for an organization where user has no active `OrgMembership` | `403` | `Forbidden. You do not have an active membership in the requested organization.` / `Forbidden. You are not a member of the requested community.` | `auth.middleware.js` (lines 42–60), `tenant.middleware.js` (lines 99–112) | `phase4b1_critical_remediation.test.mjs`, `phase6_2a_high_remediation.test.mjs`, `phase6_2b_medium_remediation.test.mjs` |
| Missing `X-Organization-Id` header and no default `orgId` on tenant-scoped route | `400` | `Workspace context is required.` | `tenant.middleware.js` (lines 42–46) | `phase6_2a_high_remediation.test.mjs`, `phase6_2b_medium_remediation.test.mjs` |
| Malformed `X-Organization-Id` (non-ObjectId string) | `400` | `Invalid workspace context identifier.` / `Invalid organization context header.` | `auth.middleware.js` (lines 51–53), `tenant.middleware.js` (lines 49–51) | `tenantIsolation.test.mjs`, `phase6_4_critical_high_remediation.test.mjs` |
| Non-existent organization ID in tenant context | `404` | `Workspace Organization Not Found.` | `tenant.middleware.js` (lines 59–61) | `tenantIsolation.test.mjs` |
| Deactivated or suspended organization | `403` | `This community workspace has been deactivated...` / `suspended...` | `tenant.middleware.js` (lines 64–70) | `tenantIsolation.test.mjs` |
| Expired community `PlatformSubscription` on non-exempt route | `403` | `SUBSCRIPTION_EXPIRED` | `tenant.middleware.js` (lines 115–155) | `platformSubscription.integration.test.js` |
| Tenant user or spoofed `"Super Admin"` tenant role accessing `requirePlatformContext: true` route | `403` | `Forbidden. Platform Super Admin access required.` | `tenant.middleware.js` (lines 20, 28–30) | `phase4b1_critical_remediation.test.mjs`, `phase6_4_critical_high_remediation.test.mjs` |
| Client-supplied `orgId` in body/query/params conflicts with `req.tenant.orgId` | `403` | `Forbidden. Active workspace context does not match...` / `belongs to another community.` | `visitorPass.controller.js`, `role.controller.js`, `onboardingWizard.controller.js`, `userPreference.controller.js` | `phase4b2_high_remediation.test.mjs`, `phase6_2a_high_remediation.test.mjs`, `phase6_2b_medium_remediation.test.mjs` |
| Cross-tenant resource ID (`:id`) read, update, or delete attempt (BOLA / IDOR) | `404` / `403` | Resource not found in tenant scope (`404`) or explicit cross-community rejection (`403`) | All feature controllers, services, and repositories | `phase4b1`, `phase4b2`, `phase4b3`, `phase4c`, `phase6_2a`, `phase6_2b`, `phase6_4` |
| Unauthenticated public visitor-pass lookup with expired, revoked, malformed, raw MongoDB ID, or cross-tenant token | `404` | `Visitor pass not found or expired` | `visitorPass.controller.js` (lines 148–176), `visitorPassToken.repository.js` | `phase4c_low_remediation.test.mjs` (`A.10`, `A.11`) |

---

## 9. Test Coverage

All relevant automated security and regression test suites were executed against the current codebase on branch `security/phase2-repository-tenant-isolation`.

### 9.1 Executed Test Commands & Results Summary

| Test Suite / Command | Passed | Failed | Skipped | Status |
| :--- | :---: | :---: | :---: | :---: |
| `node --test tests/phase4b1_critical_remediation.test.mjs tests/phase4b2_high_remediation.test.mjs tests/phase4b3_medium_remediation.test.mjs tests/phase4c_low_remediation.test.mjs` | **77** | 0 | 0 | **PASS** |
| `node --test tests/phase6_2a_high_remediation.test.mjs tests/phase6_4_critical_high_remediation.test.mjs` | **45** | 0 | 0 | **PASS** |
| `node --test tests/phase6_2b_medium_remediation.test.mjs` | **22** | 0 | 0 | **PASS** |
| `node --test tests/phase6_2c_low_remediation.test.mjs` | **24** | 0 | 0 | **PASS** |
| `node --test tests/financial.reconciliation.phase7.test.mjs` | **11** | 0 | 0 | **PASS** |
| `node --test tests/authSpamEmailVerification.test.mjs tests/google.provider.test.mjs tests/apple.provider.test.mjs` | **30** | 0 | 0 | **PASS** |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/features/visitorTenant.integration.test.js tests/features/walletService.integration.test.js tests/features/roleService.integration.test.js` | **18** | 0 | 0 | **PASS** |
| **Total Executed Assertions / Tests** | **227** | **0** | **0** | **100% PASS** |

### 9.2 Breakdown of Key Security Test Suites

1. **`tests/phase4b1_critical_remediation.test.mjs` (24/24 PASS):**
   - Verifies platform-wide route lockout (`requirePlatformContext: true`), tenant role name spoofing prevention (`RESERVED_PLATFORM_ROLE_NAMES`), invoice offline settlement/approval/rejection tenant isolation, wallet cross-tenant target user isolation, and workspace module/member/settings tenant boundaries.
2. **`tests/phase4b2_high_remediation.test.mjs` (19/19 PASS):**
   - Verifies cross-tenant BOLA/IDOR rejection across `visitorPass`, `visitorLog`, `blacklist`, `noticeBoard`, `noticeComment`, `noticeReaction`, `poll`, `amenity`, `amenityBooking`, and `amenityManagement` (`/api/v2/amenities`).
3. **`tests/phase4b3_medium_remediation.test.mjs` (17/17 PASS):**
   - Verifies tenant isolation across `complaint`, `technician`, `directory`, `directoryMessage`, `communityNote`, `notification`, `userPreference`, `villa`, and `user` invitation/role management.
4. **`tests/phase4c_low_remediation.test.mjs` (17/17 PASS):**
   - Verifies `IntegrationHub` AES-256-GCM credential decryption tenant scoping, gate hardware pass consumption tenant checks, `VisitorPassToken` tenant-scoped deletion, public visitor pass token boundary (`A.10` & `A.11`), complaint/unit export RBAC & tenant isolation, and background worker/SLA escalation `orgId` propagation.
5. **`tests/phase6_2a_high_remediation.test.mjs` (16/16 PASS):**
   - Verifies `complaintRepository.findAll` filter-spread override prevention, exclusion of unassigned invoices lacking `communityId`, `communityNote` forged header rejection, assessment carry-forward cross-community balance isolation, `GET /api/v1/roles/:id/permissions` cross-tenant Role ID rejection (`5.1`), and `POST /api/v1/onboarding/execute-import` cross-tenant `organisationId` body override rejection (`5.2`).
6. **`tests/phase6_2b_medium_remediation.test.mjs` (22/22 PASS) & `tests/phase6_2c_low_remediation.test.mjs` (24/24 PASS):**
   - Verifies wallet, user preferences, notification, and directory message tenant boundaries, bounded pagination (`limit <= 100`), audit/security log date-range safety (`<= 365` days), CRM sort-field allowlisting, `MasterPricing` global vs. custom organization plan isolation, and organization-scoped vs. global session revocation.
7. **`tests/phase6_4_critical_high_remediation.test.mjs` (29/29 PASS):**
   - Verifies platform CRM `/api/v1/enquiries` `requirePlatformContext: true` enforcement, `IssueReport` attachment authentication and tenant verification (with static `/uploads/issueReports` blocked at `404`), and cross-tenant isolation across financial reconciliation endpoints (`run`, `verify`, `integrity`, `metrics`, `inventory`, `reports/:runId`, `exceptions`, `exceptions/:exceptionId`).

---

## 10. Security Verification

Every required security verification question is answered below based on direct code inspection and executable test evidence:

| # | Security Verification Question | Answer | Evidence (Source Files & Executable Tests) |
| :-: | :--- | :---: | :--- |
| **1** | **Are all protected tenant-scoped API routes guarded by authentication and tenant-context validation?** | **YES** | All tenant-scoped feature routers in `backend/src/routes/api.routes.js` enforce `isAuthenticated` (`auth.middleware.js`) and `tenantContext` (`tenant.middleware.js`). Multi-org/user-global endpoints (`/notifications`, `/users/preferences`) enforce `isAuthenticated` plus explicit `OrgMembership` verification in `notification.controller.js` (lines 5–32) and `userPreference.controller.js` (lines 4–41). |
| **2** | **Are unauthenticated requests to protected endpoints rejected before controller execution?** | **YES** | `isAuthenticated` (`auth.middleware.js` lines 72–97) rejects missing or invalid JWTs with `401 Unauthorized` before `tenantContext` or any controller method executes. Verified in `authSpamEmailVerification.test.mjs` and `phase4b1_critical_remediation.test.mjs`. |
| **3** | **Are requests missing tenant context rejected on tenant-scoped endpoints?** | **YES** | `tenant.middleware.js` (lines 42–46) throws `new HttpError(400, 'Workspace context is required.')` whenever `orgId` is absent for a non-platform caller. Controllers also include defense-in-depth checks (`getTrustedOrgId`, `getValidatedWalletOrgId`, `resolveTenantOrgId`, `resolveOnboardingOrgId`). Verified in `phase6_2a` (`1.5`, `2.4`, `3.3`) and `phase6_2b` (`1.1`, `4.1`). |
| **4** | **Are malformed tenant IDs rejected safely without unhandled cast errors?** | **YES** | `auth.middleware.js` (line 51) and `tenant.middleware.js` (line 49) validate `mongoose.Types.ObjectId.isValid(orgId)` and return `400 Bad Request` before any Mongoose query executes. Global `error.middleware.js` (lines 14–18) also catches `CastError` and returns `400 Invalid resource identifier format`. |
| **5** | **Can a client override tenant context using `req.body.orgId`, `req.query.orgId`, or `req.params.orgId`?** | **NO** | Controllers derive `orgId` from `req.tenant.orgId` (populated by `tenant.middleware.js`). Where `:orgId` or `body.orgId` / `query.orgId` exists (`visitorPass.controller.js` line 89, `onboardingWizard.controller.js` line 7, `userPreference.controller.js` line 10, `wallet.controller.js` line 8, `reconciliation.controller.js` line 10), non-platform mismatches are rejected with `403 Forbidden` or ignored in favor of `req.tenant.orgId`. Verified in `phase6_2a` (`1.4`, `5.2`) and `phase6_2b` (`1.2`, `2.2`). |
| **6** | **Can an authenticated user access or mutate a resource in an organization where they have no active membership?** | **NO** | `auth.middleware.js` (`assertOrgHeaderAllowed`, lines 42–60) and `tenant.middleware.js` (lines 89–112) query `OrgMembership.findOne({ userId, orgId, status: 'Active' })`. Pending, Invited, Suspended, or non-existent memberships are rejected with `403 Forbidden`. Verified across `phase4b1`, `phase6_2a`, `phase6_2b`, and `authSpamEmailVerification.test.mjs`. |
| **7** | **Can a user in Organization A read, update, or delete a resource belonging to Organization B by ID (`:id`)?** | **NO** | Controllers pass `(id, req.tenant.orgId)` into services and repositories, which filter by `{ _id: id, orgId }` (or `{ _id: id, communityId: orgId }`) and verify resource ownership, returning `404 Not Found` or `403 Forbidden` with zero data mutation. Verified across `phase4b1`, `phase4b2`, `phase4b3`, `phase4c`, `phase6_2a` (`5.1`), and `phase6_4`. |
| **8** | **Are list, search, filter, count, and export endpoints scoped to the active tenant?** | **YES** | All list, search, count, dashboard KPI, and CSV/XLSX export endpoints (`villas/export`, `complaints/export`, `polls/:id/export/csv`, `invoices`, `notices`, `directory`, `visitor-pass/org/:orgId`, `reconciliation/*`) inject `req.tenant.orgId` at the repository aggregation/query level and sanitize/bound filter and pagination inputs (`limit <= 100`). Verified in `phase4c` (`B.1`–`B.3`), `phase6_2a` (`1.1`–`2.4`), and `phase6_2b` (`5.1`–`5.4`). |
| **9** | **Are create and bulk-operation endpoints forced to write under the validated tenant context?** | **YES** | Single creation endpoints (`createNotice`, `createPoll`, `createAmenity`, `createUnit`, `createPass`, `createComplaint`, `createRole`) and bulk endpoints (`villas/bulk-upload`, `villas/batch-generate`, `users/bulk-invite`, `onboarding/validate-import`, `onboarding/execute-import`) overwrite or bind `orgId` to `req.tenant.orgId`. Verified in `bulkInviteSecurity.api.test.mjs` and `phase6_2a` (`5.2`). |
| **10** | **Are platform-admin cross-tenant exceptions explicit, auditable, and restricted to authorized platform roles?** | **YES** | Cross-tenant platform routes use `tenantContext({ requirePlatformContext: true })`, which checks `Boolean(req.user.isPlatform)` (`tenant.middleware.js` lines 20, 28–30). `isPlatform` is minted in the JWT exclusively when the user authenticates into the platform organization (`org.isPlatform === true`) and cannot be spoofed by creating a tenant role named `"Super Admin"` (`RESERVED_PLATFORM_ROLE_NAMES` in `role.services.js`). |
| **11** | **Do error responses avoid leaking cross-tenant resource existence or sensitive data?** | **YES** | Repository queries scoped by `{ _id: id, orgId }` return `null` when a foreign tenant's `:id` is queried, causing services to return a generic `404 Not Found` (or generic `403 Forbidden`) without exposing any fields of the foreign document. Public visitor pass lookups (`GET /api/v1/visitor-pass/public/:token`) return an identical `404 Visitor pass not found or expired` for unknown, expired, revoked, malformed, or cross-tenant tokens. |

---

## 11. Security Enhancements: Before vs. After

| Security Control Area | Before Remediation | After Remediation (Verified State) |
| :--- | :--- | :--- |
| **Header-Based Org Switching (`X-Organization-Id`)** | Several routes without `tenantContext` read `req.headers['x-organization-id']` directly without checking `OrgMembership`. | `auth.middleware.js` (`assertOrgHeaderAllowed`) and `tenant.middleware.js` both verify `OrgMembership({ userId, orgId, status: 'Active' })` before any controller runs. |
| **Platform Admin Privilege Boundary** | Some controllers checked `req.user.role === 'Super Admin'`, which could be confused with a tenant-level admin role. | `req.user.isPlatform` is cryptographically bound to the platform organization (`org.isPlatform === true`), `RESERVED_PLATFORM_ROLE_NAMES` blocks tenant role spoofing, and platform routers enforce `tenantContext({ requirePlatformContext: true })`. |
| **Financial & Reconciliation Endpoints** | Reconciliation and wallet endpoints had paths where `orgId` could be omitted or supplied via untrusted query/body parameters. | `ReconciliationController.resolveTenantOrgId` and `WalletController.getValidatedWalletOrgId` enforce `req.tenant.orgId` for all non-platform callers and verify target user `OrgMembership`. |
| **Role Permission Inspection (`GET /roles/:id/permissions`)** | `RoleController.getRolePermissions` fetched permissions by `:id` without verifying that the role belonged to `req.tenant.orgId`. | `RoleController.getRolePermissions` and `RoleService.getRolePermissions` verify `existingRole.orgId === req.tenant.orgId` (`403 Forbidden` on cross-tenant role ID). |
| **Onboarding Wizard Bulk Import (`/onboarding/*`)** | `OnboardingWizardController` fell back to `req.body.organisationId || req.body.orgId` if `req.tenant?.orgId` was absent. | `resolveOnboardingOrgId(req)` rejects cross-tenant body `organisationId`/`orgId` overrides with `403 Forbidden` and binds imports strictly to `req.tenant.orgId`. |
| **Public Visitor Pass Lookup (`/visitor-pass/public/:token`)** | Looked up pass without resolving `orgId` from the token, risking `400` failure or raw ObjectId enumeration. | Resolves `{ passId, orgId }` strictly from revocable `VisitorPassToken`, validates token format & runtime expiration, rejects raw MongoDB IDs, and returns a strict bearer-safe field allowlist. |
| **Issue Report Evidence Attachments** | Uploaded issue report attachments were served via unauthenticated static `/uploads/issueReports/*` paths. | `backend/index.js` blocks `/uploads/issueReports/*` with `404`; attachments are served exclusively via authenticated, tenant-verified `GET /api/v1/issue-reports/:id/attachments/:filename`. |
| **Complaint Export & Unbounded Pagination** | `complaintRepository.findAll` spread raw query filters after `orgId`, and several list endpoints allowed unbounded `limit`. | `complaintController.exportComplaints` whitelists filter keys, `complaintRepository.findAll` locks `orgId`, and list controllers cap `limit <= 100`. |

---

## 12. Phase Status and Remaining Gaps

### 12.1 Phase 2 API/Controller Tenant-Isolation Checklist Status

| Checklist ID | Control Requirement | Status | Notes / Evidence |
| :--- | :--- | :---: | :--- |
| **SEC-01.1** | Authenticate every protected request and verify active + email-verified user status | **COMPLETED** | Enforced in `auth.middleware.js` (`isAuthenticated`, `optionalAuth`, `isUserEmailVerified`). |
| **SEC-01.2** | Validate tenant context per request (`X-Organization-Id` / JWT `orgId` -> active `OrgMembership`) | **COMPLETED** | Enforced in `auth.middleware.js` (`assertOrgHeaderAllowed`) and `tenant.middleware.js` (`tenantContext`). |
| **SEC-02.1** | Enforce API/Controller tenant isolation across all CRUD, action, list, search, export, and bulk routes | **COMPLETED** | Audited and verified across all 50+ feature routers and controllers; residual `role.controller.js` and `onboardingWizard.controller.js` gaps closed and tested. |
| **SEC-02.2** | Prevent BOLA / IDOR across cross-tenant `:id` lookups and child sub-resources | **COMPLETED** | Verified across invoices, wallets, reconciliation, visitor passes/logs, notices/comments/reactions, polls, amenities/bookings, complaints, roles, and villas. |
| **SEC-02.3** | Enforce strict platform-admin isolation (`requirePlatformContext: true`) | **COMPLETED** | Enforced across all platform commercial, subscription, provisioning, audit-log, and `/enquiries` routes. |
| **SEC-02.4** | Harden public / token-based endpoints against cross-tenant enumeration | **COMPLETED** | Hardened across `GET /api/v1/visitor-pass/public/:token` and `/api/v1/billing-links/:token`. |

### 12.2 Remaining Out-of-Scope / Architectural Items to Track
1. **Legacy `emailVerified` Backfill Script (Operational / Deployment Task):**
   - While `isUserEmailVerified(user)` in `user.model.js` safely handles legacy documents missing the `emailVerified` field (`emailVerified !== false`), running a one-time database migration script prior to production cutover to explicitly stamp `emailVerified: true` on verified historical accounts and tighten the schema check to `user.emailVerified === true` is recommended as an operational cutover step.
2. **Real-Time Socket.io Room Join & Event Emission Audit (Next Security Phase):**
   - While HTTP API/Controller endpoints are now fully isolated and verified, real-time WebSocket room subscriptions (`user:${userId}`, `org:${orgId}`, `role:${roleName}`) and socket handshake authentication should undergo a dedicated Phase 3 real-time tenant isolation audit.

---

## 13. Recommended Next Feature

### Recommended Next Phase: `SEC-03.1 — Real-Time WebSocket (Socket.io) & Event-Bus Tenant Isolation Audit`

- **Objective:** Verify and harden multi-tenant isolation across all Socket.io connection handshakes, room join/leave handlers (`src/config/socket.js`), feature-level `.events.js` listeners, and `.socket.js` dispatchers (`invoice.socket.js`, `notification.socket.js`, `villa.socket.js`, `payment.socket.js`, `wallet.socket.js`, `directoryMessage`, and gate scanner live feeds).
- **Scope:**
  1. Inspect `backend/src/config/socket.js` to ensure socket connection handshakes authenticate the JWT, verify `isUserEmailVerified(user)`, and validate `OrgMembership` (`status: 'Active'`) before permitting a client socket to join any `org:${orgId}` or `role:${roleName}` room.
  2. Audit all feature `.socket.js` dispatchers to confirm real-time broadcasts are scoped to `org:${orgId}` or `user:${userId}` and never broadcast tenant events globally (`io.emit`).
  3. Verify that workspace switching or session revocation immediately removes or disconnects sockets from unauthorized organization rooms.
- **Acceptance Criteria:**
  - A connected socket for a user in Organization A cannot subscribe to `org:${orgBId}` events by emitting a forged room-join payload.
  - All feature socket dispatchers include `orgId` in room routing and wrap emissions in safe `try/catch` blocks.
  - Automated Socket.io multi-tenant isolation tests pass with 0 cross-tenant event leaks.

---

## 14. Final Verdict

**PASS — PRODUCTION-READY FOR API/CONTROLLER TENANT ISOLATION (`SEC-02.1`).**

All protected API routes and controllers in the Nahom (`Manage-My-Gate`) backend enforce authenticated identity verification, active `OrgMembership` tenant context validation, strict `req.tenant.orgId` controller binding, and tenant-scoped service/repository execution. All confirmed API/controller tenant-isolation findings—including the residual `RoleController.getRolePermissions` and `OnboardingWizardController` gaps identified during this deep audit—have been remediated and verified by **227 passing automated tests (`0` failures)**.
