# NAHOM — COMMUNITY ENGAGEMENT UNIFICATION
# MASTER PHASE 2 IMPLEMENTATION REPORT: UNIFIED BACKEND GATEWAY & CREATE API

**Project:** Nahom / Connect Harmony / Manage-My-Gate  
**Feature:** Community Engagement (Notice Board + Poll Unification)  
**Phase:** **PHASE 2 — UNIFIED BACKEND GATEWAY & CREATE API**  
**Status:** **COMPLETED**  
**Date:** September 22, 2026  
**Author:** AI Pair Programming Agent (Antigravity)  

---

## 1. Status
**COMPLETED**

The Phase 2 Unified Backend Gateway & Create API has been fully designed, implemented, and verified against all functional, security, and architectural acceptance criteria. 

Zero breaking changes were introduced to existing Notice or Poll APIs. Domain separation ("One Model, One Feature") has been strictly maintained.

---

## 2. Repository Discovery
Prior to implementation, the codebase was inspected to identify and reuse all established domain services, repositories, and cross-cutting infrastructure:

- **Notice Domain (`backend/src/features/noticeBoard/`):**
  - Service: `noticeBoardService.createNotice(noticeData, userId, orgId)` in `noticeBoard.service.js`.
  - Validator: `createNoticeRules` express-validator chains in `noticeBoard.validator.js`.
  - Upload & Security: `noticeUpload` and `noticeImageSignatureValidator` in `middlewares/noticeBoard.upload.js`.
  - Events & Audit: `noticeBoard.events.js` (`NOTICE_CREATED`) and `noticeBoard.audit.js`.
- **Poll Domain (`backend/src/features/poll/`):**
  - Service: `pollService.createPoll(pollData)` in `poll.services.js`.
  - Validator: `createPollRules()` express-validator chains in `poll.validateRules.js`.
  - Scheduling Support: Phase 1 extension with `'Scheduled'` status enum and `scheduleDate`.
  - Events & Audit: `poll.events.js` (`poll_created`, `poll_published`), `poll.notification.js`, and `poll.audit.js`.
- **Audience Service (`backend/src/features/audience/`):**
  - Service: `AudienceService.validateTarget(targetAudience, orgId, session)` and `countEligibleRecipients` in `audience.service.js`.
  - Constants: `AUDIENCE_TARGET_TYPES` (`ALL`, `ROLES`, `BLOCKS`, `UNITS`, `RESIDENCY_TYPES`, `CUSTOM`).
- **Cross-Cutting Security & Tenant Middlewares:**
  - Authentication: `isAuthenticated` in `backend/src/middlewares/auth.middleware.js`.
  - Tenant Isolation: `tenantContext` in `backend/src/middlewares/tenant.middleware.js`.
  - RBAC: `authorizePermission` in `backend/src/middlewares/rbac.middleware.js`.
- **Permission & Role Architecture (`backend/src/utils/permissionMapper.js`):**
  - `mapPermission` and `expandUserPermissions` for role-hierarchy resolution.
- **Outbox Architecture (`backend/src/features/communityEngagement/` & `backend/src/features/outbox/`):**
  - Standardized Outbox event helper: `enqueueCommunityEngagementOutbox` in `communityEngagement.outbox.js`.

---

## 3. Files Created
1. `backend/src/features/communityEngagement/communityEngagement.validate.js`
   - Common validation rules and dynamic domain delegation middleware (`validateEngagementContent`).
   - Normalizes envelope fields (`audience` -> `targetAudience`, string options -> `{ text, votesCount: 0 }`).
   - Dynamically invokes `validate(createNoticeRules)` or `validate(createPollRules())`.
2. `backend/src/features/communityEngagement/communityEngagement.service.js`
   - Orchestration service (`CommunityEngagementService`) with constructor dependency injection.
   - Enforces granular content-type permissions (`verifyContentTypePermission`).
   - Delegates cleanly to `noticeBoardService.createNotice` and `pollService.createPoll`.
