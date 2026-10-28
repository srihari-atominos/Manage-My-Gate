import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeResidentSelfService } from '../../src/middlewares/rbac.middleware.js';

const run = (req) => new Promise((resolve) => authorizeResidentSelfService()(req, {}, (error) => resolve(error || null)));

test('personal expense authorization allows only the verified active resident role', async () => {
  const error = await run({ user: { id: 'u1', isPlatform: false }, tenant: { orgId: 'o1', isPlatform: false }, tenantRole: 'Family Member' });
  assert.equal(error, null);
  const residentOwnerError = await run({ user: { id: 'u1', isPlatform: false }, tenant: { orgId: 'o1', isPlatform: false }, tenantRole: 'Resident Owner' });
  assert.equal(residentOwnerError?.statusCode, 403);
  const residentTenantError = await run({ user: { id: 'u1', isPlatform: false }, tenant: { orgId: 'o1', isPlatform: false }, tenantRole: 'Resident Tenant' });
  assert.equal(residentTenantError?.statusCode, 403);
});
test('personal expense authorization rejects unauthenticated, staff, guard, admin and platform callers', async () => {
  const cases = [
    {},
    { user: { id: 'u1' }, tenant: { orgId: 'o1' }, tenantRole: 'Staff' },
    { user: { id: 'u1' }, tenant: { orgId: 'o1' }, tenantRole: 'Security Guard' },
    { user: { id: 'u1' }, tenant: { orgId: 'o1' }, tenantRole: 'Community Admin' },
    { user: { id: 'u1', isPlatform: true }, tenant: { orgId: 'o1', isPlatform: true }, tenantRole: 'Resident' },
  ];
  const errors = await Promise.all(cases.map(run));
  assert.equal(errors[0]?.statusCode, 401);
  errors.slice(1).forEach((error) => assert.equal(error?.statusCode, 403));
});
test('personal expense authorization never trusts an unverified JWT role claim', async () => {
  const error = await run({ user: { id: 'u1', role: 'Resident' }, tenant: { orgId: 'o1', isPlatform: false }, tenantRole: 'Staff' });
  assert.equal(error?.statusCode, 403);
});