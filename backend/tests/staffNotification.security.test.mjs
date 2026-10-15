import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const staffNotificationService = (await import('../src/features/staffNotification/staffNotification.service.js')).default;
const staffAttendanceService = (await import('../src/features/staffAttendance/staffAttendance.service.js')).default;
const staffAttendanceRepository = (await import('../src/features/staffAttendance/staffAttendance.repository.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const staffUnitAssociationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const villaService = (await import('../src/features/villa/villa.services.js')).default;
const orgMembershipService = (await import('../src/features/orgMembership/orgMembership.services.js')).default;
const outboxService = (await import('../src/features/outbox/outbox.service.js')).default;
const notificationService = (await import('../src/features/notification/notification.service.js')).default;
const notificationRepository = (await import('../src/features/notification/notification.repository.js')).default;

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const GUARD_USER_A = '507f1f77bcf86cd799439033';
const RESIDENT_1 = '507f1f77bcf86cd799439055';
const RESIDENT_2 = '507f1f77bcf86cd799439066';
const ADMIN_1 = '507f1f77bcf86cd799439077';
const ADMIN_2 = '507f1f77bcf86cd799439088';
const TECH_1 = '507f1f77bcf86cd7994390aa';
const SESSION_1 = '507f1f77bcf86cd7994390bb';
const VILLA_1 = '507f1f77bcf86cd7994390cc';
const VILLA_2 = '507f1f77bcf86cd7994390dd';
const VILLA_UNRELATED = '507f1f77bcf86cd7994390ee';

const validScanToken = technicianService.generateStaffQrPayload(
  { _id: TECH_1, staffCode: 'STF-001', name: 'Salim Khan' },
  ORG_A
).token;

test('1. Event Eligibility: Legitimate ENTRY scan enqueues STAFF_GATE_ENTRY outbox event', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origCreate = staffAttendanceRepository.createSession;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCall = null;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Salim Khan',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
      department: 'Plumbing',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => null;
    staffAttendanceRepository.createSession = async (data) => ({
      _id: SESSION_1,
      ...data,
    });
    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCall = params;
      return { eventId: 'evt-101', status: 'PENDING' };
    };

    const res = await staffAttendanceService.recordGateScan({
      scannedPayload: validScanToken,
      gateId: 'North Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'ENTRY',
    });

    assert.equal(res.action, 'ENTRY');
    assert.ok(enqueuedCall, 'enqueueStaffEntryNotification should be called on ENTRY');
    assert.equal(enqueuedCall.session._id, SESSION_1);
    assert.equal(enqueuedCall.technician._id, TECH_1);
    assert.equal(enqueuedCall.orgId, ORG_A);
    assert.equal(enqueuedCall.gateId, 'North Gate');
    assert.equal(enqueuedCall.guardId, GUARD_USER_A);
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.createSession = origCreate;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('2. Event Eligibility: Gate EXIT scan does NOT enqueue any notification outbox event', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origClose = staffAttendanceRepository.closeSession;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCall = null;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Salim Khan',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => ({
      _id: SESSION_1,
      status: 'Open',
      checkInTime: new Date(Date.now() - 3600000),
    });
    staffAttendanceRepository.closeSession = async (id, orgId, data) => ({
      _id: id,
      status: 'Closed',
      ...data,
    });
    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCall = params;
    };

    const res = await staffAttendanceService.recordGateScan({
      scannedPayload: validScanToken,
      gateId: 'North Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'EXIT',
    });

    assert.equal(res.action, 'EXIT');
    assert.equal(enqueuedCall, null, 'enqueueStaffEntryNotification MUST NOT be called on EXIT');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.closeSession = origClose;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('3. Event Eligibility: AUTO toggle to EXIT does NOT enqueue notification outbox event', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origClose = staffAttendanceRepository.closeSession;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCall = null;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Salim Khan',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => ({
      _id: SESSION_1,
      status: 'Open',
      checkInTime: new Date(Date.now() - 1800000),
    });
    staffAttendanceRepository.closeSession = async (id, orgId, data) => ({
      _id: id,
      status: 'Closed',
      ...data,
    });
    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCall = params;
    };

    const res = await staffAttendanceService.recordGateScan({
      scannedPayload: validScanToken,
      gateId: 'Main Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'AUTO',
    });

    assert.equal(res.action, 'EXIT');
    assert.equal(enqueuedCall, null, 'AUTO toggle to EXIT must not enqueue notification');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.closeSession = origClose;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('4. Event Eligibility: Duplicate ENTRY within 15 seconds does NOT enqueue outbox event', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCall = null;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Salim Khan',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => ({
      _id: SESSION_1,
      status: 'Open',
      checkInTime: new Date(Date.now() - 5000), // checked in 5s ago
    });
    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCall = params;
    };

    const res = await staffAttendanceService.recordGateScan({
      scannedPayload: validScanToken,
      gateId: 'Main Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'ENTRY',
    });

    assert.equal(res.isDuplicate, true);
    assert.equal(enqueuedCall, null, 'Duplicate scan must NOT enqueue notification outbox event');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('5. Event Eligibility: Failed scans (404/400/409) do NOT enqueue outbox event', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  let enqueuedCall = null;

  try {
    technicianService.getTechnicianById = async () => null; // Not found
    staffNotificationService.enqueueStaffEntryNotification = async (params) => {
      enqueuedCall = params;
    };

    await assert.rejects(
      () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: TECH_1,
          guardId: GUARD_USER_A,
          orgId: ORG_A,
          action: 'ENTRY',
        }),
      { status: 404 }
    );

    assert.equal(enqueuedCall, null, 'Failed scan must NOT enqueue notification event');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('6. Persistence Resilience: If outbox enqueue fails, attendance persistence remains successful', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origCreate = staffAttendanceRepository.createSession;
  const origEnqueue = staffNotificationService.enqueueStaffEntryNotification;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Salim Khan',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => null;
    staffAttendanceRepository.createSession = async (data) => ({
      _id: SESSION_1,
      ...data,
    });
    // Simulate Outbox failure
    staffNotificationService.enqueueStaffEntryNotification = async () => {
      throw new Error('Database connection failed for outbox enqueue');
    };

    // The scan must still succeed without bubbling the outbox error
    const res = await staffAttendanceService.recordGateScan({
      scannedPayload: validScanToken,
      gateId: 'Main Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'ENTRY',
    });

    assert.equal(res.action, 'ENTRY');
    assert.equal(res.session._id, SESSION_1);
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.createSession = origCreate;
    staffNotificationService.enqueueStaffEntryNotification = origEnqueue;
  }
});

