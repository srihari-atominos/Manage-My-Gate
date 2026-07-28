import mongoose from 'mongoose';
import platformPaymentRepository from './platformPayment.repository.js';
import platformPaymentEvents from './platformPayment.events.js';
import platformInvoiceService from '../platformInvoice/platformInvoice.service.js';
import platformOrderService from '../platformOrder/platformOrder.service.js';
import IdempotencyError from './utils/idempotencyError.js';
import HttpError from '../../utils/httpError.utils.js';

class PlatformPaymentService {
  /**
   * Process a payment (or incoming webhook event) safely within a transaction.
   * Handles idempotency gracefully if the event/transaction was already processed.
   * Updates Invoice and Order status upon successful payment.
   * 
   * @param {Object} paymentData - { gatewayTransactionId, gatewayEventId, orderId, invoiceId, amount, currency, status, paymentMethod, rawGatewayPayload }
   */
  async processPayment(paymentData) {
    const {
      gatewayTransactionId,
      gatewayEventId,
      orderId,
      invoiceId,
      amount,
      currency = 'INR',
      status,
      paymentMethod = 'UNKNOWN',
      rawGatewayPayload = {},
    } = paymentData;

    if (!gatewayTransactionId || !gatewayEventId) {
      throw new HttpError(400, 'Gateway Transaction ID and Gateway Event ID are required.');
    }

    if (!orderId || !invoiceId) {
      throw new HttpError(400, 'Order ID and Invoice ID are required to process a payment.');
    }

    // Verify existence of Invoice and Order via Service layer (cross-feature calls)
    const invoice = await platformInvoiceService.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new HttpError(404, `Platform invoice with ID '${invoiceId}' not found.`);
    }

    const order = await platformOrderService.getOrderById(orderId);
    if (!order) {
      throw new HttpError(404, `Platform order with ID '${orderId}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let createdPayment;
      try {
        createdPayment = await platformPaymentRepository.createPayment(
          {
            gatewayTransactionId,
            gatewayEventId,
            orderId,
            invoiceId,
            amount: Number(amount),
            currency,
            status,
            paymentMethod,
            rawGatewayPayload,
          },
          session
        );
      } catch (error) {
        if (error instanceof IdempotencyError || error.isIdempotencyError) {
          // Transaction aborted on idempotency duplicate key
          await session.abortTransaction();

          // Fetch pre-existing record to return cleanly to webhook handler
          const existingPayment = await platformPaymentRepository.findByGatewayEventAndTransaction(
            gatewayEventId,
            gatewayTransactionId
          );

          platformPaymentEvents.emit('payment.processed', {
            payment: existingPayment || { gatewayEventId, gatewayTransactionId, status },
            isDuplicate: true,
          });

          return {
            alreadyProcessed: true,
            message: 'Webhook payment event was already processed (idempotent duplicate call).',
            payment: existingPayment,
          };
        }
        throw error;
      }

      // If status is SUCCESS, update Invoice to PAID and Order to PAID inside the same transaction
      if (status === 'SUCCESS') {
        await platformInvoiceService.updateInvoiceStatus(invoiceId, 'PAID', session);
        await platformOrderService.updateOrderStatus(orderId, 'PAID', session);
      }

      await session.commitTransaction();

      if (status === 'SUCCESS') {
        platformPaymentEvents.emit('payment.processed', { payment: createdPayment, isDuplicate: false });
      } else {
        platformPaymentEvents.emit('payment.failed', createdPayment);
      }

      return {
        alreadyProcessed: false,
        message: `Payment processed with status '${status}'.`,
        payment: createdPayment,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve paginated platform payments.
   * @param {Object} queryParams
   */
  async getAllPayments(queryParams) {
    return await platformPaymentRepository.findAllPaginated(queryParams);
  }

  /**
   * Get payment by ID.
   * @param {string} id
   */
  async getPaymentById(id) {
    const payment = await platformPaymentRepository.findById(id);
    if (!payment) {
      throw new HttpError(404, `Platform payment with ID '${id}' not found.`);
    }
    return payment;
  }

  /**
   * Get payments by Order ID.
   * @param {string} orderId
   */
  async getPaymentsByOrderId(orderId) {
    return await platformPaymentRepository.findByOrderId(orderId);
  }

  /**
   * Get payments by Invoice ID.
   * @param {string} invoiceId
   */
  async getPaymentsByInvoiceId(invoiceId) {
    return await platformPaymentRepository.findByInvoiceId(invoiceId);
  }

  /**
   * Refund a payment safely within a transaction.
   * @param {string} paymentId
   * @param {string} [reason='Customer Refund']
   */
  async refundPayment(paymentId, reason = 'Customer Refund') {
    const payment = await platformPaymentRepository.findById(paymentId);
    if (!payment) {
      throw new HttpError(404, `Platform payment with ID '${paymentId}' not found.`);
    }

    if (payment.status !== 'SUCCESS') {
      throw new HttpError(400, `Only SUCCESS payments can be refunded. Current status: ${payment.status}`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const refundedPayment = await platformPaymentRepository.updateStatus(
        paymentId,
        'REFUNDED',
        session
      );

      await session.commitTransaction();

      platformPaymentEvents.emit('payment.refunded', refundedPayment);

      return {
        message: `Payment ID '${paymentId}' refunded successfully. Reason: ${reason}`,
        payment: refundedPayment,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PlatformPaymentService();
