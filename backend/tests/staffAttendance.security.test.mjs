import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const { authorizeAnyPermission } = await import('../src/middlewares/rbac.middleware.js');
const staffAttendanceService = (await import('../src/features/staffAttendance/staffAttendance.service.js')).default;
const staffAttendanceRepository = (await import('../src/features/staffAttendance/staffAttendance.repository.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const staffUnitAssociationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const staffAttendanceController = (await import('../src/features/staffAttendance/staffAttendance.controller.js')).default;

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const GUARD_USER_A = '507f1f77bcf86cd799439033';
const GUARD_USER_B = '507f1f77bcf86cd799439044';
const RESIDENT_USER = '507f1f77bcf86cd799439055';
const TECH_1 = '507f1f77bcf86cd799439088';
const TECH_USER_1 = '507f1f77bcf86cd799439099';
const VILLA_1 = '507f1f77bcf86cd7994390aa';

function getValidScanQr(techId = TECH_1, orgId = ORG_A, code = 'STF-001', name = 'Ali Ahmed') {
  return technicianService.generateStaffQrPayload({ _id: techId, staffCode: code, name }, orgId);
}

test('1. parseScanPayload accurately parses Nahom MMG barcode, STF token, JSON, and raw ObjectId', () => {
  // MMG protocol
  const mmg = staffAttendanceService.parseScanPayload(`MMG:SERVICE:STF-001:${TECH_1}:Mohammed_Ali`);
  assert.equal(mmg.technicianId, TECH_1);
  assert.equal(mmg.staffCode, 'STF-001');

  // Token protocol
  const stf = staffAttendanceService.parseScanPayload(`STF:${TECH_1}:ab12cd34ef56`);
  assert.equal(stf.technicianId, TECH_1);
  assert.equal(stf.signature, 'ab12cd34ef56');

  // JSON protocol
  const json = staffAttendanceService.parseScanPayload(JSON.stringify({ app: 'Nahom', type: 'SERVICE', technicianId: TECH_1, staffCode: 'STF-001' }));
  assert.equal(json.technicianId, TECH_1);
  assert.equal(json.staffCode, 'STF-001');

  // Raw ObjectId
  const rawId = staffAttendanceService.parseScanPayload(TECH_1);
  assert.equal(rawId.technicianId, TECH_1);

  // Staff code
  const codeOnly = staffAttendanceService.parseScanPayload('STF-999');
  assert.equal(codeOnly.staffCode, 'STF-999');
});

test('2. recordGateScan creates Open session (ENTRY) when staff has no active session', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origCreate = staffAttendanceRepository.createSession;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Ali Ahmed',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
      department: 'Electrical',
    });

    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [
      { villaId: { _id: VILLA_1, unitNumber: 'Villa-101', status: 'Occupied' } },
    ];

    staffAttendanceRepository.findActiveSession = async () => null;

    let createdDoc = null;
    staffAttendanceRepository.createSession = async (data) => {
      createdDoc = { _id: 'session1', ...data };
      return createdDoc;
    };

    const result = await staffAttendanceService.recordGateScan({
      scannedPayload: getValidScanQr().barcodePayload,
      gateId: 'North Gate',
      guardId: GUARD_USER_A,
      orgId: ORG_A,
      action: 'ENTRY',
    });

    assert.equal(result.action, 'ENTRY');
    assert.equal(result.session.status, 'Open');
    assert.equal(result.session.checkInGate, 'North Gate');
    assert.equal(result.associatedUnits.length, 1);
    assert.equal(result.associatedUnits[0].unitNumber, 'Villa-101');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.createSession = origCreate;
  }
});

