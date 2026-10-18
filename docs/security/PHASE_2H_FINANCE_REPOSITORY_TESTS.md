# Phase 2H — Finance and Ledger Repository Integration Tests

## 1. Overview
In Phase 2H, we established isolated MongoDB integration test coverage for the Finance and Ledgering domain of the Nahom multi-tenant application. This layer encompasses billing (Invoices), revenue collection (Payments), double-entry accounting (Financial Ledger), and resident stored value (Wallets).

Tests were executed against a local, ephemeral `mongodb-memory-server` without modifying production application code.

## 2. Repositories Tested
- **Invoice Repository:** (`backend/src/features/invoice/invoice.repository.js`)
- **Payment Repository:** (`backend/src/features/payment/payment.repository.js`)
- **Financial Ledger Repository:** (`backend/src/features/ledger/financialLedger.repository.js`)
- **Wallet Repository:** (`backend/src/features/wallet/wallet.repository.js`)

## 3. Test Suites Created

### 3.1 Invoice Repository (`invoice.integration.test.js`)
- **Behaviors Verified:**
  - `createBatch`: Successfully inserts multiple synthetic invoice records.
  - **Unique Constraints (Duplicate Billing Spam):** Ensured the repository gracefully intercepts `11000` duplicate key errors on the composite index `[assessmentId, targetUserId, billingPeriodString]` and throws an HTTP 409 `HttpError`.
  - `getInvoices` (Pagination & Scoping): Verified that pagination filters effectively scope results strictly to the queried `orgId` boundaries.

### 3.2 Payment Repository (`payment.integration.test.js`)
- **Behaviors Verified:**
  - `createPayment`: Secures insertion of success/pending payments with mandatory `referenceId` mapping.
  - `findByGatewayTransactionId`: Retrieves distinct payment intents correctly.
  - `getPaymentStats`: Validated the `$facet` aggregations strictly compute today's revenue, success, and pending counts only for the requesting tenant (`orgId`), completely ignoring transactions belonging to cross-tenant organizations.

### 3.3 Financial Ledger Repository (`financialLedger.integration.test.js`)
- **Behaviors Verified:**
  - **Idempotency & Concurrency:** Verified that `createEntry` respects the `idempotencyKey` unique index. Reusing an idempotency key triggers the atomic fallback `11000` logic, gracefully returning `alreadyExists: true` with the original entry rather than crashing.
  - **Double-Entry Invariants:** Conformed to the `domain: 'INVOICE'` requirements, creating symmetric debit (`CASH_CLEARING`) and credit (`INVOICE_RECEIVABLE`) lines.
  - `getAccountBalances`: Verified trial balance computations correctly sum debits and credits per account for a specific `orgId`.

### 3.4 Wallet Repository (`wallet.integration.test.js`)
- **Behaviors Verified:**
  - `updateBalance` (Atomic Guard): Verified that conditional `$gte` assertions successfully prevent wallet overdrafts (HTTP 400 thrown when attempting to debit beyond the `balance`).
  - `atomicCredit` / `atomicDebit`: Tested the atomic increments properly scope to user and organization constraints.
  - `debitBalanceIfSufficient`: Confirmed it correctly aborts and returns `null` instead of throwing an error when funds are insufficient (preventing concurrent overdraft race conditions).
  - `createTransaction`: Verified WalletTransaction links back properly to the tenant's `orgId`.

## 4. Observations & Constraints
- **Wallet Fallback Behavior:** The Wallet repository contains a fallback mechanism to default to a global "Active" organization if `orgId` is omitted. While tested through injection, it indicates potential leakage risks if routing omits the org ID.
- **FinancialLedger Schema Rigidity:** The ledger strictly enforces `FINANCIAL_DOMAINS` enum limits (`INVOICE`, `AMENITY`, etc.) and block deletions/updates (Invariants 1, 2, and 5) directly inside Mongoose middleware.
- **Mongoose `new` vs `returnDocument`:** A warning in `wallet.repository.js` noted that `findOneAndUpdate` passes the deprecated `new: true` option in some locations instead of `returnDocument: 'after'`.

## 5. Summary
**13/13 tests passing.** The Finance and Ledgering layer successfully maintains strict multi-tenant boundaries (`orgId`), leverages optimistic concurrency guards for idempotency, and utilizes atomic queries to prevent race conditions during balance deduction.
