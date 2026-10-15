import { Server } from 'socket.io';
import mongoose from 'mongoose';
import logger from '../utils/logger.utils.js';
import { canJoinRoom } from './socketRoomPolicy.js';
import { initRoleSocket } from '../features/role/role.socket.js';
import { initUserSocket } from '../features/user/user.socket.js';
import { setupPaymentSocketListeners } from '../features/payment/payment.socket.js';
import { setupWalletSocketListeners } from '../features/wallet/wallet.socket.js';
import { initComplaintSockets } from '../features/complaint/complaint.socket.js';
import { initAmenitySockets } from '../features/amenity/amenity.socket.js';
import { initAmenityBookingSockets } from '../features/amenityBooking/amenityBooking.socket.js';
import { initCommunityNoteSockets } from '../features/communityNote/communityNote.socket.js';
import { initDirectoryMessageSockets } from '../features/directoryMessage/directoryMessage.socket.js';
import { initOrganizationSocket } from '../features/organization/organization.socket.js';
import { initStaffUnitAssociationSocket } from '../features/staffUnitAssociation/staffUnitAssociation.socket.js';
import { initTechnicianSocket } from '../features/technician/technician.socket.js';
import { initStaffAttendanceSocket } from '../features/staffAttendance/staffAttendance.socket.js';

let io = null;
let redisAdapterActive = false;

export const isRedisAdapterReady = () => redisAdapterActive;

