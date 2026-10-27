import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const { authorizeAnyPermission } = await import('../src/middlewares/rbac.middleware.js');
const staffUnitAssociationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const staffUnitAssociationRepository = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.repository.js')).default;
const villaService = (await import('../src/features/villa/villa.services.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const orgMembershipService = (await import('../src/features/orgMembership/orgMembership.services.js')).default;

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const RESIDENT_USER_A = '507f1f77bcf86cd799439033';
const RESIDENT_USER_B = '507f1f77bcf86cd799439044';
const VILLA_1 = '507f1f77bcf86cd799439055';
const VILLA_2 = '507f1f77bcf86cd799439066';
const VILLA_OTHER = '507f1f77bcf86cd799439077';
const TECH_1 = '507f1f77bcf86cd799439088';
const TECH_2 = '507f1f77bcf86cd799439099';

test('1. resolveUserAuthorizedUnitIds resolves units from OrgMembership and direct Villa links', async () => {
  const origGetMembership = orgMembershipService.getMembership;
  const origGetByResident = villaService.getUnitsByResidentUserIds;
  const origGetByVillaIds = villaService.getUnitsByVillaIds;

  try {
    orgMembershipService.getMembership = async (userId, orgId) => ({
      userId,
      orgId,
      status: 'Active',
      units: [{ villaId: VILLA_1, residentType: 'Owner' }],
    });

    villaService.getUnitsByResidentUserIds = async (userIds) => [
      { _id: VILLA_2, orgId: ORG_A, unitNumber: 'B-202', ownerId: RESIDENT_USER_A },
    ];

    villaService.getUnitsByVillaIds = async (ids, orgId) => [
      { _id: VILLA_1, orgId: ORG_A, unitNumber: 'A-101', blockOrBuilding: 'Block A', type: 'Apartment', status: 'Occupied', floor: '1' },
      { _id: VILLA_2, orgId: ORG_A, unitNumber: 'B-202', blockOrBuilding: 'Block B', type: 'Villa', status: 'Occupied', floor: '2' },
    ];

    const result = await staffUnitAssociationService.resolveUserAuthorizedUnitIds(RESIDENT_USER_A, ORG_A, false);
    assert.equal(result.unitIds.length, 2);
    assert.ok(result.unitIds.includes(VILLA_1));
    assert.ok(result.unitIds.includes(VILLA_2));
    assert.equal(result.units.length, 2);
  } finally {
    orgMembershipService.getMembership = origGetMembership;
    villaService.getUnitsByResidentUserIds = origGetByResident;
    villaService.getUnitsByVillaIds = origGetByVillaIds;
  }
});

test('2. getMyAuthorizedUnits returns sanitized unit fields only', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [
        {
          _id: VILLA_1,
          unitNumber: 'A-101',
          blockOrBuilding: 'Block A',
          type: 'Apartment',
          status: 'Occupied',
          floor: '1',
          metadata: { privateData: 'secret' },
        },
      ],
    });

    const units = await staffUnitAssociationService.getMyAuthorizedUnits(RESIDENT_USER_A, ORG_A, false);
    assert.equal(units.length, 1);
    assert.equal(units[0]._id, VILLA_1);
    assert.equal(units[0].unitNumber, 'A-101');
    assert.equal(units[0].metadata, undefined, 'Internal metadata must not be exposed');
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
  }
});

test('3. getEligibleStaff returns sanitized active staff in the community', async () => {
  const origGetTechnicians = technicianService.getTechnicians;
  try {
    technicianService.getTechnicians = async (orgId, filter) => [
      {
        _id: TECH_1,
        name: 'Mohammed Ali',
        department: 'Electrical',
        designation: 'Senior Electrician',
        type: 'In-House Staff',
        staffCode: 'STF-001',
        phone: '+966500000001',
        email: 'ali@example.com',
        status: 'Active',
        notes: 'Secret internal admin disciplinary note',
      },
    ];

    const staffList = await staffUnitAssociationService.getEligibleStaff(ORG_A);
    assert.equal(staffList.length, 1);
    assert.equal(staffList[0].name, 'Mohammed Ali');
    assert.equal(staffList[0].department, 'Electrical');
    assert.equal(staffList[0].notes, undefined, 'Internal admin notes must never leak to residents');
  } finally {
    technicianService.getTechnicians = origGetTechnicians;
  }
});

