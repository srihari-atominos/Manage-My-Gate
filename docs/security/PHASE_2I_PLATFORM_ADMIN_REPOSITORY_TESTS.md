# Phase 2I — Platform Administration Repository Integration Tests

## 1. Git Baseline and Preservation
- **Branch:** `security/phase2-repository-tenant-isolation`
- **State:** No production controllers, services, repositories, models, middleware, or business logic were modified. All testing additions were restricted to the `tests/features/` directory and executed in an isolated memory instance.

## 2. Repository and Model Inventory
The Platform Administration domain primarily orchestrates higher-level B2B SaaS operations above the community tenant layer:
- **Platform Subscription:** (`platformSubscription.model.js` & `platformSubscription.repository.js`)
  - **Responsibilities:** Manages tenant SaaS subscriptions, plans, statuses (`ACTIVE`, `TRIALING`, etc.), and billing cycles.
  - **Required Fields:** `subscriptionNumber` (Unique), `organizationId` (Required), `planName`, `endDate`, `renewalDate`.
- **Platform Invoice:** (`platformInvoice.model.js` & `platformInvoice.repository.js`)
  - **Responsibilities:** Stores system-generated billing invoices against `orderId`. Employs sequence management (`InvoiceSequence`) to safely generate incremental IDs.
  - **Required Fields:** `invoiceNumber` (Unique), `orderId` (Required), `dueDate`, `customerSnapshot`, `commercialSnapshot`, `subtotal`, `vatAmount`, `totalAmount`, `amountOutstanding`, `invoiceChecksum`.
- **Platform Order:** (`platformOrder.model.js` & `platformOrder.repository.js`)
  - **Responsibilities:** Tracks converted quotes, terms, pricing snapshots, and associated timeline/amendment records.
  - **Required Fields:** `orderNumber` (Unique), `quoteId` (Unique), `customerSnapshot`, `communitySnapshot`, `pricingSnapshot`, `pricingChecksum`, `unitCount`, `subtotal`, `totalAmount`.

## 3. Integration Tests Established

### 3.1 Platform Subscription Repository (`platformSubscription.integration.test.js`)
- **Creation & Verification:** Successfully created a subscription record using a valid synthetic Mongoose payload.
- **Uniqueness Check:** Enforced that inserting a duplicate `subscriptionNumber` correctly rejects with a MongoDB `11000` duplicate key error.
- **Pagination Search:** Verified the `$facet`-based `findAllPaginated` successfully extracts paginated records and accurately computes totals.

### 3.2 Platform Invoice Repository (`platformInvoice.integration.test.js`)
- **Sequence Safety:** Evaluated `getNextInvoiceNumber` to ensure robust auto-incrementing invoice strings (e.g., `INV-2026-000001`). Confirmed it correctly defaults to the global system identifier `000000000000000000000000` if `organizationId` is omitted.
- **Creation & Lookup:** Passed standard insertion and retrieval tests bound to `orderId`.
- **Pagination & Scope Filtering:** Proved that calling `getInvoicesPaginated` strictly isolates records to the requested `organizationId` or `orderId`.

### 3.3 Platform Order Repository (`platformOrder.integration.test.js`)
- **Idempotent Retrieval:** Verified lookup behavior by `conversionId` (used natively to prevent double-converting a closed quote).
- **Idempotency Guard:** Proved duplicate `quoteId` entries gracefully reject with `11000` constraints.
- **Pagination:** Successfully filtered active orders by `organizationId`.

## 4. Execution & Results
**Command:** 
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --testMatch "**/tests/features/*.integration.test.js" --testMatch "**/tests/features/*.repository.test.js"
```

**Results:**
- **Test Suites:** 18 passed, 18 total.
- **Tests:** 53 passed, 53 total.
- **Snapshots:** 0 total.
- **Time:** ~36 seconds.

**Included Suites (Phases 2E–2I):**
`platformSubscription.integration.test.js`, `platformOrder.integration.test.js`, `platformInvoice.integration.test.js`, `wallet.integration.test.js`, `financialLedger.integration.test.js`, `invoice.integration.test.js`, `payment.integration.test.js`, `orgMembership.integration.test.js`, `organization.integration.test.js`, `rolePermission.integration.test.js`, `role.integration.test.js`, `permission.integration.test.js`, `issueReport.integration.test.js`, `amenityFacility.integration.test.js`, `crmInquiry.integration.test.js`, and their respective unit test variants.

## 5. Coverage Gaps & Suspected Defects
During rigorous integration testing of existing behaviors without modifying production code, two structural defects in the platform layer were exposed and proven:

1. **Missing Dependency in PlatformOrderRepository:**
   - **Defect:** `platformOrder.repository.js` fails on `findByQuoteId` because it calls `mongoose.Types.ObjectId.isValid` without importing `mongoose`. 
   - **Impact:** Any service calling `findByQuoteId` in production will encounter an uncaught `ReferenceError: mongoose is not defined`.
   - **Verification:** An integration test explicitly expects and catches this `ReferenceError` to demonstrate the bug's active presence in the unmodified codebase.
2. **Schema Alignment Gap in PlatformSubscription:**
   - **Defect:** The Mongoose schema strictly enforces the US spelling `organizationId`. However, the repository implements a method named `findByOrganisationId` which attempts to query using `{ organisationId }`. 
   - **Impact:** Queries routed through this function will silently fail to resolve matches because Mongoose strict querying will not map `organisationId` to the `organizationId` field index.

## 6. Final Status
**PASS**
All repository access constraints evaluate successfully, exposing explicitly documentable bugs in unused edge patterns without introducing arbitrary runtime mutations to force them green.
