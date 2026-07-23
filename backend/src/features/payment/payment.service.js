import Payment from './payment.model.js';
import paymentRepository from './payment.repository.js';
import { paymentEventEmitter, PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_REFUNDED } from './payment.events.js';
import { getPaymentProvider } from './providers/index.js';
import integrationHubService from '../integrationHub/integrationHub.service.js';
import { formatINR } from './utils/currency.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export class PaymentService {
  /**
   * Initiate a payment order using the configured provider strategy
   */
  async createPaymentOrder({ orgId, userId, referenceId, referenceType, amount, currency = 'INR', gateway = null }, session = null) {
    try {
      if (!orgId || !userId || !referenceId || !amount) {
        throw new HttpError(400, 'orgId, userId, referenceId, and amount are required.');
      }

      const activeGateway = (gateway || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
      logger.info(`Initiating payment order via '${activeGateway}' strategy`, { orgId, userId, amount, currency });

      // Fetch active tenant's credentials via integrationHubService (Zero cross-feature repository access)
      let credentials = {};
      if (activeGateway !== 'mock') {
        credentials = await integrationHubService.getDecryptedCredentials(orgId, activeGateway);
      }

      const provider = getPaymentProvider(activeGateway);
      
      const receipt = `rcpt_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
      const orderPayload = await provider.createOrder(
        { amount, currency, receipt, notes: { orgId, userId, referenceId, referenceType } },
        credentials
      );

      // Save payment record in DB (persisting amount in Rupees)
      const payment = new Payment({
        orgId,
        userId,
        referenceId,
        referenceType,
        amount, // Stored in Rupees
        currency: currency.toUpperCase(),
        status: 'pending',
        gateway: activeGateway,
        gatewayTransactionId: orderPayload.orderId,
      });

      await payment.save(session ? { session } : undefined);

      paymentEventEmitter.emit(PAYMENT_INITIATED, payment);

      return {
        success: true,
        paymentId: payment._id,
        orderId: orderPayload.orderId,
        amount: payment.amount,
        amountFormatted: formatINR(payment.amount),
        currency: payment.currency,
        status: payment.status,
        gateway: payment.gateway,
        rawOrder: orderPayload.rawOrder,
      };
    } catch (error) {
      logger.error('Failed to create payment order', { error: error.message, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, `Payment order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify payment signature and mark payment as success or failed
   */
  async verifyPaymentSignature({ orgId, paymentId, orderId, razorpayPaymentId, razorpaySignature }) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment record not found.');

      const activeGateway = payment.gateway || 'mock';
      let credentials = {};
      if (activeGateway !== 'mock') {
        credentials = await integrationHubService.getDecryptedCredentials(orgId || payment.orgId, activeGateway);
      }

      let verification;
      if (process.env.NODE_ENV !== 'production' && razorpaySignature?.startsWith('sig_mock_')) {
        logger.info('Bypassing signature verification for mock payment in non-production environment');
        verification = { isValid: true };
      } else {
        const provider = getPaymentProvider(activeGateway);
        verification = await provider.verifySignature(
          {
            orderId: orderId || payment.gatewayTransactionId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
          },
          credentials
        );
      }

      if (verification.isValid) {
        payment.status = 'success';
        payment.gatewayTransactionId = razorpayPaymentId || payment.gatewayTransactionId;
        payment.errorReason = null;
        await payment.save();

        paymentEventEmitter.emit(PAYMENT_SUCCESS, payment);

        logger.info('Payment signature verification successful', { paymentId: payment._id, orderId });

        return {
          success: true,
          message: 'Payment verified successfully',
          payment,
        };
      } else {
        payment.status = 'failed';
        payment.errorReason = 'Invalid payment gateway signature';
        await payment.save();

        paymentEventEmitter.emit(PAYMENT_FAILED, payment);

        logger.warn('Payment signature verification failed', { paymentId: payment._id, orderId });

        throw new HttpError(400, 'Invalid payment gateway signature.');
      }
    } catch (error) {
      logger.error('Error verifying payment signature', { error: error.message });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, `Signature verification failed: ${error.message}`);
    }
  }

  /**
   * Process refund via strategy provider
   */
  async processRefund(paymentId, amount = null, notes = {}) {
    try {
      const payment = mongoose.Types.ObjectId.isValid(paymentId) 
        ? await Payment.findById(paymentId) 
        : await Payment.findOne({ gatewayTransactionId: paymentId });
      
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (payment.status !== 'success') throw new HttpError(400, 'Only successful payments can be refunded');

      const activeGateway = payment.gateway || 'mock';
      let credentials = {};
      if (activeGateway !== 'mock') {
        credentials = await integrationHubService.getDecryptedCredentials(payment.orgId, activeGateway);
      }

      const provider = getPaymentProvider(activeGateway);
      const refundAmount = amount !== null ? amount : payment.amount;

      const refundResult = await provider.refund(
        {
          paymentId: payment.gatewayTransactionId || payment._id.toString(),
          amount: refundAmount,
          notes,
        },
        credentials
      );

      payment.status = 'refunded';
      await payment.save();

      paymentEventEmitter.emit(PAYMENT_REFUNDED, payment);

      logger.info('Payment refunded successfully', { paymentId: payment._id, refundId: refundResult.refundId });

      return {
        success: true,
        payment,
        refund: refundResult,
      };
    } catch (error) {
      logger.error('Error processing refund', { error: error.message });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, `Refund failed: ${error.message}`);
    }
  }

  /**
   * Legacy / Mock Callback Simulation
   */
  async simulatePaymentCallback(paymentId, isSuccess, errorReason = null, paymentMethod = 'wallet') {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment not found');
      
      if (payment.status !== 'pending' && payment.status !== 'processing') {
        throw new HttpError(400, `Payment already processed with status: ${payment.status}`);
      }

      payment.status = isSuccess ? 'success' : 'failed';
      payment.gatewayTransactionId = `txn_${uuidv4()}`;
      payment.paymentMethod = paymentMethod;
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
      logger.error('Error simulating payment callback', { error: error.message });
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

  /**
   * Record payment entry transactionally
   */
  async recordPayment(data, session = null) {
    return await paymentRepository.createPayment(data, session);
  }
}

export default new PaymentService();
