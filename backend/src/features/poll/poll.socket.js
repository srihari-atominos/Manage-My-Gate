import { getIO } from '../../config/socket.js';
import pollEvents from './poll.events.js';
import logger from '../../utils/logger.utils.js';
import { messageBroker } from '../../utils/messageBroker.util.js';

const ROOM_PREFIX = 'org:';

const emitToOrg = (orgId, event, data) => {
  try {
    const io = getIO();
    io.to(`${ROOM_PREFIX}${orgId}`).emit(event, data);
  } catch (error) {
    logger.error(`[PollSocket] Failed to emit ${event} to org ${orgId}:`, error);
  }
};

export const registerPollSocketHandlers = () => {
  pollEvents.on('poll_created', (poll) => {
    // We might not want to emit draft polls to everyone. Usually only active ones.
    if (poll.status === 'Active') {
      messageBroker.publishEvent('socket:poll_created', { orgId: poll.orgId, poll });
    }
  });

  pollEvents.on('poll_updated', (poll) => {
    messageBroker.publishEvent('socket:poll_updated', { orgId: poll.orgId, poll });
  });

  pollEvents.on('poll_published', (poll) => {
    messageBroker.publishEvent('socket:poll_published', { orgId: poll.orgId, poll });
  });

  pollEvents.on('poll_closed', (poll) => {
    messageBroker.publishEvent('socket:poll_closed', { orgId: poll.orgId, poll });
  });

  pollEvents.on('poll_vote_added', ({ orgId, residentId, optionIndex, updatedPoll }) => {
    messageBroker.publishEvent('socket:poll_vote_added', { orgId, poll: updatedPoll, residentId, optionIndex });
  });

  pollEvents.on('poll_vote_removed', ({ orgId, residentId, optionIndex, updatedPoll }) => {
    messageBroker.publishEvent('socket:poll_vote_removed', { orgId, poll: updatedPoll, residentId, optionIndex });
  });

  pollEvents.on('poll_deleted', (payload) => {
    messageBroker.publishEvent('socket:poll_deleted', payload);
  });

  // Subscribe to message broker events to emit across all pods
  messageBroker.subscribeEvent('socket:poll_created', (payload) => {
    emitToOrg(payload.orgId, 'poll_created', payload.poll);
  });

  messageBroker.subscribeEvent('socket:poll_updated', (payload) => {
    emitToOrg(payload.orgId, 'poll_updated', payload.poll);
  });

  messageBroker.subscribeEvent('socket:poll_published', (payload) => {
    emitToOrg(payload.orgId, 'poll_published', payload.poll);
  });

  messageBroker.subscribeEvent('socket:poll_closed', (payload) => {
    emitToOrg(payload.orgId, 'poll_closed', payload.poll);
  });

  messageBroker.subscribeEvent('socket:poll_vote_added', (payload) => {
    emitToOrg(payload.orgId, 'poll_vote_added', payload);
  });

  messageBroker.subscribeEvent('socket:poll_vote_removed', (payload) => {
    emitToOrg(payload.orgId, 'poll_vote_removed', payload);
  });

  messageBroker.subscribeEvent('socket:poll_deleted', (payload) => {
    emitToOrg(payload.orgId, 'poll_deleted', { pollId: payload._id });
  });
};