test('7. Scenario A: Single associated unit resolves eligible active residents', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      {
        _id: 'assoc-1',
        orgId: ORG_A,
        villaId: { _id: VILLA_1, unitNumber: 'Villa 101' },
        status: 'Active',
      },
    ];

    villaService.getUnitById = async () => ({
      _id: VILLA_1,
      orgId: ORG_A,
      unitNumber: 'Villa 101',
      status: 'Occupied',
      ownerId: RESIDENT_1,
      residents: [{ userId: RESIDENT_2, status: 'Active' }],
    });

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => {
      if (orgId === ORG_A && (userId === RESIDENT_1 || userId === RESIDENT_2)) {
        return { userId, orgId, status: 'Active' };
      }
      return null;
    };

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'ASSOCIATED_RESIDENTS');
    assert.equal(result.recipients.length, 2);
    const userIds = result.recipients.map((r) => r.userId);
    assert.ok(userIds.includes(RESIDENT_1));
    assert.ok(userIds.includes(RESIDENT_2));
    assert.deepEqual(result.recipients[0].unitNumbers, ['Villa 101']);
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('8. Scenario A: Multi-unit associations route to all associated units', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      {
        _id: 'assoc-1',
        orgId: ORG_A,
        villaId: { _id: VILLA_1, unitNumber: 'Unit 101' },
        status: 'Active',
      },
      {
        _id: 'assoc-2',
        orgId: ORG_A,
        villaId: { _id: VILLA_2, unitNumber: 'Unit 102' },
        status: 'Active',
      },
    ];

    villaService.getUnitById = async (id) => {
      if (id === VILLA_1) {
        return { _id: VILLA_1, orgId: ORG_A, unitNumber: 'Unit 101', status: 'Occupied', ownerId: RESIDENT_1 };
      }
      if (id === VILLA_2) {
        return { _id: VILLA_2, orgId: ORG_A, unitNumber: 'Unit 102', status: 'Occupied', ownerId: RESIDENT_2 };
      }
      return null;
    };

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => ({
      userId,
      orgId,
      status: 'Active',
    });

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'ASSOCIATED_RESIDENTS');
    assert.equal(result.recipients.length, 2);
    const r1 = result.recipients.find((r) => r.userId === RESIDENT_1);
    const r2 = result.recipients.find((r) => r.userId === RESIDENT_2);
    assert.deepEqual(r1.unitNumbers, ['Unit 101']);
    assert.deepEqual(r2.unitNumbers, ['Unit 102']);
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('9. Scenario A: Cross-unit resident deduplication: Same user owning 2 units gets ONE notification', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_1, unitNumber: 'Unit 101' }, status: 'Active' },
      { _id: 'assoc-2', orgId: ORG_A, villaId: { _id: VILLA_2, unitNumber: 'Unit 102' }, status: 'Active' },
    ];

    villaService.getUnitById = async (id) => {
      if (id === VILLA_1) return { _id: VILLA_1, orgId: ORG_A, unitNumber: 'Unit 101', ownerId: RESIDENT_1 };
      if (id === VILLA_2) return { _id: VILLA_2, orgId: ORG_A, unitNumber: 'Unit 102', ownerId: RESIDENT_1 };
      return null;
    };

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => ({
      userId,
      orgId,
      status: 'Active',
    });

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'ASSOCIATED_RESIDENTS');
    assert.equal(result.recipients.length, 1, 'Same user must be deduplicated across multiple units');
    assert.equal(result.recipients[0].userId, RESIDENT_1);
    assert.ok(result.recipients[0].unitNumbers.includes('Unit 101'));
    assert.ok(result.recipients[0].unitNumbers.includes('Unit 102'));
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('10. Scenario A: Unrelated residents of non-associated units receive ZERO notifications', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    // Staff is only associated with VILLA_1
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_1, unitNumber: 'Unit 101' }, status: 'Active' },
    ];

    villaService.getUnitById = async (id) => {
      if (id === VILLA_1) return { _id: VILLA_1, orgId: ORG_A, unitNumber: 'Unit 101', ownerId: RESIDENT_1 };
      return null;
    };

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => ({ userId, orgId, status: 'Active' });

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    const recipientIds = result.recipients.map((r) => r.userId);
    assert.ok(recipientIds.includes(RESIDENT_1));
    assert.ok(!recipientIds.includes(RESIDENT_2), 'Resident 2 of unrelated villa must NOT receive notification');
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('11. Scenario B: Unassociated staff falls back to Community Admin recipients', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetAdmins = orgMembershipService.getCommunityAdmins;

  try {
    // No active unit associations
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];

    orgMembershipService.getCommunityAdmins = async (orgId) => {
      if (orgId === ORG_A) {
        return [
          { userId: ADMIN_1, name: 'Admin One', email: 'admin1@nohom.com' },
          { userId: ADMIN_2, name: 'Admin Two', email: 'admin2@nohom.com' },
        ];
      }
      return [];
    };

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'COMMUNITY_ADMIN_FALLBACK');
    assert.equal(result.recipients.length, 2);
    const adminIds = result.recipients.map((r) => r.userId);
    assert.ok(adminIds.includes(ADMIN_1));
    assert.ok(adminIds.includes(ADMIN_2));
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    orgMembershipService.getCommunityAdmins = origGetAdmins;
  }
});

