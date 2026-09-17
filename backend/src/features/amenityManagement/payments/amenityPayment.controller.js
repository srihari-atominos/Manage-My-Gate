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

      // Gateway HMAC SHA256 signature verification when secret is configured
      if (secret) {
        if (!signature) {
          logger.warn('[AmenityPaymentController] Missing webhook signature header');
          return res.status(400).json({ success: false, message: 'Missing webhook signature' });
        }

        const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

        let isValid = false;
        try {
          if (typeof signature === 'string' && signature.length === expectedSignature.length) {
            isValid = crypto.timingSafeEqual(
              Buffer.from(signature, 'utf8'),
              Buffer.from(expectedSignature, 'utf8')
            );
          }
        } catch {
          isValid = false;
        }

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