test('4. createAssociation allows authorized resident to associate eligible staff', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;
  const origFindActive = staffUnitAssociationRepository.findActive;
  const origFindPending = staffUnitAssociationRepository.findPending;
  const origCreate = staffUnitAssociationRepository.create;
  const origFindById = staffUnitAssociationRepository.findById;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1, unitNumber: 'A-101' }],
    });

    villaService.getUnitById = async () => ({ _id: VILLA_1, orgId: ORG_A });
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
      userId: 'userTech1',
      designation: 'Electrician',
    });

    staffUnitAssociationRepository.findActive = async () => null;
    staffUnitAssociationRepository.findPending = async () => null;
    staffUnitAssociationRepository.create = async (doc) => ({ _id: 'assoc1', ...doc });
    staffUnitAssociationRepository.findById = async () => ({
      _id: 'assoc1',
      villaId: { _id: VILLA_1, unitNumber: 'A-101' },
      technicianId: { _id: TECH_1, name: 'Mohammed Ali' },
      status: 'Pending',
      associatedBy: { _id: RESIDENT_USER_A },
    });

    const result = await staffUnitAssociationService.createAssociation(
      RESIDENT_USER_A,
      ORG_A,
      { villaId: VILLA_1, technicianId: TECH_1, notes: 'Morning maintenance' },
      false
    );

    assert.ok(result);
    assert.equal(result._id, 'assoc1');
    assert.equal(result.status, 'Pending');
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationRepository.findActive = origFindActive;
    staffUnitAssociationRepository.findPending = origFindPending;
    staffUnitAssociationRepository.create = origCreate;
    staffUnitAssociationRepository.findById = origFindById;
  }
});

test('5. createAssociation rejects resident attempting to associate with unauthorized unit with 403', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });

    await assert.rejects(
      async () =>
        staffUnitAssociationService.createAssociation(
          RESIDENT_USER_A,
          ORG_A,
          { villaId: VILLA_OTHER, technicianId: TECH_1 },
          false
        ),
      (err) => err.statusCode === 403 && err.message.includes('not authorized'),
      'Must return 403 Forbidden when resident attempts to associate staff with a unit they do not manage'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
  }
});

test('6. createAssociation rejects inactive or cross-community staff with 400', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });
    villaService.getUnitById = async () => ({ _id: VILLA_1, orgId: ORG_A });

    // Inactive staff
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Inactive',
      isDeleted: false,
    });

    await assert.rejects(
      async () =>
        staffUnitAssociationService.createAssociation(
          RESIDENT_USER_A,
          ORG_A,
          { villaId: VILLA_1, technicianId: TECH_1 },
          false
        ),
      (err) => err.statusCode === 400 && err.message.includes('not active'),
      'Must return 400 when staff member is inactive'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
  }
});

test('7. createAssociation rejects duplicate active association with 409 Conflict', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;
  const origFindActive = staffUnitAssociationRepository.findActive;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });
    villaService.getUnitById = async () => ({ _id: VILLA_1, orgId: ORG_A });
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
    });

    staffUnitAssociationRepository.findActive = async () => ({
      _id: 'existingActive',
      status: 'Active',
    });

    await assert.rejects(
      async () =>
        staffUnitAssociationService.createAssociation(
          RESIDENT_USER_A,
          ORG_A,
          { villaId: VILLA_1, technicianId: TECH_1 },
          false
        ),
      (err) => err.statusCode === 409 && err.message.includes('already actively associated'),
      'Must return 409 Conflict when active association already exists for this unit and staff member'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationRepository.findActive = origFindActive;
  }
});

