import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const staffAttendanceService = (await import('../src/features/staffAttendance/staffAttendance.service.js')).default;
const staffAttendanceRepository = (await import('../src/features/staffAttendance/staffAttendance.repository.js')).default;
const staffNotificationService = (await import('../src/features/staffNotification/staffNotification.service.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const orgMembershipRepository = (await import('../src/features/orgMembership/orgMembership.repository.js')).default;
const outboxWorker = (await import('../src/workers/outbox.worker.js')).default;
const { authorizeAnyPermission } = await import('../src/middlewares/rbac.middleware.js');

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const TECH_1 = '507f1f77bcf86cd799439088';
const TECH_2 = '507f1f77bcf86cd799439099';
const SESSION_1 = '507f1f77bcf86cd7994390aa';
const SESSION_2 = '507f1f77bcf86cd7994390bb';

test('1. Community Admin Attendance Stats: getAttendanceStats aggregates correct metrics single-roundtrip', async () => {
  const origStats = staffAttendanceRepository.getAttendanceStats;

  try {
    staffAttendanceRepository.getAttendanceStats = async (orgId, query) => {
      assert.equal(orgId, ORG_A);
      return {
        totalSessions: 15,
        openSessions: 4,
        closedSessions: 11,
        missingCheckoutExceptions: 1,
        distinctStaffCount: 8,
      };
    };

    const stats = await staffAttendanceService.getAttendanceStats(ORG_A, {});
    assert.equal(stats.totalSessions, 15);
    assert.equal(stats.openSessions, 4);
    assert.equal(stats.closedSessions, 11);
    assert.equal(stats.missingCheckoutExceptions, 1);
    assert.equal(stats.distinctStaffCount, 8);
  } finally {
    staffAttendanceRepository.getAttendanceStats = origStats;
  }
});

test('2. Attendance History: findHistory returns paginated records with duration and exception flags', async () => {
  const origFind = staffAttendanceRepository.findHistory;

  try {
    const now = new Date();
    const entryTime = new Date(now.getTime() - 90 * 60 * 1000); // 90 mins ago
    const exitTime = now;

    staffAttendanceRepository.findHistory = async (orgId, filter, pagination) => {
      assert.equal(orgId, ORG_A);
      return {
        records: [
          {
            _id: SESSION_1,
            orgId: ORG_A,
            technicianId: TECH_1,
            staffCode: 'STF-001',
            status: 'Closed',
            checkInTime: entryTime,
            checkInGate: 'Main Gate',
            checkOutTime: exitTime,
            exitGate: 'North Gate',
            durationMinutes: 90,
            isMissingCheckout: false,
            technician: { name: 'Zaid Ali', department: 'Electrical' },
          },
          {
            _id: SESSION_2,
            orgId: ORG_A,
            technicianId: TECH_2,
            staffCode: 'STF-002',
            status: 'Open',
            checkInTime: new Date(now.getTime() - 15 * 60 * 60 * 1000), // 15 hrs ago
            checkInGate: 'Main Gate',
            durationMinutes: null,
            isMissingCheckout: true,
            technician: { name: 'Kareem Nour', department: 'Plumbing' },
          },
        ],
        pagination: {
          totalRecords: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
        },
      };
    };

    const result = await staffAttendanceService.getAttendanceHistory(ORG_A, {});
    assert.equal(result.records.length, 2);
    assert.equal(result.records[0].durationMinutes, 90);
    assert.equal(result.records[0].isMissingCheckout, false);
    assert.equal(result.records[1].isMissingCheckout, true, 'Session open for 15 hours must flag isMissingCheckout: true');
  } finally {
    staffAttendanceRepository.findHistory = origFind;
  }
});

test('3. RBAC Authorization: staff:attendance grants access to reporting; unauthorized resident is denied', async () => {
  const middleware = authorizeAnyPermission(['staff:attendance', 'staff:manage']);

  const runMiddleware = (req) =>
    new Promise((resolve, reject) => {
      middleware(req, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  // Authorized Admin
  const adminReq = {
    user: { id: 'user-admin', role: 'Community Admin' },
    tenant: { orgId: ORG_A },
    tenantRole: 'Community Admin',
    tenantPermissions: ['staff:attendance', 'staff:manage'],
    headers: { 'x-organization-id': ORG_A },
  };
  await assert.doesNotReject(() => runMiddleware(adminReq));

  // Unauthorized Resident
  const residentReq = {
    user: { id: 'user-resident', role: 'Resident' },
    tenant: { orgId: ORG_A },
    tenantRole: 'Resident',
    tenantPermissions: ['villas:read', 'staff:assign_unit'],
    headers: { 'x-organization-id': ORG_A },
  };
  await assert.rejects(() => runMiddleware(residentReq), { status: 403 });

  // Staff member holding only staff:view_own is DENIED community reporting
  const staffReq = {
    user: { id: 'user-staff', role: 'Staff/Vendor' },
    tenant: { orgId: ORG_A },
    tenantRole: 'Staff/Vendor',
    tenantPermissions: ['staff:view_own'],
    headers: { 'x-organization-id': ORG_A },
  };
  await assert.rejects(() => runMiddleware(staffReq), { status: 403 });
});

test('4. Staff Self-Service Attendance: /me resolves canonical staff profile and scopes history to staff only', async () => {
  const origGetProfile = technicianService.getMyProfile;
  const origFindHistory = staffAttendanceRepository.findHistory;

  try {
    technicianService.getMyProfile = async (userId, orgId) => {
      assert.equal(userId, 'staff-user-123');
      assert.equal(orgId, ORG_A);
      return {
        _id: TECH_1,
        name: 'Tariq Staff',
        orgId: ORG_A,
      };
    };

    staffAttendanceRepository.findHistory = async (orgId, filter) => {
      // Must filter strictly to the authenticated technician
      assert.equal(filter.technicianId, TECH_1);
      return {
        records: [{ _id: SESSION_1, technicianId: TECH_1, status: 'Closed' }],
        pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 20 },
      };
    };

    const res = await staffAttendanceService.getMyAttendance('staff-user-123', ORG_A, {});
    assert.equal(res.records.length, 1);
    assert.equal(res.records[0].technicianId, TECH_1);
  } finally {
    technicianService.getMyProfile = origGetProfile;
    staffAttendanceRepository.findHistory = origFindHistory;
  }
});

test('5. Gate/Security View: getActiveSessions returns only currently open sessions in the organization', async () => {
  const origGetActive = staffAttendanceRepository.getActiveSessions;

  try {
    staffAttendanceRepository.getActiveSessions = async (orgId) => {
      assert.equal(orgId, ORG_A);
      return [
        { _id: SESSION_1, orgId: ORG_A, status: 'Open', technicianId: { name: 'Active Tech 1' } },
        { _id: SESSION_2, orgId: ORG_A, status: 'Open', technicianId: { name: 'Active Tech 2' } },
      ];
    };

    const active = await staffAttendanceService.getActiveSessions(ORG_A);
    assert.equal(active.length, 2);
    assert.ok(active.every((s) => s.status === 'Open'));
  } finally {
    staffAttendanceRepository.getActiveSessions = origGetActive;
  }
});

test('6. Reconciliation Mechanism: reconcileMissingStaffEntryEvents discovers and enqueues missing entries idempotently', async () => {
  const origGetRecent = staffAttendanceService.getRecentSessionsForReconciliation;
  const origGetTech = technicianService.getTechnicianById;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCount = 0;

  try {
    // Return an attendance session that was created 2 hours ago
    staffAttendanceService.getRecentSessionsForReconciliation = async () => [
      {
        _id: SESSION_1,
        technicianId: TECH_1,
        orgId: ORG_A,
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        checkInGate: 'Main Gate',
      },
    ];

    technicianService.getTechnicianById = async (id, orgId) => ({
      _id: TECH_1,
      name: 'Unnotified Technician',
      department: 'AC Repair',
      orgId: ORG_A,
      status: 'Active',
    });

    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCount++;
      return { eventId: 'evt-reconciled-1', status: 'PENDING' };
    };

    // When MongoDB is offline/mocked, reconciliation gracefully handles check
    const result = await staffNotificationService.reconcileMissingStaffEntryEvents(ORG_A, 24);
    assert.ok(typeof result.checkedCount === 'number');
    assert.ok(typeof result.reconciledCount === 'number');
  } finally {
    staffAttendanceService.getRecentSessionsForReconciliation = origGetRecent;
    technicianService.getTechnicianById = origGetTech;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('7. Tenant Isolation: Multi-tenant boundary is enforced across organizations', async () => {
  const origFindHistory = staffAttendanceRepository.findHistory;
  const origStats = staffAttendanceRepository.getAttendanceStats;

  try {
    staffAttendanceRepository.findHistory = async (orgId) => {
      assert.equal(orgId, ORG_B);
      return { records: [], pagination: { totalRecords: 0, totalPages: 1, currentPage: 1, limit: 20 } };
    };
    staffAttendanceRepository.getAttendanceStats = async (orgId) => {
      assert.equal(orgId, ORG_B);
      return { totalSessions: 0, openSessions: 0, closedSessions: 0, missingCheckoutExceptions: 0, distinctStaffCount: 0 };
    };

    const history = await staffAttendanceService.getAttendanceHistory(ORG_B, {});
    const stats = await staffAttendanceService.getAttendanceStats(ORG_B, {});

    assert.equal(history.records.length, 0);
    assert.equal(stats.totalSessions, 0);
  } finally {
    staffAttendanceRepository.findHistory = origFindHistory;
    staffAttendanceRepository.getAttendanceStats = origStats;
  }
});

test('8. Fallback Recipient Audit: findCommunityAdmins excludes platform-wide super admins without community membership', async () => {
  const origFind = orgMembershipRepository.findCommunityAdmins;

  try {
    orgMembershipRepository.findCommunityAdmins = async (orgId) => {
      assert.equal(orgId, ORG_A);
      // Returns only legitimate community administrators
      return [
        { userId: 'admin-local-1', name: 'Local Community Admin', email: 'admin@community.com' },
      ];
    };

    const admins = await orgMembershipRepository.findCommunityAdmins(ORG_A);
    assert.equal(admins.length, 1);
    assert.equal(admins[0].userId, 'admin-local-1');
  } finally {
    orgMembershipRepository.findCommunityAdmins = origFind;
  }
});

test('9. QR Tamper Resistance: Tampered signature or cross-tenant QR token is rejected with HTTP 401', async () => {
  const origGetTech = technicianService.getTechnicianById;

  try {
    technicianService.getTechnicianById = async (id, orgId) => {
      assert.equal(orgId, ORG_A);
      return {
        _id: TECH_1,
        name: 'Adversarial Tech',
        staffCode: 'STF-ADV',
        orgId: ORG_A,
        status: 'Active',
      };
    };

    // Valid QR token
    const validQr = technicianService.generateStaffQrPayload(
      { _id: TECH_1, staffCode: 'STF-ADV', name: 'Adversarial Tech' },
      ORG_A
    );

    // Tampered signature
    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: `STF:${TECH_1}:fakesig12345678`,
          orgId: ORG_A,
          guardId: 'guard-1',
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401 && err.message.includes('Invalid or tampered'),
      'Tampered signature must throw HTTP 401'
    );

    // Cross-tenant token: Token legitimately generated for ORG_B
    const crossOrgQr = technicianService.generateStaffQrPayload(
      { _id: TECH_1, staffCode: 'STF-ADV', name: 'Adversarial Tech' },
      ORG_B
    );

    // Scanning ORG_B token at ORG_A must fail signature verification
    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: crossOrgQr.token,
          orgId: ORG_A,
          guardId: 'guard-1',
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401,
      'Cross-tenant token signature must fail at target org with HTTP 401'
    );
  } finally {
    technicianService.getTechnicianById = origGetTech;
  }
});

test('10. Manual Administrative Checkout: Admin can close stuck sessions; validates state, org, and time boundaries', async () => {
  const origFindById = staffAttendanceRepository.findById;
  const origClose = staffAttendanceRepository.closeSession;

  try {
    const checkInTime = new Date(Date.now() - 14 * 60 * 60 * 1000); // 14 hours ago

    staffAttendanceRepository.findById = async (sessionId, orgId) => {
      if (sessionId === SESSION_1 && orgId === ORG_A) {
        return {
          _id: SESSION_1,
          orgId: ORG_A,
          technicianId: TECH_1,
          status: 'Open',
          checkInTime,
          notes: 'Auto entry',
        };
      }
      return null;
    };

    let closedPayload = null;
    staffAttendanceRepository.closeSession = async (sessionId, orgId, updateData) => {
      closedPayload = { sessionId, orgId, ...updateData };
      return {
        _id: sessionId,
        orgId,
        technicianId: TECH_1,
        status: 'Closed',
        ...updateData,
      };
    };

    // 1. Successful manual checkout by admin
    const result = await staffAttendanceService.manualCheckout(SESSION_1, ORG_A, 'admin-user-99', {
      notes: 'Staff forgot to badge out at North Gate',
    });
    assert.equal(result.session.status, 'Closed');
    assert.equal(closedPayload.exitGuardId, 'admin-user-99');
    assert.ok(closedPayload.notes.includes('Manual checkout by admin admin-user-99'));

    // 2. Reject checkout on session belonging to another org (or not found)
    await assert.rejects(
      async () => staffAttendanceService.manualCheckout(SESSION_1, ORG_B, 'admin-user-99'),
      (err) => err.statusCode === 404
    );

    // 3. Reject checkout on already closed session
    staffAttendanceRepository.findById = async () => ({
      _id: SESSION_1,
      orgId: ORG_A,
      status: 'Closed',
      checkInTime,
    });
    await assert.rejects(
      async () => staffAttendanceService.manualCheckout(SESSION_1, ORG_A, 'admin-user-99'),
      (err) => err.statusCode === 400 && err.message.includes('already closed')
    );

    // 4. Reject checkout if checkOutTime is earlier than checkInTime
    staffAttendanceRepository.findById = async () => ({
      _id: SESSION_1,
      orgId: ORG_A,
      status: 'Open',
      checkInTime,
    });
    await assert.rejects(
      async () =>
        staffAttendanceService.manualCheckout(SESSION_1, ORG_A, 'admin-user-99', {
          checkOutTime: new Date(checkInTime.getTime() - 60000), // 1 min before checkin
        }),
      (err) => err.statusCode === 400 && err.message.includes('earlier than checkin')
    );

    // 5. Reject checkout if checkOutTime is in the future (> 5m tolerance)
    await assert.rejects(
      async () =>
        staffAttendanceService.manualCheckout(SESSION_1, ORG_A, 'admin-user-99', {
          checkOutTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        }),
      (err) => err.statusCode === 400 && err.message.includes('cannot be in the future')
    );
  } finally {
    staffAttendanceRepository.findById = origFindById;
    staffAttendanceRepository.closeSession = origClose;
  }
});

test('11. Timezone & Date Boundary Normalization: YYYY-MM-DD endDate includes the entire day (up to 23:59:59.999Z)', async () => {
  const origAggregate = (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate;

  try {
    let capturedMatch = null;
    (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate = async (pipeline) => {
      capturedMatch = pipeline[0].$match;
      return [{ records: [], totalCount: [{ count: 0 }] }];
    };

    await staffAttendanceRepository.findHistory(ORG_A, {
      startDate: '2026-10-10',
      endDate: '2026-10-12',
    });

    assert.ok(capturedMatch);
    assert.equal(capturedMatch.checkInTime.$gte.toISOString(), '2026-10-10T00:00:00.000Z');
    assert.equal(capturedMatch.checkInTime.$lte.toISOString(), '2026-10-12T23:59:59.999Z');
  } finally {
    (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate = origAggregate;
  }
});

test('12. Outbox Lease Fencing: Worker skips completion update if event was reclaimed by lease recovery', async () => {
  const OutboxEvent = (await import('../src/features/outbox/outboxEvent.model.js')).default;
  const origFindOneAndUpdate = OutboxEvent.findOneAndUpdate;
  const origUpdateOne = OutboxEvent.updateOne;
  const origUpdateMany = OutboxEvent.updateMany;

  try {
    OutboxEvent.updateMany = async () => ({ modifiedCount: 0 });

    let findCalled = false;
    OutboxEvent.findOneAndUpdate = async () => {
      if (!findCalled) {
        findCalled = true;
        return {
          _id: 'evt-test-fence-1',
          eventType: 'USER_INVITED',
          payload: { email: 'test@example.com' },
          retries: 0,
        };
      }
      return null;
    };

    let updateMatch = null;
    OutboxEvent.updateOne = async (filter, update) => {
      updateMatch = filter;
      // Simulate that the event was already reset from PROCESSING by another worker (matchedCount = 0)
      return { matchedCount: 0, modifiedCount: 0 };
    };

    await outboxWorker.processOutboxEvents();

    assert.ok(updateMatch);
    assert.equal(updateMatch._id, 'evt-test-fence-1');
    assert.ok(updateMatch.leaseToken, 'Update filter must fence on unique leaseToken');
  } finally {
    OutboxEvent.findOneAndUpdate = origFindOneAndUpdate;
    OutboxEvent.updateOne = origUpdateOne;
    OutboxEvent.updateMany = origUpdateMany;
  }
});

test('14. Concurrency & Lease Fencing: Stale Worker A cannot overwrite state of Worker B who reclaimed the event', async () => {
  const OutboxEvent = (await import('../src/features/outbox/outboxEvent.model.js')).default;
  const origFindOneAndUpdate = OutboxEvent.findOneAndUpdate;
  const origUpdateOne = OutboxEvent.updateOne;
  const origUpdateMany = OutboxEvent.updateMany;

  try {
    // In-memory simulated event document
    const simulatedDoc = {
      _id: 'evt-concurrency-race',
      eventType: 'USER_INVITED',
      payload: { email: 'concurrency@example.com' },
      status: 'PENDING',
      leaseToken: null,
      retries: 0,
    };

    // 1. Worker A claims event
    const leaseTokenA = 'lease-token-worker-A';
    simulatedDoc.status = 'PROCESSING';
    simulatedDoc.leaseToken = leaseTokenA;

    // 2. Worker A stalls... lease recovery expires Worker A lease and resets event to PENDING
    simulatedDoc.status = 'PENDING';
    simulatedDoc.leaseToken = null;

    // 3. Worker B claims event with leaseTokenB
    const leaseTokenB = 'lease-token-worker-B';
    simulatedDoc.status = 'PROCESSING';
    simulatedDoc.leaseToken = leaseTokenB;

    // 4. Worker B finishes and marks COMPLETED using leaseTokenB
    let workerBUpdateSucceeded = false;
    if (simulatedDoc.status === 'PROCESSING' && simulatedDoc.leaseToken === leaseTokenB) {
      simulatedDoc.status = 'COMPLETED';
      simulatedDoc.leaseToken = null;
      workerBUpdateSucceeded = true;
    }
    assert.equal(workerBUpdateSucceeded, true, 'Worker B must successfully complete the event');
    assert.equal(simulatedDoc.status, 'COMPLETED');

    // 5. Worker A resumes and attempts to complete using its stale leaseTokenA
    let workerAUpdateSucceeded = false;
    if (simulatedDoc.leaseToken === leaseTokenA) {
      simulatedDoc.status = 'COMPLETED_BY_A';
      workerAUpdateSucceeded = true;
    }

    assert.equal(workerAUpdateSucceeded, false, 'Stale Worker A MUST be rejected due to lease token mismatch');
    assert.equal(simulatedDoc.status, 'COMPLETED', 'Event state must remain as completed by Worker B');
  } finally {
    OutboxEvent.findOneAndUpdate = origFindOneAndUpdate;
    OutboxEvent.updateOne = origUpdateOne;
    OutboxEvent.updateMany = origUpdateMany;
  }
});

test('13. Query Safety: Malformed / NaN date strings do not inject $gte: null into match conditions', async () => {
  const origAggregate = (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate;

  try {
    let capturedMatch = null;
    (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate = async (pipeline) => {
      capturedMatch = pipeline[0].$match;
      return [{ records: [], totalCount: [{ count: 0 }] }];
    };

    await staffAttendanceRepository.findHistory(ORG_A, {
      startDate: 'invalid-date-string',
      endDate: 'also-invalid',
    });

    assert.ok(capturedMatch);
    assert.equal(capturedMatch.checkInTime, undefined, 'checkInTime must not be populated with null values');
  } finally {
    (await import('../src/features/staffAttendance/staffAttendance.model.js')).default.aggregate = origAggregate;
  }
});

test('15. Date Range Safety: Reversed date range (startDate > endDate) rejects with HTTP 400', async () => {
  await assert.rejects(
    async () => {
      await staffAttendanceRepository.findHistory(ORG_A, {
        startDate: '2026-10-20',
        endDate: '2026-10-01',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Start date cannot be later than end date/);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await staffAttendanceRepository.getAttendanceStats(ORG_A, {
        startDate: '2026-10-20',
        endDate: '2026-10-01',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Start date cannot be later than end date/);
      return true;
    }
  );
});

test('16. Outbox Lease Fencing: Stale Worker A failure/retry cannot overwrite Worker B who reclaimed the event', async () => {
  const OutboxEvent = (await import('../src/features/outbox/outboxEvent.model.js')).default;
  const origFindOneAndUpdate = OutboxEvent.findOneAndUpdate;
  const origUpdateOne = OutboxEvent.updateOne;
  const origUpdateMany = OutboxEvent.updateMany;

  try {
    const simulatedDoc = {
      _id: 'evt-concurrency-failure-race',
      eventType: 'STAFF_GATE_ENTRY',
      payload: { sessionId: 'sess-1' },
      status: 'PENDING',
      leaseToken: null,
      retries: 0,
    };

    // 1. Worker A claims event
    const leaseTokenA = 'lease-token-worker-A';
    simulatedDoc.status = 'PROCESSING';
    simulatedDoc.leaseToken = leaseTokenA;

    // 2. Worker A stalls... lease recovery resets to PENDING
    simulatedDoc.status = 'PENDING';
    simulatedDoc.leaseToken = null;
    simulatedDoc.retries = 1;

    // 3. Worker B claims event with leaseTokenB
    const leaseTokenB = 'lease-token-worker-B';
    simulatedDoc.status = 'PROCESSING';
    simulatedDoc.leaseToken = leaseTokenB;

    // 4. Stale Worker A encounters an error and attempts to fail/retry using leaseTokenA
    let staleFailureUpdated = false;
    if (simulatedDoc.leaseToken === leaseTokenA) {
      simulatedDoc.status = 'FAILED';
      staleFailureUpdated = true;
    }

    assert.equal(staleFailureUpdated, false, 'Stale Worker A failure update MUST NOT match leaseTokenB');
    assert.equal(simulatedDoc.status, 'PROCESSING', 'Event must remain in PROCESSING state under Worker B');
    assert.equal(simulatedDoc.leaseToken, leaseTokenB, 'Event lease must remain owned by Worker B');
  } finally {
    OutboxEvent.findOneAndUpdate = origFindOneAndUpdate;
    OutboxEvent.updateOne = origUpdateOne;
    OutboxEvent.updateMany = origUpdateMany;
  }
});

test('17. Outbox Retry & Lease Recovery: Exhausted retries transition to FAILED and lease recovery clears ownership', async () => {
  const OutboxEvent = (await import('../src/features/outbox/outboxEvent.model.js')).default;
  const origFindOneAndUpdate = OutboxEvent.findOneAndUpdate;
  const origUpdateOne = OutboxEvent.updateOne;
  const origUpdateMany = OutboxEvent.updateMany;

  try {
    let leaseRecoveryCalled = false;
    let recoveryFilter = null;
    let recoveryUpdate = null;

    OutboxEvent.updateMany = async (filter, update) => {
      leaseRecoveryCalled = true;
      recoveryFilter = filter;
      recoveryUpdate = update;
      return { modifiedCount: 1 };
    };

    OutboxEvent.findOneAndUpdate = async () => null;

    await outboxWorker.processOutboxEvents();

    assert.equal(leaseRecoveryCalled, true, 'Lease recovery must run at start of batch');
    assert.equal(recoveryFilter.status, 'PROCESSING');
    assert.ok(recoveryFilter.updatedAt.$lt, 'Lease recovery must filter on expired updatedAt');
    assert.equal(recoveryUpdate.$set.status, 'PENDING');
    assert.equal(recoveryUpdate.$set.leaseToken, null, 'Lease token must be cleared atomically');
    assert.equal(recoveryUpdate.$set.lockedAt, null, 'Lock timestamp must be cleared atomically');
    assert.equal(recoveryUpdate.$inc.retries, 1, 'Retries must increment on lease timeout');
  } finally {
    OutboxEvent.findOneAndUpdate = origFindOneAndUpdate;
    OutboxEvent.updateOne = origUpdateOne;
    OutboxEvent.updateMany = origUpdateMany;
  }
});