test('3. recordGateScan closes Open session (EXIT) when active session exists', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origClose = staffAttendanceRepository.closeSession;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Ali Ahmed',
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });

    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];

    staffAttendanceRepository.findActiveSession = async () => ({
      _id: 'session1',
      orgId: ORG_A,
      technicianId: TECH_1,
      status: 'Open',
      checkInTime: new Date(Date.now() - 3600000),
      checkInGate: 'North Gate',
    });

    staffAttendanceRepository.closeSession = async (sessionId, orgId, updateData) => ({
      _id: sessionId,
      orgId,
      status: 'Closed',
      checkInTime: new Date(Date.now() - 3600000),
      checkOutTime: updateData.checkOutTime,
      exitGate: updateData.exitGate,
      exitGuardId: updateData.exitGuardId,
    });

    const validQr = technicianService.generateStaffQrPayload(
      { _id: TECH_1, staffCode: 'STF-001', name: 'Ali Ahmed' },
      ORG_A
    );

    const result = await staffAttendanceService.recordGateScan({
      scannedPayload: validQr.token,
      gateId: 'South Gate',
      guardId: GUARD_USER_B,
      orgId: ORG_A,
      action: 'EXIT',
    });

    assert.equal(result.action, 'EXIT');
    assert.equal(result.session.status, 'Closed');
    assert.equal(result.session.exitGate, 'South Gate');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.closeSession = origClose;
  }
});

test('4. Concurrency: Repository createSession converts Mongo duplicate key (11000) into HTTP 409 Conflict', async () => {
  const StaffAttendance = (await import('../src/features/staffAttendance/staffAttendance.model.js')).default;
  const origSave = StaffAttendance.prototype.save;

  try {
    StaffAttendance.prototype.save = async function () {
      const err = new Error('E11000 duplicate key error collection: staffattendances index: orgId_1_technicianId_1 dup key');
      err.code = 11000;
      throw err;
    };

    await assert.rejects(
      async () =>
        staffAttendanceRepository.createSession({
          orgId: ORG_A,
          technicianId: TECH_1,
          checkInGuardId: GUARD_USER_A,
          status: 'Open',
        }),
      (err) => err.statusCode === 409 && err.message.includes('already has an active open attendance session'),
      'Must convert E11000 into HTTP 409'
    );
  } finally {
    StaffAttendance.prototype.save = origSave;
  }
});

test('5. State conflict: ENTRY when session is already open throws 409 Conflict', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];

    // Session opened 10 minutes ago
    staffAttendanceRepository.findActiveSession = async () => ({
      _id: 'sessionOld',
      status: 'Open',
      checkInTime: new Date(Date.now() - 600000),
    });

    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: getValidScanQr().token,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 409 && err.message.includes('already has an active open session'),
      'Must reject double-check-in with 409'
    );
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
  }
});

test('6. State conflict: EXIT when no session is open throws 400 Bad Request', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];
    staffAttendanceRepository.findActiveSession = async () => null;

    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: getValidScanQr().token,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'EXIT',
        }),
      (err) => err.statusCode === 400 && err.message.includes('does not have an active open session'),
      'Must reject check-out without prior check-in with 400'
    );
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
  }
});

test('7. Multiple daily sessions: Staff can check in, check out, and check in again on the same day', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origCreate = staffAttendanceRepository.createSession;
  const origClose = staffAttendanceRepository.closeSession;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      staffCode: 'STF-001',
    });
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];

    let currentSession = null;
    let counter = 0;
    staffAttendanceRepository.findActiveSession = async () => currentSession;
    staffAttendanceRepository.createSession = async (data) => {
      counter++;
      currentSession = { _id: `session-${counter}`, ...data };
      return currentSession;
    };
    staffAttendanceRepository.closeSession = async (id, orgId, data) => {
      currentSession = null;
      return { _id: id, status: 'Closed', ...data };
    };

    // First Entry
    const s1 = await staffAttendanceService.recordGateScan({
      scannedPayload: getValidScanQr().token,
      orgId: ORG_A,
      guardId: GUARD_USER_A,
      action: 'ENTRY',
    });
    assert.equal(s1.action, 'ENTRY');

    // First Exit
    const s2 = await staffAttendanceService.recordGateScan({
      scannedPayload: getValidScanQr().token,
      orgId: ORG_A,
      guardId: GUARD_USER_A,
      action: 'EXIT',
    });
    assert.equal(s2.action, 'EXIT');

    // Second Entry (Multiple daily session permitted!)
    const s3 = await staffAttendanceService.recordGateScan({
      scannedPayload: getValidScanQr().token,
      orgId: ORG_A,
      guardId: GUARD_USER_B,
      action: 'ENTRY',
    });
    assert.equal(s3.action, 'ENTRY');
    assert.ok(s3.session._id !== s1.session._id);
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffAttendanceRepository.createSession = origCreate;
    staffAttendanceRepository.closeSession = origClose;
  }
});