3. `backend/src/features/communityEngagement/communityEngagement.controller.js`
   - Thin Express controller extracting request payloads, invoking the orchestrator service, and returning standardized `res.success` responses.
4. `backend/src/features/communityEngagement/communityEngagement.router.js`
   - Express router declaring `POST /content` protected with `isAuthenticated`, `tenantContext`, `authorizePermission`, `noticeUpload`, and `validateEngagementContent`.
5. `backend/tests/features/communityEngagement/communityEngagementGateway.test.js`
   - Automated unit and integration test suite covering all gateway behaviors (14/14 tests passing).

---

## 4. Files Modified
1. `backend/src/features/communityEngagement/index.js`
   - Updated barrel exports to expose `CommunityEngagementService`, `CommunityEngagementController`, `validateEngagementContent`, and `communityEngagementRouter`.
2. `backend/src/routes/api.routes.js`
   - Imported `communityEngagementRouter` and registered the route at `/community-engagement` (accessible at `/api/community-engagement` and `/api/v1/community-engagement`).

---

## 5. Files Deleted
**None** (Zero files deleted in Phase 2).

---

## 6. New API Specification
- **Endpoint:** `POST /api/community-engagement/content` (also accessible at `/api/v1/community-engagement/content`)
- **HTTP Method:** `POST`
- **Headers:** 
  - `Authorization: Bearer <jwt>`
  - `x-organization-id: <orgId>` (or token org context)
  - `Content-Type: application/json` or `multipart/form-data`
- **Supported Content Types:**
  - `contentType: "NOTICE"`: Creates a community broadcast notice with optional audience targeting, priority, attachments, acknowledgment tracking, and scheduling.
  - `contentType: "POLL"`: Creates an interactive community poll with options, voting mode, choice type, results visibility, anonymity, quorum threshold, and scheduling.
- **Rejection of Invalid Types:** Missing `contentType` or unsupported types (e.g. `"SURVEY"`) are rejected with HTTP 400 (`"Invalid contentType: '...'. Allowed values are: NOTICE, POLL"`).

---

## 7. Request Flow Architecture
```
Client: POST /api/community-engagement/content
  ↓
isAuthenticated (backend/src/middlewares/auth.middleware.js)
  ↓
tenantContext (backend/src/middlewares/tenant.middleware.js)
  ↓
authorizePermission(['notices', 'polls', 'community_engagement'], ...)
  ↓
validateEngagementContent (backend/src/features/communityEngagement/communityEngagement.validate.js)
  ↓
contentType Inspection
       /                      \
      /                        \
     v                          v
contentType: NOTICE        contentType: POLL
     |                          |
     v                          v
createNoticeRules          createPollRules()
     |                          |
     v                          v
noticeBoardService         pollService
  .createNotice()            .createPoll()
     |                          |
     v                          v
Notice Transaction & Model Poll Transaction & Model
     |                          |
     v                          v
Notice Domain Events       Poll Domain Events
(NOTICE_CREATED)           (poll_created / poll_published)
     |                          |
     +------------+-------------+
                  |
                  v
       Outbox Enqueue & Audit Log
                  |
                  v
     Standardized HTTP 201 Response
```

---

## 8. Notice Integration
- When `contentType === 'NOTICE'`:
  - Request body normalizes `audience` or `targetAudience`.
  - Captures uploaded files via `noticeUpload` if provided.
  - Gateway delegates to `noticeBoardService.createNotice(noticeData, userId, orgId)`.
  - `noticeBoardService` validates the target audience using `audienceService.validateTarget`, handles priority governance, manages single-pinned notices, opens and commits its atomic MongoDB transaction, emits `NOTICE_CREATED`, and records audit logs.
  - Returns created Notice wrapped with `contentType: 'NOTICE'`:
    ```json
    {
      "success": true,
      "message": "Notice created successfully",
      "data": {
        "contentType": "NOTICE",
        "_id": "67...",
        "title": "Water Supply Maintenance",
        "description": "...",
        "category": "Maintenance",
        "priority": "High",
        "status": "Published"
      }
    }
    ```

---

