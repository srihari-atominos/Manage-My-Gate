# Phase 3B — Wallet Tenant-Isolation Remediation and Regression Tests

## 1. Objective and Git Baseline
This phase targeted the tenant-isolation risk discovered in `backend/src/features/wallet/wallet.service.js`, specifically the `WalletService.addMoney()` method and associated fallbacks. The goal was to remove arbitrary cross-tenant wallet creation and firmly scope wallet adjustments to the trusted session context.
- **Branch:** `security/phase2-repository-tenant-isolation`
- **State:** Code was directly patched and tested in isolation without polluting the repository status or committing prematurely.

## 2. Root Cause Analysis
During trace analysis, severe context leakage was confirmed:
1. **Controller Vulnerability (`wallet.controller.js`):** The `orgId` resolution hierarchy checked untrusted sources (`req.headers`, `req.body.orgId`) *before* the trusted middleware context (`req.tenant.orgId`), allowing a standard user to spoof their target community.
2. **Service Fallback Vulnerability (`wallet.service.js`):** If `addMoney()` was invoked without an `orgId`, the service ran `Organization.findOne({ status: 'Active' })` and deliberately assigned the wallet credit to the **very first active community** in the entire multi-tenant database.
3. **Repository Deep-Fallback Vulnerability (`wallet.repository.js`):** `getWallet()`, `updateBalance()`, and `createTransaction()` duplicated this destructive fallback. Furthermore, `getWallet()` included a sub-routine that arbitrarily queried `OrgMembership` for *any* active membership belonging to a user, implicitly crossing tenant boundaries for users in multiple communities.

## 3. Remediation Details
- **`wallet.controller.js`**: Rewrote the context derivation to strictly prioritize `req.tenant?.orgId` over user-supplied payload inputs.
- **`wallet.service.js`**: Nuked the `Organization.findOne()` fallback in `addMoney`. If `targetOrgId` cannot be determined by the provided arguments or existing wallet context, the service now strictly throws an `HttpError(400, 'Valid Organization ID is required...')`.
- **`wallet.repository.js`**: Eliminated all default-organization queries. Removed the `OrgMembership` context-guessing logic. Implemented a hard guard requiring a valid `targetOrgId` to proceed with any wallet upsert, debit, or credit.

## 4. Test Strategy and Execution
A dedicated integration suite (`walletService.integration.test.js`) was engineered specifically addressing the requirements of Phase 3B.

### Executed Test Cases
1. **A valid tenant context credits only that tenant's wallet**: Verified via explicit org ID targeting without cross-contamination.
2. **Missing tenant context does not select a default organization**: Explicitly asserts an `HttpError` rejection instead of silently adopting the mock 'Trap Org'.
3. **Invalid tenant context is rejected**: Verified via null boundaries triggering immediate throw.
4. **A supplied organization ID conflicting with trusted tenant context cannot redirect the operation**: Verified via testing `wallet.controller.js` directly, proving that injecting a malicious `orgId` in `req.body` is overridden by `req.tenant`.
5. **A user belonging to multiple organizations cannot credit a wallet in an unauthorized organization**: Verified via multi-wallet seeding; crediting Org A did not alter the balance of Org B.
6. **An explicitly authorized platform-admin workflow continues to work**: Asserts that `isPlatform: true` correctly processes when relying on the provided `body.orgId`.
7. **Failed validation does not create a wallet or alter any balance**: Asserted database state (document counts) before and after failures.
8. **Existing payment, transaction and idempotency behavior remains intact**: Verified that legitimate `addMoney` calls generate correctly scoped `WalletTransaction` ledgers.

**Command Executed:**
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/features/walletService.integration.test.js tests/features/wallet.integration.test.js
```

**Results:**
- **Test Suites:** 2 passed, 2 total (including the legacy repo tests to ensure no regressions).
- **Tests:** 13 passed, 13 total.
- **Time:** ~15.5s

## 5. Remaining Limitations and Risks
- The repository previously contained an explicit fallback to `process.env.PLATFORM_ORG_ID`. Because the new logic strictly throws an error if `targetOrgId` is missing *before* that check, the env-fallback is now unreachable. If platform administration specifically relied on `addMoney` functioning without *any* specified payload ID, they must now provide it manually.
- Controllers in other domains (e.g. `invoice`) that invoke Wallet services must be audited to ensure they also inject a verified `orgId` rather than trusting payloads blindly.

## 6. Final Status
**PASS**
The wallet vulnerability is completely remediated at the controller, service, and repository layers, and protected by regression coverage.
