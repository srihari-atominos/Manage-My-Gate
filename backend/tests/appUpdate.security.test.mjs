import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantContext } from '../src/middlewares/tenant.middleware.js';
import { validationResult } from 'express-validator';
import { createReleaseValidator, updateReleaseValidator, getPolicyValidator } from '../src/features/appUpdate/appUpdate.validator.js';

test('Security & RBAC: Rejects non-platform community administrators from accessing release management', async () => {
  const middleware = tenantContext({ requirePlatformContext: true });

  const communityAdminReq = {
    user: {
      id: '507f1f77bcf86cd799439011',
      role: 'Community Admin',
      orgId: '507f1f77bcf86cd799439099',
      isPlatform: false,
    },
    headers: {
      'x-organization-id': '507f1f77bcf86cd799439099',
    },
  };

  let nextCalled = false;
  let receivedError = null;

  await middleware(communityAdminReq, {}, (err) => {
    nextCalled = true;
    receivedError = err;
  });

  assert.equal(nextCalled, true);
  assert.ok(receivedError, 'Expected an authorization error');
  assert.equal(receivedError.statusCode, 403);
  assert.match(receivedError.message, /Platform administrator access required/);
});

test('Security & RBAC: Authorizes legitimate Platform Administrator for release management', async () => {
  const middleware = tenantContext({ requirePlatformContext: true });

  const platformAdminReq = {
    user: {
      id: '507f1f77bcf86cd799439011',
      role: 'Platform Super Admin',
      isPlatform: true,
      orgId: '507f1f77bcf86cd799439099',
      permissions: ['*'],
    },
    headers: {},
  };

  let nextCalled = false;
  let receivedError = null;

  await middleware(platformAdminReq, {}, (err) => {
    nextCalled = true;
    receivedError = err;
  });

  assert.equal(nextCalled, true);
  assert.equal(receivedError, undefined);
  assert.equal(platformAdminReq.tenant?.isPlatform, true);
});

test('Validation: Rejects invalid release configuration fields', async () => {
  const runValidators = async (validators, req) => {
    for (const v of validators) {
      await v.run(req);
    }
    return validationResult(req);
  };

  // Invalid releaseType
  const invalidTypeReq = {
    body: {
      version: '1.2.0',
      versionCode: 31,
      releaseType: 'SUPER_URGENT', // Invalid
    },
  };
  const typeResult = await runValidators(createReleaseValidator, invalidTypeReq);
  assert.equal(typeResult.isEmpty(), false);
  assert.ok(typeResult.array().some((e) => e.path === 'releaseType'));

  // Invalid semver format
  const invalidSemverReq = {
    body: {
      version: 'v1.x.alpha',
      versionCode: 31,
      releaseType: 'NORMAL',
    },
  };
  const semverResult = await runValidators(createReleaseValidator, invalidSemverReq);
  assert.equal(semverResult.isEmpty(), false);
  assert.ok(semverResult.array().some((e) => e.path === 'version'));

  // Negative gracePeriodDays
  const negativeGraceReq = {
    body: {
      version: '1.2.0',
      versionCode: 31,
      releaseType: 'IMPORTANT',
      gracePeriodDays: -5,
    },
  };
  const graceResult = await runValidators(createReleaseValidator, negativeGraceReq);
  assert.equal(graceResult.isEmpty(), false);
  assert.ok(graceResult.array().some((e) => e.path === 'gracePeriodDays'));

  // Non-positive versionCode
  const invalidCodeReq = {
    body: {
      version: '1.2.0',
      versionCode: 0,
      releaseType: 'NORMAL',
    },
  };
  const codeResult = await runValidators(createReleaseValidator, invalidCodeReq);
  assert.equal(codeResult.isEmpty(), false);
  assert.ok(codeResult.array().some((e) => e.path === 'versionCode'));
});
