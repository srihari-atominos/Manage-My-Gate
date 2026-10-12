import { getIO } from '../../config/socket.js';
import { canJoinRoom, resolveSocketIdentity } from '../../config/socketRoomPolicy.js';
import {
  amenityBookingEventEmitter,
  AMENITY_BOOKING_CREATED,
  AMENITY_BOOKING_CANCELLED,
  AMENITY_BOOKING_CHECKED_IN,
} from './amenityBooking.events.js';

// These locks are a short-lived user-experience hint only. Reservation creation
// is protected by the database-backed hold transition in the reservation service.
const slotLocks = new Map();
const roomFor = (orgId, amenityId) => `amenity:${orgId}:${amenityId}`;
const lockKeyFor = ({ orgId, amenityId, date, startTime, endTime }) => `${orgId}:${amenityId}:${date}:${startTime}:${endTime}`;
const deny = (socket) => socket.emit('amenity_access_denied', { code: 'AMENITY_ROOM_FORBIDDEN' });

/** Attaches testable, tenant-scoped handlers for the legacy booking-lock UI. */
export const attachAmenityBookingSocketHandlers = (io, socket, {
  authorizeRoom = canJoinRoom,
  resolveIdentity = resolveSocketIdentity,
  locks = slotLocks,
  scheduleRelease = setTimeout,
  now = Date.now,
} = {}) => {
  const authorize = async (orgId) => {
    const identity = resolveIdentity(socket);
    if (!identity?.id || !orgId || !(await authorizeRoom(socket, `org:${orgId}`))) {
      deny(socket);
      return null;
    }
    return identity;
  };

  socket.on('join_amenity_room', async ({ amenityId, orgId } = {}) => {
    try {
      if (!amenityId || !(await authorize(orgId))) return;
      socket.join(roomFor(orgId, amenityId));
      socket.emit('sync_locked_slots', Array.from(locks.values()).filter((lock) => lock.orgId === orgId && lock.amenityId === amenityId));
    } catch { deny(socket); }
  });

  socket.on('leave_amenity_room', async ({ amenityId, orgId } = {}) => {
    try {
      if (!amenityId || !(await authorize(orgId))) return;
      socket.leave(roomFor(orgId, amenityId));
    } catch { deny(socket); }
  });

  socket.on('lock_slot', async (payload = {}) => {
    try {
      const { amenityId, orgId, date, startTime, endTime } = payload;
      const identity = await authorize(orgId);
      if (!identity || !amenityId || !date || !startTime || !endTime) return;
      const lockKey = lockKeyFor({ orgId, amenityId, date, startTime, endTime });
      const existingLock = locks.get(lockKey);
      if (existingLock && existingLock.userId !== identity.id) {
        socket.emit('slot_lock_failed', { message: 'Slot is currently being booked by someone else.' });
        return;
      }
      // userId is derived from the signed socket identity, never client input.
      const lockData = { orgId, amenityId, date, startTime, endTime, userId: identity.id, lockedAt: now() };
      locks.set(lockKey, lockData);
      const roomName = roomFor(orgId, amenityId);
      socket.to(roomName).emit('slot_locked', lockData);
      scheduleRelease(() => {
        if (locks.get(lockKey)?.lockedAt === lockData.lockedAt) {
          locks.delete(lockKey);
          io.to(roomName).emit('slot_released', { lockKey, ...lockData });
        }
      }, 5 * 60 * 1000);
      socket.emit('slot_lock_success', lockData);
    } catch { deny(socket); }
  });

  socket.on('release_slot', async (payload = {}) => {
    try {
      const { amenityId, orgId, date, startTime, endTime } = payload;
      const identity = await authorize(orgId);
      if (!identity || !amenityId || !date || !startTime || !endTime) return;
      const lockKey = lockKeyFor({ orgId, amenityId, date, startTime, endTime });
      const lockData = locks.get(lockKey);
      if (!lockData || lockData.userId !== identity.id) {
        socket.emit('slot_lock_failed', { message: 'Only the lock owner may release this slot.' });
        return;
      }
      locks.delete(lockKey);
      io.to(roomFor(orgId, amenityId)).emit('slot_released', { lockKey, ...lockData });
    } catch { deny(socket); }
  });

  socket.on('disconnect', () => {
    const identity = resolveIdentity(socket);
    if (!identity?.id) return;
    for (const [lockKey, lockData] of locks.entries()) {
      if (lockData.userId === identity.id) {
        locks.delete(lockKey);
        io.to(roomFor(lockData.orgId, lockData.amenityId)).emit('slot_released', { lockKey, ...lockData });
      }
    }
  });
};

export const initAmenityBookingSockets = () => {
  const io = getIO();
  io.on('connection', (socket) => attachAmenityBookingSocketHandlers(io, socket));

  amenityBookingEventEmitter.on(AMENITY_BOOKING_CREATED, (booking) => {
    try {
      const lockKey = lockKeyFor({ orgId: String(booking.orgId), amenityId: String(booking.amenityId), date: booking.bookingDate, startTime: booking.startTime, endTime: booking.endTime });
      if (slotLocks.has(lockKey)) {
        slotLocks.delete(lockKey);
        io.to(roomFor(booking.orgId, booking.amenityId)).emit('slot_released', { lockKey });
      }
      if (booking?.orgId) io.to(`org:${booking.orgId}`).emit('AMENITY_BOOKING_CREATED', booking);
    } catch { /* a notification cannot affect a committed booking */ }
  });
  amenityBookingEventEmitter.on(AMENITY_BOOKING_CHECKED_IN, (booking) => {
    try { if (booking?.orgId) io.to(`org:${booking.orgId}`).emit('AMENITY_CHECKIN', booking); } catch { /* no-op */ }
  });
  amenityBookingEventEmitter.on(AMENITY_BOOKING_CANCELLED, (booking) => {
    try { if (booking?.orgId) io.to(`org:${booking.orgId}`).emit('AMENITY_BOOKING_CANCELLED', booking); } catch { /* no-op */ }
  });
};
