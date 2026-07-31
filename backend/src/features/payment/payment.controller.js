import paymentService from './payment.service.js';
import HttpError from '../../utils/httpError.utils.js';

class PaymentController {
  /**
   * Create Payment Order
   */
  async createOrder(req, res, next) {
    try {
      const { referenceId, referenceType, amount, currency, gateway } = req.body;
      const orgId = req.user?.orgId || req.body.orgId || req.headers['x-organization-id'];
      const userId = req.user?.id || req.user?._id || req.body.userId;

      if (!orgId || !userId) {
        throw new HttpError(400, 'Organization ID and User ID are required.');
      }

      const orderResult = await paymentService.createPaymentOrder({
        orgId,
        userId,
        referenceId,
        referenceType,
        amount,
        currency,
        gateway,
      });

      res.status(201).json({
        success: true,
        message: 'Payment order created successfully',
        data: orderResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Payment Signature
   */
  async verifySignature(req, res, next) {
    try {
      const { paymentId, orderId, razorpayPaymentId, razorpaySignature } = req.body;
      const orgId = req.user?.orgId || req.body.orgId || req.headers['x-organization-id'];

      const verificationResult = await paymentService.verifyPaymentSignature({
        orgId,
        paymentId,
        orderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      res.status(200).json({
        success: true,
        message: verificationResult.message,
        data: verificationResult.payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process Refund
   */
  async refund(req, res, next) {
    try {
      const { paymentId, amount, notes } = req.body;
      if (!paymentId) {
        throw new HttpError(400, 'paymentId is required for refund.');
      }

      const refundResult = await paymentService.processRefund(paymentId, amount, notes);

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: refundResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Simulate Payment Callback (Development / Testing)
   */
  async simulateCallback(req, res, next) {
    try {
      const { paymentId, isSuccess, errorReason, paymentMethod } = req.body;
      if (!paymentId) throw new HttpError(400, 'paymentId is required');

      const payment = await paymentService.simulatePaymentCallback(paymentId, isSuccess, errorReason, paymentMethod);
      
      res.status(200).json({
        success: true,
        message: 'Payment simulation processed',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
