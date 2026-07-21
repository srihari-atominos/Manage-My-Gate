import crypto from 'crypto';
import mongoose from 'mongoose';
import paymentRepository from '../payment.repository.js';
import { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_FAILED } from '../payment.events.js';
import invoiceService from '../../invoice/invoice.services.js';
import Invoice from '../../invoice/invoice.model.js';
import logger from '../../../utils/logger.utils.js';

/**
 * Validates Razorpay HMAC SHA256 webhook signature.
 * @param {Buffer|string} rawBody - Raw HTTP body payload
 * @param {string} signature - x-razorpay-signature header value
 * @param {string} secret - Webhook secret key
 * @returns {boolean}
 */
export const verifyRazorpaySignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    logger.error('Error in verifyRazorpaySignature:', err);
    return false;
  }
};

/**
 * Process Razorpay webhook events with Mongoose Transactions and OCC.
 */
export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'default_webhook_secret_key';

    // 1. Signature Verification
    if (signature && process.env.NODE_ENV !== 'test') {
      const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        logger.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    // Parse payload
    let eventPayload;
    if (Buffer.isBuffer(rawBody)) {
      eventPayload = JSON.parse(rawBody.toString('utf8'));
    } else if (typeof rawBody === 'string') {
      eventPayload = JSON.parse(rawBody);
    } else {
      eventPayload = rawBody;
    }

    const { event, payload } = eventPayload;
    logger.info(`Processing Razorpay webhook event: ${event}`);

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || payload?.order?.entity || {};
      const razorpayPaymentId = paymentEntity.id || payload?.payment?.entity?.id;
      const orderId = paymentEntity.order_id || paymentEntity.id;
      const amountPaise = paymentEntity.amount || 0;
      const amountRupees = amountPaise / 100;
      const notes = paymentEntity.notes || {};

      const invoiceId = notes.invoiceId || notes.referenceId;
      const orgId = notes.orgId || notes.communityId;
      const userId = notes.userId || notes.targetUserId;

      if (!invoiceId) {
        logger.info('Razorpay webhook received for non-invoice payment or general order', { orderId, razorpayPaymentId });
        return res.status(200).json({ success: true, message: 'Webhook received' });
      }

      // Start Mongoose Transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Fetch invoice inside session for OCC check
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice) {
          await session.abortTransaction();
          session.endSession();
          logger.warn(`Webhook invoice not found: ${invoiceId}`);
          return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Optimistic Concurrency & Idempotency check: prevent double-crediting if duplicate webhook arrives
        if (invoice.status === 'PAID') {
          await session.abortTransaction();
          session.endSession();
          logger.info(`Invoice ${invoiceId} already settled (PAID). Idempotent response returned.`);
          return res.status(200).json({ success: true, message: 'Webhook processed. Invoice already settled.' });
        }

        const targetOrgId = orgId || invoice.communityId;
        const targetUserId = userId || invoice.targetUserId;

        // Transactional settlement of Invoice with OCC
        const updatedInvoice = await invoiceService.settleInvoicePayment(
          invoiceId,
          {
            paymentMethod: 'RAZORPAY',
            paid_at: new Date(),
            settled_at: new Date(),
            offlineReference: razorpayPaymentId,
          },
          session
        );

        // Transactional creation of Payment record
        let paymentRecord = await paymentRepository.findByGatewayTransactionId(orderId, session);
        if (paymentRecord) {
          paymentRecord.status = 'success';
          paymentRecord.gatewayTransactionId = razorpayPaymentId || orderId;
          paymentRecord.paymentMethod = 'RAZORPAY';
          await paymentRecord.save({ session });
        } else {
          paymentRecord = await paymentRepository.createPayment(
            {
              orgId: targetOrgId,
              userId: targetUserId,
              referenceId: invoice._id,
              referenceType: 'Invoice',
              amount: amountRupees || invoice.totalDue,
              currency: paymentEntity.currency || 'INR',
              status: 'success',
              gateway: 'razorpay',
              paymentMethod: 'RAZORPAY',
              gatewayTransactionId: razorpayPaymentId || orderId,
            },
            session
          );
        }

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Emit decoupled Node events
        paymentEventEmitter.emit(PAYMENT_SUCCESS, paymentRecord);

        return res.status(200).json({
          success: true,
          message: 'Razorpay webhook processed and invoice settled successfully',
          data: { invoiceId, paymentId: paymentRecord._id },
        });
      } catch (txnError) {
        await session.abortTransaction();
        session.endSession();

        // Check for Mongoose OCC VersionError
        if (txnError.name === 'VersionError' || txnError.code === 11000) {
          logger.warn(`OCC Version conflict during webhook settlement for invoice ${invoiceId}. Handled idempotently.`);
          return res.status(200).json({ success: true, message: 'Concurrent settlement detected. Idempotent response.' });
        }

        logger.error('Transaction error in Razorpay webhook settlement:', txnError);
        throw txnError;
      }
    }

    return res.status(200).json({ success: true, message: `Webhook event ${event} acknowledged` });
  } catch (error) {
    logger.error('Error handling Razorpay webhook:', error);
    next(error);
  }
};