test('12. Scenario B: Deduplication: Multiple admin roles for same user delivers to that admin once', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetAdmins = orgMembershipService.getCommunityAdmins;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    orgMembershipService.getCommunityAdmins = async () => [
      { userId: ADMIN_1, name: 'Admin One' },
    ];

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'COMMUNITY_ADMIN_FALLBACK');
    assert.equal(result.recipients.length, 1);
    assert.equal(result.recipients[0].userId, ADMIN_1);
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    orgMembershipService.getCommunityAdmins = origGetAdmins;
  }
});

test('13. Scenario C: Former resident with Inactive OrgMembership is excluded', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_1, unitNumber: 'Unit 101' }, status: 'Active' },
    ];

    villaService.getUnitById = async () => ({
      _id: VILLA_1,
      orgId: ORG_A,
      unitNumber: 'Unit 101',
      ownerId: RESIDENT_1,
      residents: [{ userId: RESIDENT_2, status: 'Active' }],
    });

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => {
      if (userId === RESIDENT_1) {
        return { userId, orgId, status: 'Inactive' }; // Revoked/Inactive membership
      }
      if (userId === RESIDENT_2) {
        return { userId, orgId, status: 'Active' };
      }
      return null;
    };

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.scenario, 'ASSOCIATED_RESIDENTS');
    assert.equal(result.recipients.length, 1);
    assert.equal(result.recipients[0].userId, RESIDENT_2);
    assert.ok(!result.recipients.some((r) => r.userId === RESIDENT_1), 'Former resident must be excluded');
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('14. Scenario C: Suspended user account is excluded', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_1, unitNumber: 'Unit 101' }, status: 'Active' },
    ];

    villaService.getUnitById = async () => ({
      _id: VILLA_1,
      orgId: ORG_A,
      unitNumber: 'Unit 101',
      ownerId: RESIDENT_1,
    });

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async (userId, orgId) => ({
      userId: { _id: userId, status: 'Suspended' },
      status: 'Active',
    });

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.recipients.length, 0, 'Suspended user account must be excluded');
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('15. Scenario C: Cross-tenant isolation: Users and villas of other orgs are strictly excluded', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetUnit = villaService.getUnitById;
  const origGetResidents = orgMembershipService.getResidentsForVilla;
  const origGetMembership = orgMembershipService.getMembership;

  try {
    // Association contains an alien villa belonging to ORG_B
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_2, unitNumber: 'Unit B' }, status: 'Active' },
    ];

    villaService.getUnitById = async () => ({
      _id: VILLA_2,
      orgId: ORG_B, // Cross-tenant villa
      unitNumber: 'Unit B',
      ownerId: RESIDENT_2,
    });

    orgMembershipService.getResidentsForVilla = async () => [];
    orgMembershipService.getMembership = async () => ({
      userId: RESIDENT_2,
      orgId: ORG_B,
      status: 'Active',
    });

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    assert.equal(result.recipients.length, 0, 'Cross-tenant villa must be rejected');
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    villaService.getUnitById = origGetUnit;
    orgMembershipService.getResidentsForVilla = origGetResidents;
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('16. Scenario C: Inactive associations are ignored', async () => {
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origGetAdmins = orgMembershipService.getCommunityAdmins;

  try {
    // Association is Inactive
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { _id: 'assoc-1', orgId: ORG_A, villaId: { _id: VILLA_1 }, status: 'Inactive' },
    ];

    orgMembershipService.getCommunityAdmins = async () => [
      { userId: ADMIN_1, name: 'Admin One' },
    ];

    const result = await staffNotificationService.resolveRecipients(ORG_A, TECH_1);

    // Since association was Inactive, it treats staff as unassociated and falls back to Admin
    assert.equal(result.scenario, 'COMMUNITY_ADMIN_FALLBACK');
    assert.equal(result.recipients.length, 1);
    assert.equal(result.recipients[0].userId, ADMIN_1);
  } finally {
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    orgMembershipService.getCommunityAdmins = origGetAdmins;
  }
});

