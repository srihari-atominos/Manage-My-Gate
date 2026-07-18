import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.utils.js';

/**
 * Helper to populate user and unit details, and extract communityId for an invoice.
 */
const prepareInvoicePayload = async (payload) => {
  try {
    const Invoice = (await import('./invoice.model.js')).default;
    const invoiceDoc = await Invoice.findById(payload._id)
      .populate('targetUserId', 'name username')
      .populate('unitId', 'unitNumber')
      .populate('assessmentId', 'communityId');

    if (invoiceDoc) {
      const docObj = invoiceDoc.toObject();
      if (invoiceDoc.assessmentId) {
        docObj.communityId = invoiceDoc.assessmentId.communityId;
      }
      return docObj;
    }
  } catch (error) {
    logger.error('Failed to prepare invoice payload for socket:', error);
  }
  return payload;
};

/**
 * Listen to native invoice EventEmitter events and dispatch them via Socket.io.
 */
export const setupInvoiceSocketListeners = async () => {
  const { invoiceEventEmitter, INVOICE_GENERATED, INVOICE_STATUS_UPDATED } = await import('./invoice.events.js');

  logger.info('Registering real-time Socket.io listeners for Invoice events.');

  invoiceEventEmitter.on(INVOICE_GENERATED, async (payload) => {
    try {
      if (!payload || !payload.targetUserId) {
        logger.warn('Socket dispatch ignored: payload or targetUserId missing for INVOICE_GENERATED');
        return;
      }

      const populatedPayload = await prepareInvoicePayload(payload);
      const targetUserId = populatedPayload.targetUserId?._id || populatedPayload.targetUserId;
      
      const userRoom = `user:${targetUserId}`;
      logger.info(`Broadcasting invoice_generated to room: ${userRoom}`);
      getIO().to(userRoom).emit('invoice_generated', populatedPayload);

      if (populatedPayload.communityId) {
        const orgRoom = `org:${populatedPayload.communityId}`;
        logger.info(`Broadcasting invoice_generated to room: ${orgRoom}`);
        getIO().to(orgRoom).emit('invoice_generated', populatedPayload);
      }

      // Create persistent database notification for the user
      try {
        const notificationService = (await import('../notification/notification.service.js')).default;
        const amountStr = populatedPayload.totalDue ? populatedPayload.totalDue.toLocaleString('en-IN') : '0';
        await notificationService.createNotification({
          recipientId: targetUserId,
          senderId: null,
          title: 'New Maintenance & Assessment Bill',
          body: `A new assessment invoice of ₹${amountStr} has been generated for unit ${populatedPayload.unitId?.unitNumber || '—'} for period ${populatedPayload.billingPeriodString || '—'}.`,
          actionUrl: '/billing?tab=action-center',
          type: 'INFO',
        });
      } catch (err) {
        logger.error('Failed to create user notification for generated invoice:', err);
      }
    } catch (error) {
      logger.error('Failed to emit invoice_generated socket event:', error);
    }
  });

  invoiceEventEmitter.on(INVOICE_STATUS_UPDATED, async (payload) => {
    try {
      if (!payload || !payload.targetUserId) {
        logger.warn('Socket dispatch ignored: payload or targetUserId missing for INVOICE_STATUS_UPDATED');
        return;
      }

      const populatedPayload = await prepareInvoicePayload(payload);
      const targetUserId = populatedPayload.targetUserId?._id || populatedPayload.targetUserId;

      const userRoom = `user:${targetUserId}`;
      logger.info(`Broadcasting invoice_status_updated to room: ${userRoom}`);
      getIO().to(userRoom).emit('invoice_status_updated', populatedPayload);

      if (populatedPayload.communityId) {
        const orgRoom = `org:${populatedPayload.communityId}`;
        logger.info(`Broadcasting invoice_status_updated to room: ${orgRoom}`);
        getIO().to(orgRoom).emit('invoice_status_updated', populatedPayload);
      }
    } catch (error) {
      logger.error('Failed to emit invoice_status_updated socket event:', error);
    }
  });
};

export default setupInvoiceSocketListeners;
