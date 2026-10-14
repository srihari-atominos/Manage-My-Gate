import mongoose from 'mongoose';
import { getIO } from '../../config/socket.js';
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

export const initAmenityBookingSockets = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    // 1. User opens the calendar view for a specific amenity
    socket.on('join_amenity_room', async ({ amenityId, orgId } = {}) => {
      try {
        if (!amenityId || !orgId || !mongoose.isValidObjectId(amenityId) || !mongoose.isValidObjectId(orgId)) return;
        const roomName = `amenity:${orgId}:${amenityId}`;
        const { canJoinRoom } = await import('../../config/socketRoomPolicy.js');
        if (!(await canJoinRoom(socket, roomName))) {
          logger.warn(`[Socket Auth] Refused amenity room ${roomName} for socket ${socket.id}`);
          return;
        }
        socket.join(roomName);
        logger.info(`Socket ${socket.id} joined room: ${roomName}`);

        // Send sanitized currently locked slots in this room to the newly joined client
        const currentLocks = await slotLockStore.getPublicLocksForAmenity(amenityId, orgId);
        socket.emit('sync_locked_slots', currentLocks);
      } catch (err) {
        logger.error('Error joining amenity room:', err);
      }
    });

    socket.on('leave_amenity_room', ({ amenityId, orgId } = {}) => {
      if (!amenityId || !orgId) return;
      const roomName = `amenity:${orgId}:${amenityId}`;
      socket.leave(roomName);
    });

    // 2. User clicks a slot to begin checkout (SEC-WS-03 & SEC-WS-08)
    socket.on('lock_slot', async (payload = {}) => {
      try {
        const { amenityId, orgId, date, startTime, endTime } = payload;
        if (!amenityId || !orgId || !date || !startTime || !endTime) {
          socket.emit('slot_lock_failed', { message: 'Invalid slot parameters.' });
          return;
        }
        if (!mongoose.isValidObjectId(amenityId) || !mongoose.isValidObjectId(orgId)) {
          socket.emit('slot_lock_failed', { message: 'Invalid identifier format.' });
          return;
        }

        const { resolveSocketIdentity, canJoinRoom } = await import('../../config/socketRoomPolicy.js');
        const identity = await resolveSocketIdentity(socket);
        if (!identity || !identity.id) {
          socket.emit('slot_lock_failed', { message: 'Authentication required.' });
          return;
        }

        // Authoritatively verify that the amenity belongs to the specified organization
        const Amenity = (await import('../amenity/amenity.model.js')).default;
        const amenityDoc = await Amenity.findOne({ _id: amenityId, orgId }).select('_id orgId').lean();
        if (!amenityDoc) {
          socket.emit('slot_lock_failed', { message: 'Amenity does not belong to specified organization.' });
          return;
        }

        const roomName = `amenity:${orgId}:${amenityId}`;
        if (!(await canJoinRoom(socket, roomName))) {
          socket.emit('slot_lock_failed', { message: 'Unauthorized organization context.' });
          return;
        }

        const userId = identity.id;
        const lockKey = `${orgId}_${amenityId}_${date}_${startTime}_${endTime}`;
        const lockData = {
          amenityId,
          orgId,
          date,
          startTime,
          endTime,
          userId,
          lockedAt: Date.now(),
        };

        const acquired = await slotLockStore.acquire(lockKey, lockData);
        if (!acquired) {
          socket.emit('slot_lock_failed', { message: 'Slot is currently being booked by someone else.' });
          return;
        }

        // Broadcast sanitized slot availability to other participants in the room
        socket.to(roomName).emit('slot_locked', {
          amenityId,
          date,
          startTime,
          endTime,
        });

        // Auto-release local lock after 5 minutes if checkout not completed
        setTimeout(async () => {
          const current = await slotLockStore.get(lockKey);
          if (current && current.lockedAt === lockData.lockedAt) {
            await slotLockStore.release(lockKey, userId);
            io.to(roomName).emit('slot_released', { lockKey, amenityId, date, startTime, endTime });
          }
        }, 5 * 60 * 1000);

        socket.emit('slot_lock_success', lockData);
      } catch (err) {
        logger.error('Error locking slot:', err);
        socket.emit('slot_lock_failed', { message: 'Internal error processing slot lock.' });
      }
    });

    // 3. SEC-WS-03: User cancels or closes checkout early (Harden release_slot)
    socket.on('release_slot', async (payload = {}) => {
      try {
        const { amenityId, orgId, date, startTime, endTime } = payload;
        if (!amenityId || !orgId || !date || !startTime || !endTime) {
          socket.emit('slot_release_failed', { message: 'Invalid slot parameters.' });
          return;
        }
        if (!mongoose.isValidObjectId(amenityId) || !mongoose.isValidObjectId(orgId)) {
          socket.emit('slot_release_failed', { message: 'Invalid identifier format.' });
          return;
        }

        const { resolveSocketIdentity, canJoinRoom } = await import('../../config/socketRoomPolicy.js');
        const identity = await resolveSocketIdentity(socket);
        if (!identity || !identity.id) {
          socket.emit('slot_release_failed', { message: 'Authentication required.' });
          return;
        }

        // Authoritative verification of amenity and organization
        const Amenity = (await import('../amenity/amenity.model.js')).default;
        const amenityDoc = await Amenity.findOne({ _id: amenityId, orgId }).select('_id orgId').lean();
        if (!amenityDoc) {
          socket.emit('slot_release_failed', { message: 'Amenity does not belong to specified organization.' });
          return;
        }

        const roomName = `amenity:${orgId}:${amenityId}`;
        if (!(await canJoinRoom(socket, roomName))) {
          socket.emit('slot_release_failed', { message: 'Unauthorized organization context.' });
          return;
        }

        const lockKey = `${orgId}_${amenityId}_${date}_${startTime}_${endTime}`;
        const existingLock = await slotLockStore.get(lockKey);
        if (!existingLock) {
          socket.emit('slot_release_failed', { message: 'No active lock found for this slot.' });
          return;
        }

        // Check ownership or admin override
        const isOwner = String(existingLock.userId) === String(identity.id);
        let isAuthorizedAdmin = identity.isPlatform === true;
        if (!isAuthorizedAdmin && !isOwner) {
          const { getPermissionsForUser } = await import('../../middlewares/rbac.middleware.js');
          const perms = await getPermissionsForUser({ id: identity.id }, orgId);
          isAuthorizedAdmin = perms.some((p) => p === '*' || p === 'amenity:write' || p === 'amenity:admin');
        }

        if (!isOwner && !isAuthorizedAdmin) {
          socket.emit('slot_release_failed', { message: 'Forbidden: You do not own this slot lock.' });
          return;
        }

        // Authorized release with compare-and-delete
        const released = await slotLockStore.release(lockKey, isOwner && !isAuthorizedAdmin ? identity.id : null);
        if (!released) {
          socket.emit('slot_release_failed', { message: 'Forbidden: You do not own this slot lock.' });
          return;
        }

        socket.emit('slot_release_success', { lockKey });
        // Emit sanitized availability update only after verified release
        io.to(roomName).emit('slot_released', { lockKey, amenityId, date, startTime, endTime });
      } catch (err) {
        logger.error('Error releasing slot:', err);
        socket.emit('slot_release_failed', { message: 'Internal error processing slot release.' });
      }
    });

    socket.on('disconnect', () => {});
  });

  // 4. Real-time Backend Event Listeners -> Socket.io Broadcasts (SEC-WS-04 Scoping)
  amenityBookingEventEmitter.on(AMENITY_BOOKING_CREATED, async (booking) => {
    try {
      const lockKey = `${booking.orgId}_${booking.amenityId}_${booking.bookingDate}_${booking.startTime}_${booking.endTime}`;
      const roomName = `amenity:${booking.orgId}:${booking.amenityId}`;

      await slotLockStore.release(lockKey);
      io.to(roomName).emit('slot_released', { lockKey });

      // SEC-WS-04: Public availability update (omit private resident identities and financial amounts)
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
      // SEC-WS-04: Scope check-in updates to guards, admins, and the booking owner
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
      // SEC-WS-04: Scope cancellation to booking owner and org admin
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
