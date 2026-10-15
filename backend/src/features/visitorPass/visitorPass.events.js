import { EventEmitter } from 'events';
import { getIO } from '../../config/socket.js';
import notificationService from '../notification/notification.service.js';
import logger from '../../utils/logger.utils.js';

const safeGetIO = () => {
  try {
    return getIO();
  } catch {
    return null;
  }
};

class VisitorPassEvents extends EventEmitter {}

const visitorPassEvents = new VisitorPassEvents();

// 1. Pass Created (e.g. resident created guest invitation or admin issued pass)
visitorPassEvents.on('pass_created', async (pass) => {
  try {
    const io = safeGetIO();
    const passId = pass._id ? String(pass._id) : '';
    const orgId = pass.orgId ? String(pass.orgId) : null;
    const createdById = pass.createdById ? String(pass.createdById) : null;
    const visitorName = pass.visitorDetails?.name || (pass.groupGuests && pass.groupGuests[0]?.name) || 'Visitor';

    // Socket real-time broadcast to community guards/org room
    if (io && orgId) {
      io.to(`org:${orgId}`).emit('visitor:pass_created', {
        passId,
        passType: pass.passType,
        visitorName,
        shortKey: pass.shortKey,
      });
    }

    // Deliver notification to creator / resident confirming pass creation
    if (createdById && orgId) {
      const dedupKey = `pass_created:${passId}:${createdById}`;
      await notificationService.createNotification({
        recipientId: createdById,
        orgId,
        title: 'Guest Invitation Created',
        body: `Invitation pass generated for ${visitorName} (${pass.passType || 'GUEST'}). Share code: ${pass.shortKey || 'Active'}`,
        actionUrl: '/visitor-management?tab=passes',
        type: 'SUCCESS',
        metadata: {
          passId,
          orgId,
          passType: pass.passType,
          shortKey: pass.shortKey,
          type: 'VISITOR_PASS_CREATED',
        },
        dedupKey,
      }).catch((err) => logger.warn(`[VisitorPass Events] Failed to create pass notification: ${err.message}`));
    }
  } catch (err) {
    logger.error(`[VisitorPass Events] Error handling pass_created: ${err.message}`);
  }
});

// 2. Pass Revoked (e.g. resident or guard cancelled pass)
visitorPassEvents.on('pass_revoked', async (pass) => {
  try {
    const io = safeGetIO();
    const passId = pass._id ? String(pass._id) : '';
    const orgId = pass.orgId ? String(pass.orgId) : null;
    const createdById = pass.createdById ? String(pass.createdById) : null;
    const visitorName = pass.visitorDetails?.name || 'Visitor';

    if (io && orgId) {
      io.to(`org:${orgId}`).emit('visitor:pass_revoked', {
        passId,
        visitorName,
      });
    }

    if (createdById && orgId) {
      const dedupKey = `pass_revoked:${passId}:${createdById}`;
      await notificationService.createNotification({
        recipientId: createdById,
        orgId,
        title: 'Visitor Pass Revoked',
        body: `The invitation pass for ${visitorName} has been revoked.`,
        actionUrl: '/visitor-management?tab=passes',
        type: 'WARNING',
        metadata: {
          passId,
          orgId,
          type: 'VISITOR_PASS_REVOKED',
        },
        dedupKey,
      }).catch((err) => logger.warn(`[VisitorPass Events] Failed to create pass revoked notification: ${err.message}`));
    }
  } catch (err) {
    logger.error(`[VisitorPass Events] Error handling pass_revoked: ${err.message}`);
  }
});

// 3. Pass Updated (e.g. consumed / used at gate)
visitorPassEvents.on('pass_updated', async (pass) => {
  try {
    const io = safeGetIO();
    const passId = pass._id ? String(pass._id) : '';
    const orgId = pass.orgId ? String(pass.orgId) : null;

    if (io && orgId) {
      io.to(`org:${orgId}`).emit('visitor:pass_updated', {
        passId,
        status: pass.status,
        usedCount: pass.usedCount,
      });
    }
  } catch (err) {
    logger.error(`[VisitorPass Events] Error handling pass_updated: ${err.message}`);
  }
});

export default visitorPassEvents;
