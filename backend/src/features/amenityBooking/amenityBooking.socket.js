import { getIO } from '../../config/socket.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CREATED, AMENITY_BOOKING_CANCELLED } from './amenityBooking.events.js';

/**
 * Socket payload structure:
 * {
 *    amenityId: string,
 *    date: 'YYYY-MM-DD',
 *    startTime: 'HH:mm',
 *    endTime: 'HH:mm',
 *    userId: string
 * }
 */

// In-memory lock store (for production, use Redis with TTL)
const slotLocks = new Map();

export const initAmenityBookingSockets = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    
    // 1. User opens the calendar view for a specific amenity
    socket.on('join_amenity_room', ({ amenityId, orgId }) => {
      try {
        const roomName = `amenity:${orgId}:${amenityId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
        
        // Send currently locked slots in this room to the newly joined client
        const currentLocks = Array.from(slotLocks.values()).filter(lock => lock.amenityId === amenityId);
        socket.emit('sync_locked_slots', currentLocks);
      } catch (err) {
        console.error('Error joining amenity room:', err);
      }
    });

    socket.on('leave_amenity_room', ({ amenityId, orgId }) => {
      const roomName = `amenity:${orgId}:${amenityId}`;
      socket.leave(roomName);
    });

    // 2. User A clicks a slot to begin checkout
    socket.on('lock_slot', (payload) => {
      try {
        const { amenityId, orgId, date, startTime, endTime, userId } = payload;
        const lockKey = `${amenityId}_${date}_${startTime}_${endTime}`;
        const roomName = `amenity:${orgId}:${amenityId}`;

        // Check if slot is already locked by someone else
        if (slotLocks.has(lockKey) && slotLocks.get(lockKey).userId !== userId) {
          socket.emit('slot_lock_failed', { message: 'Slot is currently being booked by someone else.' });
          return;
        }

        // Create the lock
        const lockData = { ...payload, lockedAt: Date.now() };
        slotLocks.set(lockKey, lockData);

        // Broadcast the lock to all OTHER users in the room
        socket.to(roomName).emit('slot_locked', lockData);

        // Auto-release the lock after 5 minutes (300000 ms) if not checked out
        setTimeout(() => {
          if (slotLocks.has(lockKey) && slotLocks.get(lockKey).lockedAt === lockData.lockedAt) {
            slotLocks.delete(lockKey);
            io.to(roomName).emit('slot_released', { lockKey, ...lockData });
          }
        }, 5 * 60 * 1000);

        socket.emit('slot_lock_success', lockData);
      } catch (err) {
        console.error('Error locking slot:', err);
      }
    });

    // 3. User cancels or closes the checkout modal early
    socket.on('release_slot', (payload) => {
      try {
        const { amenityId, orgId, date, startTime, endTime } = payload;
        const lockKey = `${amenityId}_${date}_${startTime}_${endTime}`;
        const roomName = `amenity:${orgId}:${amenityId}`;

        if (slotLocks.has(lockKey)) {
          const lockData = slotLocks.get(lockKey);
          slotLocks.delete(lockKey);
          io.to(roomName).emit('slot_released', { lockKey, ...lockData });
        }
      } catch (err) {
        console.error('Error releasing slot:', err);
      }
    });

    socket.on('disconnect', () => {
      // Clean up any locks held by this socket/user if possible
      // Requires mapping socket.id to userId, omitted here for brevity
    });
  });

  // 4. Listen to backend internal events to release locks automatically upon booking confirmation
  amenityBookingEventEmitter.on(AMENITY_BOOKING_CREATED, (booking) => {
    try {
      const lockKey = `${booking.amenityId}_${booking.bookingDate}_${booking.startTime}_${booking.endTime}`;
      const roomName = `amenity:${booking.orgId}:${booking.amenityId}`;
      
      if (slotLocks.has(lockKey)) {
        slotLocks.delete(lockKey);
        // We broadcast slot_released, but the frontend will now refetch or receive the confirmed booking
        io.to(roomName).emit('slot_released', { lockKey });
      }
    } catch (err) {
      console.error('Error handling booking created event in sockets:', err);
    }
  });
};
