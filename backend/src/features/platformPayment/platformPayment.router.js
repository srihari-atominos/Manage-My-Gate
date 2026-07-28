import { Router } from 'express';
import platformPaymentController from './platformPayment.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  processPaymentRules,
  queryPaymentRules,
  getByIdPaymentRules,
  refundPaymentRules,
} from './platformPayment.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /platform-payments/process:
 *   post:
 *     summary: Process a platform payment or payment webhook
 *     tags: [PlatformPayments]
 */
router.post(
  '/process',
  isAuthenticated,
  validate(processPaymentRules),
  platformPaymentController.process
);

/**
 * @swagger
 * /platform-payments:
 *   get:
 *     summary: Retrieve paginated platform payments
 *     tags: [PlatformPayments]
 */
router.get(
  '/',
  isAuthenticated,
  validate(queryPaymentRules),
  platformPaymentController.getAll
);

/**
 * @swagger
 * /platform-payments/order/{orderId}:
 *   get:
 *     summary: Retrieve platform payments by Order ID
 *     tags: [PlatformPayments]
 */
router.get(
  '/order/:orderId',
  isAuthenticated,
  platformPaymentController.getByOrderId
);

/**
 * @swagger
 * /platform-payments/invoice/{invoiceId}:
 *   get:
 *     summary: Retrieve platform payments by Invoice ID
 *     tags: [PlatformPayments]
 */
router.get(
  '/invoice/:invoiceId',
  isAuthenticated,
  platformPaymentController.getByInvoiceId
);

/**
 * @swagger
 * /platform-payments/{id}:
 *   get:
 *     summary: Retrieve a single platform payment by ID
 *     tags: [PlatformPayments]
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(getByIdPaymentRules),
  platformPaymentController.getById
);

/**
 * @swagger
 * /platform-payments/{id}/refund:
 *   post:
 *     summary: Refund a platform payment
 *     tags: [PlatformPayments]
 */
router.post(
  '/:id/refund',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN'),
  validate(refundPaymentRules),
  platformPaymentController.refund
);

export default router;
