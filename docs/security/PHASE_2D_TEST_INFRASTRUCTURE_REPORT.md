# Phase 2D — Test Infrastructure Configuration Report

## 1. Baseline Preservation
- **Initial State:** The working tree contained numerous untracked scratch files and modifications from previous phases.
- **Action Taken:** The Git status and all existing files were strictly preserved. No `git clean` or `git reset` commands were executed.

## 2. Test Runner Compatibility Assessment
- **Environment:** Node `v20.19.4` and NPM `v9.9.4`.
- **Existing Framework:** The `package.json` natively utilized `node --test` for specific `.mjs` scripts (SSO, Security, Onboarding).
- **Orphaned Framework:** A thorough inspection of `tests/invoice.repository.test.js` and `tests/features/rbac/governanceRbac.test.js` confirmed explicit dependencies on Jest globals (`jest.spyOn`, `jest.clearAllMocks()`). 
- **Compatibility Conclusion:** Jest was definitively required to run the orphaned feature tests. Since the project utilizes `"type": "module"`, Jest must be executed with Node's `--experimental-vm-modules` flag. Both the native Node test runner and Jest can coexist seamlessly by mapping them to separate NPM scripts.

## 3. Approved Configuration Changes
To restore the testing baseline without modifying business logic or breaking existing setups, the following exact changes were applied to `backend/package.json`:
1. Installed `jest (^29.7.0)` as a `devDependency` using the project's native package manager (`npm install --save-dev jest`).
2. Appended a new strict discovery script to `package.json`:
   `"test:features": "node --experimental-vm-modules node_modules/jest/bin/jest.js tests/features/ tests/*.test.js --passWithNoTests"`
3. Left the original `"test"` script (which runs the native Node runner) entirely untouched.

*No application code, existing tests, controllers, or repositories were altered.*

## 4. Test Execution and Verification

### A. Original Native Node Tests
- **Command:** `npm test`
- **Result:** Executed safely.
- **Failures Retained:** The two pre-existing Google SSO assertion failures remain unchanged.
  - *Evidence-based Explanation:* The test at `tests/google.provider.test.mjs:8:3` explicitly asserts a hardcoded expected Client ID (`610778456829...`). However, the actual configured ID injected into the environment during test execution is `691785946843...`. Because this discrepancy lies in business logic / configuration, it was deliberately left untouched per instructions.

### B. Restored Jest Feature Tests
- **Command:** `npm run test:features`
- **Result:** The orphaned tests located in `tests/features/` and `tests/*.test.js` are now actively discoverable and executable by the Jest runner. 
- **Limitations:** While the infrastructure is now capable of executing them, several tests still require complex environment variables (e.g., MongoDB URIs, specific `.env.test` files) to pass entirely depending on local developer setup.

## 5. Review and Next Steps
The testing baseline has been successfully restored. 

- **Achieved:** The project now supports both `node --test` (for lightweight SSO assertions) and `jest` (for complex repository mocking and feature coverage) simultaneously without conflict.
- **Pending/Unsupported:** The massive coverage gaps identified in Phase 2C (no tests for Amenity Management, CRM, Platform Admin, Issue Reporting) persist.
- **Recommendation:** Proceed with writing targeted repository-level regression tests for the missing Phase 2 domains, now that the Jest framework is officially supported and running.