test('8. Multi-unit association: One staff member can be associated with multiple distinct units', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;
  const origFindActive = staffUnitAssociationRepository.findActive;
  const origFindPending = staffUnitAssociationRepository.findPending;
  const origCreate = staffUnitAssociationRepository.create;
  const origFindById = staffUnitAssociationRepository.findById;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1, VILLA_2],
      units: [{ _id: VILLA_1 }, { _id: VILLA_2 }],
    });
    villaService.getUnitById = async (id) => ({ _id: id, orgId: ORG_A });
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
    });

    // Neither association is duplicate
    staffUnitAssociationRepository.findActive = async () => null;
    staffUnitAssociationRepository.findPending = async () => null;
    staffUnitAssociationRepository.create = async (doc) => ({ _id: `assoc-${doc.villaId}`, ...doc });
    staffUnitAssociationRepository.findById = async (id) => ({ _id: id, status: 'Pending' });

    const assoc1 = await staffUnitAssociationService.createAssociation(
      RESIDENT_USER_A,
      ORG_A,
      { villaId: VILLA_1, technicianId: TECH_1 },
      false
    );
    const assoc2 = await staffUnitAssociationService.createAssociation(
      RESIDENT_USER_A,
      ORG_A,
      { villaId: VILLA_2, technicianId: TECH_1 },
      false
    );

    assert.equal(assoc1._id, 'assoc-507f1f77bcf86cd799439055');
    assert.equal(assoc2._id, 'assoc-507f1f77bcf86cd799439066');
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationRepository.findActive = origFindActive;
    staffUnitAssociationRepository.findPending = origFindPending;
    staffUnitAssociationRepository.create = origCreate;
    staffUnitAssociationRepository.findById = origFindById;
  }
});

test('9. getAssociations filters to authorized units and blocks cross-household inspection with 403', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origFindAssoc = staffUnitAssociationRepository.findAssociations;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });

    let passedFilter = null;
    staffUnitAssociationRepository.findAssociations = async (orgId, filter) => {
      passedFilter = filter;
      return [{ _id: 'assoc1', villaId: VILLA_1 }];
    };

    const res = await staffUnitAssociationService.getAssociations(RESIDENT_USER_A, ORG_A, {}, false);
    assert.equal(res.length, 1);
    assert.deepEqual(passedFilter.villaId, { $in: [VILLA_1] }, 'Query must be constrained to authorized units');

    // Attempting to filter by unauthorized unit throws 403
    await assert.rejects(
      async () =>
        staffUnitAssociationService.getAssociations(
          RESIDENT_USER_A,
          ORG_A,
          { villaId: VILLA_OTHER },
          false
        ),
      (err) => err.statusCode === 403,
      'Must return 403 when resident queries a unit they do not manage'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    staffUnitAssociationRepository.findAssociations = origFindAssoc;
  }
});

test('10. removeAssociation soft-deactivates association without deleting or modifying canonical Technician', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origFindById = staffUnitAssociationRepository.findById;
  const origDeactivate = staffUnitAssociationRepository.deactivate;
  const origDeleteTech = technicianService.deleteTechnician;

  let techDeleteCalled = false;
  technicianService.deleteTechnician = async () => {
    techDeleteCalled = true;
  };

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });

    staffUnitAssociationRepository.findById = async () => ({
      _id: 'assoc1',
      villaId: { _id: VILLA_1 },
      technicianId: { _id: TECH_1, name: 'Ali' },
      status: 'Active',
    });

    staffUnitAssociationRepository.deactivate = async (id, orgId, userId, reason) => ({
      _id: id,
      status: 'Inactive',
      deactivatedBy: userId,
      deactivationReason: reason,
    });

    const result = await staffUnitAssociationService.removeAssociation('assoc1', RESIDENT_USER_A, ORG_A, 'No longer needed', false);
    assert.equal(result.status, 'Inactive');
    assert.equal(techDeleteCalled, false, 'Canonical Technician record MUST NOT be deleted or altered');
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    staffUnitAssociationRepository.findById = origFindById;
    staffUnitAssociationRepository.deactivate = origDeactivate;
    technicianService.deleteTechnician = origDeleteTech;
  }
});