## 9. Poll Integration
- When `contentType === 'POLL'`:
  - Request body normalizes `options`: accepts array of strings (`["Yes", "No"]`) or objects (`[{ text: "Yes" }]`), transforming them into `{ text: string, votesCount: 0 }`.
  - Evaluates `scheduleDate`: if `scheduleDate > now`, status defaults to `'Scheduled'`; otherwise defaults to `'Active'`.
  - Gateway delegates to `pollService.createPoll(pollData)`.
  - `pollService` validates the target audience using `audienceService.validateTarget`, calculates eligible voters, opens and commits its atomic MongoDB transaction, emits `poll_created` or `poll_published`, and records audit logs.
  - Returns created Poll wrapped with `contentType: 'POLL'`:
    ```json
    {
      "success": true,
      "message": "Poll created successfully",
      "data": {
        "contentType": "POLL",
        "_id": "67...",
        "question": "Should the clubhouse timing be extended?",
        "options": [
          { "text": "Yes", "votesCount": 0 },
          { "text": "No", "votesCount": 0 }
        ],
        "status": "Active"
      }
    }
    ```

---

## 10. Audience Integration
- The gateway does **not** duplicate audience eligibility or validation logic.
- Both Notice and Poll domains continue to invoke the existing authoritative `audienceService.validateTarget(targetAudience, orgId, session)` within their respective database transactions.
- Supported target types (`ALL`, `ROLES`, `BLOCKS`, `UNITS`, `RESIDENCY_TYPES`, `CUSTOM`) function identically whether created via legacy endpoints or the unified gateway.

---

## 11. Scheduling Integration
- **Notice Scheduling:** `scheduleDate` is passed directly to `noticeBoardService`. If `scheduleDate <= now`, it auto-publishes; otherwise status is set to `Scheduled`.
- **Poll Scheduling (Phase 1 Support):** `scheduleDate` is passed directly to `pollService.createPoll`. When `scheduleDate > now`, status is set to `'Scheduled'` and chronologic validation (`endDate > scheduleDate`) is enforced by `poll.validateRules.js` and `pollService`.
- Auto-activation remains owned by background crons (`noticeBoard.cron.js`, `poll.cron.js`) and on-demand read triggers. The gateway contains zero scheduler code.

---

## 12. Authentication / RBAC
- **Authentication:** `isAuthenticated` verifies the Bearer JWT and sets `req.user`. Unauthenticated calls return HTTP 401.
- **Route Authorization:** `authorizePermission(['notices', 'polls', 'community_engagement'], CONTENT_MANAGE_PERMISSIONS)` guards the route.
- **Granular Content-Type Authorization:** The orchestration service (`verifyContentTypePermission`) verifies that non-admin callers requesting `NOTICE` possess `notices:create` or `notices:manage_notices`, and callers requesting `POLL` possess `polls:create`, `notices:manage_polls`, or `polls:manage`.
- **Admin Roles:** Super Admin, Community Admin, Admin, and Platform Super Admin bypass permission checks seamlessly.

---

## 13. Tenant Isolation
- `tenantContext` resolves the authoritative tenant context from `x-organization-id` header and authenticated token, verifying membership.
- Client-supplied `orgId` in the JSON request body is strictly ignored in favor of `req.tenant.orgId`.
- Domain services (`createNotice`, `createPoll`) receive `orgId` exclusively from `req.tenant.orgId`, guaranteeing complete tenant boundary isolation.

---

## 14. Transaction Handling
- In strict adherence to the project rules, the Community Engagement gateway does **not** initiate an outer database transaction.
- `noticeBoardService.createNotice` starts, commits, or aborts its own `mongoose.ClientSession` transaction.
- `pollService.createPoll` starts, commits, or aborts its own `mongoose.ClientSession` transaction.
- Zero nested transactions are created.

---

## 15. Outbox / Notification
- When `createNotice` commits, it emits `NOTICE_CREATED` on `noticeEvents`.
- When `createPoll` commits, it emits `poll_created` or `poll_published` on `pollEvents`.
- `noticeBoard.events.js` and `poll.notification.js` process these domain events and enqueue outbox records via `enqueueCommunityEngagementOutbox`.
- The gateway does not send notifications directly and does not alter the outbox worker.

