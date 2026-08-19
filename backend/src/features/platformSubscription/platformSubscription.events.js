import { platformSubscriptionEvents } from './platformSubscription.service.js';

platformSubscriptionEvents.on('subscription.activated', async (payload) => {
  console.log('⚡ [Event] subscription.activated received:', payload);
  try {
    const platformEntitlementService = (await import('../platformEntitlement/platformEntitlement.service.js')).default;
    await platformEntitlementService.handleSubscriptionActivatedEvent(payload);
  } catch (err) {
    console.error('Failed to handle subscription.activated event:', err);
  }
});

export default platformSubscriptionEvents;
