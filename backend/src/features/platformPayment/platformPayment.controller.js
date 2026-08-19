import platformPaymentService from './platformPayment.service.js';

class PlatformPaymentController {
  async createOrder(req, res, next) {
    try {
      const { amount, currency = 'INR', inquiryId } = req.body;
      const rawOrgId = req.user?.orgId || req.headers['x-organization-id'];
      const orgId = rawOrgId && rawOrgId.length === 24 ? rawOrgId : null;
      const rawUserId = req.user?._id || req.user?.id;
      const userId = rawUserId && String(rawUserId).length === 24 ? rawUserId : null;

      const paymentService = (await import('../payment/payment.service.js')).default;
      const orderResult = await paymentService.createPaymentOrder({
        orgId,
        userId,
        referenceId: inquiryId || `REF-${Date.now()}`,
        referenceType: 'INQUIRY_PAYMENT',
        amount: parseFloat(amount) || 0,
        currency,
        gateway: 'RAZORPAY',
      });

      res.success({
        order: {
          id: orderResult.orderId,
          amount: Math.round((orderResult.amount || amount || 0) * 100),
          currency: orderResult.currency || 'INR',
          key: orderResult.key || process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey'
        },
        paymentId: orderResult.paymentId
      }, 'Payment order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async sendReminder(req, res, next) {
    try {
      const data = await platformPaymentService.sendPaymentReminderEmail(req.body);
      res.success(data, `Payment reminder email sent to ${data.recipientEmail}`);
    } catch (error) {
      next(error);
    }
  }

  async recordOffline(req, res, next) {
    try {
      const actorId = req.user?._id || req.user?.id || null;
      const data = await platformPaymentService.createOfflinePaymentTransaction({
        ...req.body,
        actorId,
      });

      const provisioning = await platformPaymentService.processCompleteProvisioningFlow({
        inquiryId: req.body.inquiryId || req.body.orderId || req.body.invoiceId,
        amount: req.body.amount,
        gateway: req.body.gateway || 'RAZORPAY',
        email: req.body.email,
        actorId,
      }).catch((err) => {
        console.error('[PaymentController] Provisioning flow error:', err.message);
        return null;
      });

      res.success({
        payment: data,
        provisioning,
      }, 'Payment recorded and workspace fully provisioned successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const eventId = req.body.eventId || req.headers['x-gateway-event-id'] || `EVT-${Date.now()}`;
      const result = await platformPaymentService.handleGatewayWebhook(eventId, req.body);
      const status = result.isDuplicate ? 200 : 201;
      res.success(result, result.message, status);
    } catch (error) {
      next(error);
    }
  }

  async reconcile(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user?._id || req.user?.id || null;
      const data = await platformPaymentService.reconcilePayment(id, actorId);
      res.success(data, 'Payment reconciled and outbox event published successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await platformPaymentService.getPayments(req.query);
      res.success(data, 'Payment transactions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllocations(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformPaymentService.getPaymentAllocations(id);
      res.success(data, 'Payment allocations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOutboxEvents(req, res, next) {
    try {
      const data = await platformPaymentService.getOutboxEvents();
      res.success(data, 'Outbox events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async replayOutboxEvent(req, res, next) {
    try {
      const { id } = req.params;
      const data = await platformPaymentService.replayOutboxEvent(id);
      res.success(data, 'Outbox event replayed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PlatformPaymentController();
