import orgEventEmitter from '../organization/organization.events.js';
import auditLogService from './auditLog.services.js';
import logger from '../../utils/logger.utils.js';

/**
 * Listen for organization status change events and asynchronously write audit logs.
 */
orgEventEmitter.on('ORG_STATUS_CHANGED', async (eventData) => {
  try {
    const { actorId, targetId, oldStatus, newStatus } = eventData;

    await auditLogService.logEvent({
      actorId,
      action: 'ORG_STATUS_CHANGED',
      targetId,
      metadata: {
        oldStatus,
        newStatus,
      },
      ipAddress: 'System Event', // Service layer is protocol-agnostic
    });

    logger.info(`Audit Log: ORG_STATUS_CHANGED logged for target org ${targetId} by actor ${actorId}`);
  } catch (error) {
    logger.error('Failed to write audit log for ORG_STATUS_CHANGED event: ', error);
  }
});
