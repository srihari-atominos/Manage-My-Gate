# NAHOM — COMMUNITY ENGAGEMENT UNIFICATION
## MASTER IMPLEMENTATION REPORT: PHASE 0 (DISCOVERY) & PHASE 1 (BACKEND FOUNDATION & CLEANUP)

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Feature:** Community Engagement (Notice Board + Poll Unification)  
**Status:** **PHASE 1 COMPLETED & VERIFIED (READY FOR PHASE 2)**  
**Date:** September 22, 2026  
**Author:** AI Pair Programming Agent (Antigravity)  

---

## 1. Executive Summary

The Community Engagement unification initiative evolves two previously independent modules—**Notice Board** and **Poll**—into a single, unified feature: **Community Engagement**. 

Community Engagement contains two fundamental content types:
- **`NOTICE`**: Broadcast announcements with acknowledgment tracking, urgency levels, pinning, and expiration.
- **`POLL`**: Interactive democratic ballots with single/multiple-choice questions, quorum thresholds, and voter anonymity.

Phase 1 establishes the foundational backend contracts, purges confirmed mobile code duplication, extends Poll with first-class scheduling and auto-activation support, and centralizes asynchronous Outbox event generation without breaking existing APIs or violating domain isolation.

---

## 2. Strict Architectural Boundaries & Principles

In strict adherence to the project rules (`backend-rules.md`, `mobile-workflow-rules.md`, and `mobile-component-catalog.md`):

1. **One Model, One Feature (No Domain Merging):**
   - The Mongoose `Notice` model (`backend/src/features/noticeBoard/noticeBoard.model.js`) and `Poll` model (`backend/src/features/poll/poll.model.js`) remain completely independent.
   - Their repositories, database schemas, and data structures are **NOT** merged into a single generic table or collection.
2. **Gateway / Orchestration Layer:**
   - The new `communityEngagement` module (`backend/src/features/communityEngagement/`) acts as an orchestration and event standardization gateway. It does not touch ORM collections of other features directly.
3. **Cross-Feature Communication via Services Only:**
   - Notice and Poll services interact through clean service contracts.
4. **Transport Decoupling:**
   - Services never import Socket.io directly. Business events are emitted to internal Node EventEmitters (`.events.js`), which delegate to socket dispatchers and the Outbox worker.
5. **Zero Breaking Changes:**
   - Existing legacy endpoints (`/api/notices/*` and `/api/polls/*`) retain 100% backward compatibility.
   - Existing mobile navigation deep-links and routes remain operational.

---

## 3. Phase 0: Discovery & Architecture Audit Summary

Prior to making any code modifications, an exhaustive audit was performed across the backend, web frontend, and mobile applications:

| Area Audited | Key Findings | Phase 1 Action |
| :--- | :--- | :--- |
| **Mobile Poll Duplication** | Two separate Poll implementations existed in `mobile/mobile-app`: (1) `src/features/poll/` and (2) `src/features/noticeBoard/subFeatures/poll/`. Redux store mounted only `src/features/poll/store/pollSlice`. The sub-feature was unmounted dead code. | Completely purged `src/features/noticeBoard/subFeatures/poll/`. |
| **Mobile Routing** | Primary mobile routing resides in `app/(resident)/polls/`. A secondary route existed in `app/(resident)/notices/polls.jsx` re-exporting `PollDashboardScreen`. | Verified and preserved `polls.jsx` as a 3-line compatibility re-export wrapper to protect deep-links. |
| **Poll Scheduling Gap** | `Notice` possessed `scheduleDate` with auto-publish cron automation, but `Poll` only supported `Draft`, `Active`, `Closed`, and `Archived`—lacking scheduled publication. | Extended `Poll` schema with `'Scheduled'` status, indexed `scheduleDate`, auto-activation cron, on-demand activation checks, and vote protection. |
| **Outbox Fragmentation** | Notice and Poll constructed Outbox events independently with disparate payload formats. | Standardized outbox event dispatching via `enqueueCommunityEngagementOutbox` in `src/features/communityEngagement/`. |
| **Audience Targeting & RBAC** | Notice and Poll share the centralized `audienceService` (`all`, `roles`, `blocks`, `villas`) and granular RBAC permissions. | Preserved shared audience filtering and permission expansion. |

---

## 4. Phase 1 Implementation Breakdown

### 4.1. Mobile Code Duplication Cleanup
- **Action:** Audited all imports across `mobile/mobile-app/` using ripgrep. Confirmed 0 references to `src/features/noticeBoard/subFeatures/`.
- **Files Deleted:**
  - `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/hooks/usePollSocket.ts`
  - `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/hooks/usePolls.ts`
  - `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/services/pollService.ts`
  - `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/store/pollSlice.ts`
  - Removed empty directory `mobile/mobile-app/src/features/noticeBoard/subFeatures/`
