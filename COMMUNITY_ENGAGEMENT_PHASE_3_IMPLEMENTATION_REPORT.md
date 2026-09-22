# NAHOM — COMMUNITY ENGAGEMENT UNIFICATION
# PHASE 3: IMPLEMENTATION REPORT
## Creation Validation, Side-Effect-Free Preview & Outbox Dispatcher

**Date:** September 22, 2026  
**System:** Nahom / Connect Harmony / Manage-My-Gate  
**Phase:** Phase 3 — Creation Validation, Preview & Outbox Dispatcher  
**Status:** **COMPLETE & VERIFIED (86/86 AUTOMATED TESTS PASSING)**

---

## 1. Executive Summary

Phase 3 establishes rigorous pre-flight validation, an idempotent and side-effect-free preview capability, and a hardened Outbox event dispatcher for the unified Community Engagement gateway. Building upon the Phase 2 thin gateway orchestration layer (`POST /api/community-engagement/content`), Phase 3 delivers:

1. **Pre-flight Dynamic Validation Pipeline (`communityEngagement.validate.js`)**: Unifies envelope checks (`contentType`), payload normalization (`audience` -> `targetAudience`, string array options -> object array), audience `targetType` structural verification, chronological scheduling boundaries (`expiryDate > scheduleDate`, `endDate > scheduleDate`), and delegates domain validation to authoritative sub-feature validators (`createNoticeRules` and `createPollRules()`).
2. **Server-Side Preview Gateway (`POST /api/community-engagement/preview`)**: An authenticated, tenant-isolated, side-effect-free simulation engine that validates payloads, projects lifecycle status (`Draft`, `Scheduled`, `Published`, `Active`), normalizes audience scopes, and calculates real-time estimated recipient counts using `AudienceService.countEligibleRecipients()`, strictly performing **zero** database writes, **zero** outbox enqueues, and **zero** notification side-effects.
3. **Hardened Outbox Dispatcher (`communityEngagement.outbox.js`)**: Centralizes governance event propagation across Notice and Poll domains with correlation ID tracking (`loggerStorage.getStore()`), Mongoose session propagation, readyState connection protection, and aggregate contract validation.
4. **Zero-Regression Verification**: All 86 relevant automated tests passed across 7 test suites with 0 failures.

---

## 2. Architectural Boundary & Domain Isolation Compliance