test('8. Rejects cross-community or inactive staff scan with 404 or 400', async () => {
  const origGetTech = technicianService.getTechnicianById;

  try {
    // Cross-community technician
    technicianService.getTechnicianById = async () => {
      throw new (await import('../src/utils/httpError.utils.js')).default(404, 'Technician not found');
    };

    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: getValidScanQr().token,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 404,
      'Must reject staff from different community'
    );

    // Inactive technician
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Inactive',
      isDeleted: false,
    });

    await assert.rejects(
      async () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: getValidScanQr().token,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 400 && err.message.includes('not active'),
      'Must reject inactive staff'
    );
  } finally {
    technicianService.getTechnicianById = origGetTech;
  }
});

test('9. Staff QR token generation: Staff member can retrieve own signed QR payload and admin can retrieve for staff', async () => {
  const origGetMy = technicianService.getMyProfile;
  const origGetTech = technicianService.getTechnicianById;

  try {
    technicianService.getMyProfile = async () => ({
      _id: TECH_1,
      name: 'Tariq Electrician',
      staffCode: 'STF-500',
      department: 'Electrical',
      type: 'In-House Staff',
      status: 'Active',
      isDeleted: false,
    });

    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Tariq Electrician',
      staffCode: 'STF-500',
      department: 'Electrical',
      type: 'In-House Staff',
      status: 'Active',
      isDeleted: false,
    });

    // Staff member generating own QR
    const selfQr = await technicianService.getMyQr(TECH_USER_1, ORG_A, {});
    assert.ok(selfQr.barcodePayload.includes('MMG:SERVICE:STF-500:507f1f77bcf86cd799439088:Tariq_Electrician'));
    assert.ok(selfQr.signature);
    assert.ok(selfQr.token.startsWith('STF:507f1f77bcf86cd799439088:'));

    // Admin generating staff QR
    const adminQr = await technicianService.getStaffQrById(TECH_1, ORG_A);
    assert.equal(adminQr.barcodePayload, selfQr.barcodePayload);
  } finally {
    technicianService.getMyProfile = origGetMy;
    technicianService.getTechnicianById = origGetTech;
  }
});

test('10. RBAC authorization: Gate scan allows visitor:guard and rejects unauthorized resident', async () => {
  const middleware = authorizeAnyPermission(['staff:attendance', 'visitor:guard', 'staff:manage']);

  // Case A: Security Guard with visitor:guard
  const reqGuard = {
    user: { id: GUARD_USER_A, role: 'Security Guard', orgId: ORG_A, permissions: ['visitor:guard'] },
    tenantPermissions: ['visitor:guard'],
    headers: { 'x-organization-id': ORG_A },
  };
  let guardPassed = false;
  await middleware(reqGuard, {}, (err) => { if (!err) guardPassed = true; });
  assert.equal(guardPassed, true, 'Security guard must pass gate scan authorization');

  // Case B: Resident with only visitor:resident
  const reqResident = {
    user: { id: RESIDENT_USER, role: 'Resident Owner', orgId: ORG_A, permissions: ['visitor:resident'] },
    tenantPermissions: ['visitor:resident'],
    headers: { 'x-organization-id': ORG_A },
  };
  let resError = null;
  await middleware(reqResident, {}, (err) => { resError = err; });
  assert.ok(resError, 'Resident must be denied on gate scan endpoint');
  assert.equal(resError.statusCode, 403);
});

