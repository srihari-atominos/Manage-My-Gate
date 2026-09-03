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

const safeEmit = (room, event, payload) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, payload);
    }
  } catch (e) {
    // Socket.io not initialized in test/CLI mode
  }
};

/**
 * Listen to native invoice EventEmitter events and dispatch them via Socket.io.
 */
export const setupInvoiceSocketListeners = async () => {
  const { invoiceEventEmitter, INVOICE_GENERATED, INVOICE_STATUS_UPDATED, OFFLINE_PAYMENT_SUBMITTED } = await import('./invoice.events.js');

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
      safeEmit(userRoom, 'invoice_generated', populatedPayload);

      if (populatedPayload.communityId) {
        const orgRoom = `org:${populatedPayload.communityId}`;
        logger.info(`Broadcasting invoice_generated to room: ${orgRoom}`);
        safeEmit(orgRoom, 'invoice_generated', populatedPayload);
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
      safeEmit(userRoom, 'invoice_status_updated', populatedPayload);

      if (populatedPayload.communityId) {
        const orgRoom = `org:${populatedPayload.communityId}`;
        logger.info(`Broadcasting invoice_status_updated to room: ${orgRoom}`);
        safeEmit(orgRoom, 'invoice_status_updated', populatedPayload);
      }

      if (populatedPayload.status === 'PAID') {
        try {
          const notificationService = (await import('../notification/notification.service.js')).default;
          await notificationService.createNotification({
            recipientId: targetUserId,
            senderId: null,
            title: 'Payment Verified',
            body: `Your offline payment has been successfully verified and settled.`,
            actionUrl: '/billing',
            type: 'SUCCESS',
          });
        } catch (err) {
          logger.error('Failed to create user notification for paid invoice:', err);
        }
      }
    } catch (error) {
      logger.error('Failed to emit invoice_status_updated socket event:', error);
    }
  });

  invoiceEventEmitter.on(OFFLINE_PAYMENT_SUBMITTED, async (payload) => {
    try {
      if (!payload || !payload.communityId) {
        logger.warn('Socket dispatch ignored: payload or communityId missing for OFFLINE_PAYMENT_SUBMITTED');
        return;
      }

      const orgRoom = `org:${payload.communityId}`;
      logger.info(`Broadcasting offline_payment_submitted to room: ${orgRoom}`);
      try {
        const io = getIO();
        if (io) io.to(orgRoom).emit('offline_payment_submitted', payload);
      } catch (e) {
        // Socket.io not initialized in test/CLI mode
      }

      try {
        const notificationService = (await import('../notification/notification.service.js')).default;
        const Role = (await import('../role/role.model.js')).default;
        const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
        
        // Notify resident
        if (payload.invoice?.targetUserId) {
          const resUserId = payload.invoice.targetUserId._id || payload.invoice.targetUserId;
          const amtStr = (payload.invoice?.offlineAmount || payload.invoice?.totalAmount || 0).toLocaleString('en-IN');
          await notificationService.createNotification({
            recipientId: resUserId,
            senderId: null,
            title: 'Payment Submitted',
            body: `Your ₹${amtStr} bank transfer has been submitted for verification.`,
            actionUrl: '/billing?tab=action-center',
            type: 'INFO',
          });
        }

        // Check for admin roles to notify admins
        const adminRoles = await Role.find({ 
          name: { $in: ['Admin', 'Community Admin', 'Super Admin'] }, 
          $or: [{ orgId: payload.communityId }, { orgId: null }] 
        });
        const adminRoleIds = adminRoles.map(r => r._id);
        
        if (adminRoleIds.length > 0) {
          const memberships = await OrgMembership.find({ 
            orgId: payload.communityId, 
            $or: [{ roleIds: { $in: adminRoleIds } }, { roleId: { $in: adminRoleIds } }] 
          });

          for (const member of memberships) {
            const amtStr = (payload.invoice?.offlineAmount || payload.invoice?.totalAmount || 0).toLocaleString('en-IN');
            await notificationService.createNotification({
              recipientId: member.userId,
              senderId: null,
              title: 'New Bank Transfer',
              body: `${payload.residentName || 'Resident'} submitted a ₹${amtStr} payment for verification.`,
              actionUrl: '/billing?tab=action-center',
              type: 'INFO',
            });
          }
        }
      } catch (err) {
        logger.error('Failed to create notification for bank transfer submission:', err);
      }
    } catch (error) {
      logger.error('Failed to emit offline_payment_submitted socket event:', error);
    }
  });

  invoiceEventEmitter.on('BANK_TRANSFER_REJECTED', async (payload) => {
    try {
      if (!payload || !payload.targetUserId) return;
      const targetUserId = payload.targetUserId._id || payload.targetUserId;
      const userRoom = `user:${targetUserId}`;
      getIO().to(userRoom).emit('bank_transfer_rejected', payload);

      const notificationService = (await import('../notification/notification.service.js')).default;
      const amtStr = (payload.totalAmount || payload.totalDue || 0).toLocaleString('en-IN');
      await notificationService.createNotification({
        recipientId: targetUserId,
        senderId: null,
        title: 'Payment Could Not Be Verified',
        body: `Your ₹${amtStr} payment could not be verified. Reason: ${payload.rejectionReason || 'Verification failed.'}`,
        actionUrl: '/billing?tab=action-center',
        type: 'WARNING',
      });
    } catch (error) {
      logger.error('Failed to emit BANK_TRANSFER_REJECTED socket event:', error);
    }
  });

  invoiceEventEmitter.on('CASH_PAYMENT_RECORDED', async (payload) => {
    try {
      if (!payload || !payload.targetUserId) return;
      const targetUserId = payload.targetUserId._id || payload.targetUserId;
      const userRoom = `user:${targetUserId}`;
      getIO().to(userRoom).emit('cash_payment_recorded', payload);

      const notificationService = (await import('../notification/notification.service.js')).default;
      const amtStr = (payload.paidAmount || payload.totalAmount || 0).toLocaleString('en-IN');
      await notificationService.createNotification({
        recipientId: targetUserId,
        senderId: null,
        title: 'Cash Payment Received',
        body: `₹${amtStr} cash payment has been recorded. Invoice: ${payload.snapshot?.assessmentName || 'Maintenance'}, Receipt: ${payload.receiptNumber || 'N/A'}`,
        actionUrl: '/billing?tab=action-center',
        type: 'SUCCESS',
      });
    } catch (error) {
      logger.error('Failed to emit CASH_PAYMENT_RECORDED socket event:', error);
    }
  });
};

export default setupInvoiceSocketListeners;