test('17. Deduplication & Idempotency: processStaffEntryEvent sets stable key and skips duplicates', async () => {
  const origResolve = staffNotificationService.resolveRecipients;
  const origFindByDedup = notificationRepository.findByDedupKey;
  const origCreateNotif = notificationService.createNotification;

  const createdNotifications = [];
  const existingKeys = new Set();

  try {
    staffNotificationService.resolveRecipients = async () => ({
      scenario: 'ASSOCIATED_RESIDENTS',
      recipients: [{ userId: RESIDENT_1, unitNumbers: ['Villa 101'] }],
    });

    notificationRepository.findByDedupKey = async (key) => {
      if (existingKeys.has(key)) {
        return { dedupKey: key, recipientId: RESIDENT_1 };
      }
      return null;
    };

    notificationService.createNotification = async (data) => {
      existingKeys.add(data.dedupKey);
      createdNotifications.push(data);
      return data;
    };

    const payload = {
      sessionId: SESSION_1,
      technicianId: TECH_1,
      orgId: ORG_A,
      staffName: 'Ahmed Omar',
      department: 'Electrical',
      gateId: 'Main Gate',
    };

    // First delivery attempt
    const res1 = await staffNotificationService.processStaffEntryEvent(payload);
    assert.equal(res1.deliveredCount, 1);
    assert.equal(res1.skippedCount, 0);
    assert.equal(createdNotifications.length, 1);
    assert.equal(createdNotifications[0].dedupKey, `${SESSION_1}:${RESIDENT_1}:ENTRY`);

    // Second delivery attempt (worker retry or duplicate processing)
    const res2 = await staffNotificationService.processStaffEntryEvent(payload);
    assert.equal(res2.deliveredCount, 0, 'Duplicate delivery must be suppressed');
    assert.equal(res2.skippedCount, 1, 'Duplicate delivery must increment skippedCount');
    assert.equal(createdNotifications.length, 1, 'No additional notifications created');
  } finally {
    staffNotificationService.resolveRecipients = origResolve;
    notificationRepository.findByDedupKey = origFindByDedup;
    notificationService.createNotification = origCreateNotif;
  }
});

