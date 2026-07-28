# Manage My Gate: B2B SaaS Lifecycle Architecture & Implementation Guide
## CRM, Quote-to-Cash, Subscription, Asynchronous Provisioning & Self-Service Onboarding

---

## 1. Executive Summary & Complete Customer Lifecycle

This specification defines the end-to-end B2B SaaS architecture for **Manage My Gate**. It aligns the initial B2B CRM & Billing design (`platfromBilling-des.md`) with the **B2B SaaS Lifecycle Architecture Specification** (`Manage My Gate B2B SaaS Lifecycle Architecture Specification.pdf`).

The platform transforms from simple isolated modules into a fault-tolerant, scalable, event-driven Quote-to-Cash and automated delivery engine.

### End-to-End Commercial & Operational Journey

```
[Customer Inquiry] ────────► [Lead Qualification] ────────► [Deal / Opportunity]
                                                                    │
                                                                    ▼
[Quote Approval] ◄────────── [Custom Quote Builder] ◄────── [Communication & Demo]
       │
       ▼
[Quote Acceptance] ────────► [Platform Order Created] ─────► [Invoice Issued]
                                                                    │
                                                                    ▼
[Entitlements Created] ◄──── [Subscription Created] ◄───── [Idempotent Payment]
       │
       ▼
[Provisioning Job Created] (Async) ──► [Asynchronous Provisioning Worker]
                                                  │
                                                  ▼
                                       - Provision Organisation
                                       - Provision Workspace
                                       - Activate Feature Entitlements
                                       - Create Initial Community Admin
                                                  │
                                                  ▼
[ACTIVE CUSTOMER] ◄───────── [Data Migration Import] ◄──── [Self-Service Onboarding]
```

---

## 2. Gap Analysis: Current vs. Target Architecture

Before implementing any changes, the table below highlights existing capabilities, required additions, and architectural modifications:

| Domain Area | Existing Codebase State | Target Requirement | Recommended Action |
|---|---|---|---|
| **CRM & Inquiries** | Basic `crmInquiry` schema | Full Lead/Deal lifecycle tracking & 2-column view | **Modify / Extend** `crmInquiry` |
| **Communication & Demos** | Partial logging | Unified thread + Google Meet calendar integration | **Build** `crmThread` & `crmMeeting` |
| **Action Center & Tasks** | Basic tasks | Central task grid with Mongoose `$facet` pagination | **Build** `crmTask` |
| **Pricing Engine** | Basic base price | Multi-tiered base + per-unit + add-ons + setup fees + tax | **Enhance** `masterPricing` |
| **Quote Builder** | Basic quote model | Pricing snapshot, configurable discount approval rules | **Modify** `platformQuote` |
| **Platform Order** | Missing | Commercial agreement source of truth (`platformOrder`) | **ADD NEW MODULE** `platformOrder` |
| **Platform Invoice** | Single combined model | Financial documentation only (Arabic RTL PDF tax invoice) | **Refactor** `platformInvoice` |
| **Payment Transaction** | Stored inside invoice | Dedicated `platformPayment` entity + Webhook Idempotency | **ADD NEW MODULE** `platformPayment` |
| **Subscription Lifecycle**| Missing / Implicit | Commercial subscription (`TRIAL`, `ACTIVE`, `GRACE_PERIOD`) | **ADD NEW MODULE** `platformSubscription` |
| **Feature Entitlements** | Hardcoded in workspace | Logical entitlement layer (`Org -> Sub -> Entitlements`) | **ADD NEW MODULE** `platformEntitlement` |
| **Provisioning Worker** | Synchronous webhook flow | Asynchronous retryable `platformProvisioningJob` state machine | **ADD NEW MODULE** `platformProvisioningJob` |
| **Customer Onboarding** | Simple setup wizard | Self-service Excel/CSV validation, preview & error report | **Extend** `onboardingWizard` |
| **Customer/Deal UI** | Fragmented views | Unified Customer/Deal Workspace with visual lifecycle stepper | **Build Unified UI Container** |

