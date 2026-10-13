import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const { checkIsAdmin, authorizePermission, authorizeAnyPermission } = await import('../src/middlewares/rbac.middleware.js');
const { expandUserPermissions, mapPermission } = await import('../src/utils/permissionMapper.js');
const { isVisitorManager } = await import('../src/features/visitorPass/visitorPass.policy.js');

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const USER_ID = '507f1f77bcf86cd799439033';

test('1. Legitimate Platform Admin retains intended platform-level access', async () => {
  const platformAdminReq = {
    user: {
      id: USER_ID,
      role: 'Platform Super Admin',
      isPlatform: true,
    },
    headers: {},
  };
  const isAdmin = await checkIsAdmin(platformAdminReq);
  assert.equal(isAdmin, true, 'Platform admin with isPlatform:true must be admin');

  const platformAdminTokenRoleReq = {
    user: {
      id: USER_ID,
      role: 'Platform Super Admin',
      isPlatform: false,
    },
    headers: {},
  };
  const isAdminToken = await checkIsAdmin(platformAdminTokenRoleReq);
  assert.equal(isAdminToken, true, 'Platform Super Admin role without orgId must retain platform admin access');
});

test('2. Legitimate Community Admin retains intended community-level access', async () => {
  const communityAdminReq = {
    user: {
      id: USER_ID,
      role: 'Community Admin',
      orgId: ORG_A,
    },
    headers: {
      'x-organization-id': ORG_A,
    },
    tenant: {
      orgId: ORG_A,
      role: 'Community Admin',
    },
    tenantRole: 'Community Admin',
  };
  const isAdmin = await checkIsAdmin(communityAdminReq);
  assert.equal(isAdmin, true, 'Community Admin must be recognized for their community');
});

test('3. Custom role "Staff Administrator" does not gain admin privileges', async () => {
  const staffAdminReq = {
    user: {
      id: USER_ID,
      role: 'Staff Administrator',
      orgId: ORG_A,
    },
    headers: {
      'x-organization-id': ORG_A,
    },
    tenant: {
      orgId: ORG_A,
      role: 'Staff Administrator',
    },
    tenantRole: 'Staff Administrator',
  };
  const isAdmin = await checkIsAdmin(staffAdminReq);
  assert.equal(isAdmin, false, '"Staff Administrator" must NOT bypass RBAC as admin');
});

test('4. Custom role "Maintenance Supervisor" does not gain admin privileges', async () => {
  const supervisorReq = {
    user: {
      id: USER_ID,
      role: 'Maintenance Supervisor',
      orgId: ORG_A,
    },
    headers: {
      'x-organization-id': ORG_A,
    },
    tenantRole: 'Maintenance Supervisor',
  };
  const isAdmin = await checkIsAdmin(supervisorReq);
  assert.equal(isAdmin, false, '"Maintenance Supervisor" must NOT be treated as admin');
});

test('5. Custom role "Administration Assistant" does not gain admin privileges', async () => {
  const adminAssistantReq = {
    user: {
      id: USER_ID,
      role: 'Administration Assistant',
      orgId: ORG_A,
    },
    headers: {
      'x-organization-id': ORG_A,
    },
    tenantRole: 'Administration Assistant',
  };
  const isAdmin = await checkIsAdmin(adminAssistantReq);
  assert.equal(isAdmin, false, '"Administration Assistant" must NOT be treated as admin');
});

test('6. Role without required permission is denied in middleware', async () => {
  const middleware = authorizePermission('staff', 'manage');
  const req = {
    user: {
      id: USER_ID,
      role: 'Staff Administrator',
      orgId: ORG_A,
      permissions: ['staff:view'],
    },
    headers: {
      'x-organization-id': ORG_A,
    },
    tenantPermissions: ['staff:view'],
    tenantRole: 'Staff Administrator',
  };
  let errorCaught = null;
  const next = (err) => {
    if (err) errorCaught = err;
  };
  await middleware(req, {}, next);
  assert.ok(errorCaught, 'Should deny request lacking staff:manage permission');
  assert.equal(errorCaught.statusCode, 403, 'Should return HTTP 403 Forbidden');
});

