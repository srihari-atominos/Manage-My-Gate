import amenityReservationService from '../reservations/amenityReservation.service.js';
import crypto from 'crypto';
import logger from '../../../utils/logger.utils.js';

export class AmenityPaymentController {
  /**
   * Processes payment webhook notification.
   */
  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      // Optional gateway HMAC SHA256 signature verification if secret configured and signature provided
      if (signature && secret && process.env.NODE_ENV !== 'test') {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

        if (!isValid) {
          logger.warn('[AmenityPaymentController] Webhook signature verification failed');
          return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }
      }

      const { orgId, holdId, reservationId, paymentReference, status, paymentAmount } = req.body;

      const result = await amenityReservationService.handlePaymentWebhook({
        orgId,
        holdId,
        reservationId,
        paymentReference,
        status,
        paymentAmount,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment webhook processed successfully',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityPaymentController = new AmenityPaymentController();
export default amenityPaymentController;