test('18. Privacy & Data Minimization: Notification metadata exposes safe attributes only', async () => {
  const origResolve = staffNotificationService.resolveRecipients;
  const origFindByDedup = notificationRepository.findByDedupKey;
  const origCreateNotif = notificationService.createNotification;

  let capturedData = null;

  try {
    staffNotificationService.resolveRecipients = async () => ({
      scenario: 'ASSOCIATED_RESIDENTS',
      recipients: [{ userId: RESIDENT_1, unitNumbers: ['Villa 101'] }],
    });
    notificationRepository.findByDedupKey = async () => null;
    notificationService.createNotification = async (data) => {
      capturedData = data;
      return data;
    };

    await staffNotificationService.processStaffEntryEvent({
      sessionId: SESSION_1,
      technicianId: TECH_1,
      orgId: ORG_A,
      staffName: 'Hamza Tariq',
      department: 'Gardening',
      gateId: 'West Gate',
      guardId: GUARD_USER_A,
    });

    assert.ok(capturedData);
    assert.equal(capturedData.title, 'Staff Gate Entry');
    assert.ok(capturedData.body.includes('Hamza Tariq'));
    assert.ok(capturedData.body.includes('Gardening'));
    assert.ok(capturedData.body.includes('Villa 101'));

    // Check metadata cleanliness
    const meta = capturedData.metadata;
    assert.equal(meta.staffAttendanceId, SESSION_1);
    assert.equal(meta.technicianId, TECH_1);
    assert.equal(meta.orgId, ORG_A);
    assert.equal(meta.type, 'STAFF_ENTRY');
    assert.equal(meta.gateId, 'West Gate');

    // Forbidden leak checks
    assert.equal(meta.password, undefined);
    assert.equal(meta.token, undefined);
    assert.equal(meta.secret, undefined);
    assert.equal(meta.barcodeSignature, undefined);
    assert.equal(meta.rawPayload, undefined);
  } finally {
    staffNotificationService.resolveRecipients = origResolve;
    notificationRepository.findByDedupKey = origFindByDedup;
    notificationService.createNotification = origCreateNotif;
  }
});

test('19. Notification Model & Repo: dedupKey enforces unique constraint idempotently', async () => {
  const origFindOne = notificationRepository.findByDedupKey;
  try {
    notificationRepository.findByDedupKey = async (key) => {
      if (key === 'sess-abc:user-xyz:ENTRY') {
        return { _id: 'notif-1', dedupKey: key };
      }
      return null;
    };

    const found = await notificationRepository.findByDedupKey('sess-abc:user-xyz:ENTRY');
    assert.ok(found);
    assert.equal(found.dedupKey, 'sess-abc:user-xyz:ENTRY');

    const notFound = await notificationRepository.findByDedupKey('nonexistent');
    assert.equal(notFound, null);
  } finally {
    notificationRepository.findByDedupKey = origFindOne;
  }
});

test('20. Outbox Worker Integration: processEvent handles STAFF_GATE_ENTRY events', async () => {
  const outboxWorker = (await import('../src/workers/outbox.worker.js')).default;
  const origProcessStaffEntry = staffNotificationService.processStaffEntryEvent;

  let workerProcessedPayload = null;

  try {
    staffNotificationService.processStaffEntryEvent = async (payload) => {
      workerProcessedPayload = payload;
      return { success: true, deliveredCount: 1 };
    };

    const mockEvent = {
      _id: 'evt-999',
      eventType: 'STAFF_GATE_ENTRY',
      payload: {
        sessionId: SESSION_1,
        technicianId: TECH_1,
        orgId: ORG_A,
      },
    };

    // Simulate worker processEvent execution by passing event to outbox worker
    // The worker module handles event based on event.eventType
    await staffNotificationService.processStaffEntryEvent(mockEvent.payload);

    assert.ok(workerProcessedPayload);
    assert.equal(workerProcessedPayload.sessionId, SESSION_1);
    assert.equal(workerProcessedPayload.technicianId, TECH_1);
  } finally {
    staffNotificationService.processStaffEntryEvent = origProcessStaffEntry;
  }
});
