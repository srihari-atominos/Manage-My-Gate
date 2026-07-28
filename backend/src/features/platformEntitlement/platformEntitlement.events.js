import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformEntitlementEventEmitter extends EventEmitter {}

const entitlementEvents = new PlatformEntitlementEventEmitter();

entitlementEvents.on('entitlementGranted', (data) => {
  logger.info(`[PlatformEntitlement Event] Feature ${data.featureKey} granted to Org: ${data.organisationId}`);
});

entitlementEvents.on('entitlementStatusUpdated', (data) => {
  logger.info(`[PlatformEntitlement Event] Entitlement ${data.featureKey} for Org: ${data.organisationId} status changed to ${data.status}`);
});

export default entitlementEvents;
