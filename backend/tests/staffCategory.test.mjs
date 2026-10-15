import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const mongoose = (await import('mongoose')).default;
// Complaint assignment runs in a transaction; these tests fail before any write, so a no-op session is enough.
mongoose.startSession = async () => ({
  startTransaction() {},
  async commitTransaction() {},
  async abortTransaction() {},
  async endSession() {},
  endSession() {},
});

const {
  isCommunityAssignable,
  isResidentAssignable,
  staffCategoryForRoleScope,
  staffCategoryOf,
} = await import('../src/features/technician/staffCategory.utils.js');
const { isTenantScope, ROLE_SCOPE_VALUES } = await import('../src/features/role/roleScope.constants.js');
const staffUnitAssociationService = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.service.js')).default;
const staffUnitAssociationRepository = (await import('../src/features/staffUnitAssociation/staffUnitAssociation.repository.js')).default;
const villaService = (await import('../src/features/villa/villa.services.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const technicianRepository = (await import('../src/features/technician/technician.repository.js')).default;
const complaintService = (await import('../src/features/complaint/complaint.service.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const VILLA = '507f1f77bcf86cd799439055';
const TECH = '507f1f77bcf86cd799439088';

const community = { staffCategory: 'COMMUNITY', communityOnly: false };
const communityOnly = { staffCategory: 'COMMUNITY', communityOnly: true };
const unit = { staffCategory: 'UNIT', communityOnly: false };

test('1. Role scopes: COMMUNITY_STAFF exists, is not a tenant scope, and maps to COMMUNITY staff', () => {
  assert.ok(ROLE_SCOPE_VALUES.includes('COMMUNITY_STAFF'));
  assert.ok(ROLE_SCOPE_VALUES.includes('STAFF'));
  assert.equal(isTenantScope('COMMUNITY_STAFF'), false);
  assert.equal(isTenantScope('STAFF'), true);
  assert.equal(staffCategoryForRoleScope('COMMUNITY_STAFF'), 'COMMUNITY');
  assert.equal(staffCategoryForRoleScope('STAFF'), 'UNIT');
  assert.equal(staffCategoryForRoleScope('GLOBAL'), null);
});

test('2. Assignability matrix for community, community-only, unit and legacy staff', () => {
  assert.equal(isCommunityAssignable(community), true);
  assert.equal(isResidentAssignable(community), true);
  assert.equal(isCommunityAssignable(communityOnly), true);
  assert.equal(isResidentAssignable(communityOnly), false);
  assert.equal(isCommunityAssignable(unit), false);
  assert.equal(isResidentAssignable(unit), true);
  // Records without a category keep the pre-existing behaviour: available everywhere.
  assert.equal(staffCategoryOf({}), 'COMMUNITY');
  assert.equal(isCommunityAssignable({}), true);
  assert.equal(isResidentAssignable({}), true);
});

test('3. getEligibleStaff asks only for resident-assignable staff', async () => {
  const orig = technicianService.getTechnicians;
  let seenFilter;
  try {
    technicianService.getTechnicians = async (orgId, filter) => {
      seenFilter = filter;
      return [{ _id: TECH, name: 'Asha', department: 'Housekeeping', type: 'In-House Staff', status: 'Active', ...unit }];
    };
    const list = await staffUnitAssociationService.getEligibleStaff(ORG);
    assert.deepEqual(seenFilter.$or, [{ staffCategory: 'UNIT' }, { communityOnly: { $ne: true } }]);
    assert.equal(list[0].staffCategory, 'UNIT');
  } finally {
    technicianService.getTechnicians = orig;
  }
});

test('4. createAssociation rejects community-only staff with 400', async () => {
  const origGetUnit = villaService.getUnitById;
  const origGetTech = technicianService.getTechnicianById;
  const origFindActive = staffUnitAssociationRepository.findActive;
  try {
    villaService.getUnitById = async () => ({ _id: VILLA, orgId: ORG });
    technicianService.getTechnicianById = async () => ({ _id: TECH, orgId: ORG, status: 'Active', isDeleted: false, ...communityOnly });
    staffUnitAssociationRepository.findActive = async () => {
      throw new Error('must not reach duplicate checks');
    };
    await assert.rejects(
      () => staffUnitAssociationService.createAssociation('admin', ORG, { villaId: VILLA, technicianId: TECH }, true),
      (err) => err.statusCode === 400 || err.status === 400
    );
  } finally {
    villaService.getUnitById = origGetUnit;
    technicianService.getTechnicianById = origGetTech;
    staffUnitAssociationRepository.findActive = origFindActive;
  }
});

test('5. assignTechnician rejects Unit Staff for direct assignment', async () => {
  const origGet = complaintService.getComplaintById;
  const origFind = technicianRepository.findById;
  try {
    complaintService.getComplaintById = async () => ({ _id: 'c1', status: 'Open' });
    technicianRepository.findById = async () => ({ _id: TECH, name: 'Asha', status: 'Active', ...unit });
    await assert.rejects(
      () => complaintService.assignTechnician('c1', ORG, TECH, [], 'direct', 'Asha', 'admin', 'Admin'),
      (err) => (err.statusCode === 400 || err.status === 400) && /Unit Staff/.test(err.message)
    );
  } finally {
    complaintService.getComplaintById = origGet;
    technicianRepository.findById = origFind;
  }
});

test('6. assignTechnician rejects a broadcast that includes Unit Staff', async () => {
  const origGet = complaintService.getComplaintById;
  const origFindAll = technicianRepository.findAll;
  try {
    complaintService.getComplaintById = async () => ({ _id: 'c1', status: 'Open' });
    technicianRepository.findAll = async () => [
      { _id: 't1', name: 'Ravi', ...community },
      { _id: 't2', name: 'Asha', ...unit },
    ];
    await assert.rejects(
      () => complaintService.assignTechnician('c1', ORG, null, ['t1', 't2'], 'broadcast', null, 'admin', 'Admin'),
      (err) => /Asha/.test(err.message) && !/Ravi/.test(err.message)
    );
  } finally {
    complaintService.getComplaintById = origGet;
    technicianRepository.findAll = origFindAll;
  }
});
