import paymentService from './payment.service.js';
import HttpError from '../../utils/httpError.utils.js';

class PaymentController {
  async simulateCallback(req, res, next) {
    try {
      const { paymentId, isSuccess, errorReason } = req.body;
      if (!paymentId) throw new HttpError(400, 'paymentId is required');

      const payment = await paymentService.simulatePaymentCallback(paymentId, isSuccess, errorReason);
      
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
