import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const attendanceService = (await import('../src/features/staffAttendance/staffAttendance.service.js')).default;
const attendanceRepo = (await import('../src/features/staffAttendance/staffAttendance.repository.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const technicianRepo = (await import('../src/features/technician/technician.repository.js')).default;
const associationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const associationRepo = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.repository.js')).default;
const HttpError = (await import('../src/utils/httpError.utils.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const GUARD = '507f1f77bcf86cd799439033';
const TECH = '507f1f77bcf86cd799439088';
const HOUR = 3600 * 1000;

const activeTech = { _id: TECH, name: 'Ali', orgId: ORG, status: 'Active', isDeleted: false, staffCode: 'STF-001' };

/** Swaps methods on an object and returns a restore function. */
function stub(target, impls) {
  const originals = {};
  for (const [name, fn] of Object.entries(impls)) {
    originals[name] = target[name];
    target[name] = fn;
  }
  return () => Object.assign(target, originals);
}

function scanStubs({ tech = activeTech, openSession = null, repo = {} } = {}) {
  const restores = [
    stub(technicianService, { getTechnicianById: async () => tech }),
    stub(associationService, { getActiveAssociationsForStaff: async () => [] }),
    stub(attendanceRepo, { findActiveSession: async () => openSession, ...repo }),
  ];
  return () => restores.forEach((r) => r());
}

const validToken = () => technicianService.generateStaffQrPayload(activeTech, ORG).token;

test('stale open session is auto-closed and the scan becomes a fresh ENTRY', async () => {
  let autoClosedId = null;
  const restore = scanStubs({
    openSession: { _id: 's-old', checkInTime: new Date(Date.now() - 20 * HOUR), notes: '' },
    repo: {
      autoCloseSession: async (id) => {
        autoClosedId = id;
        return { _id: id, status: 'Closed', autoClosed: true };
      },
      createSession: async (data) => ({ _id: 's-new', ...data }),
    },
  });
  try {
    const result = await attendanceService.recordGateScan({
      scannedPayload: validToken(),
      guardId: GUARD,
      orgId: ORG,
      action: 'AUTO',
    });
    assert.equal(autoClosedId, 's-old');
    assert.equal(result.action, 'ENTRY');
    assert.equal(result.staleSessionClosed.autoClosed, true);
  } finally {
    restore();
  }
});

test('AUTO double-scan within the duplicate window does not immediately check the person out', async () => {
  let closeCalled = false;
  const restore = scanStubs({
    openSession: { _id: 's1', checkInTime: new Date(Date.now() - 3000) },
    repo: {
      closeSession: async () => {
        closeCalled = true;
        return null;
      },
    },
  });
  try {
    const result = await attendanceService.recordGateScan({
      scannedPayload: validToken(),
      guardId: GUARD,
      orgId: ORG,
      action: 'AUTO',
    });
    assert.equal(result.isDuplicate, true);
    assert.equal(result.action, 'ENTRY');
    assert.equal(closeCalled, false);
  } finally {
    restore();
  }
});

test('deactivated staff with a stuck open session can still be checked OUT', async () => {
  const restore = scanStubs({
    tech: { ...activeTech, status: 'Inactive' },
    openSession: { _id: 's1', checkInTime: new Date(Date.now() - 2 * HOUR), notes: '' },
    repo: { closeSession: async (id) => ({ _id: id, status: 'Closed' }) },
  });
  try {
    const result = await attendanceService.recordGateScan({
      scannedPayload: validToken(),
      guardId: GUARD,
      orgId: ORG,
      action: 'EXIT',
    });
    assert.equal(result.action, 'EXIT');
  } finally {
    restore();
  }
});

test('deactivated staff without an open session is rejected on AUTO scan', async () => {
  const restore = scanStubs({ tech: { ...activeTech, status: 'Inactive' }, openSession: null });
  try {
    await assert.rejects(
      attendanceService.recordGateScan({ scannedPayload: validToken(), guardId: GUARD, orgId: ORG, action: 'AUTO' }),
      (err) => err.statusCode === 400 && /not active/.test(err.message)
    );
  } finally {
    restore();
  }
});

test('concurrent ENTRY losing the unique-index race resolves to the winning session', async () => {
  let lookups = 0;
  const winner = { _id: 'winner', checkInTime: new Date() };
  const restores = [
    stub(technicianService, { getTechnicianById: async () => activeTech }),
    stub(associationService, { getActiveAssociationsForStaff: async () => [] }),
    stub(attendanceRepo, {
      // first lookup: nothing open; after the failed insert: the other scan's session
      findActiveSession: async () => (lookups++ === 0 ? null : winner),
      createSession: async () => {
        throw new HttpError(409, 'Staff member already has an active open attendance session.');
      },
    }),
  ];
  try {
    const result = await attendanceService.recordGateScan({
      scannedPayload: validToken(),
      guardId: GUARD,
      orgId: ORG,
      action: 'ENTRY',
    });
    assert.equal(result.isDuplicate, true);
    assert.equal(result.session._id, 'winner');
  } finally {
    restores.forEach((r) => r());
  }
});

test('EXIT closing an already-closed session returns 409 instead of crashing', async () => {
  const restore = scanStubs({
    openSession: { _id: 's1', checkInTime: new Date(Date.now() - HOUR) },
    repo: { closeSession: async () => null },
  });
  try {
    await assert.rejects(
      attendanceService.recordGateScan({ scannedPayload: validToken(), guardId: GUARD, orgId: ORG, action: 'EXIT' }),
      (err) => err.statusCode === 409
    );
  } finally {
    restore();
  }
});

test('idempotency replay reports EXIT when the key belongs to the exit scan', async () => {
  const restore = stub(attendanceRepo, {
    findByIdempotencyKey: async () => ({
      _id: 's1',
      status: 'Closed',
      idempotencyKey: 'entry-key',
      exitIdempotencyKey: 'exit-key',
      technicianId: TECH,
    }),
  });
  try {
    const exit = await attendanceService.recordGateScan({
      scannedPayload: 'x',
      guardId: GUARD,
      orgId: ORG,
      idempotencyKey: 'exit-key',
    });
    assert.equal(exit.action, 'EXIT');
    const entry = await attendanceService.recordGateScan({
      scannedPayload: 'x',
      guardId: GUARD,
      orgId: ORG,
      idempotencyKey: 'entry-key',
    });
    assert.equal(entry.action, 'ENTRY');
  } finally {
    restore();
  }
});

test('updateTechnician strips tenant/identity fields and rejects duplicate staff codes', async () => {
  let written = null;
  const restore = stub(technicianRepo, {
    findAll: async () => [],
    findById: async () => ({ _id: TECH, orgId: ORG }),
    update: async (id, orgId, data) => {
      written = data;
      return { _id: id, orgId, ...data };
    },
  });
  try {
    await technicianService.updateTechnician(TECH, ORG, {
      name: 'New Name',
      orgId: '507f1f77bcf86cd7994399ff',
      userId: '507f1f77bcf86cd7994399ee',
      isDeleted: true,
    });
    assert.deepEqual(written, { name: 'New Name' });
  } finally {
    restore();
  }

  const restoreClash = stub(technicianRepo, {
    findAll: async () => [{ _id: 'someone-else', staffCode: 'STF-001' }],
    findById: async () => ({ _id: TECH, orgId: ORG }),
  });
  try {
    await assert.rejects(
      technicianService.updateTechnician(TECH, ORG, { staffCode: 'STF-001' }),
      (err) => err.statusCode === 409
    );
  } finally {
    restoreClash();
  }
});

test('updateTechnician rejects an inverted QR validity window', async () => {
  const restore = stub(technicianRepo, { findAll: async () => [], findById: async () => ({ _id: TECH, orgId: ORG }) });
  try {
    await assert.rejects(
      technicianService.updateTechnician(TECH, ORG, {
        qrValidFrom: '2026-12-01T00:00:00Z',
        qrValidUntil: '2026-11-01T00:00:00Z',
      }),
      (err) => err.statusCode === 400
    );
  } finally {
    restore();
  }
});

test('deactivating or deleting staff cascades to associations and open sessions', async () => {
  const cascaded = [];
  const restores = [
    stub(technicianRepo, {
      findAll: async () => [],
      findById: async () => ({ _id: TECH, orgId: ORG }),
      update: async (id, orgId, data) => ({ _id: id, orgId, ...data }),
      softDelete: async (id) => ({ _id: id }),
    }),
    stub(technicianService, {
      cascadeOffboarding: async (tech, orgId, reason) => cascaded.push(reason),
    }),
  ];
  try {
    await technicianService.updateTechnician(TECH, ORG, { status: 'Inactive' });
    await technicianService.deleteTechnician(TECH, ORG);
    assert.equal(cascaded.length, 2);
    await technicianService.updateTechnician(TECH, ORG, { status: 'Active' });
    assert.equal(cascaded.length, 2, 'activating must not cascade');
  } finally {
    restores.forEach((r) => r());
  }
});

test('non-admin cannot accept/reject an invitation for a staff record with no linked user', async () => {
  const restore = stub(associationRepo, {
    findById: async () => ({ _id: 'a1', status: 'Pending', technicianId: { _id: TECH, userId: null }, userId: null }),
  });
  try {
    await assert.rejects(associationService.acceptAssociation('a1', GUARD, ORG, false), (e) => e.statusCode === 403);
    await assert.rejects(associationService.rejectAssociation('a1', GUARD, ORG, '', false), (e) => e.statusCode === 403);
  } finally {
    restore();
  }
});

// ---------- QR rotation (shared signer) ----------
const { signStaffQr, verifyStaffQrSignature } = await import('../src/utils/staffQr.utils.js');

test('rotating a pass invalidates old signatures, including the legacy un-timestamped format', () => {
  const v0 = { _id: TECH, staffCode: 'STF-001' };
  const oldSig = signStaffQr(ORG, v0);
  assert.equal(verifyStaffQrSignature(ORG, v0, oldSig), true);

  const v1 = { ...v0, qrVersion: 1 };
  assert.throws(() => verifyStaffQrSignature(ORG, v1, oldSig), (e) => e.statusCode === 401);
  const newSig = signStaffQr(ORG, v1);
  assert.notEqual(newSig, oldSig);
  assert.equal(verifyStaffQrSignature(ORG, v1, newSig), true);
});

test('generateStaffQrPayload output verifies and exposes qrVersion', () => {
  const tech = { _id: TECH, staffCode: 'STF-001', name: 'Ali', qrVersion: 2 };
  const payload = technicianService.generateStaffQrPayload(tech, ORG);
  assert.equal(payload.qrVersion, 2);
  assert.equal(verifyStaffQrSignature(ORG, tech, payload.signature), true);
});

test('rotateStaffQr bumps the version via the repository and 404s for unknown staff', async () => {
  const restore = stub(technicianRepo, {
    incrementQrVersion: async (id) => (id === TECH ? { _id: TECH, orgId: ORG, status: 'Active', qrVersion: 1 } : null),
    findById: async () => ({ _id: TECH, orgId: ORG, status: 'Active', isDeleted: false, qrVersion: 1, staffCode: 'S1' }),
  });
  try {
    const out = await technicianService.rotateStaffQr(TECH, ORG);
    assert.equal(out.qrVersion, 1);
    await assert.rejects(technicianService.rotateStaffQr('507f1f77bcf86cd7994399aa', ORG), (e) => e.statusCode === 404);
  } finally {
    restore();
  }
});

// ---------- Resident "staff inside now" ----------
test('residents only see staff inside who are allocated to their own units', async () => {
  const VILLA_MINE = '507f1f77bcf86cd7994390aa';
  const VILLA_OTHER = '507f1f77bcf86cd7994390bb';
  let askedTechIds = null;
  const restores = [
    stub(associationService, {
      resolveUserAuthorizedUnitIds: async () => ({ unitIds: [VILLA_MINE], units: [{ _id: VILLA_MINE, unitNumber: 'A-101' }] }),
      getAssociations: async () => [
        { technicianId: { _id: 't1' }, villaId: { _id: VILLA_MINE, unitNumber: 'A-101' } },
        { technicianId: { _id: 't2' }, villaId: { _id: VILLA_OTHER, unitNumber: 'B-202' } },
      ],
    }),
    stub(attendanceRepo, {
      getActiveSessionsForTechnicians: async (orgId, ids) => {
        askedTechIds = ids;
        return [
          {
            _id: 's1',
            checkInTime: new Date(),
            checkInGate: 'Main Gate',
            technicianId: { _id: 't1', name: 'Ali', department: 'Plumbing', phone: '999' },
          },
        ];
      },
    }),
  ];
  try {
    const out = await attendanceService.getActiveStaffForMyUnits('u1', ORG, false);
    assert.deepEqual(askedTechIds, ['t1']);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].unitNumbers, ['A-101']);
    assert.equal('phone' in out[0], false, 'contact details must not be exposed');
  } finally {
    restores.forEach((r) => r());
  }
});

test('residents with no authorized units get an empty list without querying attendance', async () => {
  let queried = false;
  const restores = [
    stub(associationService, { resolveUserAuthorizedUnitIds: async () => ({ unitIds: [], units: [] }) }),
    stub(attendanceRepo, { getActiveSessionsForTechnicians: async () => ((queried = true), []) }),
  ];
  try {
    assert.deepEqual(await attendanceService.getActiveStaffForMyUnits('u1', ORG, false), []);
    assert.equal(queried, false);
  } finally {
    restores.forEach((r) => r());
  }
});

// ---------- Gate preview (lookup) ----------
test('lookup reports status without recording anything, and enables only the valid action', async () => {
  let wrote = false;
  const writeGuard = async () => {
    wrote = true;
    return null;
  };
  const restore = scanStubs({
    openSession: null,
    repo: { createSession: writeGuard, closeSession: writeGuard, autoCloseSession: writeGuard },
  });
  try {
    const outside = await attendanceService.lookupStaffForScan({ scannedPayload: validToken(), orgId: ORG });
    assert.equal(outside.isInside, false);
    assert.equal(outside.canCheckIn, true);
    assert.equal(outside.canCheckOut, false);
    assert.equal('userId' in outside.technician, false);
  } finally {
    restore();
  }

  const restoreInside = scanStubs({
    openSession: { _id: 's1', checkInTime: new Date(), checkInGate: 'Main Gate' },
    repo: { createSession: writeGuard, closeSession: writeGuard, autoCloseSession: writeGuard },
  });
  try {
    const inside = await attendanceService.lookupStaffForScan({ scannedPayload: validToken(), orgId: ORG });
    assert.equal(inside.isInside, true);
    assert.equal(inside.canCheckIn, false);
    assert.equal(inside.canCheckOut, true);
    assert.equal(wrote, false, 'lookup must never write attendance');
  } finally {
    restoreInside();
  }
});

test('lookup rejects unsigned or tampered passes like a real scan', async () => {
  const restore = scanStubs();
  const restoreList = stub(technicianService, { getTechnicians: async () => [activeTech] });
  try {
    await assert.rejects(
      attendanceService.lookupStaffForScan({ scannedPayload: 'STF-001', orgId: ORG }),
      (e) => e.statusCode === 401
    );
    await assert.rejects(
      attendanceService.lookupStaffForScan({ scannedPayload: `STF:${TECH}:0000000000000000`, orgId: ORG }),
      (e) => e.statusCode === 401
    );
  } finally {
    restoreList();
    restore();
  }
});

test('lookup of deactivated staff only allows check-out when still inside', async () => {
  const restore = scanStubs({
    tech: { ...activeTech, status: 'Inactive' },
    openSession: { _id: 's1', checkInTime: new Date() },
  });
  try {
    const r = await attendanceService.lookupStaffForScan({ scannedPayload: validToken(), orgId: ORG });
    assert.equal(r.canCheckIn, false);
    assert.equal(r.canCheckOut, true);
  } finally {
    restore();
  }
});

test('syncOrUpsertTechnicianFromUser does NOT recreate or un-delete a soft-deleted staff member during background syncs', async () => {
  let createdCount = 0;
  let restoredCount = 0;
  const restore = stub(technicianRepo, {
    findAnyByContactOrUserId: async () => ({ _id: TECH, userId: 'u1', isDeleted: true, status: 'Inactive' }),
    create: async () => { createdCount++; return { _id: 'new-tech' }; },
    restoreOrUpdate: async () => { restoredCount++; return { _id: TECH, isDeleted: false, status: 'Active' }; },
  });

  try {
    // Routine background sync without allowReactivateDeleted
    const res = await technicianService.syncOrUpsertTechnicianFromUser({
      userId: 'u1',
      orgId: ORG,
      email: 'test@example.com',
      allowReactivateDeleted: false,
    });
    assert.equal(res, null, 'Must return null for soft-deleted staff');
    assert.equal(createdCount, 0, 'Must NOT create a new technician document');
    assert.equal(restoredCount, 0, 'Must NOT restore soft-deleted technician');

    // Explicit administrative reactivation
    const reactivated = await technicianService.syncOrUpsertTechnicianFromUser({
      userId: 'u1',
      orgId: ORG,
      email: 'test@example.com',
      allowReactivateDeleted: true,
    });
    assert.notEqual(reactivated, null);
    assert.equal(restoredCount, 1, 'Must restore soft-deleted technician on explicit reactivation');
    assert.equal(createdCount, 0, 'Must NOT create a duplicate technician document');
  } finally {
    restore();
  }
});


// ---------- Custom "Others" department ----------
const { cleanDepartmentOther } = await import('../src/features/technician/technician.service.js');
const { departmentLabel } = await import('../src/features/staffAttendance/staffAttendance.export.js');

test('custom department text is cleaned to a single short plain line', () => {
  assert.equal(cleanDepartmentOther('  Pest \n\t control   '), 'Pest control');
  assert.equal(cleanDepartmentOther('x'.repeat(100)).length, 60);
  assert.equal(cleanDepartmentOther(null), '');
});

test('updateTechnician keeps the typed trade for Others and clears it for a fixed department', async () => {
  let written = null;
  const restore = stub(technicianRepo, {
    findAll: async () => [],
    findById: async () => ({ _id: TECH, orgId: ORG }),
    update: async (id, orgId, data) => {
      written = data;
      return { _id: id, orgId, ...data };
    },
  });
  try {
    await technicianService.updateTechnician(TECH, ORG, { department: 'Others', departmentOther: '  Gardener ' });
    assert.deepEqual({ d: written.department, o: written.departmentOther }, { d: 'Others', o: 'Gardener' });
    await technicianService.updateTechnician(TECH, ORG, { department: 'Plumbing', departmentOther: 'Gardener' });
    assert.equal(written.departmentOther, '');
  } finally {
    restore();
  }
});

test('syncOrUpsertTechnicianFromUser stores the typed trade only for Others', async () => {
  let created = null;
  const restore = stub(technicianRepo, {
    findAnyByContactOrUserId: async () => null,
    existsDeletedByUserIdOrContact: async () => false,
    create: async (doc) => ((created = doc), { _id: 't9', ...doc }),
  });
  try {
    await technicianService.syncOrUpsertTechnicianFromUser({ userId: 'u1', orgId: ORG, name: 'G', phone: '9', department: 'Others', departmentOther: 'Gardener' });
    assert.equal(created.departmentOther, 'Gardener');
    await technicianService.syncOrUpsertTechnicianFromUser({ userId: 'u1', orgId: ORG, name: 'G', phone: '9', department: 'Security', departmentOther: 'Gardener' });
    assert.equal(created.departmentOther, '');
  } finally {
    restore();
  }
});

test('exports and labels show the typed trade for Others', () => {
  assert.equal(departmentLabel({ department: 'Others', departmentOther: 'Gardener' }), 'Others - Gardener');
  assert.equal(departmentLabel({ department: 'Others' }), 'Others');
  assert.equal(departmentLabel({ department: 'Plumbing', departmentOther: 'stale' }), 'Plumbing');
});
