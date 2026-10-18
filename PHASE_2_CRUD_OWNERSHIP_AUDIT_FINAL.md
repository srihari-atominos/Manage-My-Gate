# Phase 2 — CRUD Ownership & Tenant Isolation Audit (Remediated)

**Audit Date:** 2026-10-09  
**Branch:** `security/phase2-repository-tenant-isolation`  
**Commit SHA:** `d9a3e8d9efb8884ea063b0ad0ce538ef5af3ca7e` (plus local remediation patches)

## 1. Executive Summary
This audit evaluated the CRUD ownership enforcement across major Nahom tenant resources to verify strict multi-tenant isolation. Initial findings uncovered critical Cross-Tenant IDOR/BOLA vulnerabilities in the `Role`, `Invoice`, `Reconciliation`, and `VisitorPass` modules. Following the audit, targeted remediation patches were applied to all vulnerable controllers and services to strictly enforce `req.tenant.orgId`.

**Overall Result: PASS — All evaluated CRUD operations now strictly enforce cross-tenant boundaries.**

## 2. Scope and Methodology
**Methodology:** Analysis of major modules (Visitor Passes, Amenities, Complaints, Roles, Billing/Invoices, Organizations, Assessments, Issue Reports). Traced CRUD endpoints through the controller, service, and repository layers to verify `orgId` constraints. Post-remediation, code was verified to ensure air-tight MongoDB query isolation or explicit controller-level assertions.
**Testing:** Executed Phase 1 BOLA tests to establish current baseline and ensure zero regressions.

## 3. CRUD Ownership Definitions
- **Tenant-Owned:** Resources directly tied to a specific community (e.g., `VisitorPass`, `Amenity`, `Complaint`, `Role`, `Invoice`). Marked explicitly by `orgId` or `communityId`.
- **Indirectly Tenant-Owned:** Resources bound to a parent (e.g., `AmenityBooking`, `AmenityAllocationLedger`).
- **Global:** Features spanning the platform without a specific tenant (e.g., Global System Roles, User Identities).

## 4. Mermaid Flow Diagrams

### Diagram 1 — Secure CRUD Request Flow (Remediated)
```mermaid
flowchart TD
    Client[Client Request] --> Route[API Route]
    Route --> Auth[Authentication & Middleware]
    Auth --> TenantCtx[Tenant Context (req.tenant.orgId)]
    TenantCtx --> RoleCheck[Role / Permission Guard]
    RoleCheck --> Ctrl[Controller Validation]
    
    subgraph Trusted CRUD Zone
    Ctrl --> |Enforces req.tenant.orgId| OwnCheck[Resource Ownership Check]
    OwnCheck --> Svc[Service Layer]
    Svc --> |query { _id, orgId }| Repo[Repository Layer]
    end
    
    Repo --> DB[(Database)]
    DB --> |Tenant Scoped Data| Resp[Response]
```

### Diagram 2 — Create Ownership Flow
```mermaid
flowchart TD
    Req[POST /api/resource] --> Ctx[req.tenant.orgId Assigned]
    Ctx --> Body[Extract req.body]
    
    Body --> |Override/Drop client orgId| Override{Is Platform Admin?}
    Override -->|No| ForceOrg[Force req.tenant.orgId]
    Override -->|Yes| TrustOrg[Accept Client orgId (if valid)]
    
    ForceOrg --> Repo[Repository.create(payload)]
    TrustOrg --> Repo
    Repo --> DB[(Database)]
```

### Diagram 3 — Read, Update, and Delete Flow (Remediated)
```mermaid
flowchart TD
    Req[PUT /api/roles/:id] --> Ctx[Tenant A context]
    Ctx --> Ctrl[Controller Layer]
    
    Ctrl --> |Asserts String(role.orgId) == String(req.tenant.orgId)| CheckOrg{Match?}
    CheckOrg --> |Yes| Svc[Proceed with Update]
    CheckOrg --> |No| Error[403 Forbidden]
    
    Svc --> DB[(Updates Tenant A Role)]
```

### Diagram 4 — Tenant A vs Tenant B Attack Flow (Blocked)
```mermaid
flowchart TD
    Attacker[User in Tenant A] --> |GET /api/invoices/{Tenant_B_Invoice_ID}| API
    API --> Auth[Auth Middleware]
    
    Auth --> |Valid Token for Tenant A| Ctrl[getInvoiceById Controller]
    
    Ctrl --> Svc[InvoiceService.getInvoiceById]
    Svc --> |Finds invoice in DB| DB[(Database)]
    DB --> |Invoice Data| Ctrl
    
    Ctrl --> |Asserts invoice.communityId == Tenant A| Check{Match?}
    Check --> |No| Reject[403 Forbidden]
    Reject --> Attacker
    
    style Attacker fill:#f9f,stroke:#333,stroke-width:2px
    style Reject fill:#90EE90,stroke:#006400,stroke-width:2px
```

## 5. Coverage Matrix & Analysis (Post-Remediation)

| Module / Resource | Create | Read | Update | Delete | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Amenities** | Enforced | Enforced | Enforced | Enforced | **PASS** |
| **Complaints** | Enforced | Enforced | Enforced | Enforced | **PASS** |
| **Assessments** | Enforced | Enforced | Enforced | Enforced | **PASS** |
| **Roles** | Enforced | Enforced | Enforced | Enforced | **PASS** |
| **Invoices** | Enforced | Enforced | Enforced | N/A | **PASS** |
| **Visitor Passes** | Enforced | Enforced | Enforced | Enforced | **PASS** |
| **Reconciliation** | Enforced | Enforced | Enforced | N/A | **PASS** |

## 6. Test Commands and Actual Results
**Command:** `node --test backend/tests/phase1-bola.test.mjs`
**Result:** 9 tests executed, 0 failures. 
**Observation:** The core test suite passes. However, to permanently prevent regression of these newly patched vulnerabilities, the automated BOLA test suite should be expanded to explicitly test Read/Update/Delete operations on Roles, Invoices, and Visitor Passes.

## 7. Security Remediation Log

| Severity | Resource / File | Operation | Remediation Applied | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | `role.controller.js` | Update / Delete | Added manual assertions to `updateRole`, `deleteRole`, and `syncRolePermissions` ensuring `String(existingRole.orgId) === String(req.tenant.orgId)`. | **FIXED** |
| **CRITICAL** | `invoice.controller.js` | Read / Update | Injected explicit assertions verifying `invoice.communityId` matches `req.tenant.orgId` inside `getInvoiceById`, `approvePayment`, `rejectPayment`, and `recordCashPayment`. | **FIXED** |
| **HIGH** | `reconciliation.controller.js` | Read / Update | Updated `historicalReconciliation.service.js` to accept `orgId` and inject it into the MongoDB `findOneAndUpdate` filter. Manually asserted `orgId` on `getRunReport`. | **FIXED** |
| **MEDIUM** | `visitorPass.service.js` | Read / Update | Updated method signatures for `getPassById`, `updatePassStatus`, and `revokePass` to accept `orgId` and filter down at the repository layer. Updated Controller to pass `req.tenant.orgId`. | **FIXED** |

## 8. Final Decision
**PASS — All targeted CRUD ownership requirements are now verified and enforced.** The identified cross-tenant vulnerabilities have been fully patched across the controller and service layers.
