import Payment from './payment.model.js';
import paymentRepository from './payment.repository.js';
import { paymentEventEmitter, PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_REFUNDED } from './payment.events.js';
import { getPaymentProvider } from './providers/index.js';
import integrationHubService from '../integrationHub/integrationHub.service.js';
import { formatINR } from './utils/currency.utils.js';
import Razorpay from 'razorpay';
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

      let activeGateway = (gateway || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
      
      if (process.env.PAYMENT_PROVIDER === 'mock') {
        activeGateway = 'mock';
      }

      logger.info(`Initiating payment order via '${activeGateway}' strategy`, { orgId, userId, amount, currency });

      // Fetch active tenant's credentials via integrationHubService (Zero cross-feature repository access)
      let credentials = {};
      if (activeGateway !== 'mock') {
        try {
          credentials = await integrationHubService.getDecryptedCredentials(orgId, activeGateway);
        } catch (error) {
          logger.warn(`Failed to fetch credentials for ${activeGateway}`, { error: error.message });
        }

        // Fallback to mock if no credentials exist and we're not in production
        if (!credentials?.keyId && !credentials?.key_id && !process.env.RAZORPAY_KEY_ID && process.env.NODE_ENV !== 'production') {
          activeGateway = 'mock';
          logger.info(`Fallback to 'mock' strategy due to missing Razorpay credentials`);
        }
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
        razorpayKeyId: credentials?.keyId || credentials?.key_id || process.env.RAZORPAY_KEY_ID,
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
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment record not found.');

      if (payment.status !== 'success') {
        throw new HttpError(400, 'Only successful payments can be refunded.');
      }

      const activeGateway = payment.gateway || 'mock';
      const refundAmount = amount || payment.amount; // Allow partial refunds
      
      let gatewayRefund = { id: `refund_mock_${Date.now()}` };
      
      if (process.env.NODE_ENV !== 'production' && activeGateway === 'mock') {
        logger.info('Bypassing gateway refund for mock payment in non-production environment');
      } else {
        const credentials = await integrationHubService.getDecryptedCredentials(payment.orgId, activeGateway);
        const provider = getPaymentProvider(activeGateway);
        gatewayRefund = await provider.initiateRefund(payment.gatewayTransactionId, refundAmount, notes, credentials);
      }

      // 1. Mark original payment status as partially refunded or fully refunded (Optional but good practice)
      // Here we just leave it as success, and create a negative offset Refund record

      // 2. Create Refund ledger record
      const refundRecord = await Payment.create({
        referenceId: payment.referenceId,
        referenceType: payment.referenceType,
        amount: -Math.abs(refundAmount), // Negative amount for refund
        type: 'Refund',
        parentPaymentId: payment._id,
        status: 'success',
        gatewayTransactionId: gatewayRefund.id,
        paymentMethod: payment.paymentMethod
      });

      paymentEventEmitter.emit(PAYMENT_REFUNDED, refundRecord);

      logger.info('Refund processed successfully', { paymentId: payment._id, refundId: refundRecord._id });

      // 3. Trigger recalculation of the parent Invoice
      if (payment.referenceType === 'Invoice') {
        const Invoice = (await import('../invoice/invoice.model.js')).default;
        const invoice = await Invoice.findById(payment.referenceId);
        if (invoice) {
          // Re-sum all successful payments and refunds
          const allLedgers = await Payment.find({
            referenceId: invoice._id,
            status: 'success',
            isDeleted: false
          });
          const sumPaid = allLedgers.reduce((sum, p) => sum + p.amount, 0);
          
          invoice.paidAmount = sumPaid;
          invoice.auditHistory.push({
            action: 'PAYMENT_REFUNDED',
            details: `Refund of ₹${refundAmount} processed. New Paid Amount: ₹${sumPaid}`,
            date: new Date(),
            performedBy: null
          });
          
          await invoice.save(); // Pre-save hook adjusts outstandingAmount and status
        }
      }

      return {
        success: true,
        message: 'Refund initiated successfully',
        refund: refundRecord
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

  /**
   * Generate Razorpay Payment Link
   */
  async createPaymentLink(invoice, user) {
    try {
      const activeGateway = 'razorpay';
      let credentials = {};
      try {
        credentials = await integrationHubService.getDecryptedCredentials(invoice.orgId, activeGateway);
      } catch (err) {
        logger.warn('Failed to get credentials from integrationHub, falling back to ENV', { error: err.message });
      }

      const key_id = credentials.key_id || process.env.RAZORPAY_KEY_ID;
      const key_secret = credentials.key_secret || process.env.RAZORPAY_KEY_SECRET;

      if (!key_id || !key_secret) {
        logger.warn('Razorpay credentials not found, returning mock payment link for testing');
        return `https://rzp.io/mock_link/${invoice._id}`;
      }

      const instance = new Razorpay({ key_id, key_secret });

      const payload = {
        amount: Math.round(invoice.totalDue * 100), // paise
        currency: 'INR',
        reference_id: invoice._id.toString(),
        description: `Payment for Invoice ${invoice.invoiceNumber || invoice._id}`,
        customer: {
          name: user.name || user.username || 'Resident',
          contact: user.phone || '',
          email: user.email || ''
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false
      };

      const linkResponse = await instance.paymentLink.create(payload);
      return linkResponse.short_url;
    } catch (error) {
      logger.error('Failed to create Razorpay payment link', { error: error.message });
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Returning mock payment link due to Razorpay API error in DEV mode.');
        return `https://rzp.io/mock_link/${invoice._id}`;
      }
      return null;
    }
  }
}

export default new PaymentService();
