# Billing & Invoice Engine Architecture Reference

This is the definitive technical documentation for the Billing & Invoice Module, updated for the Final Enterprise Implementation. 
Future developers MUST read this document before introducing modifications to the billing flows.

## 1. Module Responsibilities
Our architecture strictly adheres to the **One Model, One Feature** boundary:
- **`invoice`**: Manages the core invoice lifecycle, due dates, snapshots, and immutable financial status (`UNPAID`, `PAID`, `OVERDUE`).
- **`payment`**: The definitive record of incoming cash flows. Reconciles directly with Payment Gateways.
- **`adjustment`**: Manages non-cash accounting entries (`CreditNote`, `WriteOff`, `Waiver`). Separating this from `payment` maintains clean accounting ledgers.
- **`ledger`**: An append-only Resident Statement timeline generated via Pub/Sub events. Avoids expensive MongoDB `$facet` aggregations.
- **`eventStore`**: The immutable Event Sourcing log capturing every financial domain event (e.g. `INVOICE_GENERATED`) for replayability and audit tracing.
- **`invoiceSequence`**: Manages atomic sequence generation (`ORG-2026-0001`) preventing race conditions via `$inc`.
- **`financialEngine`**: Pure logic layer performing Outstanding math, carry forwards, and allocations without direct DB mutations.

---

## 2. Event Store & Event Flow Architecture
We utilize an **Event-Driven Architecture** combined with **Event Sourcing**.
When a mutation occurs, the service does NOT update the Resident Ledger directly. Instead:

1. `invoice.service.js` saves the `Invoice` document.
2. `invoice.service.js` emits an `INVOICE_GENERATED` event via native `EventEmitter`.
3. `eventStore.listener.js` intercepts this event and appends it to the `EventStore` collection.
4. `ledger.listener.js` intercepts this event and appends a row to the `Ledger` collection.
5. `notification.listener.js` reads the Organization configs and dispatches WhatsApp/Email via background workers.

*All events must conform to the Versioned Payload Standard (`eventName`, `version`, `correlationId`, `payload`).*

---

## 3. Worker Architecture & Retry Strategy (BullMQ / Agenda)
Scheduled jobs (e.g., Billing generation, Late Fee sweeps) run via background workers.

### Resilience & Idempotency
- **Distributed Locking (Redlock):** Ensures chron jobs (like the 1st-of-month billing sweep) execute exactly once across a multi-server Node.js cluster.
- **Idempotency Keys:** Every document (`Invoice`, `Payment`, `Adjustment`, `EventStore`) contains an `idempotencyKey`. If a worker crashes and retries, duplicate creations are blocked via a unique MongoDB index.
- **Graceful Degradation:** If Twilio (WhatsApp) or AWS SES (Email) are down, the main financial pipeline succeeds. The notification dispatch worker will retry with exponential backoff until the DLQ (Dead Letter Queue) is reached.

---

## 4. Reconciliation Flow
A scheduled worker (`reconciliation.worker.js`) executes daily to audit the system:
1. Scans all Invoices with status `PAID` or `VERIFICATION_PENDING`.
2. Computes: `Paid Amount = SUM(payment model) + SUM(adjustment model)`.
3. Validates against the `Invoice.paidAmount`.
4. Optionally pings Razorpay/Stripe (via `payment.provider.js`) for discrepancy validation.
5. Any mismatch emits a `RECONCILIATION_FAILED` alert.

---

## 5. Deployment Architecture & Disaster Recovery
- **Multi-Tenant Isolation:** Every query MUST enforce an `{ orgId }` boundary.
- **Horizontal Scaling:** API instances and Worker instances scale independently. 
- **Archival:** Active events remain in `EventStore`. Events older than the configured retention policy are migrated to an `ArchivedEventStore` collection to keep active indexes lightweight.
- **Disaster Recovery:** Daily automated MongoDB dumps (stored redundantly in S3) combined with the append-only Event Store guarantee that the financial timeline can be completely replayed and reconstructed if data corruption occurs.
