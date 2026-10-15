import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attachAmenityBookingSocketHandlers } from '../src/features/amenityBooking/amenityBooking.socket.js';

const makeSocket = (identity) => {
  const handlers = new Map();
  const emitted = [];
  return { data: { identity }, emitted, on: (event, handler) => handlers.set(event, handler), trigger: async (event, payload) => handlers.get(event)(payload), emit: (event, payload) => emitted.push({ event, payload }), join: () => {}, leave: () => {}, to: () => ({ emit: () => {} }) };
};
const makeIo = () => ({ emitted: [], to(room) { return { emit: (event, payload) => this.emitted.push({ room, event, payload }) }; } });
const slot = (orgId, more = {}) => ({ orgId, amenityId: 'pool', date: '2030-01-01', startTime: '09:00', endTime: '10:00', ...more });
const options = (locks, authorizeRoom) => ({ locks, authorizeRoom, resolveIdentity: (socket) => socket.data.identity, scheduleRelease: () => {}, now: () => 1 });

describe('amenity booking socket authorization', () => {
  it('rejects unauthenticated and cross-tenant room/lock requests', async () => {
    const locks = new Map(); const io = makeIo();
    const authorizeRoom = async (socket, room) => socket.data.identity?.orgId === room.slice(4);
    const anonymous = makeSocket(null); const residentA = makeSocket({ id: 'resident-a', orgId: 'org-a' });
    attachAmenityBookingSocketHandlers(io, anonymous, options(locks, authorizeRoom));
    attachAmenityBookingSocketHandlers(io, residentA, options(locks, authorizeRoom));
    await anonymous.trigger('join_amenity_room', slot('org-a'));
    await residentA.trigger('lock_slot', slot('org-b', { userId: 'resident-b' }));
    assert.equal(locks.size, 0);
    assert.equal(anonymous.emitted.at(-1).event, 'amenity_access_denied');
    assert.equal(residentA.emitted.at(-1).event, 'amenity_access_denied');
  });

  it('derives ownership from identity and scopes matching slots by organization', async () => {
    const locks = new Map(); const io = makeIo();
    const authorizeRoom = async (socket, room) => socket.data.identity.orgId === room.slice(4);
    const residentA = makeSocket({ id: 'resident-a', orgId: 'org-a' }); const residentB = makeSocket({ id: 'resident-b', orgId: 'org-b' });
    attachAmenityBookingSocketHandlers(io, residentA, options(locks, authorizeRoom));
    attachAmenityBookingSocketHandlers(io, residentB, options(locks, authorizeRoom));
    await residentA.trigger('lock_slot', slot('org-a', { userId: 'spoofed-user' }));
    await residentB.trigger('lock_slot', slot('org-b', { userId: 'resident-a' }));
    assert.equal(locks.size, 2);
    assert.equal(residentA.emitted.find((e) => e.event === 'slot_lock_success').payload.userId, 'resident-a');
    assert.equal(residentB.emitted.find((e) => e.event === 'slot_lock_success').payload.userId, 'resident-b');
  });

  it('prevents non-owners from releasing locks and cleans up on disconnect', async () => {
    const locks = new Map(); const io = makeIo();
    const authorizeRoom = async (socket, room) => socket.data.identity.orgId === room.slice(4);
    const owner = makeSocket({ id: 'owner', orgId: 'org-a' }); const other = makeSocket({ id: 'other', orgId: 'org-a' });
    attachAmenityBookingSocketHandlers(io, owner, options(locks, authorizeRoom));
    attachAmenityBookingSocketHandlers(io, other, options(locks, authorizeRoom));
    await owner.trigger('lock_slot', slot('org-a'));
    await other.trigger('release_slot', slot('org-a'));
    assert.equal(locks.size, 1); assert.equal(other.emitted.at(-1).event, 'slot_lock_failed');
    await owner.trigger('disconnect');
    assert.equal(locks.size, 0); assert.equal(io.emitted.at(-1).event, 'slot_released');
  });
});