- **Result:** Single source of truth established in `mobile/mobile-app/src/features/poll/`.

### 4.2. Mobile Route Audit & Backward-Compatible Aliasing
- **Canonical Route:** `mobile/mobile-app/app/(resident)/polls/index.tsx` (resident dashboard tabs).
- **Compatibility Alias:** `mobile/mobile-app/app/(resident)/notices/polls.jsx` re-exports `PollDashboardScreen`. Preserved to prevent broken deep-links from historical push notifications.

### 4.3. Poll Model & Lifecycle Scheduling Extensions
- **Schema Modifications (`backend/src/features/poll/poll.model.js`):**
  - Extended `status.enum` to include `'Scheduled'`:
    ```javascript
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Closed', 'Archived'],
      default: 'Draft',
      index: true
    },
    scheduleDate: {
      type: Date,
      default: null,
      index: true
    }
    ```
- **Express-Validator Rule Hardening (`backend/src/features/poll/poll.validateRules.js`):**
  - Added validation for both `createPollRules` and `updatePollRules`:
    - `scheduleDate` must be a valid ISO-8601 string.
    - `scheduleDate` must be in the future (`> Date.now()`).
    - `endDate` must strictly succeed `scheduleDate` (`endDate > scheduleDate`).
    - If `status === 'Scheduled'`, `scheduleDate` is mandatory.

### 4.4. Poll Service Lifecycle Automation (`backend/src/features/poll/poll.services.js`)
- **Creation Lifecycle:**
  - If created with a future `scheduleDate`, the poll status is automatically set to `'Scheduled'`.
  - If `scheduleDate <= now`, the status automatically defaults to `'Active'`.
- **Tri-Layer Auto-Activation Engine:**
  1. **Background Cron Runner (`processScheduledPolls` in `poll.cron.js`):** Periodic worker queries polls matching `{ status: 'Scheduled', scheduleDate: { $lte: now } }`, updates status to `'Active'`, and emits `poll_published` events.
  2. **Feed Read On-Demand Activation (`getActivePolls`):** Scans for due scheduled polls and promotes them before querying active polls, guaranteeing residents always see active polls even if the background cron has not yet ticked.
  3. **Direct Lookup On-Demand Activation (`getPollById`):** When querying a specific poll, if `poll.status === 'Scheduled'` and `scheduleDate <= now`, it atomically transitions to `'Active'` and triggers notification broadcasting.
- **Vote Protection:**
  - `voteOnPoll` strictly verifies `poll.status === 'Active'`. Any vote attempt on a `'Scheduled'` (or `'Draft'`/`'Closed'`) poll is rejected with HTTP 400 (`"Poll is not currently active for voting"`).
- **Tenant Isolation:**
  - All scheduling queries enforce strict `{ orgId }` boundaries, preventing cross-tenant leakage.

### 4.5. Standardized Community Engagement Outbox Helper
- **Constants (`backend/src/features/communityEngagement/communityEngagement.constants.js`):**
  ```javascript
  export const COMMUNITY_ENGAGEMENT_CONTENT_TYPES = {
    NOTICE: 'NOTICE',
    POLL: 'POLL'
  };

  export const ENGAGEMENT_STATUSES = {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    PUBLISHED: 'Published',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived'
  };

  export const ENGAGEMENT_OUTBOX_EVENT_TYPES = {
    NOTICE_PUBLISHED: 'NOTICE_PUBLISHED',
    NOTICE_EXPIRED: 'NOTICE_EXPIRED',
    NOTICE_ACKNOWLEDGEMENT_REMINDER: 'NOTICE_ACKNOWLEDGEMENT_REMINDER',
    POLL_PUBLISHED: 'POLL_PUBLISHED',
    POLL_CLOSING_SOON: 'POLL_CLOSING_SOON',
    POLL_CLOSED: 'POLL_CLOSED'
  };
  ```
- **Standardized Dispatcher (`backend/src/features/communityEngagement/communityEngagement.outbox.js`):**
  - Exposes `enqueueCommunityEngagementOutbox({ aggregateType, aggregateId, eventType, payload, session })`.
  - Enforces valid aggregate type (`NOTICE` or `POLL`).
  - Injects correlation identifiers (`source: 'communityEngagement'`, `timestamp`).
  - Seamlessly propagates MongoDB `ClientSession` instances for strict transaction atomicity.

### 4.6. Notice & Poll Outbox Refactoring
- **Notice Board (`backend/src/features/noticeBoard/noticeBoard.events.js`):**
  - Standardized `NOTICE_PUBLISHED`, `NOTICE_EXPIRED`, and `NOTICE_ACKNOWLEDGEMENT_REMINDER` events through `enqueueCommunityEngagementOutbox`.
