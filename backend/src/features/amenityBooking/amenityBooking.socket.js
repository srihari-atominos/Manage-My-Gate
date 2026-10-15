import mongoose from 'mongoose';
import { getIO } from '../../config/socket.js';
import { canJoinRoom, resolveSocketIdentity } from '../../config/socketRoomPolicy.js';
import {
  amenityBookingEventEmitter,
  AMENITY_BOOKING_CREATED,
  AMENITY_BOOKING_CANCELLED,
  AMENITY_BOOKING_CHECKED_IN,
} from './amenityBooking.events.js';
import { messageBroker } from '../../utils/messageBroker.util.js';
import logger from '../../utils/logger.utils.js';

/**
 * SEC-WS-08: Distributed Slot Lock Store supporting Redis atomic SET NX EX & compare-and-delete Lua with process Map fallback.
 */
class SlotLockStore {
  constructor() {
    this.localMap = new Map();
  }

  async acquire(lockKey, data, ttlMs = 300000) {
    if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
      try {
        const ttlSec = Math.ceil(ttlMs / 1000);
        const res = await messageBroker.publisher.set(
          `amenity_slot_lock:${lockKey}`,
          JSON.stringify(data),
          'NX',
          'EX',
          ttlSec
        );
        if (res === 'OK') {
          this.localMap.set(lockKey, { ...data, expiresAt: Date.now() + ttlMs });
          return true;
        }
        return false;
      } catch (err) {
        logger.error(`[SlotLockStore] Redis acquire error for ${lockKey}:`, err);
        if (process.env.REQUIRE_REDIS_LOCK === 'true') return false;
      }
    } else if (process.env.REQUIRE_REDIS_LOCK === 'true') {
      logger.error(`[SlotLockStore] Redis unavailable and REQUIRE_REDIS_LOCK is set for ${lockKey}. Refusing local lock.`);
      return false;
    }

    const existing = this.localMap.get(lockKey);
    if (existing) {
      if (existing.expiresAt > Date.now() && String(existing.userId) !== String(data.userId)) {
        return false;
      }
    }
    this.localMap.set(lockKey, { ...data, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async get(lockKey) {
    if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
      try {
        const val = await messageBroker.publisher.get(`amenity_slot_lock:${lockKey}`);
        if (!val) return null;
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      } catch (err) {
        logger.error(`[SlotLockStore] Redis get error for ${lockKey}:`, err);
        if (process.env.REQUIRE_REDIS_LOCK === 'true') return null;
      }
    } else if (process.env.REQUIRE_REDIS_LOCK === 'true') {
      return null;
    }
    const existing = this.localMap.get(lockKey);
    if (!existing) return null;
    if (existing.expiresAt && existing.expiresAt <= Date.now()) {
      this.localMap.delete(lockKey);
      return null;
    }
    return existing;
  }

  /**
   * Release lock with atomic compare-and-delete (CAS).
   * If expectedUserId is supplied, only deletes if the lock's recorded userId matches.
   */
  async release(lockKey, expectedUserId = null) {
    if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
      try {
        if (expectedUserId) {
          const lua = `
            local val = redis.call('get', KEYS[1])
            if not val then return 1 end
            local ok, data = pcall(cjson.decode, val)
            if ok and data and tostring(data.userId) == tostring(ARGV[1]) then
              return redis.call('del', KEYS[1])
            else
              return 0
            end
          `;
          const res = await messageBroker.publisher.eval(lua, 1, `amenity_slot_lock:${lockKey}`, String(expectedUserId));
          if (res === 0) return false;
        } else {
          await messageBroker.publisher.del(`amenity_slot_lock:${lockKey}`);
        }
      } catch (err) {
        logger.error(`[SlotLockStore] Redis del error for ${lockKey}:`, err);
        if (process.env.REQUIRE_REDIS_LOCK === 'true') return false;
      }
    } else if (process.env.REQUIRE_REDIS_LOCK === 'true') {
      logger.error(`[SlotLockStore] Redis unavailable and REQUIRE_REDIS_LOCK is set for release of ${lockKey}.`);
      return false;
    }
    const existing = this.localMap.get(lockKey);
    if (existing && expectedUserId && String(existing.userId) !== String(expectedUserId)) {
      return false;
    }
    this.localMap.delete(lockKey);
    return true;
  }