test('11. RBAC authorization: staff:view_own allows /me attendance and rejects unauthorized caller', async () => {
  const middleware = authorizeAnyPermission(['staff:view_own']);

  // Case A: Staff member with staff:view_own
  const reqStaff = {
    user: { id: TECH_USER_1, role: 'Staff/Vendor', orgId: ORG_A, permissions: ['staff:view_own'] },
    tenantPermissions: ['staff:view_own'],
    headers: { 'x-organization-id': ORG_A },
  };
  let staffPassed = false;
  await middleware(reqStaff, {}, (err) => { if (!err) staffPassed = true; });
  assert.equal(staffPassed, true);

  // Case B: Resident without staff:view_own
  const reqResident = {
    user: { id: RESIDENT_USER, role: 'Resident Owner', orgId: ORG_A, permissions: ['staff:assign_unit'] },
    tenantPermissions: ['staff:assign_unit'],
    headers: { 'x-organization-id': ORG_A },
  };
  let residentErr = null;
  await middleware(reqResident, {}, (err) => { residentErr = err; });
  assert.ok(residentErr);
  assert.equal(residentErr.statusCode, 403);
});

test('12. Unsigned QR payloads (raw ID, legacy 4-part MMG, unsigned JSON) are rejected with 401 unless manual override', async () => {
  const origGetTech = technicianService.getTechnicianById;
  const origCreate = staffAttendanceRepository.createSession;
  const origFindActive = staffAttendanceRepository.findActiveSession;
  const origGetAssoc = staffUnitAssociationService.getActiveAssociationsForStaff;

  try {
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Ali Ahmed',
      orgId: ORG_A,
      status: 'Active',
      staffCode: 'STF-001',
      isDeleted: false,
    });

    // 1. Raw ObjectId without signature
    await assert.rejects(
      () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: TECH_1,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401 && err.message.includes('Unsigned staff QR payload'),
      'Raw ObjectId without signature must be rejected with 401'
    );

    // 2. Legacy 4-part MMG barcode without signature
    await assert.rejects(
      () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: `MMG:SERVICE:STF-001:${TECH_1}:Ali_Ahmed`,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401 && err.message.includes('Unsigned staff QR payload'),
      'Legacy 4-part MMG barcode must be rejected with 401'
    );

    // 3. Unsigned JSON payload
    await assert.rejects(
      () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: JSON.stringify({ technicianId: TECH_1, staffCode: 'STF-001' }),
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401 && err.message.includes('Unsigned staff QR payload'),
      'Unsigned JSON payload must be rejected with 401'
    );

    // 4. Authorized manual entry (isManualEntry: true) bypasses requirement
    staffAttendanceRepository.createSession = async (d) => ({ _id: 'manual-s1', ...d });
    staffAttendanceRepository.findActiveSession = async () => null;
    staffUnitAssociationService.getActiveAssociationsForStaff = async () => [];

    const manualResult = await staffAttendanceService.recordGateScan({
      scannedPayload: TECH_1,
      orgId: ORG_A,
      guardId: GUARD_USER_A,
      isManualEntry: true,
      action: 'ENTRY',
    });
    assert.equal(manualResult.action, 'ENTRY');
    assert.equal(manualResult.session._id, 'manual-s1');
  } finally {
    technicianService.getTechnicianById = origGetTech;
    staffAttendanceRepository.createSession = origCreate;
    staffAttendanceRepository.findActiveSession = origFindActive;
    staffUnitAssociationService.getActiveAssociationsForStaff = origGetAssoc;
  }
});

test('13. Controller Manual Entry Security: Rejects isManualEntry from caller lacking guard/manage permissions with 403', async () => {
  const reqUntrusted = {
    tenant: { orgId: ORG_A, permissions: ['staff:attendance'] },
    user: { id: RESIDENT_USER, role: 'Auditor', permissions: ['staff:attendance'] },
    headers: { 'x-organization-id': ORG_A },
    body: {
      scannedPayload: TECH_1,
      isManualEntry: true,
      notes: 'Attempted manual check-in without guard permission',
    },
  };

  let caughtErr = null;
  const res = { success: () => {} };
  const next = (err) => { caughtErr = err; };

  await staffAttendanceController.scan(reqUntrusted, res, next);
  assert.ok(caughtErr, 'Untrusted caller attempting manual entry must be rejected');
  assert.equal(caughtErr.statusCode, 403);
  assert.ok(caughtErr.message.includes('Manual attendance entry requires'));
});