test('7. Cross-community access: Community Admin cannot access another community resources', async () => {
  // User is Community Admin in Org A, but requests Org B without membership in Org B
  const crossCommunityReq = {
    user: {
      id: USER_ID,
      role: 'Community Admin',
      orgId: ORG_A, // Home community is Org A
    },
    headers: {
      'x-organization-id': ORG_B, // Targets Org B
    },
    tenant: {
      orgId: ORG_A,
      role: 'Community Admin',
    },
    // tenantRole is for Org A, mismatch with Org B
  };
  const isAdminForOrgB = await checkIsAdmin(crossCommunityReq);
  assert.equal(isAdminForOrgB, false, 'Community Admin of Org A must NOT have admin authority in Org B');
});

test('8. Role-assignment ceiling cannot be bypassed through renamed role', async () => {
  // A non-admin holding "Staff Administrator" with only 'staff:view' cannot assign 'staff:manage'
  const inviterPermissions = expandUserPermissions(['staff:view'].map(mapPermission));
  const targetRolePermissions = ['staff:view', 'staff:manage'];

  const missing = targetRolePermissions
    .map(mapPermission)
    .filter((p) => !inviterPermissions.includes(p));

  assert.ok(missing.includes('staff:manage'), 'Ceiling correctly detects missing staff:manage permission');
});

test('9. Existing valid authorization flows continue to work', async () => {
  // User with staff:view can read staff records via authorizeAnyPermission
  const anyPermMiddleware = authorizeAnyPermission(['staff:view', 'staff:manage']);
  const req = {
    user: {
      id: USER_ID,
      role: 'Resident',
      orgId: ORG_A,
      permissions: ['staff:view'],
    },
    tenantPermissions: ['staff:view'],
    headers: {
      'x-organization-id': ORG_A,
    },
  };
  let passed = false;
  const next = (err) => {
    if (!err) passed = true;
  };
  await anyPermMiddleware(req, {}, next);
  assert.equal(passed, true, 'User holding staff:view should pass authorizeAnyPermission');
});

test('10. Canonical staff permission expansions and visitorManager checks follow exact system rules', () => {
  // staff:manage expands to staff:view, staff:attendance, staff:assign_unit
  const expanded = expandUserPermissions(['staff:manage']);
  assert.ok(expanded.includes('staff:view'), 'staff:manage grants staff:view');
  assert.ok(expanded.includes('staff:attendance'), 'staff:manage grants staff:attendance');
  assert.ok(expanded.includes('staff:assign_unit'), 'staff:manage grants staff:assign_unit');
  assert.equal(expanded.includes('staff:view_own'), false, 'staff:manage does not grant staff:view_own');

  // staff:view_own does NOT grant community-wide staff:view or staff:manage
  const ownExpanded = expandUserPermissions(['staff:view_own']);
  assert.equal(ownExpanded.includes('staff:view'), false, 'staff:view_own must never grant community staff:view');
  assert.equal(ownExpanded.includes('staff:manage'), false, 'staff:view_own must never grant community staff:manage');

// Visitor manager checks
  assert.equal(isVisitorManager({ role: 'Community Admin' }), true, 'Community Admin is visitor manager');
  assert.equal(isVisitorManager({ role: 'Staff Administrator' }), false, 'Staff Administrator is NOT visitor manager');
  assert.equal(isVisitorManager({ role: 'Maintenance Supervisor' }), false, 'Maintenance Supervisor is NOT visitor manager');
  assert.equal(isVisitorManager({ role: 'Resident' }), false, 'Resident is NOT visitor manager');
});

test('11. Authenticated staff with staff:view_own can access /me self-service', async () => {
  const meMiddleware = authorizeAnyPermission(['staff:view_own', 'staff:view', 'staff:manage']);
  const req = {
    user: {
      id: USER_ID,
      role: 'Staff/Vendor',
      orgId: ORG_A,
      permissions: ['staff:view_own'],
    },
    tenantPermissions: ['staff:view_own'],
    headers: { 'x-organization-id': ORG_A },
  };

  let passed = false;
  await meMiddleware(req, {}, (err) => {
    if (!err) passed = true;
  });
  assert.equal(passed, true, 'User with staff:view_own must pass self-service /me check');
});

