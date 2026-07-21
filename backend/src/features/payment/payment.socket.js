import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Real-time Socket.io dispatcher for payment events.
 * Listens to native paymentEventEmitter events and broadcasts to strict room hierarchies.
 */
export const setupPaymentSocketListeners = async () => {
  const { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_REFUNDED } = await import('./payment.events.js');

  logger.info('Registering real-time Socket.io listeners for Payment events.');

  paymentEventEmitter.on(PAYMENT_SUCCESS, (payment) => {
    try {
      if (!payment || !payment.userId) return;
      const io = getIO();
      if (!io) return;

      const userId = payment.userId._id || payment.userId;
      const orgId = payment.orgId?._id || payment.orgId;

      const userRoom = `user:${userId}`;
      logger.info(`Broadcasting payment_success to room: ${userRoom}`);
      io.to(userRoom).emit('payment_success', payment);
      io.to(userRoom).emit('paymentSuccess', payment);

      if (orgId) {
        const orgRoom = `org:${orgId}`;
        logger.info(`Broadcasting payment_success to room: ${orgRoom}`);
        io.to(orgRoom).emit('payment_success', payment);
      }
    } catch (error) {
      logger.error('Error emitting payment_success socket event:', error);
    }
  });

  paymentEventEmitter.on(PAYMENT_FAILED, (payment) => {
    try {
      if (!payment || !payment.userId) return;
      const io = getIO();
      if (!io) return;

      const userId = payment.userId._id || payment.userId;
      const userRoom = `user:${userId}`;
      logger.info(`Broadcasting payment_failed to room: ${userRoom}`);
      io.to(userRoom).emit('payment_failed', payment);
    } catch (error) {
      logger.error('Error emitting payment_failed socket event:', error);
    }
  });

  paymentEventEmitter.on(PAYMENT_REFUNDED, (payment) => {
    try {
      if (!payment || !payment.userId) return;
      const io = getIO();
      if (!io) return;

      const userId = payment.userId._id || payment.userId;
      const userRoom = `user:${userId}`;
      logger.info(`Broadcasting payment_refunded to room: ${userRoom}`);
      io.to(userRoom).emit('payment_refunded', payment);
      io.to(userRoom).emit('paymentRefunded', payment);
    } catch (error) {
      logger.error('Error emitting payment_refunded socket event:', error);
    }
  });
};

export default setupPaymentSocketListeners;
