import test from 'node:test';
import assert from 'node:assert/strict';
import roleService, { matchPermissions } from '../src/features/role/role.services.js';

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';

const community = (overrides = {}) => ({ orgId: ORG_A, isPlatform: false, permissions: ['staff:view', 'staff:manage'], ...overrides });

test('a community can change and delete its own roles', () => {
  assert.doesNotThrow(() => roleService.assertRoleAccess({ _id: 'r1', orgId: ORG_A }, community(), { write: true }));
});

test("another community's role looks like it does not exist", () => {
  assert.throws(
    () => roleService.assertRoleAccess({ _id: 'r1', orgId: ORG_B }, community(), { write: true }),
    (err) => err.status === 404 || err.statusCode === 404
  );
  assert.throws(() => roleService.assertRoleAccess({ _id: 'r1', orgId: ORG_B }, community()), /not found/);
});

test('shared roles can be read by a community but only changed by platform admins', () => {
  const shared = { _id: 'r2', orgId: null };
  assert.doesNotThrow(() => roleService.assertRoleAccess(shared, community()));
  assert.throws(() => roleService.assertRoleAccess(shared, community(), { write: true }), /platform administrators/);
  assert.doesNotThrow(() => roleService.assertRoleAccess(shared, community({ isPlatform: true }), { write: true }));
});

test('internal callers without an actor are not restricted', () => {
  assert.doesNotThrow(() => roleService.assertRoleAccess({ _id: 'r3', orgId: ORG_B }, null, { write: true }));
});

test('Community Admin can keep its name but cannot be renamed or deleted; Super Admin is fully protected', () => {
  const admin = { name: 'Community Admin' };
  assert.doesNotThrow(() => roleService.assertRoleNotProtected(admin));
  assert.throws(() => roleService.assertRoleNotProtected(admin, { renameOrDelete: true }), /cannot be renamed or deleted/);
  assert.throws(() => roleService.assertRoleNotProtected({ name: 'Super Admin' }), /protected system roles/);
  assert.doesNotThrow(() => roleService.assertRoleNotProtected({ name: 'Auditor' }, { renameOrDelete: true }));
});

test('a role manager can only newly grant permissions they hold', () => {
  const added = [{ name: 'staff:view' }, { name: 'billing:approve' }];
  assert.throws(() => roleService.assertCanGrant(added, community()), /billing:approve/);
  assert.doesNotThrow(() => roleService.assertCanGrant([{ name: 'staff.manage' }], community()));
  assert.doesNotThrow(() => roleService.assertCanGrant(added, community({ permissions: ['*'] })));
  assert.doesNotThrow(() => roleService.assertCanGrant(added, community({ isPlatform: true })));
  assert.doesNotThrow(() => roleService.assertCanGrant([], community()));
  assert.doesNotThrow(() => roleService.assertCanGrant(added, null));
});

test('permission matching is the same for ids, colon names, dot names and codes', () => {
  const catalog = [
    { _id: 'p1', name: 'staff:view', code: 'STAFF_VIEW' },
    { _id: 'p2', name: 'staff:manage' },
    { _id: 'p3', name: 'billing:read' },
  ];
  const names = (list) => list.map((p) => p.name).sort();
  assert.deepEqual(names(matchPermissions(catalog, ['staff:view'])), ['staff:view']);
  assert.deepEqual(names(matchPermissions(catalog, ['staff.manage'])), ['staff:manage']);
  assert.deepEqual(names(matchPermissions(catalog, ['p3'])), ['billing:read']);
  assert.deepEqual(names(matchPermissions(catalog, ['STAFF_VIEW'])), ['staff:view']);
  assert.deepEqual(matchPermissions(catalog, ['nope', '', null]), []);
  assert.deepEqual(matchPermissions(catalog, undefined), []);
});
