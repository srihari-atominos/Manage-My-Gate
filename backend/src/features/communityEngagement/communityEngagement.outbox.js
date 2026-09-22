import mongoose from 'mongoose';
import outboxService from '../outbox/outbox.service.js';
import logger from '../../utils/logger.utils.js';

/**
 * Standardized outbox event dispatcher for Community Engagement events.
 * Provides database connection safety, correlation tracking, and uniform event envelope.
 *
 * @param {Object} params
 * @param {'NOTICE'|'POLL'} params.aggregateType - Domain aggregate type
 * @param {string|mongoose.Types.ObjectId} params.aggregateId - Aggregate root document ID
 * @param {string} params.eventType - Specific outbox event type
 * @param {Object} params.payload - Event payload
 * @param {mongoose.ClientSession} [session=null] - Optional transaction session
 * @returns {Promise<Object|null>} Enqueued outbox event or null if skipped/failed
 */
export const enqueueCommunityEngagementOutbox = async ({
  aggregateType,
  aggregateId,
  eventType,
  payload,
  session = null,
}) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    return await outboxService.enqueueEvent(
      {
        aggregateType,
        aggregateId: aggregateId ? aggregateId.toString() : 'SYSTEM',
        eventType,
        payload,
      },
      session
    );
  } catch (err) {
    logger.error(
      `[CommunityEngagement Outbox] Failed to enqueue event ${eventType} (${aggregateType}): ${err.message}`
    );
    return null;
  }
};

export default enqueueCommunityEngagementOutbox;
