import platformPaymentService, { platformPaymentEvents } from './platformPayment.service.js';

platformPaymentEvents.on('payment.completed', async (payload) => {
  console.log('⚡ [Event] payment.completed received:', payload);
  try {
    const platformSubscriptionService = (await import('../platformSubscription/platformSubscription.service.js')).default;
    await platformSubscriptionService.handlePaymentCompletedEvent(payload);
  } catch (err) {
    console.error('Failed to handle payment.completed event:', err);
  }
});

export default platformPaymentEvents;
