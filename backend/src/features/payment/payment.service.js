import Payment from './payment.model.js';
import paymentRepository from './payment.repository.js';
import { paymentEventEmitter, PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_REFUNDED } from './payment.events.js';
import HttpError from '../../utils/httpError.utils.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.utils.js';

class MockPaymentProvider {
  /**
   * Initializes a payment intent
   */
  async initiatePayment({ orgId, userId, referenceId, referenceType, amount, currency = 'USD' }) {
    try {
      const payment = new Payment({
        orgId,
        userId,
        referenceId,
        referenceType,
        amount,
        currency,
        status: 'pending',
        gateway: 'mock'
      });

      await payment.save();

      paymentEventEmitter.emit(PAYMENT_INITIATED, payment);

      return {
        success: true,
        paymentId: payment._id,
        clientSecret: `mock_secret_${uuidv4()}`,
        status: 'pending'
      };
    } catch (error) {
      logger.error('Failed to initiate mock payment', error);
      throw new HttpError(500, 'Failed to initialize payment');
    }
  }

  /**
   * Simulates a webhook or a direct call to process the payment
   * Typically, the frontend calls this to simulate "Payment Success" or "Payment Failed"
   */
  async simulatePaymentCallback(paymentId, isSuccess, errorReason = null) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment not found');
      
      if (payment.status !== 'pending' && payment.status !== 'processing') {
        throw new HttpError(400, `Payment already processed with status: ${payment.status}`);
      }

      payment.status = isSuccess ? 'success' : 'failed';
      payment.gatewayTransactionId = `txn_${uuidv4()}`;
      if (!isSuccess) {
        payment.errorReason = errorReason || 'Payment declined by mock bank';
      }

      await payment.save();

      if (isSuccess) {
        paymentEventEmitter.emit(PAYMENT_SUCCESS, payment);
      } else {
        paymentEventEmitter.emit(PAYMENT_FAILED, payment);
      }

      return payment;
    } catch (error) {
      logger.error('Error simulating payment callback', error);
      throw error;
    }
  }

  /**
   * Process a refund
   */
  async processRefund(paymentId, amount = null) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (payment.status !== 'success') throw new HttpError(400, 'Only successful payments can be refunded');

      // Simulating refund delay
      payment.status = 'refunded';
      await payment.save();

      paymentEventEmitter.emit(PAYMENT_REFUNDED, payment);

      return payment;
    } catch (error) {
      logger.error('Error processing refund', error);
      throw error;
    }
  }

  /**
   * Dashboard aggregation methods
   */
  async getPaymentStats(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await paymentRepository.getPaymentStats(orgId);
  }

  async getRevenueTrend(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await paymentRepository.getRevenueTrend(orgId);
  }

  async getRecentActivity(orgId, limit = 10) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await paymentRepository.getRecentActivity(orgId, limit);
  }
}

export default new MockPaymentProvider();
