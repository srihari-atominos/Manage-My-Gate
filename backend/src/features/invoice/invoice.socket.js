import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Listen to native invoice EventEmitter events and dispatch them via Socket.io.
 */
export const setupInvoiceSocketListeners = async () => {
  const { invoiceEventEmitter, INVOICE_GENERATED, INVOICE_STATUS_UPDATED } = await import('./invoice.events.js');

  logger.info('Registering real-time Socket.io listeners for Invoice events.');

  invoiceEventEmitter.on(INVOICE_GENERATED, (payload) => {
    try {
      if (!payload || !payload.targetUserId) {
        logger.warn('Socket dispatch ignored: payload or targetUserId missing for INVOICE_GENERATED');
        return;
      }
      const room = `user:${payload.targetUserId}`;
      logger.info(`Broadcasting invoice_generated to room: ${room}`);
      getIO().to(room).emit('invoice_generated', payload);
    } catch (error) {
      logger.error('Failed to emit invoice_generated socket event:', error);
    }
  });

  invoiceEventEmitter.on(INVOICE_STATUS_UPDATED, (payload) => {
    try {
      if (!payload || !payload.targetUserId) {
        logger.warn('Socket dispatch ignored: payload or targetUserId missing for INVOICE_STATUS_UPDATED');
        return;
      }
      const room = `user:${payload.targetUserId}`;
      logger.info(`Broadcasting invoice_status_updated to room: ${room}`);
      getIO().to(room).emit('invoice_status_updated', payload);
    } catch (error) {
      logger.error('Failed to emit invoice_status_updated socket event:', error);
    }
  });
};

export default setupInvoiceSocketListeners;