test('11. removeAssociation denies resident attempting to remove association for another household with 403', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origFindById = staffUnitAssociationRepository.findById;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });

    staffUnitAssociationRepository.findById = async () => ({
      _id: 'assocOther',
      villaId: { _id: VILLA_OTHER },
      status: 'Active',
    });

    await assert.rejects(
      async () => staffUnitAssociationService.removeAssociation('assocOther', RESIDENT_USER_A, ORG_A, '', false),
      (err) => err.statusCode === 403,
      'Resident must receive 403 when attempting to dissociate staff from another household'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    staffUnitAssociationRepository.findById = origFindById;
  }
});

test('12. Community Admin can associate and dissociate staff across any unit in the community', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;
  const origFindActive = staffUnitAssociationRepository.findActive;
  const origFindPending = staffUnitAssociationRepository.findPending;
  const origCreate = staffUnitAssociationRepository.create;
  const origFindById = staffUnitAssociationRepository.findById;

  try {
    villaService.getUnitById = async () => ({ _id: VILLA_OTHER, orgId: ORG_A });
    technicianService.getTechnicianById = async () => ({
      _id: TECH_1,
      orgId: ORG_A,
      status: 'Active',
      isDeleted: false,
    });
    staffUnitAssociationRepository.findActive = async () => null;
    staffUnitAssociationRepository.findPending = async () => null;
    staffUnitAssociationRepository.create = async (doc) => ({ _id: 'adminAssoc', ...doc });
    staffUnitAssociationRepository.findById = async () => ({ _id: 'adminAssoc', status: 'Active' });

    // Admin creates for any villa without resident unit restrictions
    const result = await staffUnitAssociationService.createAssociation(
      RESIDENT_USER_B,
      ORG_A,
      { villaId: VILLA_OTHER, technicianId: TECH_1 },
      true // isAdmin
    );
    assert.equal(result._id, 'adminAssoc');
  } finally {
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationRepository.findActive = origFindActive;
    staffUnitAssociationRepository.findPending = origFindPending;
    staffUnitAssociationRepository.create = origCreate;
    staffUnitAssociationRepository.findById = origFindById;
  }
});

test('13. Route authorization: staff:assign_unit grants access and unauthorized role is denied', async () => {
  const middleware = authorizeAnyPermission(['staff:assign_unit', 'staff:manage']);

  // Case A: Resident with staff:assign_unit
  const reqResident = {
    user: { id: RESIDENT_USER_A, role: 'Resident Owner', orgId: ORG_A, permissions: ['staff:assign_unit'] },
    tenantPermissions: ['staff:assign_unit'],
    headers: { 'x-organization-id': ORG_A },
  };
  let residentPassed = false;
  await middleware(reqResident, {}, (err) => { if (!err) residentPassed = true; });
  assert.equal(residentPassed, true, 'User with staff:assign_unit must pass authorization');

  // Case B: User without staff:assign_unit or staff:manage
  const reqUnauth = {
    user: { id: RESIDENT_USER_B, role: 'Visitor', orgId: ORG_A, permissions: ['visitor:resident'] },
    tenantPermissions: ['visitor:resident'],
    headers: { 'x-organization-id': ORG_A },
  };
  let error = null;
  await middleware(reqUnauth, {}, (err) => { error = err; });
  assert.ok(error, 'User without staff:assign_unit must be rejected');
  assert.equal(error.statusCode, 403, 'Must return 403 Forbidden');
});

