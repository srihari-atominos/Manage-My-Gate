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

      const referenceId = notes.referenceId || notes.invoiceId;
      const orgId = notes.orgId || notes.communityId;
      const userId = notes.userId || notes.targetUserId;

      if (!referenceId) {
        logger.info('Razorpay webhook received for non-invoice payment or general order', { orderId, razorpayPaymentId });
        return res.status(200).json({ success: true, message: 'Webhook received' });
      }

      // Start Mongoose Transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Fetch the Payment record via gatewayTransactionId
        const paymentRecord = await paymentRepository.findByGatewayTransactionId(orderId, session);
        if (!paymentRecord) {
          await session.abortTransaction();
          session.endSession();
          logger.warn(`Webhook payment record not found for transaction: ${orderId}`);
          return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        // Idempotency check: if paymentRecord is already success, return early
        if (paymentRecord.status === 'success') {
          await session.abortTransaction();
          session.endSession();
          logger.info(`Payment transaction ${orderId} already settled (success). Idempotent response returned.`);
          return res.status(200).json({ success: true, message: 'Webhook processed. Payment already settled.' });
        }

        if (paymentRecord.referenceType === 'Invoice') {
          const invoice = await Invoice.findById(paymentRecord.referenceId).session(session);
          if (!invoice) {
            await session.abortTransaction();
            session.endSession();
            logger.warn(`Webhook invoice not found: ${paymentRecord.referenceId}`);
            return res.status(404).json({ success: false, message: 'Invoice not found' });
          }

          // Optimistic Concurrency & Idempotency check: prevent double-crediting if duplicate webhook arrives
          if (invoice.status === 'PAID') {
            await session.abortTransaction();
            session.endSession();
            logger.info(`Invoice ${paymentRecord.referenceId} already settled (PAID). Idempotent response returned.`);
            return res.status(200).json({ success: true, message: 'Webhook processed. Invoice already settled.' });
          }

          // Transactional settlement of Invoice with OCC
          await invoiceService.settleInvoicePayment(
            paymentRecord.referenceId,
            {
              paymentMethod: 'RAZORPAY',
              paid_at: new Date(),
              settled_at: new Date(),
              offlineReference: razorpayPaymentId,
            },
            session
          );
        } else if (paymentRecord.referenceType === 'AmenityBooking') {
          const amenityBookingService = (await import('../../amenityBooking/amenityBooking.services.js')).default;
          await amenityBookingService.settleBookingPayment(
            paymentRecord.referenceId,
            payload,
            session
          );
        }

        // Shared logic: update the Payment record's status to 'success', call await payment.save({ session }), and commit the transaction.
        paymentRecord.status = 'success';
        paymentRecord.gatewayTransactionId = razorpayPaymentId || orderId;
        paymentRecord.paymentMethod = 'RAZORPAY';
        await paymentRecord.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Emit decoupled Node events
        paymentEventEmitter.emit(PAYMENT_SUCCESS, paymentRecord);

        return res.status(200).json({
          success: true,
          message: 'Razorpay webhook processed and payment settled successfully',
          data: { referenceId: paymentRecord.referenceId, paymentId: paymentRecord._id },
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
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity || {};
      const razorpayPaymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id || paymentEntity.id;
      const errorReason = paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed on Razorpay';

      logger.warn(`Processing payment.failed webhook event`, { orderId, razorpayPaymentId, errorReason });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Check legacy Payment record
        const paymentRecord = await paymentRepository.findByGatewayTransactionId(orderId, session);

        if (paymentRecord) {
          // Out-of-Order Protection: If payment already succeeded, ignore out-of-order failed event
          if (['success', 'SUCCESS'].includes(paymentRecord.status)) {
            await session.abortTransaction();
            session.endSession();
            logger.info(`Out-of-order webhook ignored: Payment ${orderId} is already marked SUCCESS.`);
            return res.status(200).json({ success: true, message: 'Out-of-order payment.failed event ignored.' });
          }

          paymentRecord.status = 'failed';
          paymentRecord.errorReason = errorReason;
          await paymentRecord.save({ session });

          await session.commitTransaction();
          session.endSession();

          paymentEventEmitter.emit(PAYMENT_FAILED, paymentRecord);
          return res.status(200).json({ success: true, message: 'Payment marked as failed successfully' });
        }

        // 2. Check PlatformPayment record
        const PlatformPayment = (await import('../../platformPayment/platformPayment.model.js')).default;
        const platformPaymentRecord = await PlatformPayment.findOne({
          $or: [{ gatewayTransactionId: razorpayPaymentId }, { gatewayTransactionId: orderId }],
        }).session(session);

        if (platformPaymentRecord) {
          // Out-of-Order Protection: If PlatformPayment is already SUCCESS, ignore out-of-order failed event
          if (platformPaymentRecord.status === 'SUCCESS') {
            await session.abortTransaction();
            session.endSession();
            logger.info(`Out-of-order webhook ignored: PlatformPayment ${orderId} is already SUCCESS.`);
            return res.status(200).json({ success: true, message: 'Out-of-order payment.failed event ignored.' });
          }

          // Strict Uppercase Enum: 'FAILED' for PlatformPayment schema
          platformPaymentRecord.status = 'FAILED';
          await platformPaymentRecord.save({ session });

          await session.commitTransaction();
          session.endSession();

          return res.status(200).json({ success: true, message: 'PlatformPayment marked as FAILED successfully' });
        }

        await session.abortTransaction();
        session.endSession();
        logger.info(`Payment record not found for failed order ${orderId}. Webhook acknowledged.`);
        return res.status(200).json({ success: true, message: 'Payment record not found, webhook acknowledged' });
      } catch (txnError) {
        await session.abortTransaction();
        session.endSession();
        throw txnError;
      }
    }

    return res.status(200).json({ success: true, message: `Webhook event ${event} acknowledged` });
  } catch (error) {
    logger.error('Error handling Razorpay webhook:', error);
    next(error);
  }
};
