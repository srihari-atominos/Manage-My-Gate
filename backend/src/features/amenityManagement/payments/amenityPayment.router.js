import { Router } from 'express';
import amenityPaymentController from './amenityPayment.controller.js';
import {
  paymentWebhookRules,
  createAmenityPaymentOrderRules,
  verifyAmenityPaymentRules,
} from './amenityPayment.validateRules.js';
import validate from '../../../middlewares/validator.middleware.js';
import isAuthenticated from '../../../middlewares/auth.middleware.js';
import tenantContext from '../../../middlewares/tenant.middleware.js';
import authorizePermission from '../../../middlewares/rbac.middleware.js';

const router = Router();

// POST /webhook - Payment webhook endpoint
router.post(
  '/webhook',
  validate(paymentWebhookRules),
  amenityPaymentController.handleWebhook
);

// Browser and mobile checkout routes are tenant-scoped. The public webhook
// remains above this middleware because Razorpay does not carry app auth.
router.use(isAuthenticated, tenantContext);

router.post(
  '/orders',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(createAmenityPaymentOrderRules),
  amenityPaymentController.createOrder
);

router.post(
  '/verify',
  authorizePermission('amenities', ['amenities', 'discover', 'my_booking']),
  validate(verifyAmenityPaymentRules),
  amenityPaymentController.verifyPayment
);

export default router;