---

## 16. Audit
- Notice creation logs `action: 'NOTICE_CREATED'` via `auditLogService.logEvent`.
- Poll creation logs `action: 'POLL_CREATED'` via `auditLogService.logEvent`.
- Existing audit trails and query dashboards remain 100% compatible.

---

## 17. Event Naming Verification
- **Audit Findings:**
  - Notice domain consistently emits `NOTICE_CREATED`, `NOTICE_PUBLISHED`, `NOTICE_EXPIRED`, and `NOTICE_ACKNOWLEDGEMENT_REMINDER`.
  - Poll domain consistently emits `poll_created` (for drafts/scheduled), `poll_published` (for active polls), `poll_closed`, `poll_closing_soon`, and `poll_finalized`.
  - In `backend/src/features/poll/poll.events.js` and `poll.notification.js`, the event name used for poll activation/publishing is `poll_published` (with audit action `POLL_PUBLISHED`).
  - In `communityEngagement.constants.js`, `ENGAGEMENT_OUTBOX_EVENT_TYPES` defined `POLL_ACTIVATED: 'POLL_ACTIVATED'` alongside `POLL_PUBLISHED`. For runtime consistency, `poll.notification.js` maps `poll_published` to `POLL_PUBLISHED`. No conflicting duplicate event emissions exist.

---

## 18. Backward Compatibility
- `POST /api/notices` remains active and continues to invoke `noticeController.create` -> `noticeBoardService.createNotice`.
- `POST /api/polls` remains active and continues to invoke `pollController.createPoll` -> `pollService.createPoll`.
- Both legacy creation APIs and the new unified gateway call the exact same underlying domain services. Zero breaking changes were introduced.

---

## 19. Tests

| Test Suite | Command | Result | Pass Rate | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Community Engagement Gateway (New)** | `node --test tests/features/communityEngagement/communityEngagementGateway.test.js` | **14 / 14 passed** | **100%** | 2.31s |
| **Poll Scheduling, Governance & Notice Governance** | `node --test tests/features/poll/pollScheduling.service.test.js tests/features/poll/pollGovernance.service.test.js tests/features/noticeBoard/noticeGovernance.service.test.js` | **31 / 31 passed** | **100%** | 2.74s |
| **Governance Scheduler & RBAC Permissions** | `node --test tests/features/scheduler/governanceScheduler.test.js tests/features/rbac/governanceRbac.test.js` | **21 / 21 passed** | **100%** | 2.44s |
| **Total Automated Tests** | | **66 / 66 passed** | **100%** | |

- **Tests Passed:** 66
- **Tests Failed:** 0
- **Tests Skipped:** 0

---

## 20. Issues / Risks
- **Option Normalization for Polls:** Web and mobile clients may send `options` as either an array of strings (`["Option A", "Option B"]`) or an array of objects (`[{ text: "Option A" }]`). The gateway normalizes string options to `{ text: opt }` before invoking validator chains and service methods to eliminate validation mismatch.
- **Target Audience Format:** Some clients submit `audience` while others submit `targetAudience`. The gateway normalizes both, mapping `audience` to `targetAudience` if the latter is absent.
- **Multi-Part Uploads:** Notice creation allows image attachments via `multipart/form-data`. The gateway router equips `noticeUpload.array('images', 5)` to support both JSON and multipart payloads seamlessly.

---

## 21. Phase 3 Readiness
**READY**

Phase 2 establishes a verified unified creation gateway:
1. `POST /api/community-engagement/content` provides a single entry point for creating Notices and Polls.
2. Complete domain isolation and the "One Model = One Feature" rule is strictly maintained.
3. The backend is completely ready for Phase 3 (Unified Feed Aggregation API or Web Creation UI) upon user instruction.

---
*(Phase 2 is complete. Standing by for your instructions before proceeding to any further phase.)*