test('12. User with ONLY staff:view_own is DENIED on community-wide registry and ID endpoints', async () => {
  const registryMiddleware = authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:assign', 'complaints:settings']);
  const req = {
    user: {
      id: USER_ID,
      role: 'Staff/Vendor',
      orgId: ORG_A,
      permissions: ['staff:view_own'],
    },
    tenantPermissions: ['staff:view_own'],
    headers: { 'x-organization-id': ORG_A },
  };

  let error = null;
  await registryMiddleware(req, {}, (err) => {
    error = err;
  });
  assert.ok(error, 'User with only staff:view_own must receive an error');
  assert.equal(error.statusCode, 403, 'Must return 403 Forbidden for community registry');
});

test('13. User with ONLY complaints:view is DENIED on community-wide staff registry', async () => {
  const registryMiddleware = authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:assign', 'complaints:settings']);
  const req = {
    user: {
      id: USER_ID,
      role: 'Resident Owner',
      orgId: ORG_A,
      permissions: ['complaints:view', 'complaints:raise_ticket', 'complaints:track_requests'],
    },
    tenantPermissions: ['complaints:view', 'complaints:raise_ticket', 'complaints:track_requests'],
    headers: { 'x-organization-id': ORG_A },
  };

  let error = null;
  await registryMiddleware(req, {}, (err) => {
    error = err;
  });
  assert.ok(error, 'User with only complaints:view must be denied access to staff registry');
  assert.equal(error.statusCode, 403, 'Must return 403 Forbidden');
});

test('14. Authorized roles (complaints:staff, complaints:assign, staff:manage) retain registry access', async () => {
  const registryMiddleware = authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:assign', 'complaints:settings']);

  // Case A: Complaint assigner / coordinator
  const reqAssigner = {
    user: { id: USER_ID, role: 'Facility Manager', orgId: ORG_A, permissions: ['complaints:assign'] },
    tenantPermissions: ['complaints:assign'],
    headers: { 'x-organization-id': ORG_A },
  };
  let passedAssigner = false;
  await registryMiddleware(reqAssigner, {}, (err) => { if (!err) passedAssigner = true; });
  assert.equal(passedAssigner, true, 'User with complaints:assign must access registry for work order dispatching');

  // Case B: Staff manager
  const reqStaffManager = {
    user: { id: USER_ID, role: 'Staff Coordinator', orgId: ORG_A, permissions: ['staff:manage'] },
    tenantPermissions: ['staff:manage'],
    headers: { 'x-organization-id': ORG_A },
  };
  let passedStaffManager = false;
  await registryMiddleware(reqStaffManager, {}, (err) => { if (!err) passedStaffManager = true; });
  assert.equal(passedStaffManager, true, 'User with staff:manage must access staff registry');
});

test('15. Staff profile getMyProfile requires valid IDs and safely handles unlinked users', async () => {
  const technicianService = (await import('../src/features/technician/technician.service.js')).default;
  const technicianRepository = (await import('../src/features/technician/technician.repository.js')).default;

  // Missing userId / orgId
  await assert.rejects(
    async () => technicianService.getMyProfile(null, ORG_A),
    (err) => err.statusCode === 400,
    'Should throw 400 when userId is missing'
  );

  // Stub repository methods for offline unit testing
  const origFindByUserId = technicianRepository.findByUserId;
  const origFindByContact = technicianRepository.findByContactOrUserId;
  technicianRepository.findByUserId = async () => null;
  technicianRepository.findByContactOrUserId = async () => null;

  try {
    // Missing technician record produces 404
    await assert.rejects(
      async () => technicianService.getMyProfile('507f1f77bcf86cd799439099', ORG_A),
      (err) => err.statusCode === 404 && err.message.includes('No staff profile found'),
      'Should throw 404 with safe error message when linkage does not exist'
    );

    // Profile found returns authorized profile
    const mockProfile = {
      _id: 'tech123',
      userId: '507f1f77bcf86cd799439099',
      orgId: ORG_A,
      name: 'Salim Ahmed',
      designation: 'Electrician',
      staffCode: 'STF-001',
      status: 'Active',
    };
    technicianRepository.findByUserId = async () => mockProfile;

    const result = await technicianService.getMyProfile('507f1f77bcf86cd799439099', ORG_A);
    assert.equal(result._id, 'tech123');
    assert.equal(result.name, 'Salim Ahmed');
    assert.equal(result.designation, 'Electrician');
  } finally {
    technicianRepository.findByUserId = origFindByUserId;
    technicianRepository.findByContactOrUserId = origFindByContact;
  }
});

