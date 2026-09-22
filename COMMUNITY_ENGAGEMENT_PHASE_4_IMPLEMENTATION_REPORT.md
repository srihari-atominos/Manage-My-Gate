# NAHOM — COMMUNITY ENGAGEMENT
# PHASE 4 IMPLEMENTATION REPORT

## 1. Status

COMPLETE

Verified within the tested scope: 110 / 110 automated tests passing across 8 test suites with 0 failures and 0 regressions.

---

## 2. Repository Discovery

Prior to code implementation, a thorough audit of the repository was conducted:

* **Existing Notice Cron (`noticeBoard.cron.js`)**: Scheduled at `*/5 * * * *` and called `noticeBoardService.processScheduledNotices()`, `noticeBoardService.processExpiredNotices()`, and `noticeBoardService.processAcknowledgementDeadlines()`.
* **Existing Poll Cron (`poll.cron.js`)**: Scheduled at `*/5 * * * *` and called `pollService.processScheduledPolls()`, `pollService.processExpiredPolls()`, and `pollService.processClosingSoonPolls()`.
* **Application Bootstrap (`server.js`)**: Both `noticeBoardCron.init()` and `pollCron.init()` were called independently inside `initCronJobs()`, creating two duplicate 5-minute node-cron timers.
* **Poll Read-Trigger Behavior**: Audited in `poll.services.js` (`getPollById` and `getActivePolls`). Discovered that `getActivePolls` executes non-blocking `processScheduledPolls(now, orgId)` and `getPollById` transitions `Scheduled` polls to `Active` when `scheduleDate <= now`. Both mechanisms are conditional (`status: 'Scheduled'`), strictly idempotent, and preserve instant real-time feedback for users reading due polls between 5-minute cron cycles.
* **Existing Event Mappings**: Audited across event emitters, audit listeners, and outbox listeners:
  * Notice: Emits `NOTICE_PUBLISHED`, `NOTICE_EXPIRED`, `NOTICE_ACKNOWLEDGEMENT_REMINDER`.
  * Poll: Runtime emits `poll_published` (on activation), `poll_closed`, `poll_closing_soon`. Audit listens for `POLL_PUBLISHED`, `POLL_CLOSED`. Outbox listens and enqueues `POLL_ACTIVATED`, `POLL_CLOSED`, `POLL_CLOSING_SOON`.

---

## 3. Architecture Implemented

The target unified scheduler architecture has been implemented with strict domain delegation:

```
                          server.js (Application Startup)
                                        │
                                        │ initCronJobs()
                                        ▼
                        CommunityEngagementCron.init()
                                 [*/5 * * * *]
                                        │
                         CommunityEngagementCron.runNow()
                         (Overlap Protected via isRunning)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │ Promise.allSettled (Strict Failure Isolation)       │
             ▼                                                     ▼
processNoticeLifecycle(now)                           processPollLifecycle(now)
             │                                                     │
             ▼                                                     ▼
     NoticeBoardService                                       PollService
   (Domain Authority)                                     (Domain Authority)
             │                                                     │
   ┌─────────┴─────────┐                                 ┌─────────┴─────────┐
   ▼                   ▼                                 ▼                   ▼
Scheduled           Expired / Reminders               Scheduled           Expired / Alerts
   │                   │                                 │                   │
   ▼                   ▼                                 ▼                   ▼
Atomic DB Updates   Atomic DB Updates                 Atomic DB Updates   Atomic DB Updates
   │                   │                                 │                   │
   └─────────┬─────────┘                                 └─────────┬─────────┘
             ▼                                                     ▼
       Domain Events                                         Domain Events
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        ▼
                        enqueueCommunityEngagementOutbox
                                        │
                                        ▼
                            Existing Outbox Pipeline
                                        │
                                        ▼
                            Existing Notification Worker
```

### Why the Scheduler Remains an Orchestrator Only:
1. **Zero Database Querying/Updating**: `CommunityEngagementCron` never invokes Mongoose models (`Notice` or `Poll`) directly.
2. **Zero Domain Logic Ingestion**: Quorum calculation, winner selection, tie resolution, pin management, acknowledgement eligibility, and audience filtering remain 100% inside `NoticeBoardService` and `PollService`.
3. **Pure Coordination**: The scheduler solely coordinates tick execution, prevents overlapping cycles, isolates cross-domain failures, and compiles cycle-level operational summaries.