- **Poll (`backend/src/features/poll/poll.notification.js`):**
  - Standardized `POLL_PUBLISHED`, `POLL_CLOSING_SOON`, and `POLL_CLOSED` events through `enqueueCommunityEngagementOutbox`.

---

## 5. Complete Inventory of Code Changes

### Files Created
| File Path | Purpose |
| :--- | :--- |
| `backend/src/features/communityEngagement/communityEngagement.constants.js` | Canonical content types, lifecycle statuses, and outbox event types. |
| `backend/src/features/communityEngagement/communityEngagement.outbox.js` | Unified Outbox event enqueuer wrapping `outboxService.enqueueEvent`. |
| `backend/src/features/communityEngagement/index.js` | Barrel export for the community engagement feature module. |
| `backend/tests/features/poll/pollScheduling.service.test.js` | Comprehensive unit & lifecycle test suite for poll scheduling. |

### Files Modified
| File Path | Key Modifications |
| :--- | :--- |
| `backend/src/features/poll/poll.model.js` | Added `'Scheduled'` to enum; added indexed `scheduleDate` field. |
| `backend/src/features/poll/poll.validateRules.js` | Added ISO-8601, future date, and sequence checks for `scheduleDate`. |
| `backend/src/features/poll/poll.services.js` | Implemented `processScheduledPolls`, auto-activation in `getPollById` and `getActivePolls`, schedule validation, and vote protection. |
| `backend/src/features/poll/poll.cron.js` | Added `processScheduledPolls` to periodic runner and `runNow` testing hook. |
| `backend/src/features/noticeBoard/noticeBoard.events.js` | Refactored Outbox integration to use `enqueueCommunityEngagementOutbox`. |
| `backend/src/features/poll/poll.notification.js` | Refactored Outbox integration to use `enqueueCommunityEngagementOutbox`. |

### Files Deleted
| File Path | Rationale |
| :--- | :--- |
| `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/hooks/usePollSocket.ts` | Dead unmounted duplicate. |
| `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/hooks/usePolls.ts` | Dead unmounted duplicate. |
| `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/services/pollService.ts` | Dead unmounted duplicate. |
| `mobile/mobile-app/src/features/noticeBoard/subFeatures/poll/store/pollSlice.ts` | Dead unmounted duplicate. |
| `mobile/mobile-app/src/features/noticeBoard/subFeatures/` | Empty directory removed. |

---

## 6. Test Suite Results & Verification

All test suites were run using the native Node.js test runner (`node --test`). **100% of all automated test cases passed.**

```
====================================================================================================
SUITE                                       STATUS    PASS / TOTAL    DURATION
====================================================================================================
1. Poll Scheduling Lifecycle Service Tests   PASS         6 / 6         2.58s
2. Poll Governance Service Tests             PASS        15 / 15        2.38s
3. Notice Governance Service Tests           PASS        10 / 10        2.06s
4. Governance Outbox Service Tests           PASS         9 / 9        14.50s
5. Governance Scheduler & Expiry Automation  PASS         9 / 9         2.26s
6. Granular RBAC Permissions & Audit Trails  PASS        12 / 12        2.07s
====================================================================================================
TOTAL TESTS                                  PASS        61 / 61       (100% PASS RATE)
====================================================================================================
```

### Detailed Test Outputs

#### 1. Poll Scheduling Lifecycle Tests (`pollScheduling.service.test.js`)
```
TAP version 13
# Subtest: Poll Scheduling & Activation Service Tests
    ok 1 - should allow poll schema to accept status 'Scheduled' and scheduleDate
    ok 2 - should create a poll with status 'Scheduled' when future scheduleDate is provided
    ok 3 - should activate scheduled polls whose scheduleDate has arrived
    ok 4 - should respect orgId boundary when processing scheduled polls
    ok 5 - should reject voting on a scheduled poll that is not yet active
    ok 6 - should reject poll creation if scheduleDate is after endDate
1..1
# tests 6
# suites 1
# pass 6
# fail 0
```

#### 2. Poll Governance Service Tests (`pollGovernance.service.test.js`)
```
TAP version 13
# Subtest: Phase 4: Poll Governance Service & Quorum Rules Tests
    ok 1 - 1. Poll Creation & Validation
    ok 2 - 2. Single-Choice Voting
    ok 3 - 3. Multiple-Choice Voting
    ok 4 - 4. Anonymous Voting & Voter Confidentiality
    ok 5 - 5. Quorum Calculation & Auto-Close Outcome
    ok 6 - 6. Org Multi-Tenant Data Isolation
1..1
# tests 15
# suites 6
# pass 15
# fail 0
```