In strict accordance with the project's backend architectural directives and the "One Model, One Feature" mandate:
* **No Unified Database Model**: No `communityEngagement.model.js` or unified MongoDB collection was created. Notices remain persisted exclusively in `Notice`, and Polls remain persisted exclusively in `Poll`.
* **Zero Cross-Feature Repository Invasions**: The gateway service communicates strictly with `noticeBoardService`, `pollService`, and `audienceService`. It never touches ORM models or database repositories directly.
* **Preservation of Independent Feature Lifecycles**: Notice Board and Poll features maintain independent lifecycle states, business logic, voting mechanics, and scheduling routines.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │          Client Request (Web / Mobile)                  │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │ POST /api/community-engagement/content            │
                    │ POST /api/community-engagement/preview            │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                         isAuthenticated & tenantContext
                                              │
                         authorizePermission (RBAC Guard)
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │ validateEngagementContent (Express Middleware)    │
                    │   - contentType check (NOTICE | POLL)             │
                    │   - audience -> targetAudience normalization      │
                    │   - targetType validation (ALL, ROLES, etc.)      │
                    │   - Chronological validation (expiry/end > sched) │
                    │   - Dynamic delegation (Notice/Poll rules)        │
                    └─────────────────────────┬─────────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │ CommunityEngagementController                     │
                    └────────────┬─────────────────────────┬────────────┘
                                 │                         │
                    createContent│             previewContent│ (Side-Effect-Free)
                                 ▼                         ▼
        ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
        │ CommunityEngagementService        │    │ CommunityEngagementService        │
        │   - verifyContentTypePermission   │    │   - verifyContentTypePermission   │
        │   - Tenant isolation injection    │    │   - Audience target validation    │
        │   - Delegate to domain service    │    │   - countEligibleRecipients       │
        │   - Return created entity         │    │   - Status projection             │
        └──────────────┬────────────────────┘    │   - ZERO DB writes / outbox       │
                       │                         └───────────────────────────────────┘
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ Notice Service   │       │ Poll Service     │
│   & Repository   │       │   & Repository   │
└──────────────────┘       └──────────────────┘
```

---

## 3. Part A: Creation Validation Engine Implementation

File: [`backend/src/features/communityEngagement/communityEngagement.validate.js`](file:///e:/atominos/Manage-My-Gate/backend/src/features/communityEngagement/communityEngagement.validate.js)

### Validation Responsibilities:
1. **Envelope Validation**: Ensures `contentType` is supplied, trimmed, and uppercase-matched against `VALID_CONTENT_TYPES` (`NOTICE`, `POLL`).
2. **Audience Contract Normalization**: Maps legacy or client-provided `audience` payloads into the canonical `targetAudience` object model.
3. **Audience `targetType` Verification**: Validates that any specified `targetType` belongs to `['ALL', 'ROLES', 'BLOCKS', 'UNITS', 'RESIDENCY_TYPES', 'CUSTOM']`. Invalid strings trigger an immediate 400 Bad Request.
4. **Chronological Scheduling Validation**:
   * If `scheduleDate` is supplied:
     * For **NOTICE**: Ensures `expiryDate > scheduleDate`. Throws `expiryDate must be after scheduleDate` if violated.
     * For **POLL**: Ensures `endDate > scheduleDate`. Throws `endDate must be after scheduleDate` if violated.
5. **Dynamic Domain Delegation**:
   * For `NOTICE`: Invokes `validate(createNoticeRules)(req, res, next)`.
   * For `POLL`: Normalizes option string arrays (`["Yes", "No"]` -> `[{ text: "Yes" }, { text: "No" }]`) and invokes `validate(createPollRules())(req, res, next)`.

---

## 4. Part B: Audience Validation & Recipient Estimation Integration

File: [`backend/src/features/audience/audience.service.js`](file:///e:/atominos/Manage-My-Gate/backend/src/features/audience/audience.service.js) and [`backend/src/features/communityEngagement/communityEngagement.service.js`](file:///e:/atominos/Manage-My-Gate/backend/src/features/communityEngagement/communityEngagement.service.js)

### Strategy:
* Reuses `AudienceService.validateTarget(targetAudience, orgId, session)` to ensure:
  * Non-empty array constraints on `targetRoles`, `targetBlocks`, `targetUnits`.
  * Multi-tenant boundaries (ensuring roles and units referenced belong to the requesting tenant's `orgId`).
* Reuses `AudienceService.countEligibleRecipients(targetAudience, orgId, session)`:
  * Resolves all active resident and unit user IDs eligible under the audience filter.
  * Returns an accurate recipient count for preview and quorum calculations.
* Injected into `CommunityEngagementService` via constructor dependency injection (`deps.audienceService || audienceService`), enabling frictionless unit testing and loose coupling.

---

## 5. Part C: Side-Effect-Free Preview Endpoint

Endpoint: `POST /api/community-engagement/preview`  
Controller: [`CommunityEngagementController.previewContent`](file:///e:/atominos/Manage-My-Gate/backend/src/features/communityEngagement/communityEngagement.controller.js)  
Service: [`CommunityEngagementService.previewContent`](file:///e:/atominos/Manage-My-Gate/backend/src/features/communityEngagement/communityEngagement.service.js)

### Operational Guarantees:
* **Zero Database Mutations**: Neither `NoticeRepository`, `PollRepository`, nor Mongoose models are called to persist data.
* **Zero Outbox Side-Effects**: `enqueueCommunityEngagementOutbox` and `outboxService.enqueueEvent` are bypassed.
* **Zero Real-Time Emissions**: Socket.io dispatchers and event emitters (`.events.js`) are not triggered.
* **Zero Audit Logs**: Audit trail events are only logged on genuine mutations, not simulations.
* **Lifecycle Status Projection**:
  * If `scheduleDate` is in the future: status is projected as `'Scheduled'`.
  * If `status === 'Draft'`: status is projected as `'Draft'`.
  * Notice default without schedule: `'Published'`.
  * Poll default without schedule: `'Active'`.
* **Payload Normalization**:
  * Notice attachments are projected with generated preview URLs (`/public/uploads/notices/...`).
  * Poll options are projected with unique identifier tags and default zero vote tallies (`votes: 0`).
  * Audience object is validated and resolved.
  * `estimatedRecipients` integer is attached.
  * Explicit flag `previewOnly: true` is included.

---

## 6. Part D: Hardened Outbox Dispatcher

File: [`backend/src/features/communityEngagement/communityEngagement.outbox.js`](file:///e:/atominos/Manage-My-Gate/backend/src/features/communityEngagement/communityEngagement.outbox.js)

### Improvements:
1. **Connection Safety**: Inspects `mongoose.connection.readyState === 1`. Safely returns `null` if database connection is offline or mocked, preventing unhandled promise rejections.
2. **Aggregate & Event Validation**: Rejects unrecognized aggregate types (must be `NOTICE` or `POLL`) or missing event types before database interaction.
3. **Correlation Tracking**: Retrieves active correlation ID from `loggerStorage.getStore()` or falls back to provided `correlationId` / `'SYSTEM'`.
4. **Transaction Session Propagation**: Forwards active `ClientSession` into `outboxService.enqueueEvent(eventData, session)` for atomic consistency with domain writes.

---

## 7. Modified & Created Files Summary

| File Path | Nature | Purpose |
|:---|:---|:---|
| `backend/src/features/communityEngagement/communityEngagement.validate.js` | Modified | Added audience `targetType` validation, chronological date checks, and dynamic delegation |
| `backend/src/features/communityEngagement/communityEngagement.service.js` | Modified | Injected `audienceService`, implemented side-effect-free `previewContent` |
| `backend/src/features/communityEngagement/communityEngagement.controller.js` | Modified | Added `previewContent(req, res, next)` HTTP handler |
| `backend/src/features/communityEngagement/communityEngagement.router.js` | Modified | Mounted `POST /preview` route with RBAC authorization and validation middlewares |
| `backend/src/features/communityEngagement/communityEngagement.outbox.js` | Modified | Hardened outbox dispatcher with correlation ID tracking, session forwarding, and readyState checks |
| `backend/tests/features/communityEngagement/communityEngagementGateway.test.js` | Modified | Added 11 Phase 3 unit & integration tests (Preview, Audience Validation, Outbox) |

---

## 8. Automated Test Execution & Results

All 7 test suites were executed sequentially using Node.js Native Test Runner.

### Suite 1: Community Engagement Gateway & Phase 3 Tests
**Command:** `node --test tests/features/communityEngagement/communityEngagementGateway.test.js`
```
# tests 25
# suites 10
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3579.345
```
* **Phase 2 Baseline Tests (14 passed):**
  * Content-Type validation & rejection (3 tests)
  * Authentication & tenant context enforcement (3 tests)
  * Granular RBAC permissions & authorization (3 tests)
  * Notice domain delegation & contract preservation (1 test)
  * Poll domain delegation & scheduling contract preservation (1 test)
  * Gateway request validation middleware (3 tests)
* **Phase 3 Additions (11 passed):**
  * Notice preview with Published status & estimated recipients (1 test)
  * Notice preview with Scheduled status on future scheduleDate (1 test)
  * Poll preview with Active status, normalized options & estimated recipients (1 test)
  * Preview rejection for unauthorized residents (1 test)
  * Invalid audience targetType rejection (1 test)
  * Notice chronological validation: expiryDate <= scheduleDate rejection (1 test)
  * Poll chronological validation: endDate <= scheduleDate rejection (1 test)
  * Audience key normalization: `audience` -> `targetAudience` (1 test)
  * Outbox aggregateType validation rejection (1 test)
  * Outbox eventType validation rejection (1 test)
  * Outbox database disconnection safe fallback (1 test)

### Suite 2: Poll Scheduling & Lifecycle Tests
**Command:** `node --test tests/features/poll/pollScheduling.service.test.js`
* Passed: 6 / 6 tests (0 failed)

### Suite 3: Poll Governance Service Tests
**Command:** `node --test tests/features/poll/pollGovernance.service.test.js`
* Passed: 15 / 15 tests (0 failed)

### Suite 4: Notice Governance Tests
**Command:** `node --test tests/features/noticeBoard/noticeGovernance.service.test.js`
* Passed: 10 / 10 tests (0 failed)

### Suite 5: Background Governance Scheduler Tests
**Command:** `node --test tests/features/scheduler/governanceScheduler.test.js`
* Passed: 9 / 9 tests (0 failed)

### Suite 6: Granular RBAC Permissions Tests
**Command:** `node --test tests/features/rbac/governanceRbac.test.js`
* Passed: 13 / 13 tests (0 failed)

### Suite 7: Async Outbox Notification Pipeline Tests
**Command:** `node --test tests/features/outbox/governanceOutbox.service.test.js`
* Passed: 8 / 8 tests (0 failed)

### **Total Automated Test Summary:**
* **Total Passing Tests:** **86 / 86**
* **Failures:** **0**
* **Regressions:** **0**

---

## 9. Conclusion & Next Steps

Phase 3 is 100% complete and verified against all functional, architectural, and security requirements. 

**Next Phase Readiness:**  
The gateway is now fully equipped to support **Phase 4: Unified Community Feed & Mobile/Web Wizard Integration** without requiring further architectural adjustments to the validation, preview, or dispatch layers.
