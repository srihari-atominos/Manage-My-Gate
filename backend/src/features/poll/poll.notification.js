import mongoose from 'mongoose';
import pollEvents from './poll.events.js';
import { enqueueCommunityEngagementOutbox } from '../communityEngagement/communityEngagement.outbox.js';

const enqueuePollOutbox = async (eventType, poll, extraPayload = {}) => {
  return await enqueueCommunityEngagementOutbox({
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