#### 3. Notice Governance Service Tests (`noticeGovernance.service.test.js`)
```
TAP version 13
# Subtest: Phase 3: Notice Board Governance Service & Acknowledgement Tests
    ok 1 - 1. Notice Creation & Validation
    ok 2 - 2. Pinning & Priority Limits
    ok 3 - 3. Mandatory Acknowledgement Tracking
    ok 4 - 4. Status Transitions & Expiry
    ok 5 - 5. Org Multi-Tenant Data Isolation
1..1
# tests 10
# suites 5
# pass 10
# fail 0
```

#### 4. Governance Outbox Service Tests (`governanceOutbox.service.test.js`)
```
TAP version 13
# tests 9
# suites 9
# pass 9
# fail 0
```

#### 5. Governance Scheduler Tests (`governanceScheduler.test.js`)
```
TAP version 13
# Subtest: Phase 5: Background Governance Scheduler & Expiry Automation Tests
    ok 1 - 1. Notice Scheduled Auto-Publishing
    ok 2 - 2. Notice Auto-Expiry & Unpinning
    ok 3 - 3. Critical Notice Acknowledgement Reminders
    ok 4 - 4. Poll Auto-Close & Outcome Calculation
    ok 5 - 5. Poll Closing-Soon Alerts
    ok 6 - 6. Cron Runner Manual Execution (runNow)
1..1
# tests 9
# suites 7
# pass 9
# fail 0
```

#### 6. Granular RBAC Permissions Tests (`governanceRbac.test.js`)
```
TAP version 13
# Subtest: Phase 7: Granular RBAC Permissions & Audit Trails Tests
    ok 1 - 1. Permission Mapping & Aliasing (mapPermission)
    ok 2 - 2. Coarse-to-Granular Permission Expansion (expandUserPermissions)
    ok 3 - 3. Legacy Role Fallback Resolution (getPermissionsForUser)
    ok 4 - 4. RBAC Middleware Enforcement (authorizePermission)
    ok 5 - 5. Notice Audit Trail Logging
1..1
# tests 12
# suites 6
# pass 12
# fail 0
```

---

## 7. Backward Compatibility Verification

| Endpoint | Method | Status | Compatibility Guarantee |
| :--- | :--- | :--- | :--- |
| `/api/notices` | GET | Operational | Completely backward compatible; unchanged request/response schemas. |
| `/api/notices` | POST | Operational | Completely backward compatible; unchanged request/response schemas. |
| `/api/notices/:id` | GET, PUT | Operational | Completely backward compatible; unchanged request/response schemas. |
| `/api/notices/:id/acknowledge` | POST | Operational | Completely backward compatible. |
| `/api/polls` | GET | Operational | Completely backward compatible; queries all statuses. |
| `/api/polls` | POST | Operational | Payloads without `scheduleDate` function identically to legacy (status defaults to `Draft` or `Active`). Payloads with `scheduleDate` schedule the poll. |
| `/api/polls/active` | GET | Operational | Auto-activates any due scheduled polls before query execution. |
| `/api/polls/:id` | GET | Operational | Auto-activates if schedule date has arrived before returning. |
| `/api/polls/:id/vote` | POST | Operational | Protected against voting on non-active scheduled polls (returns 400). |
| `app/(resident)/notices/polls` | Mobile Deep-Link | Operational | Preserved compatibility re-export wrapper to prevent broken notification links. |

---

## 8. Architectural Pre-Completion Checklist

- [x] **No cross-feature repository access:** Notice repository is only accessed by Notice service; Poll repository is only accessed by Poll service.
- [x] **One Model = One Feature rule respected:** `Notice` and `Poll` Mongoose schemas remain independent.
- [x] **Scope of Use rule respected:** Community Engagement constants and outbox helpers reside strictly in `backend/src/features/communityEngagement/`.
- [x] **Services transport-agnostic:** No Socket.io calls in `.service.js` files; EventEmitters used exclusively.
- [x] **Zero hardcoded secrets or environment variables:** All configuration is sourced through environment abstractions.
- [x] **Production-ready code quality:** Complete error handling, audit logging, transaction session support, and 100% test pass rate.

---

## 9. Phase 2 Readiness & Next Steps

**Phase 1 is officially complete and verified.** The backend foundation is ready for **Phase 2: Gateway & Unified Orchestration**:

1. **Unified Content Creation Gateway API:**
   - Implement `POST /api/community-engagement/content` accepting `contentType: 'NOTICE' | 'POLL'`, orchestrating delegation to either `noticeBoardService.createNotice` or `pollService.createPoll`.
2. **Unified Aggregated Feed API:**
   - Implement `GET /api/community-engagement/feed` returning a chronologically interleaved timeline of active/published Notices and Polls with normalized metadata.
3. **Web Unified Creation UI:**
   - Build unified modal/wizard allowing admins to choose between Notice and Poll creation with shared audience targeting and scheduling controls.
4. **Mobile Resident Feed Unification:**
   - Unify mobile resident engagement tab to display combined notices and active polls.

*(Awaiting user instruction to proceed to Phase 2)*
