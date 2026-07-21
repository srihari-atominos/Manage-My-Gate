import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Real-time Socket.io dispatcher for wallet events.
 * Listens to native walletEventEmitter events and streams to strict room hierarchies.
 */
export const setupWalletSocketListeners = async () => {
  const { walletEventEmitter, WALLET_UPDATED, WALLET_TRANSACTION_CREATED } = await import('./wallet.events.js');

  logger.info('Registering real-time Socket.io listeners for Wallet events.');

  walletEventEmitter.on(WALLET_UPDATED, (payload) => {
    try {
      if (!payload || !payload.userId) return;
      const io = getIO();
      if (!io) return;

      const userId = payload.userId._id || payload.userId;
      const userRoom = `user:${userId}`;
      logger.info(`Broadcasting wallet_updated to room: ${userRoom}`);
      io.to(userRoom).emit('wallet_updated', payload);
      io.to(userRoom).emit('walletUpdated', payload);

      if (payload.orgId) {
        const orgId = payload.orgId._id || payload.orgId;
        const orgRoom = `org:${orgId}`;
        logger.info(`Broadcasting wallet_updated to room: ${orgRoom}`);
        io.to(orgRoom).emit('wallet_updated', payload);
      }
    } catch (error) {
      logger.error('Error emitting wallet_updated socket event:', error);
    }
  });

  walletEventEmitter.on(WALLET_TRANSACTION_CREATED, (transaction) => {
    try {
      if (!transaction || !transaction.userId) return;
      const io = getIO();
      if (!io) return;

      const userId = transaction.userId._id || transaction.userId;
      const userRoom = `user:${userId}`;
      logger.info(`Broadcasting wallet_transaction_created to room: ${userRoom}`);
      io.to(userRoom).emit('wallet_transaction_created', transaction);
    } catch (error) {
      logger.error('Error emitting wallet_transaction_created socket event:', error);
    }
  });
};

export default setupWalletSocketListeners;
