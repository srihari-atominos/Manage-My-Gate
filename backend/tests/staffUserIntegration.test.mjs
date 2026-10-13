import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const userService = (await import('../src/features/user/user.services.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const technicianRepository = (await import('../src/features/technician/technician.repository.js')).default;
const staffUnitAssociationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const staffUnitAssociationRepository = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.repository.js')).default;
const villaService = (await import('../src/features/villa/villa.services.js')).default;

const ORG_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439022';
const VILLA_ID = '507f1f77bcf86cd799439033';

test('1. Role classification: isStaffRole correctly detects staff roles', () => {
  assert.equal(userService.isStaffRole('Community Staff'), true);
  assert.equal(userService.isStaffRole('Household Staff'), true);
  assert.equal(userService.isStaffRole('Staff/Vendor'), true);
  assert.equal(userService.isStaffRole('Senior Electrician'), true);
  assert.equal(userService.isStaffRole('Private Maid'), true);
  assert.equal(userService.isStaffRole('Driver'), true);
  assert.equal(userService.isStaffRole('Cook'), true);
  assert.equal(userService.isStaffRole('Resident Owner'), false);
  assert.equal(userService.isStaffRole('Resident Tenant'), false);
  assert.equal(userService.isStaffRole('Family Member'), false);
  assert.equal(userService.isStaffRole('Community Admin'), false);
});

test('2. Technician synchronization: syncOrUpsertTechnicianFromUser creates new technician profile', async () => {
  const origFindByContact = technicianRepository.findByContactOrUserId;
  const origCreate = technicianRepository.create;
  let createdData = null;

  try {
    technicianRepository.findByContactOrUserId = async () => null;
    technicianRepository.create = async (doc) => {
      createdData = doc;
      return { _id: 'tech_new_1', ...doc };
    };

    const result = await technicianService.syncOrUpsertTechnicianFromUser({
      userId: USER_ID,
      orgId: ORG_ID,
      name: 'Ramesh Electrician',
      email: 'ramesh@example.com',
      phone: '+919876543210',
      department: 'Electrical',
      type: 'In-House Staff',
      designation: 'Community Electrician',
      status: 'Active'
    });

    assert.ok(result);
    assert.equal(createdData.userId, USER_ID);
    assert.equal(createdData.orgId, ORG_ID);
    assert.equal(createdData.name, 'Ramesh Electrician');
    assert.equal(createdData.department, 'Electrical');
    assert.equal(createdData.type, 'In-House Staff');
    assert.equal(createdData.designation, 'Community Electrician');
  } finally {
    technicianRepository.findByContactOrUserId = origFindByContact;
    technicianRepository.create = origCreate;
  }
});

test('3. Dual-scope staff sync: Global staff creates Technician without Unit Association', async () => {
  const origSync = technicianService.syncOrUpsertTechnicianFromUser;
  const origCreateAssoc = staffUnitAssociationService.createAssociation;
  let assocCalled = false;

  try {
    technicianService.syncOrUpsertTechnicianFromUser = async () => ({
      _id: 'tech_global_1',
      orgId: ORG_ID,
      userId: USER_ID,
      name: 'Global Cleaner',
      department: 'Housekeeping',
      status: 'Active'
    });

    staffUnitAssociationService.createAssociation = async () => {
      assocCalled = true;
    };

    // User is global staff (no villaId)
    await userService.syncTechnicianForStaffUser(
      USER_ID,
      ORG_ID,
      ['Community Staff'],
      null,
      { isStaff: true, name: 'Global Cleaner', email: 'cleaner@example.com', villaId: null, department: 'Housekeeping' }
    );

    assert.equal(assocCalled, false, 'Global staff should not create any unit association');
  } finally {
    technicianService.syncOrUpsertTechnicianFromUser = origSync;
    staffUnitAssociationService.createAssociation = origCreateAssoc;
  }
});

test('4. Dual-scope staff sync: Unit-Scoped staff creates Technician AND Unit Association', async () => {
  const origSync = technicianService.syncOrUpsertTechnicianFromUser;
  const origCreateAssoc = staffUnitAssociationService.createAssociation;
  let assocParams = null;

  try {
    technicianService.syncOrUpsertTechnicianFromUser = async () => ({
      _id: 'tech_unit_1',
      orgId: ORG_ID,
      userId: USER_ID,
      name: 'Private Driver',
      department: 'Others',
      status: 'Active'
    });

    staffUnitAssociationService.createAssociation = async (userId, orgId, data) => {
      assocParams = { userId, orgId, data };
      return { _id: 'assoc_1', ...data };
    };

    // User is unit-scoped household staff
    await userService.syncTechnicianForStaffUser(
      USER_ID,
      ORG_ID,
      ['Household Staff'],
      null,
      {
        isStaff: true,
        name: 'Private Driver',
        email: 'driver@example.com',
        villaId: VILLA_ID,
        designation: 'Private Driver',
        department: 'Others',
        inviterId: 'admin_1'
      }
    );

    assert.ok(assocParams, 'Unit association should be created for unit-scoped staff');
    assert.equal(assocParams.orgId, ORG_ID);
    assert.equal(assocParams.data.villaId, VILLA_ID);
    assert.equal(assocParams.data.technicianId, 'tech_unit_1');
    assert.equal(assocParams.data.roleOrTrade, 'Private Driver');
  } finally {
    technicianService.syncOrUpsertTechnicianFromUser = origSync;
    staffUnitAssociationService.createAssociation = origCreateAssoc;
  }
});

test('5. Bulk Unit Upload: Recognizes Household Staff and triggers staff onboarding', async () => {
  const origInvite = userService.inviteUser;
  let invitedArgs = null;

  try {
    userService.inviteUser = async (...args) => {
      invitedArgs = args;
      return { user: { _id: USER_ID } };
    };

    const origFindVilla = (await import('../src/features/villa/villa.repository.js')).default.findByUnitNumber;
    const origCreateVilla = (await import('../src/features/villa/villa.repository.js')).default.create;

    (await import('../src/features/villa/villa.repository.js')).default.findByUnitNumber = async () => null;
    (await import('../src/features/villa/villa.repository.js')).default.create = async () => ({ _id: VILLA_ID, unitNumber: '101' });

    await villaService.bulkUploadVillasAndResidents(
      [{
        unitNumber: '101',
        blockOrBuilding: 'Block A',
        floor: '1',
        type: 'Apartment',
        status: 'Occupied',
        name: 'Private Cook',
        email: 'cook@example.com',
        phone: '+919876543299',
        residentType: 'Household Staff'
      }],
      ORG_ID,
      'WEB'
    );

    assert.ok(invitedArgs, 'inviteUser should be called during bulk unit upload');
    // Arg 3: villaId, Arg 4: normalizedResidentType, Arg 10: staffData
    assert.equal(invitedArgs[2], VILLA_ID);
    assert.equal(invitedArgs[3], 'Household Staff');
    assert.ok(invitedArgs[10]?.isStaff, 'staffData.isStaff should be true');
  } finally {
    userService.inviteUser = origInvite;
  }
});
