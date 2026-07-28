import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class MasterPricingEvents extends EventEmitter {}

const masterPricingEvents = new MasterPricingEvents();

masterPricingEvents.on('master_pricing_created', (pricingPlan) => {
  logger.info(`[MasterPricing Event] Plan created: ${pricingPlan._id} (${pricingPlan.planName})`);
});

masterPricingEvents.on('master_pricing_updated', (pricingPlan) => {
  logger.info(`[MasterPricing Event] Plan updated: ${pricingPlan._id} (${pricingPlan.planName})`);
});

masterPricingEvents.on('master_pricing_deleted', (pricingPlan) => {
  logger.info(`[MasterPricing Event] Plan deleted: ${pricingPlan._id} (${pricingPlan.planName})`);
});

export default masterPricingEvents;