---

## 4. Files Created

1. `backend/src/features/communityEngagement/communityEngagement.cron.js`  
   The single authoritative Community Engagement scheduler with overlap protection, failure isolation, and domain delegation.
2. `backend/tests/features/communityEngagement/communityEngagementCron.test.js`  
   Comprehensive Phase 4 test suite containing 24 automated unit and integration tests.

---

## 5. Files Modified

1. `backend/server.js`  
   Replaced independent `noticeBoardCron.init()` and `pollCron.init()` calls with a single `communityEngagementCron.init()` registration.
2. `backend/src/features/noticeBoard/noticeBoard.cron.js`  
   Transformed into a backward-compatible wrapper: `.init()` logs a deprecation note without registering a duplicate node-cron timer; `.runNow()` remains functional for legacy consumers and tests.
3. `backend/src/features/poll/poll.cron.js`  
   Transformed into a backward-compatible wrapper: `.init()` logs a deprecation note without registering a duplicate node-cron timer; `.runNow()` remains functional for legacy consumers and tests.
4. `backend/src/features/communityEngagement/index.js`  
   Exported `CommunityEngagementCron` and `communityEngagementCron`.

---

## 6. Files Deleted

None.

---

## 7. Lifecycle Ownership

Domain boundaries and lifecycle authorities are preserved without exception:

### Notice Lifecycle (Owned by `NoticeBoardService`)
* **Scheduled $\rightarrow$ Published**: `NoticeBoardService.processScheduledNotices(now)`. Performs atomic conditional update (`status: 'Scheduled', scheduleDate: { $lte: now }`), handles pin logic (`unpinAllExcept`), and emits `NOTICE_PUBLISHED`.
* **Published $\rightarrow$ Expired**: `NoticeBoardService.processExpiredNotices(now)`. Atomically transitions past-due notices to `Expired`, unpins them, and emits `NOTICE_EXPIRED`.
* **Acknowledgement Reminders**: `NoticeBoardService.processAcknowledgementDeadlines(now)`. Scans critical notices nearing deadline and emits `NOTICE_ACKNOWLEDGEMENT_REMINDER`.

### Poll Lifecycle (Owned by `PollService`)
* **Scheduled $\rightarrow$ Active**: `PollService.processScheduledPolls(now, orgId)`. Performs atomic conditional update (`status: 'Scheduled', scheduleDate: { $lte: now }`) and emits `poll_published`.
* **Active $\rightarrow$ Closed**: `PollService.processExpiredPolls(now)`. Detects expired polls, evaluates quorum and outcome, atomically updates status to `Closed`, and emits `poll_closed`.
* **Closing-Soon Alerts**: `PollService.processClosingSoonPolls(now)`. Detects polls ending within ~24 hours and emits `poll_closing_soon`.
* **Quorum & Outcome Calculation**: `computePollOutcome(poll)` in `poll.services.js`. Determines `PASSED`, `REJECTED`, `TIED`, `NO_QUORUM`, and `winningOption`.
* **Finalization**: `PollService.finalizePoll(pollId, orgId, userId, isCommunityAdmin)`. Administrative domain operation updating `finalizedAt` and emitting `poll_finalized`.

---

## 8. Scheduler Behavior

* **Cron Expression**: Default `*/5 * * * *` (runs every 5 minutes), matching existing operational cadence.
* **Single Registration Guard**: `init()` stores the active node-cron task reference on `this.task`. Repeated calls log a warning and return the existing task instance without creating duplicate timers.
* **Overlap Protection**: `runNow()` inspects `this.isRunning`. If a previous cycle is currently executing, the tick is safely skipped (`{ skipped: true, reason: 'Already running' }`). The flag is reset inside a `finally` block to guarantee release on both success and error.
* **Failure Isolation**: `processNoticeLifecycle(now)` and `processPollLifecycle(now)` are orchestrated using `Promise.allSettled`. If Notice throws an uncaught error, Poll continues unaffected; if Poll throws, Notice continues unaffected.
* **Stop Capability**: `stop()` halts the active node-cron task and nullifies `this.task`.
* **Cycle Summary**: Returns structured execution summary detailing timestamp, notices published/expired/reminded, polls activated/closed/alerted, and any errors encountered.