---

## 3. High-Level System Architecture & Component Mapping

```
+-------------------------------------------------------------------------------------------------------+
|                                    FRONTEND LAYER (React / SCSS)                                     |
|                                                                                                       |
|  +-------------------------------------------------------------------------------------------------+  |
|  |                              [Unified Customer / Deal Workspace]                                 |  |
|  |  [Visual Lifecycle Stepper: Inquiry -> Demo -> Quote -> Order -> Payment -> Provision -> Active]  |  |
|  +-------------------------------------------------------------------------------------------------+  |
|         │                        │                     │                      │                       |
|  [CrmInquiryView]       [CommunicationHubView]  [ActionCenterView]   [PlatformBillingView]            |
|  [QuoteBuilderModal]    [OrderDetailsView]      [InvoiceLedgerView]  [OnboardingWizardView]           |
|         │                        │                     │                      │                       |
|   useCrmInquiry            useCrmThread          useActionCenter        usePlatformBilling            |
+---------│------------------------│---------------------│----------------------│-----------------------+
          │                        │                     │                      │
          +------------------------+----------+----------+----------------------+
                                              │
                                    (Axios + X-Request-ID)
                                              │
+---------------------------------------------v---------------------------------------------------------+
|                                    BACKEND LAYER (Node.js / Express)                                  |
|                                                                                                       |
|  [crmInquiry]  [crmThread]  [crmMeeting]  [crmTask]  [masterPricing]  [platformQuote]  [platformOrder]   |
|  [platformInvoice]  [platformPayment]  [platformSubscription]  [platformEntitlement]                  |
|  [platformProvisioningJob]  [auditLog]                                                                |
|                                                                                                       |
|  Flow: Router ────► Validator ────► Controller ────► Service ────► Repository ────► Database          |
+---------------------------------------------┬---------------------------------------------------------+
                                              │
                                   [Internal Event Bus]
                                      (*.events.js)
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
          [Socket Dispatchers]                            [Asynchronous Background Workers]
            (*.socket.js)                                 - Provisioning Job Worker
           - Room-based streaming                         - Webhook Idempotency Handler
           - getIO() Singleton                            - PDF Tax Invoice Generator
                                                          - Email Delivery Service
```

---

## 4. Key Architectural Enhancements

### 4.1. Commercial Lifecycle Separation (Quote -> Order -> Invoice -> Payment)
To avoid direct, rigid coupling between payment webhooks and provisioning, the commercial lifecycle is decoupled into explicit business entities:

1. **`platformQuote` (Offer):** Represents the proposed pricing offer, including base plan, unit counts, add-on features, discounts, and expiration dates. Stores a **complete pricing snapshot** so future master pricing updates never alter existing offers.
2. **`platformOrder` (Agreed Commercial Package):** Created upon quote acceptance. Represents the legal agreement between Manage My Gate and the customer. Serves as the primary reference for subscription creation and provisioning jobs.
   - **Lifecycle States:** `DRAFT` -> `PENDING_ACCEPTANCE` -> `ACCEPTED` -> `PAYMENT_PENDING` -> `PAID` -> `PROVISIONING` -> `ACTIVE`.
   - **Exception States:** `CANCELLED`, `EXPIRED`, `PAYMENT_FAILED`, `PROVISIONING_FAILED`.
3. **`platformInvoice` (Financial Document):** Generated from an order for billing/accounting compliance. Contains tax breakdown, currency, billing address, and Arabic RTL rendering parameters.
4. **`platformPayment` (Transaction Record):** Stores payment gateway execution details (`gatewayTransactionId`, `gatewayEventId`, payment method, timestamp, raw gateway payload, failure reason, refund status).

---

### 4.2. Payment Webhook Idempotency Architecture