  async getPublicLocksForAmenity(amenityId, orgId = null) {
    const results = [];
    if (messageBroker.useRedis && messageBroker.publisher && messageBroker.publisher.status === 'ready') {
      try {
        const pattern = orgId ? `amenity_slot_lock:${orgId}_${amenityId}_*` : `amenity_slot_lock:*${amenityId}_*`;
        const keys = await messageBroker.publisher.keys(pattern);
        if (keys && keys.length) {
          const rawVals = await messageBroker.publisher.mget(keys);
          for (const raw of rawVals) {
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                results.push({
                  amenityId: parsed.amenityId,
                  date: parsed.date,
                  startTime: parsed.startTime,
                  endTime: parsed.endTime,
                });
              } catch {
                // Ignore corrupted keys
              }
            }
          }
        }
        return results;
      } catch (err) {
        logger.error(`[SlotLockStore] Redis keys error for amenity ${amenityId}:`, err);
      }
    }

    const now = Date.now();
    for (const [key, lock] of this.localMap.entries()) {
      if (lock.expiresAt && lock.expiresAt <= now) {
        this.localMap.delete(key);
      } else if (lock.amenityId === amenityId && (!orgId || String(lock.orgId) === String(orgId))) {
        // SEC-WS-04: Strip private user ID and sensitive metadata from public availability sync
        results.push({
          amenityId: lock.amenityId,
          date: lock.date,
          startTime: lock.startTime,
          endTime: lock.endTime,
        });
      }
    }
    return results;
  }
}

export const slotLockStore = new SlotLockStore();
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

  amenityBookingEventEmitter.on(AMENITY_BOOKING_CREATED, async (booking) => {
    try {
      const lockKey = lockKeyFor({ orgId: String(booking.orgId), amenityId: String(booking.amenityId), date: booking.bookingDate, startTime: booking.startTime, endTime: booking.endTime });
      if (slotLocks.has(lockKey)) {
        slotLocks.delete(lockKey);
        io.to(roomFor(booking.orgId, booking.amenityId)).emit('slot_released', { lockKey });
      }

      // SEC-WS-04: Public availability update (omit private resident identities and financial amounts)
      const roomName = roomFor(booking.orgId, booking.amenityId);
      io.to(roomName).emit('AMENITY_SLOT_RESERVED', {
        amenityId: booking.amenityId,
        date: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });

      // SEC-WS-04: Route full booking & payment details only to the booking owner and org admins
      if (booking?.residentId) {
        const userRoom = `user:${booking.residentId.toString()}`;
        io.to(userRoom).emit('AMENITY_BOOKING_CREATED', booking);
        io.to(userRoom).emit('PAYMENT_SUCCESS', booking);
      }

      if (booking?.orgId) {
        const adminRoom = `org:${booking.orgId.toString()}:role:admin`;
        io.to(adminRoom).emit('AMENITY_BOOKING_CREATED', booking);
        io.to(adminRoom).emit('PAYMENT_SUCCESS', booking);
      }
    } catch (err) {
      logger.error('Error handling booking created event in sockets:', err);
    }
  });

  amenityBookingEventEmitter.on(AMENITY_BOOKING_CHECKED_IN, (booking) => {
    try {
      if (booking?.residentId) {
        io.to(`user:${booking.residentId.toString()}`).emit('AMENITY_CHECKIN', booking);
      }
      if (booking?.orgId) {
        io.to(`org:${booking.orgId.toString()}:guards`).emit('AMENITY_CHECKIN', booking);
        io.to(`org:${booking.orgId.toString()}:role:admin`).emit('AMENITY_CHECKIN', booking);
      }
    } catch (err) {
      logger.error('Error broadcasting checkin event in sockets:', err);
    }
  });

  amenityBookingEventEmitter.on(AMENITY_BOOKING_CANCELLED, (booking) => {
    try {
      if (booking?.residentId) {
        io.to(`user:${booking.residentId.toString()}`).emit('AMENITY_BOOKING_CANCELLED', booking);
      }
      if (booking?.orgId) {
        io.to(`org:${booking.orgId.toString()}:role:admin`).emit('AMENITY_BOOKING_CANCELLED', booking);
      }
    } catch (err) {
      logger.error('Error broadcasting cancellation event in sockets:', err);
    }
  });
};

export default initAmenityBookingSockets;