test('14. Controller Manual Entry Security: Rejects isManualEntry with missing or empty notes with 400', async () => {
  const reqGuard = {
    tenant: { orgId: ORG_A, permissions: ['visitor:guard'] },
    user: { id: GUARD_USER_A, role: 'Security Guard', permissions: ['visitor:guard'] },
    headers: { 'x-organization-id': ORG_A },
    body: {
      scannedPayload: TECH_1,
      isManualEntry: true,
      notes: '   ', // empty notes
    },
  };

  let caughtErr = null;
  const res = { success: () => {} };
  const next = (err) => { caughtErr = err; };

  await staffAttendanceController.scan(reqGuard, res, next);
  assert.ok(caughtErr, 'Manual entry with empty notes must be rejected');
  assert.equal(caughtErr.statusCode, 400);
  assert.ok(caughtErr.message.includes('A valid reason or audit note is required'));
});

test('15. Production Security: ALLOW_LEGACY_UNSIGNED_STAFF_SCANS is strictly ignored when NODE_ENV is production', async () => {
  const origEnv = process.env.NODE_ENV;
  const origLegacy = process.env.ALLOW_LEGACY_UNSIGNED_STAFF_SCANS;
  const origGetTech = technicianService.getTechnicianById;

  try {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LEGACY_UNSIGNED_STAFF_SCANS = 'true';

    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      name: 'Ali Ahmed',
      orgId: ORG_A,
      status: 'Active',
      staffCode: 'STF-001',
      isDeleted: false,
    });

    await assert.rejects(
      () =>
        staffAttendanceService.recordGateScan({
          scannedPayload: TECH_1,
          orgId: ORG_A,
          guardId: GUARD_USER_A,
          action: 'ENTRY',
        }),
      (err) => err.statusCode === 401 && err.message.includes('Unsigned staff QR payload'),
      'Legacy unsigned scan must be rejected in production even if flag is true'
    );
  } finally {
    process.env.NODE_ENV = origEnv;
    process.env.ALLOW_LEGACY_UNSIGNED_STAFF_SCANS = origLegacy;
    technicianService.getTechnicianById = origGetTech;
  }
});

test('16. Advanced Filters & Reporting: findHistory and getAttendanceStats correctly apply department, type, and search filters', async () => {
  const origFindHistory = staffAttendanceRepository.findHistory;
  const origGetStats = staffAttendanceRepository.getAttendanceStats;

  try {
    let capturedFilter = null;
    let capturedPagination = null;
    staffAttendanceRepository.findHistory = async (orgId, filter, pagination) => {
      capturedFilter = filter;
      capturedPagination = pagination;
      return { records: [], pagination: { totalRecords: 0, totalPages: 1, currentPage: 1, limit: pagination.limit } };
    };

    let capturedStatsQuery = null;
    staffAttendanceRepository.getAttendanceStats = async (orgId, query) => {
      capturedStatsQuery = query;
      return { totalSessions: 0, openSessions: 0, closedSessions: 0, missingCheckoutExceptions: 0, distinctStaffCount: 0 };
    };

    // Test query via service
    await staffAttendanceService.getAttendanceHistory(ORG_A, {
      department: 'Electrical',
      type: 'In-House Staff',
      search: 'Ali',
      gateId: 'Main Gate',
      status: 'Open',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      limit: 100,
      page: 1,
    });

    assert.equal(capturedFilter.department, 'Electrical');
    assert.equal(capturedFilter.type, 'In-House Staff');
    assert.equal(capturedFilter.search, 'Ali');
    assert.equal(capturedFilter.gateId, 'Main Gate');
    assert.equal(capturedFilter.status, 'Open');
    assert.equal(capturedFilter.startDate, '2026-01-01');
    assert.equal(capturedFilter.endDate, '2026-01-31');
    assert.equal(capturedPagination.limit, 100);

    // Test stats query via service
    await staffAttendanceService.getAttendanceStats(ORG_A, {
      department: 'Plumbing',
      technicianId: TECH_1,
      gateId: 'North Gate',
    });

    assert.equal(capturedStatsQuery.department, 'Plumbing');
    assert.equal(capturedStatsQuery.technicianId, TECH_1);
    assert.equal(capturedStatsQuery.gateId, 'North Gate');
  } finally {
    staffAttendanceRepository.findHistory = origFindHistory;
    staffAttendanceRepository.getAttendanceStats = origGetStats;
  }
});


