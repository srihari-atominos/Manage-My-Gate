import { platformEntitlementEvents } from './platformEntitlement.service.js';

platformEntitlementEvents.on('entitlements.activated', async (payload) => {
  console.log('⚡ [Event] entitlements.activated received:', payload);
  try {
    const platformProvisioningJobService = (await import('../platformProvisioningJob/platformProvisioningJob.service.js')).default;
    await platformProvisioningJobService.handleEntitlementsActivatedEvent(payload);
  } catch (err) {
    console.error('Failed to handle entitlements.activated event:', err);
  }
});

export default platformEntitlementEvents;