---

## 9. Event Flow

The established multi-layer event mapping is strictly preserved:

| Domain | Action / Trigger | Runtime / Domain Event | Audit Event | Outbox Event | Notification Worker Event |
|:---|:---|:---|:---|:---|:---|
| **Notice** | Scheduled Publish | `NOTICE_PUBLISHED` | `NOTICE_PUBLISHED` | `NOTICE_PUBLISHED` | `NOTICE_PUBLISHED` |
| **Notice** | Notice Expiry | `NOTICE_EXPIRED` | `NOTICE_EXPIRED` | N/A | N/A |
| **Notice** | Ack Reminder | `NOTICE_ACKNOWLEDGEMENT_REMINDER` | N/A | `NOTICE_ACKNOWLEDGEMENT_REMINDER` | `NOTICE_ACKNOWLEDGEMENT_REMINDER` |
| **Poll** | Scheduled Activation | `poll_published` | `POLL_PUBLISHED` | `POLL_ACTIVATED` | `POLL_ACTIVATED` |
| **Poll** | Poll Expiry / Close | `poll_closed` | `POLL_CLOSED` | `POLL_CLOSED` | `POLL_CLOSED` |
| **Poll** | Poll Finalization | `poll_finalized` | `POLL_FINALIZED` | `POLL_CLOSED` | `POLL_CLOSED` |
| **Poll** | Closing Soon Alert | `poll_closing_soon` | N/A | `POLL_CLOSING_SOON` | `POLL_CLOSING_SOON` |

---

## 10. Outbox

The scheduler does **not** introduce any direct outbox logic or bypass domain boundaries:
1. Scheduler triggers `NoticeBoardService` or `PollService`.
2. Domain services emit domain events (`NOTICE_PUBLISHED`, `poll_published`, etc.).
3. Domain event listeners (`noticeBoard.events.js`, `poll.notification.js`) invoke `enqueueCommunityEngagementOutbox()`.
4. `enqueueCommunityEngagementOutbox()` persists events to the `OutboxEvent` collection with correlation tracking.
5. The existing asynchronous `outbox.worker.js` processes pending events, resolves audience recipients in batches of 100, and generates in-app notifications.

---

## 11. Audit

Audit logging remains strictly decoupled and owned by domain features:
* `noticeBoard.audit.js` listens to `noticeEvents` and records structured entries in `AuditLog` via `auditLogService.logEvent()`.
* `poll.audit.js` listens to `pollEvents` and records entries in `AuditLog`.
* The scheduler creates zero direct audit entries.

---

## 12. Transaction Ownership

MongoDB transactions remain strictly owned within domain boundaries:
* `CommunityEngagementCron` creates **no** outer transaction session.
* When Notice or Poll domain services perform multi-document writes or state changes requiring atomicity, they manage their own `mongoose.startSession()` and transaction boundaries.
* This prevents cross-domain lock contention, transaction timeouts, and distributed deadlocks.

---

## 13. Tenant Isolation

* **Polls**: `processScheduledPolls(now, orgId)` supports tenant scoping and indexes by `orgId`. Multi-tenant processing preserves community isolation.
* **Notices**: Notice records store `orgId`. Notice publishing unpins only notices belonging to the same tenant (`unpinAllExcept(notice.orgId, notice._id)`).
* The scheduler passes no arbitrary tenant context; domain services query records by strict indexed statuses and validate tenant boundaries during event and outbox enqueuing.

---

## 14. Legacy Compatibility

* `backend/src/features/noticeBoard/noticeBoard.cron.js`:
  * `.init()`: Logs `[NoticeBoard Cron] Deprecated: Notice lifecycle scheduling is orchestrated by CommunityEngagementCron.` and does **not** register a node-cron timer.
  * `.runNow(now)`: Fully maintained and delegates directly to `noticeBoardService`. Existing tests and scripts pass without modification.
