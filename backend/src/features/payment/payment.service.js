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
   * Rehydrates a previously-created Razorpay order for a safe checkout retry.
   * Reusing the pending order prevents a resident from being charged twice by
   * repeatedly opening checkout for the same reservation hold.
   */
  async getCheckoutDetails(payment) {
    if (!payment || payment.gateway !== 'razorpay' || payment.status !== 'pending') {
      throw new HttpError(400, 'This payment is not available for checkout.');
    }

    const credentials = await integrationHubService.getDecryptedCredentials(payment.orgId, 'razorpay');
    const razorpayKeyId = credentials?.keyId || credentials?.key_id;
    if (!razorpayKeyId) {
      throw new HttpError(400, 'Razorpay credentials configured for your community are invalid. Please contact your community admin.');
    }

    return {
      success: true,
      paymentId: payment._id,
      orderId: payment.gatewayTransactionId,
      amount: payment.amount,
      amountFormatted: formatINR(payment.amount),
      currency: payment.currency,
      status: payment.status,
      gateway: payment.gateway,
      razorpayKeyId,
    };
  }

  /**
   * Initiate a payment order using the configured provider strategy
   */
  async createPaymentOrder({ orgId, userId, referenceId, referenceType, amount, currency = 'INR', gateway = null }, session = null) {
    try {
      if (!orgId || !userId || !referenceId || !amount) {
        throw new HttpError(400, 'orgId, userId, referenceId, and amount are required.');
      }

      // Backend Amount & Eligibility Validation for Invoices
      if (referenceType === 'Invoice') {
        const Invoice = (await import('../invoice/invoice.model.js')).default;
        const invoice = await Invoice.findById(referenceId);
        if (!invoice) {
          throw new HttpError(404, 'Invoice not found.');
        }
        if (String(invoice.orgId) !== String(orgId)) {
          throw new HttpError(404, 'Invoice not found.');
        }
        if (invoice.status === 'PAID') {
          throw new HttpError(400, 'Invoice has already been fully paid.');
        }
        if (invoice.status === 'CANCELLED') {
          throw new HttpError(400, 'Invoice is cancelled and cannot accept payments.');
        }
        
        const remainingDue = Math.max(0, invoice.totalDue - (invoice.paidAmount || 0));
        if (amount > remainingDue + 0.01) {
          throw new HttpError(400, `Payment amount (₹${amount}) exceeds remaining invoice due of ₹${remainingDue}.`);
        }
      }

      let activeGateway = (gateway || 'razorpay').toLowerCase();

      let credentials = {};
      let isConfigured = false;
      try {
        isConfigured = await integrationHubService.isProviderConfigured(orgId, 'razorpay');
        if (isConfigured) {
          credentials = await integrationHubService.getDecryptedCredentials(orgId, 'razorpay');
        }
      } catch (error) {
        logger.warn('Failed to fetch credentials for razorpay from integrationHub', { error: error.message });
      }

      if (activeGateway === 'razorpay') {
        if (!isConfigured) {
          throw new HttpError(
            400,
            'Online payment gateway (Razorpay) has not been configured for your community by the administrator. Please contact your community admin or use an offline payment method.'
          );
        }

        const keyId = credentials?.keyId || credentials?.key_id;
        const keySecret = credentials?.keySecret || credentials?.key_secret;

        if (!keyId || !keySecret || keyId === 'test_key' || keyId === 'rzp_test_YOUR_KEY_ID_HERE') {
          throw new HttpError(
            400,
            'Razorpay credentials configured for your community are invalid. Please contact your community admin.'
          );
        }
      } else if (activeGateway === 'mock') {
        if (process.env.NODE_ENV !== 'test') {
          throw new HttpError(400, 'Mock payment gateway is disabled in this environment.');
        }
      }

      logger.info(`Initiating payment order via '${activeGateway}' strategy`, { orgId, userId, amount, currency });

      const provider = getPaymentProvider(activeGateway);
      
      const receipt = `rcpt_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
      let orderPayload;
      try {
        orderPayload = await provider.createOrder(
          { amount, currency, receipt, notes: { orgId, userId, referenceId, referenceType } },
          credentials
        );
      } catch (err) {
        logger.error(`Payment order creation failed for gateway '${activeGateway}': ${err.message}`);
        const statusCode = err.statusCode === 401 ? 400 : (err.statusCode || 500);
        throw new HttpError(statusCode, `Payment gateway error: ${err.message}`);
      }

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
        razorpayKeyId: activeGateway === 'mock' ? 'rzp_test_mockkey' : (credentials?.keyId || credentials?.key_id || process.env.RAZORPAY_KEY_ID),
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
      if (orgId && String(payment.orgId) !== String(orgId)) {
        throw new HttpError(404, 'Payment record not found.');
      }

      if (payment.status === 'success') {
        logger.info(`Payment transaction ${paymentId} already settled (success). Idempotent response returned.`);
        let settledInvoice = null;
        if (payment.referenceType === 'Invoice' && payment.referenceId) {
          try {
            const invoiceService = (await import('../invoice/invoice.services.js')).default;
            settledInvoice = await invoiceService.getInvoiceById(payment.referenceId);
          } catch (err) {}
        }
        return {
          success: true,
          message: 'Payment already verified by webhook',
          payment,
          invoice: settledInvoice,
        };
      }

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

        let settledInvoice = null;
        if (payment.referenceType === 'Invoice' && payment.referenceId) {
          try {
            const invoiceService = (await import('../invoice/invoice.services.js')).default;
            settledInvoice = await invoiceService.getInvoiceById(payment.referenceId);
          } catch (err) {
            logger.warn('Could not fetch settled invoice in verifyPaymentSignature:', err.message);
          }
        }

        return {
          success: true,
          message: 'Payment verified successfully',
          payment,
          invoice: settledInvoice,
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
  async assertPaymentAccess(paymentId, { orgId, userId, isAdmin = false } = {}) {
    const payment = await Payment.findById(paymentId);
    if (!payment || (orgId && String(payment.orgId) !== String(orgId))) {
      throw new HttpError(404, 'Payment record not found.');
    }
    if (!isAdmin && userId && String(payment.userId) !== String(userId)) {
      throw new HttpError(403, 'Forbidden. This payment belongs to another user.');
    }
    return payment;
  }

  async processRefund(paymentId, amount = null, notes = {}, context = {}) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new HttpError(404, 'Payment record not found.');
      if (context.orgId && String(payment.orgId) !== String(context.orgId)) {
        throw new HttpError(404, 'Payment record not found.');
      }

      if (payment.status !== 'success') {
        throw new HttpError(400, 'Only successful payments can be refunded.');
      }

      const activeGateway = payment.gateway || 'mock';
      const refundAmount = amount === null || amount === undefined ? payment.amount : Number(amount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        throw new HttpError(400, 'Refund amount must be a positive number.');
      }

      const previousRefunds = await Payment.find({
        parentPaymentId: payment._id,
        type: 'Refund',
        status: 'success',
        isDeleted: false,
      }).select('amount').lean();
      const alreadyRefunded = previousRefunds.reduce((sum, refund) => sum + Math.abs(Number(refund.amount) || 0), 0);
      const refundableAmount = Math.max(0, Number(payment.amount) - alreadyRefunded);
      if (refundAmount > refundableAmount + 0.01) {
        throw new HttpError(400, `Refund amount exceeds the remaining refundable amount of ₹${refundableAmount}.`);
      }
      
      let gatewayRefund = { id: `refund_mock_${Date.now()}` };
      
      if (
        process.env.NODE_ENV !== 'production'
        && (activeGateway === 'mock' || payment.gatewayTransactionId?.startsWith('pay_mock_'))
      ) {
        logger.info('Bypassing gateway refund for mock payment in non-production environment');
      } else {
        const credentials = await integrationHubService.getDecryptedCredentials(payment.orgId, activeGateway);
        const provider = getPaymentProvider(activeGateway);
        // Providers implement the common `refund` contract. Calling a
        // non-existent `initiateRefund` meant real Razorpay refunds failed
        // before any money could be sent back to the payer.
        gatewayRefund = await provider.refund(
          {
            paymentId: payment.gatewayTransactionId,
            amount: refundAmount,
            notes,
          },
          credentials
        );
      }

      // 1. Mark original payment status as partially refunded or fully refunded (Optional but good practice)
      // Here we just leave it as success, and create a negative offset Refund record

      // 2. Create Refund ledger record
      const refundRecord = await Payment.create({
        orgId: payment.orgId,
        userId: payment.userId,
        referenceId: payment.referenceId,
        referenceType: payment.referenceType,
        amount: -Math.abs(refundAmount), // Negative amount for refund
        type: 'Refund',
        parentPaymentId: payment._id,
        status: 'success',
        gateway: activeGateway,
        gatewayTransactionId: gatewayRefund.refundId || gatewayRefund.id,
        paymentMethod: payment.paymentMethod,
        currency: payment.currency,
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
            performedBy: context.actorId || null
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

  /**
   * Check if payment gateway is actively configured for an organization
   */
  async isGatewayConfigured(orgId, gateway = 'razorpay') {
    const configuredProvider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
    if (configuredProvider === 'mock') {
      return { isConfigured: true, provider: 'mock', isMock: true };
    }

    try {
      let credentials = {};
      const platformOrgId = process.env.PLATFORM_ORG_ID;
      if (platformOrgId) {
        credentials = await integrationHubService.getDecryptedCredentials(platformOrgId, gateway);
      } else {
        const globalConn = await integrationHubService.getGlobalConnectionByProvider(gateway);
        if (globalConn) {
          credentials = await integrationHubService.getDecryptedCredentialsById(globalConn._id);
        } else if (orgId) {
          credentials = await integrationHubService.getDecryptedCredentials(orgId, gateway);
        }
      }

      const keyId = credentials?.keyId || credentials?.key_id || process.env.RAZORPAY_KEY_ID;
      const keySecret = credentials?.keySecret || credentials?.key_secret || process.env.RAZORPAY_KEY_SECRET;
      const isRealKey = !!(keyId && keySecret && (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_')));

      return {
        isConfigured: isRealKey,
        provider: gateway,
        isMock: false,
        keyId: isRealKey ? keyId : null
      };
    } catch (err) {
      logger.warn('Failed to check gateway configuration status', { error: err.message });
      return { isConfigured: false, provider: gateway, isMock: false };
    }
  }
}

export default new PaymentService();
