import { getIO } from '../../config/socket.js';
import {
  amenityEventEmitter,
  AMENITY_CREATED,
  AMENITY_UPDATED,
  AMENITY_DELETED,
} from './amenity.events.js';

export const initAmenitySockets = () => {
  const io = getIO();

  // 1. Listen for new amenity creations
  amenityEventEmitter.on(AMENITY_CREATED, (amenity) => {
    try {
      if (amenity?.orgId) {
        io.to(`org:${amenity.orgId}`).emit('AMENITY_CREATED', amenity);
      } else {
        io.emit('AMENITY_CREATED', amenity);
      }
    } catch (err) {
      console.error('Error broadcasting amenity creation event in sockets:', err);
    }
  });

  // 2. Listen for amenity updates (including status changes to Maintenance)
  amenityEventEmitter.on(AMENITY_UPDATED, (amenity) => {
    try {
      if (amenity?.orgId) {
        io.to(`org:${amenity.orgId}`).emit('AMENITY_UPDATED', amenity);
      } else {
        io.emit('AMENITY_UPDATED', amenity);
      }
    } catch (err) {
      console.error('Error broadcasting amenity update event in sockets:', err);
    }
  });

  // 3. Listen for amenity deletions/deactivations
  amenityEventEmitter.on(AMENITY_DELETED, (amenity) => {
    try {
      if (amenity?.orgId) {
        io.to(`org:${amenity.orgId}`).emit('AMENITY_DELETED', amenity);
      } else {
        io.emit('AMENITY_DELETED', amenity);
      }
    } catch (err) {
      console.error('Error broadcasting amenity deletion event in sockets:', err);
    }
  });
};