/**
 * Initializes the Socket.io server.
 * @param {import('http').Server} httpServer - The HTTP/HTTPS server instance
 * @returns {Server} The initialized Socket.io Server instance
 */
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export const initSocket = async (httpServer) => {
  if (io) {
    logger.warn('Socket.io server already initialized.');
    return io;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const envOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '';
  const parsedEnvOrigins = envOrigins.split(',').map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3004', 'http://localhost:8081', 'http://localhost:8082', 'http://127.0.0.1:8081'];
  const allowedOrigins = [...new Set(isProd ? parsedEnvOrigins : [...parsedEnvOrigins, ...defaultOrigins])];

  logger.info(`Initializing Socket.io with allowed origins: ${allowedOrigins.join(', ')}`);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    // Production-ready timeouts and transports
    pingTimeout: 60000,   // 60 seconds
    pingInterval: 25000,   // 25 seconds
    transports: ['websocket', 'polling']
  });

  // Production Redis Adapter for cluster support
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        redisAdapterActive = false;
        logger.error('[Socket.io Redis Adapter] Publisher connection error:', err);
      });
      subClient.on('error', (err) => {
        redisAdapterActive = false;
        logger.error('[Socket.io Redis Adapter] Subscriber connection error:', err);
      });
      pubClient.on('ready', () => {
        redisAdapterActive = true;
      });
      subClient.on('ready', () => {
        redisAdapterActive = true;
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      io.adapter(createAdapter(pubClient, subClient));
      redisAdapterActive = true;
      logger.info('Socket.io Redis adapter enabled and connected successfully');
    } catch (error) {
      redisAdapterActive = false;
      if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_REDIS_ADAPTER === 'true') {
        logger.error('CRITICAL: Redis adapter failed to connect in production cluster mode (REQUIRE_REDIS_ADAPTER=true). Aborting server start to avoid split-brain room isolation.', error);
        throw error;
      }
      logger.error('Failed to initialize Socket.io Redis adapter. Falling back to in-memory adapter.', error);
    }
  }

  // Socket.io Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const { resolveSocketIdentity } = await import('./socketRoomPolicy.js');
      const identity = await resolveSocketIdentity(socket);
      if (!identity || !identity.id) {
        logger.warn(`[Socket Auth] Unauthorized connection attempt rejected: ${socket.id}`);
        return next(new Error('Unauthorized: Authentication required.'));
      }
      socket.data.user = identity;
      logger.info(`[Socket Auth] Authenticated connection allowed: ${socket.id} (user: ${identity.id})`);
      next();
    } catch (authErr) {
      logger.error(`[Socket Auth] Handshake auth error on socket ${socket.id}:`, authErr);
      next(new Error('Unauthorized: Authentication error.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (user: ${socket.data?.user?.id || 'unidentified'})`);

    // SEC-WS-05: Ensure authenticated socket is automatically attached to its verified user room
    if (socket.data?.user?.id) {
      socket.join(`user:${socket.data.user.id}`);
    }

    // Join room event boilerplate
    socket.on('join_room', async (room) => {
      if (!room) {
        logger.warn(`Socket ${socket.id} attempted to join empty room.`);
        return;
      }
      try {
        if (!(await canJoinRoom(socket, String(room)))) {
          logger.warn(`Socket ${socket.id} was refused room: ${room}`);
          return;
        }
        logger.info(`Socket ${socket.id} is joining room: ${room}`);
        socket.join(room);
      } catch (error) {
        logger.error(`Failed to authorise socket ${socket.id} for room ${room}:`, error);
      }
    });

    // SEC-WS-06: Explicit room leave
    socket.on('leave_room', (room) => {
      if (room && typeof room === 'string') {
        logger.info(`Socket ${socket.id} is leaving room: ${room}`);
        socket.leave(room);
      }
    });

    // SEC-WS-06: Evict previous tenant rooms on workspace / organization context switch
    socket.on('leave_tenant_rooms', (prevOrgId) => {
      try {
        const rooms = Array.from(socket.rooms);
        for (const r of rooms) {
          if (prevOrgId && typeof prevOrgId === 'string' && mongoose.isValidObjectId(prevOrgId)) {
            if (r.startsWith(`org:${prevOrgId}`) || r.startsWith(`amenity:${prevOrgId}:`) || r.startsWith('villa:')) {
              logger.info(`Socket ${socket.id} leaving tenant room: ${r}`);
              socket.leave(r);
            }
          } else {
            if (r.startsWith('org:') || r.startsWith('amenity:') || r.startsWith('villa:')) {
              logger.info(`Socket ${socket.id} leaving room on context reset: ${r}`);
              socket.leave(r);
            }
          }
        }
      } catch (err) {
        logger.error(`Error in leave_tenant_rooms for socket ${socket.id}:`, err);
      }
    });

    // SEC-WS-06: Context switch event with server-side validation and room isolation
    socket.on('switch_workspace', async ({ prevOrgId, newOrgId } = {}) => {
      try {
        const rooms = Array.from(socket.rooms);
        for (const r of rooms) {
          if (prevOrgId && (r.startsWith(`org:${prevOrgId}`) || r.startsWith(`amenity:${prevOrgId}:`) || r.startsWith('villa:'))) {
            socket.leave(r);
          } else if (!prevOrgId && (r.startsWith('org:') || r.startsWith('amenity:') || r.startsWith('villa:'))) {
            socket.leave(r);
          }
        }
        if (newOrgId && mongoose.isValidObjectId(newOrgId)) {
          const targetRoom = `org:${newOrgId}`;
          if (await canJoinRoom(socket, targetRoom)) {
            socket.join(targetRoom);
            socket.emit('workspace_switched', { orgId: newOrgId, success: true });
          } else {
            socket.emit('workspace_switched', { orgId: newOrgId, success: false, message: 'Unauthorized organization context' });
          }
        }
      } catch (err) {
        logger.error(`Error in switch_workspace for socket ${socket.id}:`, err);
      }
    });

    // Disconnect event boilerplate
    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Initialize feature-level socket dispatchers
  initRoleSocket();
  initUserSocket();
  initOrganizationSocket();
  initComplaintSockets();
  initAmenitySockets();
  initAmenityBookingSockets();
  initCommunityNoteSockets();
  initDirectoryMessageSockets();
  initStaffUnitAssociationSocket();
  initTechnicianSocket();
  initStaffAttendanceSocket();
  setupPaymentSocketListeners().catch((err) => logger.error('Failed to init payment socket listeners', err));
  setupWalletSocketListeners().catch((err) => logger.error('Failed to init wallet socket listeners', err));

  return io;
};

/**
 * Retrieves the initialized Socket.io server singleton.
 * @returns {Server} The active Socket.io Server instance
 * @throws {Error} If initSocket has not been called yet
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized. Call initSocket(server) first.');
  }
  return io;
};

/**
 * SEC-WS-05: Centralized socket disconnection helper for revoking active sessions.
 * Disconnects all active sockets for a specific user across all cluster instances.
 * @param {string} userId - Target user ID
 */
export const disconnectUserSockets = (userId) => {
  try {
    if (!userId || !io) return;
    const targetRoom = `user:${userId.toString()}`;
    logger.info(`[Socket Revocation] Terminating active sockets in room ${targetRoom}`);
    io.in(targetRoom).disconnectSockets(true);
  } catch (err) {
    logger.error(`[Socket Revocation] Failed to disconnect sockets for user ${userId}:`, err);
  }
};

/**
 * SEC-WS-06: Evict a user's active sockets from all rooms associated with a specific organization.
 * @param {string} userId - Target user ID
 * @param {string} orgId - Target organization ID to evict from
 */
export const evictUserFromTenantRooms = async (userId, orgId) => {
  try {
    if (!userId || !orgId || !io) return;
    const targetRoom = `user:${userId.toString()}`;
    const sockets = await io.in(targetRoom).fetchSockets();
    for (const s of sockets) {
      for (const r of s.rooms) {
        if (r.startsWith(`org:${orgId}`) || r.startsWith(`amenity:${orgId}:`) || r.startsWith('villa:')) {
          logger.info(`[Context Switch Eviction] Evicting socket ${s.id} of user ${userId} from room ${r}`);
          s.leave(r);
        }
      }
    }
  } catch (err) {
    logger.error(`[Context Switch Eviction] Failed to evict user ${userId} from org ${orgId}:`, err);
  }
};

export default {
  initSocket,
  getIO,
  disconnectUserSockets,
  evictUserFromTenantRooms,
};