test('14. resolveUserAuthorizedUnitIds returns empty if OrgMembership is Inactive or missing', async () => {
  const origGetMembership = orgMembershipService.getMembership;
  try {
    // Inactive membership
    orgMembershipService.getMembership = async () => ({
      userId: RESIDENT_USER_A,
      orgId: ORG_A,
      status: 'Inactive',
      units: [{ villaId: VILLA_1, residentType: 'Owner' }],
    });

    const res = await staffUnitAssociationService.resolveUserAuthorizedUnitIds(RESIDENT_USER_A, ORG_A, false);
    assert.deepEqual(res.unitIds, []);
    assert.deepEqual(res.units, []);

    // Missing membership (null)
    orgMembershipService.getMembership = async () => null;
    const resNull = await staffUnitAssociationService.resolveUserAuthorizedUnitIds(RESIDENT_USER_A, ORG_A, false);
    assert.deepEqual(resNull.unitIds, []);
    assert.deepEqual(resNull.units, []);
  } finally {
    orgMembershipService.getMembership = origGetMembership;
  }
});

test('15. resolveUserAuthorizedUnitIds filters out inactive villas and cross-org villas', async () => {
  const origGetMembership = orgMembershipService.getMembership;
  const origGetUnits = villaService.getUnitsByVillaIds;
  const origGetResidentUnits = villaService.getUnitsByResidentUserIds;
  try {
    orgMembershipService.getMembership = async () => ({
      userId: RESIDENT_USER_A,
      orgId: ORG_A,
      status: 'Active',
      units: [{ villaId: VILLA_1 }, { villaId: VILLA_2 }],
    });
    villaService.getUnitsByResidentUserIds = async () => [];

    // VILLA_1 is active in ORG_A; VILLA_2 is Inactive
    villaService.getUnitsByVillaIds = async (ids, orgId) => [
      { _id: VILLA_1, orgId: ORG_A, status: 'Occupied' },
      { _id: VILLA_2, orgId: ORG_A, status: 'Inactive' },
    ];

    const res = await staffUnitAssociationService.resolveUserAuthorizedUnitIds(RESIDENT_USER_A, ORG_A, false);
    assert.deepEqual(res.unitIds, [VILLA_1]);
    assert.equal(res.units.length, 1);
    assert.equal(res.units[0]._id, VILLA_1);
  } finally {
    orgMembershipService.getMembership = origGetMembership;
    villaService.getUnitsByVillaIds = origGetUnits;
    villaService.getUnitsByResidentUserIds = origGetResidentUnits;
  }
});

test('16. createAssociation rejects villa or technician belonging to another org with 400 or 404', async () => {
  const origResolve = staffUnitAssociationService.resolveUserAuthorizedUnitIds;
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;

  try {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = async () => ({
      unitIds: [VILLA_1],
      units: [{ _id: VILLA_1 }],
    });

    // Case A: Villa belongs to ORG_B -> 404 Not Found in this community
    villaService.getUnitById = async () => ({ _id: VILLA_1, orgId: ORG_B });
    technicianService.getTechnicianById = async () => ({ _id: TECH_1, orgId: ORG_A, status: 'Active' });

    await assert.rejects(
      async () =>
        staffUnitAssociationService.createAssociation(RESIDENT_USER_A, ORG_A, { villaId: VILLA_1, technicianId: TECH_1 }, true),
      (err) => (err.statusCode === 404 || err.statusCode === 400) && (err.message.includes('community') || err.message.includes('organization')),
      'Must reject cross-tenant villa'
    );

    // Case B: Technician belongs to ORG_B -> 400 Bad Request
    villaService.getUnitById = async () => ({ _id: VILLA_1, orgId: ORG_A });
    technicianService.getTechnicianById = async () => ({ _id: TECH_1, orgId: ORG_B, status: 'Active' });

    await assert.rejects(
      async () =>
        staffUnitAssociationService.createAssociation(RESIDENT_USER_A, ORG_A, { villaId: VILLA_1, technicianId: TECH_1 }, true),
      (err) => err.statusCode === 400 && err.message.includes('community'),
      'Must reject cross-tenant technician'
    );
  } finally {
    staffUnitAssociationService.resolveUserAuthorizedUnitIds = origResolve;
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
  }
});

