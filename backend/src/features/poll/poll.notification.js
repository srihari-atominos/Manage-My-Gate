import mongoose from 'mongoose';
import pollEvents from './poll.events.js';
import outboxService from '../outbox/outbox.service.js';
import logger from '../../utils/logger.utils.js';

const enqueuePollOutbox = async (eventType, poll, extraPayload = {}) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
  try {
    await outboxService.enqueueEvent({
      aggregateType: 'POLL',
      aggregateId: poll._id || poll.id,
      eventType,
      payload: {
        pollId: poll._id || poll.id,
        orgId: poll.orgId,
        question: poll.question,
        targetAudience: poll.targetAudience,
        createdBy: poll.createdBy,
        outcome: poll.outcome,
        winningOption: poll.winningOption,
        expiresAt: poll.expiresAt || poll.endDate,
        ...extraPayload,
      },
    });
  } catch (err) {
    logger.error(`[Poll Notification] Failed to enqueue outbox event ${eventType}: ${err.message}`);
  }
};

pollEvents.on('poll_created', async (poll) => {
  if (poll && poll.status === 'Active') {
    await enqueuePollOutbox('POLL_ACTIVATED', poll);
  }
});

pollEvents.on('poll_published', async (poll) => {
  if (poll) {
    await enqueuePollOutbox('POLL_ACTIVATED', poll);
  }
});

pollEvents.on('poll_closed', async (poll) => {
  if (poll) {
    await enqueuePollOutbox('POLL_CLOSED', poll);
  }
});

pollEvents.on('poll_finalized', async (poll) => {
  if (poll) {
    await enqueuePollOutbox('POLL_CLOSED', poll);
  }
});

pollEvents.on('poll_closing_soon', async (poll) => {
  if (poll) {
    await enqueuePollOutbox('POLL_CLOSING_SOON', poll);
  }
});

export default enqueuePollOutbox;

