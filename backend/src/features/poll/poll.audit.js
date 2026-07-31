import pollEvents from './poll.events.js';
import auditLogService from '../auditLog/auditLog.services.js';
import logger from '../../utils/logger.utils.js';

const logPollEvent = async (action, poll, actorId = 'System', metadata = {}) => {
  try {
    await auditLogService.logEvent({
      actorId: actorId !== 'System' ? actorId : undefined,
      action,
      targetId: poll._id,
      metadata: {
        ...metadata,
        pollQuestion: poll.question,
        orgId: poll.orgId
      },
      ipAddress: 'System Event' // Service layer is protocol-agnostic
    });
  } catch (error) {
    logger.error(`[Poll Audit] Failed to log ${action} event:`, error);
  }
};

pollEvents.on('poll_created', (poll) => logPollEvent('POLL_CREATED', poll, poll.createdBy));
pollEvents.on('poll_updated', (poll) => logPollEvent('POLL_UPDATED', poll, poll.createdBy));
pollEvents.on('poll_published', (poll) => logPollEvent('POLL_PUBLISHED', poll, poll.createdBy));
pollEvents.on('poll_closed', (poll) => {
  // Check if closed by user or system
  // We don't have the explicit actor here in the event payload, but if it's auto closed it might not have an actor.
  logPollEvent('POLL_CLOSED', poll);
});
pollEvents.on('poll_deleted', (pollData) => logPollEvent('POLL_DELETED', pollData, pollData.actorId));
pollEvents.on('poll_vote_added', (data) => {
  logPollEvent('POLL_VOTE_ADDED', { _id: data.pollId, orgId: data.orgId, question: 'Vote Added' }, data.residentId);
});