Payment webhooks must safely handle duplicate gateway deliveries without duplicating transactions, orders, invoices, or provisioning jobs.

#### Webhook Handler Execution Flow:

```
[Gateway Webhook] ────► 1. Verify Webhook Signature
                                  │
                                  ▼
                        2. Extract Gateway Event ID & Transaction ID
                                  │
                                  ▼
                        3. Check Database Idempotency Index
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
             [Already Processed?]          [New Event]
                   │                             │
                   ▼                             ▼
        Return 200 OK Immediately     4. Create/Update platformPayment Record
        (Skip downstream logic)       5. Update platformInvoice status -> PAID
                                      6. Update platformOrder status -> PAID
                                      7. Create platformSubscription & Entitlements
                                      8. Enqueue platformProvisioningJob (PENDING)
                                      9. Return 200 OK to Gateway
```

#### Unique Database Indexes Enforced:
* `platformPayment`: Unique index on `gatewayEventId` and `gatewayTransactionId`.
* `platformInvoice`: Unique index on `invoiceNumber`.
* `platformOrder`: Unique index on `orderNumber`.
* `platformQuote`: Unique index on `quoteNumber`.

---

### 4.3. Asynchronous Provisioning Job Architecture & State Machine

Full workspace provisioning is **asynchronous** and **decoupled** from the HTTP payment webhook response.

#### Provisioning Job Model (`platformProvisioningJob`):
```javascript
const platformProvisioningJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOrder', required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformPayment', required: true },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  requestedFeatures: [{ type: String, required: true }],
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY_PENDING', 'MANUAL_REVIEW'],
    default: 'PENDING'
  },
  currentStep: {
    type: String,
    enum: ['INIT', 'CREATE_ORG', 'CREATE_WORKSPACE', 'ACTIVATE_ENTITLEMENTS', 'CREATE_ADMIN', 'GENERATE_TEMPLATES', 'FINISHED']
  },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastError: { type: String },
  errorDetails: { type: Object },
  startedAt: { type: Date },
  completedAt: { type: Date },
  nextRetryAt: { type: Date }
}, { timestamps: true });
```

#### Provisioning Worker Lifecycle & State Machine:

```
                  [Job Enqueued: PENDING]
                             │
                             ▼
                  [Status: IN_PROGRESS]
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     (Step Execution)                (Step Failure Occurs)
            │                                 │
   - Provision Organisation                   ▼
   - Provision Workspace              [Retry Count < Max?]
   - Activate Entitlements                    │
   - Create Community Admin       ┌───────────┴───────────┐
   - Generate CSV Templates       │                       │
            │                   (YES)                    (NO)
            ▼                     │                       │
   [Status: COMPLETED]    [RETRY_PENDING]          [MANUAL_REVIEW]
                                  │                       │
                                  └─► Auto Retry Worker   └─► Alert Admin Dashboard
```

---

### 4.4. Logical Feature Entitlements Layer

Features are no longer hardcoded directly inside workspace documents. Access is controlled via a logical entitlement model:

$$\text{Organisation} \longrightarrow \text{Subscription} \longrightarrow \text{Feature Entitlements}$$

#### Model Schema (`platformEntitlement`):
```javascript
const platformEntitlementSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformSubscription', required: true },
  featureKey: {
    type: String,
    enum: ['VISITOR_MANAGEMENT', 'BILLING_COLLECTION', 'AMENITY_BOOKING', 'COMPLIANCE', 'NOTICE_BOARD', 'GUARD_PATROL'],
    required: true
  },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'ACTIVE' },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date },
  quantity: { type: Number, default: 1 }, // e.g. Max unit/gate count
  sourceOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOrder' }
}, { timestamps: true });
```

#### Access Evaluation Hook:
```javascript
// Check entitlement before authorizing feature routing:
const hasAccess = await entitlementService.verifyEntitlement(organisationId, 'VISITOR_MANAGEMENT');
if (!hasAccess) {
  throw new ForbiddenError('Organization does not possess an active VISITOR_MANAGEMENT entitlement');
}
```