* `backend/src/features/poll/poll.cron.js`:
  * `.init()`: Logs `[Poll Cron] Deprecated: Poll lifecycle scheduling is orchestrated by CommunityEngagementCron.` and does **not** register a node-cron timer.
  * `.runNow(now)`: Fully maintained and delegates directly to `poll.services.js`. Existing tests and scripts pass without modification.

---

## 15. Poll Read-Trigger Audit

* **Audit Finding**: Read-triggered activation exists in:
  1. `getPollById(pollId, orgId)`: If a poll is `Scheduled` and its `scheduleDate <= new Date()`, it transitions to `Active`, updates the database, and emits `poll_published`.
  2. `getActivePolls(orgId)`: Executes non-blocking `processScheduledPolls(new Date(), orgId)` before querying active polls.
* **Decision**: **Retained without modification**.
  * **Rationale**: Eliminates the "5-minute latency gap" between cron ticks. When a user requests a poll that has passed its scheduled start time, it immediately transitions to `Active`.
  * **Safety Verification**: All updates utilize atomic conditional filters (`status: 'Scheduled'`). Once updated, subsequent scheduler ticks or reads encounter `status: 'Active'` and perform zero updates, guaranteeing absolute idempotency and zero duplicate event generation.

---

## 16. Tests

All 8 test suites were executed sequentially using Node.js Native Test Runner.

| Suite Name | Test File | Passed | Failed | Status |
|:---|:---|:---:|:---:|:---:|
| **Phase 4 Scheduler & Lifecycle** | `tests/features/communityEngagement/communityEngagementCron.test.js` | **24** | **0** | **PASS** |
| **Community Engagement Gateway (Phases 2 & 3)** | `tests/features/communityEngagement/communityEngagementGateway.test.js` | **25** | **0** | **PASS** |
| **Poll Scheduling & Lifecycle** | `tests/features/poll/pollScheduling.service.test.js` | **6** | **0** | **PASS** |
| **Poll Governance Service** | `tests/features/poll/pollGovernance.service.test.js` | **15** | **0** | **PASS** |
| **Notice Governance Backend** | `tests/features/noticeBoard/noticeGovernance.service.test.js` | **10** | **0** | **PASS** |
| **Background Governance Scheduler** | `tests/features/scheduler/governanceScheduler.test.js` | **9** | **0** | **PASS** |
| **Granular RBAC Permissions** | `tests/features/rbac/governanceRbac.test.js` | **13** | **0** | **PASS** |
| **Async Outbox Notification Pipeline** | `tests/features/outbox/governanceOutbox.service.test.js` | **8** | **0** | **PASS** |
| **Total Automated Tests** | | **110** | **0** | **100% PASS** |

---

## 17. Security / Multi-Tenancy Verification

* **Authentication & Permissions**: The scheduler executes as an internal system background process (`actorId: 'System'`). It does not inject fake user credentials or bypass HTTP authentication middlewares.
* **Tenant Scoping**: All lifecycle operations operate strictly on database documents possessing valid `orgId` attributes. Notice unpinning is scoped to `updated.orgId`. Poll outcome evaluation is isolated to `poll.orgId`.
* **Outbox & Notification Recipient Leakage**: Outbox events payload contains the authoritative `orgId`. Audience recipient resolution in `AudienceService` enforces tenant boundaries, ensuring residents in Organization A never receive notices or polls from Organization B.
* **Cross-Tenant Processing**: No global cross-tenant joins or unauthenticated updates are executed.

---

## 18. Risks / Follow-ups

* No known Phase 4-specific blocking issues were identified within the tested scope.
* **Follow-up Note for Phase 7 (End-to-End Governance Testing)**: In high-scale production deployments with tens of thousands of active communities, consider evaluating distributed job locking (e.g., Redis Redlock) if backend server instances scale horizontally across multiple container replicas. For the current single/clustered server architecture, the in-process `isRunning` guard and atomic conditional updates (`findOneAndUpdate`) guarantee safe execution.

---

## 19. Phase 5 Readiness

The backend scheduler and lifecycle orchestration consolidation is complete and verified.

* **Next Approved Phase**: **Phase 5 — Web Unified Creation Wizard & Hub**
* Phase 5 has **not** been implemented, in strict compliance with the Phase 4 stop condition.
