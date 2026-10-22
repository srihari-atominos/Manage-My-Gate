import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getRoleRoomKeys } from '../src/config/socketRoomPolicy.js';

// Backend dispatchers broadcast to org:<id>:role:admin / org:<id>:role:facilitymanager. Tenant roles are
// named "Community Admin", "Facility Manager", ... so each name must map onto the canonical room keys.
describe('socket role-room aliases', () => {
  test('Community Admin receives the canonical admin room', () => {
    const keys = getRoleRoomKeys('Community Admin');
    assert.ok(keys.includes('admin'));
    assert.ok(keys.includes('communityadmin'));
  });

  test('Super Admin and Admin map to the admin room', () => {
    assert.ok(getRoleRoomKeys('Super Admin').includes('admin'));
    assert.ok(getRoleRoomKeys('Admin').includes('admin'));
  });

  test('Facility Manager and Manager map to the facilitymanager room', () => {
    assert.ok(getRoleRoomKeys('Facility Manager').includes('facilitymanager'));
    assert.ok(getRoleRoomKeys('Manager').includes('facilitymanager'));
  });

  test('Residents never receive staff rooms', () => {
    const keys = getRoleRoomKeys('Resident Owner');
    assert.deepEqual(keys, ['residentowner']);
  });

  test('empty role names produce no rooms', () => {
    assert.deepEqual(getRoleRoomKeys(''), []);
    assert.deepEqual(getRoleRoomKeys(undefined), []);
  });
});