---

### 4.5. Transaction Boundaries vs. External Side Effects

The architecture enforces strict separation between database transactional boundaries and asynchronous external side effects:

#### 1. Transactional Database Boundary (Mongoose `ClientSession`)
Must succeed or roll back atomically in MongoDB:
* Create `Organization` document.
* Create `Workspace` document.
* Create Initial `User` (Community Admin account).
* Activate `PlatformEntitlement` records.
* Update `PlatformProvisioningJob` status.

#### 2. Asynchronous External Side Effects (Event-Driven Workers)
Executed outside the MongoDB transaction context with independent retry logic:
* **PDF Tax Invoice Generation:** Puppeteer HTML-to-PDF rendering.
* **S3 Bucket Upload:** Storing generated PDF invoices and migration sheets.
* **Email Notifications:** Sending welcome credentials & tax invoice copies.
* **Socket.IO Delivery:** Emitting real-time updates to client UI.
* **Google Meet API Calls:** Generating demo scheduling links.

---

### 4.6. Configurable Pricing & Quote Approval Engine

The pricing engine in `masterPricing` and `platformQuote` supports multi-dimensional SaaS pricing:

$$\text{Final Price} = \left( \text{Base Plan} + (\text{Units} \times \text{Per-Unit Rate}) + \sum \text{Add-ons} + \text{Setup Fees} - \text{Discount} \right) + \text{Tax}$$

#### Approval Workflow Rules:
* **Sales Agent:** Can build quotes and edit drafts. If discount applied exceeds the **configurable threshold** (stored in `masterPricing.maxAgentDiscountPercent`, default `10%`), the quote status updates to `PENDING_APPROVAL`.
* **Sales Manager / Admin:** Receives an automatically generated `APPROVE_QUOTE` task in `crmTask`. Manager can approve or reject with audit comments.
* **Audit Trail (`auditLog`):** Logs quote price edits, original vs. new amounts, discount percentage, authorizer ID, and timestamp.

---

### 4.7. Unified Customer / Deal Workspace (Frontend)

To reduce UI complexity for sales and support agents, the frontend provides a unified **Customer / Deal Workspace** container rather than requiring navigation across separate apps.

#### Visual Lifecycle Header Stepper Component:
```
+---------------------------------------------------------------------------------------------------------+
| Customer: Al-Reem Community | Lead ID: CR-9042 | Agent: Tariq Mansoor                                   |
+---------------------------------------------------------------------------------------------------------+
| [✓ Inquiry] ──► [✓ Demo] ──► [✓ Quote] ──► [✓ Approval] ──► [● Payment] ──► [○ Provision] ──► [○ Active] |
+---------------------------------------------------------------------------------------------------------+
| Tabs: [Overview] [Communication] [Meetings] [Tasks] [Quotes] [Orders] [Invoices] [Provisioning]         |
+---------------------------------------------------------------------------------------------------------+
```

---

### 4.8. Self-Service Onboarding & Data Import Engine

Replaces passive static file templates with an interactive data import wizard inside `onboardingWizard`:

```
[Download Template] ──► [Fill CSV/Excel] ──► [Upload File]
                                                    │
                                                    ▼
                                           [Server Validation]
                                                    │
                                  ┌─────────────────┴─────────────────┐
                                  │                                   │
                         (Validation Errors)                  (Validation Valid)
                                  │                                   │
                                  ▼                                   ▼
                      [Show Error Summary Table]              [Show Data Preview]
                      - Valid: 980 | Invalid: 20                      │
                      - Download Error Log CSV                        ▼
                      - Re-upload Fixed Rows                  [Confirm Import]
                                                                      │
                                                                      ▼
                                                          [Transactional Import]
```