test('17. Repository create converts Mongo duplicate key (11000) race to HTTP 409', async () => {
  const StaffUnitAssociation = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.model.js')).default;
  const origSave = StaffUnitAssociation.prototype.save;

  try {
    StaffUnitAssociation.prototype.save = async function () {
      const err = new Error('E11000 duplicate key error collection: staffunitassociations index: orgId_1_villaId_1_technicianId_1 dup key');
      err.code = 11000;
      throw err;
    };

    await assert.rejects(
      async () =>
        staffUnitAssociationRepository.create({
          orgId: ORG_A,
          villaId: VILLA_1,
          technicianId: TECH_1,
          associatedBy: RESIDENT_USER_A,
        }),
      (err) => err.statusCode === 409 && err.message.includes('already actively associated'),
      'Must convert E11000 to HTTP 409 Conflict'
    );
  } finally {
    StaffUnitAssociation.prototype.save = origSave;
  }
});

test('18. Permission isolation: staff:view and staff:view_own cannot access association management endpoints', async () => {
  const assocMiddleware = authorizeAnyPermission(['staff:assign_unit', 'staff:manage']);

  // Case A: User with only staff:view
  const reqStaffView = {
    user: { id: RESIDENT_USER_A, role: 'Viewer', orgId: ORG_A, permissions: ['staff:view'] },
    tenantPermissions: ['staff:view'],
    headers: { 'x-organization-id': ORG_A },
  };
  let errA = null;
  await assocMiddleware(reqStaffView, {}, (err) => { errA = err; });
  assert.ok(errA, 'staff:view must be denied for association routes');
  assert.equal(errA.statusCode, 403);

  // Case B: User with staff:view_own
  const reqStaffViewOwn = {
    user: { id: TECH_1, role: 'Technician', orgId: ORG_A, permissions: ['staff:view_own'] },
    tenantPermissions: ['staff:view_own'],
    headers: { 'x-organization-id': ORG_A },
  };
  let errB = null;
  await assocMiddleware(reqStaffViewOwn, {}, (err) => { errB = err; });
  assert.ok(errB, 'staff:view_own must be denied for association routes');
  assert.equal(errB.statusCode, 403);
});


test('checkScheduleConflict detects overlap with overnight shifts and ignores adjacent windows', async () => {
  const original = staffUnitAssociationRepository.findActiveOrPendingByTechnician;
  staffUnitAssociationRepository.findActiveOrPendingByTechnician = async () => [
    { villaId: { _id: 'v1', unitNumber: 'A-1' }, accessSchedule: { days: ['mon'], timeWindow: { start: '22:00', end: '06:00' } } },
  ];
  try {
    const night = await staffUnitAssociationService.checkScheduleConflict('t1', 'o1', { days: ['mon'], timeWindow: { start: '05:00', end: '07:00' } }, 'v2');
    assert.equal(night.hasConflict, true, 'early-morning part of an overnight shift must conflict');
    const adjacent = await staffUnitAssociationService.checkScheduleConflict('t1', 'o1', { days: ['mon'], timeWindow: { start: '06:00', end: '10:00' } }, 'v2');
    assert.equal(adjacent.hasConflict, false, 'back-to-back windows do not overlap');
    const otherDay = await staffUnitAssociationService.checkScheduleConflict('t1', 'o1', { days: ['tue'], timeWindow: { start: '23:00', end: '23:30' } }, 'v2');
    assert.equal(otherDay.hasConflict, false);
  } finally {
    staffUnitAssociationRepository.findActiveOrPendingByTechnician = original;
  }
});
