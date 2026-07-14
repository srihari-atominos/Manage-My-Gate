import { Server } from 'socket.io';
import logger from '../utils/logger.utils.js';

let io = null;

/**
 * Initializes the Socket.io server.
 * @param {import('http').Server} httpServer - The HTTP/HTTPS server instance
 * @returns {Server} The initialized Socket.io Server instance
 */
export const initSocket = (httpServer) => {
  if (io) {
    logger.warn('Socket.io server already initialized.');
    return io;
  }

  // Parse ALLOWED_ORIGINS or CLIENT_URL for CORS. Defaults to frontend default port.
  const envOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = envOrigins.split(',').map((url) => url.trim());

  logger.info(`Initializing Socket.io with allowed origins: ${allowedOrigins.join(', ')}`);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    // Production-ready timeouts
    pingTimeout: 60000,   // 60 seconds
    pingInterval: 25000,   // 25 seconds
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Join room event boilerplate
    socket.on('join_room', (room) => {
      if (!room) {
        logger.warn(`Socket ${socket.id} attempted to join empty room.`);
        return;
      }
      logger.info(`Socket ${socket.id} is joining room: ${room}`);
      socket.join(room);
    });

    // Disconnect event boilerplate
    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

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

export default {
  initSocket,
  getIO,
};