* **Validation Rules:** Validates duplicate unit numbers, invalid phone formats, and missing owner names.
* **Non-Partial Clean Imports:** Prevents partial, corrupted imports of invalid rows.

---

## 5. Security, Observability & Correlation ID Tracing

### 5.1. Request Correlation Tracing (`X-Request-ID`)
Every HTTP request, background job, and event log carries a standardized correlation payload:
```json
{
  "requestId": "REQ-89420-1049",
  "correlationId": "CORR-ORG-5021",
  "inquiryId": "INQ-6021",
  "orderId": "ORD-10029",
  "paymentId": "PAY-90412",
  "provisioningJobId": "PROV-3019",
  "timestamp": "2026-07-28T10:12:05Z"
}
```

### 5.2. Audit Trail Requirements (`auditLog`)
The system records immutable audit log entries for critical actions:
* Quote price & discount modifications.
* Managerial quote approvals & rejections.
* Order acceptance & cancellations.
* Payment webhook executions & refund events.
* Subscription status changes (Activation, Grace Period, Suspension).
* Manual provisioning job retries.
* Customer data migration imports.

---

## 6. Implementation Phased Roadmap

### Phase 1: Core Commercial Entities & Pricing Engine (Sprint 1)
1. Build `masterPricing` backend module with tier pricing and configurable discount rules.
2. Build `platformQuote` with pricing snapshot preservation.
3. Build `platformOrder` backend feature module.

### Phase 2: CRM, Communication Hub & Action Center (Sprint 2)
1. Build `crmInquiry`, `crmThread`, and `crmMeeting` features.
2. Integrate Google Calendar API for demo links.
3. Build `crmTask` (Action Center) with Mongoose `$facet` pagination.
4. Build Unified Customer / Deal Workspace UI with visual lifecycle stepper.

### Phase 3: Payment Transactions, Invoicing & Webhook Idempotency (Sprint 3)
1. Refactor `platformInvoice` for Arabic RTL PDF tax invoice rendering.
2. Build `platformPayment` backend module with database unique indexes.
3. Build payment webhook route with signature verification and event idempotency check.

### Phase 4: Subscriptions, Entitlements & Asynchronous Provisioning (Sprint 4)
1. Build `platformSubscription` and `platformEntitlement` features.
2. Build `platformProvisioningJob` state machine and background worker process.
3. Enforce Mongoose `ClientSession` transactions for atomic DB setup.

### Phase 5: Self-Service Data Migration & Onboarding (Sprint 5)
1. Build CSV/Excel parser and validation engine in `onboardingWizard`.
2. Build interactive upload preview, error reporting, and retry UI.
3. Execute end-to-end integration and failure recovery test suites.

---

## 7. Verification & Final Acceptance Criteria

The final implementation must satisfy all of the following empirical verification benchmarks:

- [ ] **Commercial Separation:** `Quote`, `Order`, `Invoice`, and `Payment` exist as distinct, decoupled modules.
- [ ] **Idempotent Webhooks:** Sending duplicate payment webhook payloads returns `200 OK` without creating duplicate payments, invoices, orders, or provisioning jobs.
- [ ] **Asynchronous Provisioning:** Webhook responses finish in under 300ms by enqueuing a `platformProvisioningJob` for background worker execution.
- [ ] **Failure Recovery:** If workspace provisioning fails midway (e.g. database timeout during admin creation), the job marks as `RETRY_PENDING` and recovers cleanly without leaving orphaned records.
- [ ] **Logical Entitlements:** Feature access (`VISITOR_MANAGEMENT`, `BILLING`) is evaluated through `platformEntitlement` instead of hardcoded workspace flags.
- [ ] **Data Migration Safety:** Uploading 1,000 community records with 20 invalid rows displays an error summary, lets the user download an error CSV, and blocks partial corrupted imports.
- [ ] **Correlation Observability:** All logs for an inquiry through provisioning share the same `correlationId` across stdout traces.
