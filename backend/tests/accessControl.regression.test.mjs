import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import {
  authorizePlatformRoles,
  checkIsAdmin,
  isPlatformAdministrator,
} from '../src/middlewares/rbac.middleware.js';
import { isMediaTokenAuthAllowed } from '../src/middlewares/auth.middleware.js';
import { canJoinRoom } from '../src/config/socketRoomPolicy.js';
import { isVisitorManager } from '../src/features/visitorPass/visitorPass.policy.js';
import { isProtectedSystemRoleName } from '../src/features/role/role.services.js';
import { setupAccountPasswordRules } from '../src/features/auth/auth.validateRules.js';
import { hasAmenityAdminScope } from '../src/features/amenityManagement/domain/access/amenityAdminScope.js';
import { signMediaDownloadToken, verifyMediaDownloadToken } from '../src/utils/jwt.utils.js';

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  middleware(req, {}, (error) => resolve(error));
});

const validate = async (rules, body) => {
  const req = { body, headers: {}, query: {} };
  for (const rule of rules) await rule.run(req);
  return validationResult(req);
};

describe('Broken access-control regressions', () => {
  it('does not elevate names that merely contain admin or super', async () => {
    assert.equal(await checkIsAdmin({ user: { role: 'Billing Admin' }, tenantRole: 'Billing Admin' }), false);
    assert.equal(await checkIsAdmin({ user: { role: 'Superintendent' }, tenantRole: 'Superintendent' }), false);
    assert.equal(await checkIsAdmin({ user: { role: 'Community Admin' }, tenantRole: 'Community Admin' }), true);
  });

  it('requires both an exact platform role and isPlatform for platform administration', async () => {
    assert.equal(isPlatformAdministrator({ isPlatform: true, role: 'Sales Executive' }), false);
    assert.equal(isPlatformAdministrator({ isPlatform: false, role: 'Platform Admin' }), false);
    assert.equal(isPlatformAdministrator({ isPlatform: true, role: 'Platform Admin' }), true);

    const denied = await runMiddleware(
      authorizePlatformRoles('Platform Super Admin', 'Platform Admin', 'Super Admin'),
      { user: { isPlatform: true, role: 'Sales Executive' }, tenantRole: 'Sales Executive' },
    );
    assert.equal(denied?.statusCode, 403);
  });

  it('does not let a non-admin platform role join arbitrary tenant socket rooms', async () => {
    const salesSocket = {
      data: { identity: { id: '507f1f77bcf86cd799439011', role: 'Sales Executive', isPlatform: true } },
    };
    const adminSocket = {
      data: { identity: { id: '507f1f77bcf86cd799439011', role: 'Platform Admin', isPlatform: true } },
    };
    const room = 'org:507f1f77bcf86cd799439012';

    assert.equal(await canJoinRoom(salesSocket, room), false);
    assert.equal(await canJoinRoom(adminSocket, room), true);
  });

  it('does not route API JWT query parameters to protected uploads', () => {
    const token = 'signed-token';
    assert.equal(isMediaTokenAuthAllowed({ method: 'GET', query: { auth_token: token }, originalUrl: '/uploads/notices/a.png' }), false);
  });

  it('limits upload URL authorization to a short-lived, tenant-bound capability', () => {
    const mediaToken = signMediaDownloadToken({
      id: '507f1f77bcf86cd799439011',
      orgId: '507f1f77bcf86cd799439012',
      role: 'Resident',
      isPlatform: false,
    });
    const claims = verifyMediaDownloadToken(mediaToken);
    assert.equal(claims.orgId, '507f1f77bcf86cd799439012');
    assert.equal(isMediaTokenAuthAllowed({ method: 'GET', query: { media_token: mediaToken }, originalUrl: '/uploads/notices/a.png' }), true);
    assert.equal(isMediaTokenAuthAllowed({ method: 'POST', query: { media_token: mediaToken }, originalUrl: '/uploads/notices/a.png' }), false);
    assert.equal(isMediaTokenAuthAllowed({ method: 'GET', query: { media_token: mediaToken }, originalUrl: '/api/v1/users' }), false);
  });

  it('does not give a sales/support platform user amenity administration access', async () => {
    assert.equal(
      await hasAmenityAdminScope({ isPlatform: true, role: 'Sales Executive', permissions: [] }),
      false,
    );
    assert.equal(
      await hasAmenityAdminScope({ isPlatform: true, role: 'Platform Admin', permissions: [] }),
      true,
    );
  });

  it('does not treat custom visitor role names as a privilege grant', () => {
    assert.equal(isVisitorManager({ role: 'Visitor Manager', isPlatform: false, permissions: [] }), false);
    assert.equal(isVisitorManager({ role: 'Resident', isPlatform: false, permissions: ['visitor:manage'] }), true);
  });

  it('recognizes system role names as protected from tenant role creation', () => {
    assert.equal(isProtectedSystemRoleName('Community Admin'), true);
    assert.equal(isProtectedSystemRoleName('PLATFORM_ADMIN'), true);
    assert.equal(isProtectedSystemRoleName('Billing Admin'), false);
  });

  it('requires a setup capability before an onboarding password can be changed', async () => {
    const withoutToken = await validate(setupAccountPasswordRules, {
      email: 'admin@example.com',
      password: 'ChangeMe123!',
    });
    assert.equal(withoutToken.isEmpty(), false);
    assert.equal(withoutToken.array().some((error) => error.path === 'setupToken'), true);

    const withToken = await validate(setupAccountPasswordRules, {
      email: 'admin@example.com',
      password: 'ChangeMe123!',
      setupToken: 'a'.repeat(64),
    });
    assert.equal(withToken.isEmpty(), true);
  });
});
