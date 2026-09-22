import mongoose from 'mongoose';
import outboxService from '../outbox/outbox.service.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import {
  COMMUNITY_ENGAGEMENT_CONTENT_TYPES,
  VALID_CONTENT_TYPES,
  ENGAGEMENT_OUTBOX_EVENT_TYPES,
} from './communityEngagement.constants.js';

/**
 * Standardized outbox event dispatcher for Community Engagement events.
 * Provides database connection safety, correlation tracking, transaction session propagation,
 * and uniform event envelope.
 *
 * @param {Object} params
 * @param {'NOTICE'|'POLL'} params.aggregateType - Domain aggregate type
 * @param {string|mongoose.Types.ObjectId} params.aggregateId - Aggregate root document ID
 * @param {string} params.eventType - Specific outbox event type
 * @param {Object} params.payload - Event payload
 * @param {mongoose.ClientSession} [session=null] - Optional transaction session
 * @param {string} [correlationId=null] - Optional correlation identifier
 * @returns {Promise<Object|null>} Enqueued outbox event or null if skipped/failed
 */
export const enqueueCommunityEngagementOutbox = async ({
  aggregateType,
  aggregateId,
  eventType,
  payload,
  session = null,
  correlationId = null,
}) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }

  // Validate aggregate type
  if (!aggregateType || !VALID_CONTENT_TYPES.includes(aggregateType)) {
    logger.warn(`[CommunityEngagement Outbox] Skipped: Invalid aggregateType '${aggregateType}'`);
    return null;
  }

  // Validate event type
  if (!eventType || typeof eventType !== 'string') {
    logger.warn(`[CommunityEngagement Outbox] Skipped: Missing or invalid eventType`);
    return null;
  }

  const currentCorrelationId = correlationId || loggerStorage.getStore() || 'SYSTEM';

  try {
    const event = await outboxService.enqueueEvent(
      {
        aggregateType,
        aggregateId: aggregateId ? aggregateId.toString() : 'SYSTEM',
        eventType,
        payload,
        correlationId: currentCorrelationId,
      },
      session
    );

    logger.info(
      `[CommunityEngagement Outbox] Successfully enqueued ${eventType} for ${aggregateType}:${aggregateId} (Correlation: ${currentCorrelationId})`
    );
    return event;
  } catch (err) {
    logger.error(
      `[CommunityEngagement Outbox] Failed to enqueue event ${eventType} (${aggregateType}): ${err.message}`
    );
    return null;
  }
};

export default enqueueCommunityEngagementOutbox;
