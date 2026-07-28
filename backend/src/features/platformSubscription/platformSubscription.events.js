import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformSubscriptionEventEmitter extends EventEmitter {}

const subscriptionEvents = new PlatformSubscriptionEventEmitter();

subscriptionEvents.on('subscriptionCreated', (data) => {
  logger.info(`[PlatformSubscription Event] Subscription created for Org: ${data.organisationId} (Plan: ${data.planName})`);
});

subscriptionEvents.on('subscriptionStatusUpdated', (data) => {
  logger.info(`[PlatformSubscription Event] Subscription status for Org: ${data.organisationId} updated to ${data.status}`);
});

export default subscriptionEvents;
