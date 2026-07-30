import orgEventEmitter from '../organization/organization.events.js';
import provisioningJobEvents from '../platformProvisioningJob/platformProvisioningJob.events.js';
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

/**
 * Listen for contract owner assignment events and asynchronously write audit logs.
 */
const handleContractOwnerAssigned = async (eventData) => {
  try {
    const { actorId, targetId, newOwnerId } = eventData;

    await auditLogService.logEvent({
      actorId,
      action: 'CONTRACT_OWNER_ASSIGNED',
      targetId,
      metadata: {
        newOwnerId,
      },
      ipAddress: 'System Event',
    });

    logger.info(`Audit Log: CONTRACT_OWNER_ASSIGNED logged for target org ${targetId} by actor ${actorId}`);
  } catch (error) {
    logger.error('Failed to write audit log for CONTRACT_OWNER_ASSIGNED event: ', error);
  }
};

orgEventEmitter.on('CONTRACT_OWNER_ASSIGNED', handleContractOwnerAssigned);

/**
 * Listen for provisioning started events and asynchronously write audit logs.
 */
const handleProvisioningStarted = async (eventData) => {
  try {
    const { actorId, targetId, jobId, planId } = eventData;

    await auditLogService.logEvent({
      actorId,
      action: 'PROVISIONING_STARTED',
      targetId,
      metadata: {
        jobId,
        planId,
      },
      ipAddress: 'System Event',
    });

    logger.info(`Audit Log: PROVISIONING_STARTED logged for target org ${targetId} (Job: ${jobId})`);
  } catch (error) {
    logger.error('Failed to write audit log for PROVISIONING_STARTED event: ', error);
  }
};

orgEventEmitter.on('PROVISIONING_STARTED', handleProvisioningStarted);
if (provisioningJobEvents) {
  provisioningJobEvents.on('PROVISIONING_STARTED', handleProvisioningStarted);
}

/**
 * Listen for provisioning completed events and asynchronously write audit logs.
 */
const handleProvisioningCompleted = async (eventData) => {
  try {
    const { actorId, targetId, jobId, workspaceId } = eventData;

    await auditLogService.logEvent({
      actorId,
      action: 'PROVISIONING_COMPLETED',
      targetId,
      metadata: {
        jobId,
        workspaceId,
      },
      ipAddress: 'System Event',
    });

    logger.info(`Audit Log: PROVISIONING_COMPLETED logged for target org ${targetId} (Job: ${jobId})`);
  } catch (error) {
    logger.error('Failed to write audit log for PROVISIONING_COMPLETED event: ', error);
  }
};

orgEventEmitter.on('PROVISIONING_COMPLETED', handleProvisioningCompleted);
if (provisioningJobEvents) {
  provisioningJobEvents.on('PROVISIONING_COMPLETED', handleProvisioningCompleted);
}

/**
 * Listen for provisioning failed events and asynchronously write audit logs.
 */
const handleProvisioningFailed = async (eventData) => {
  try {
    const { actorId, targetId, jobId, errorReason, retryCount } = eventData;

    await auditLogService.logEvent({
      actorId,
      action: 'PROVISIONING_FAILED',
      targetId,
      metadata: {
        jobId,
        errorReason,
        retryCount,
      },
      ipAddress: 'System Event',
    });

    logger.info(`Audit Log: PROVISIONING_FAILED logged for target org ${targetId} (Job: ${jobId})`);
  } catch (error) {
    logger.error('Failed to write audit log for PROVISIONING_FAILED event: ', error);
  }
};

orgEventEmitter.on('PROVISIONING_FAILED', handleProvisioningFailed);
if (provisioningJobEvents) {
  provisioningJobEvents.on('PROVISIONING_FAILED', handleProvisioningFailed);
}

