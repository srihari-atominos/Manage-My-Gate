import { Router } from 'express';
import platformOrderController from './platformOrder.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createOrderFromQuoteRules,
  updateOrderStatusRules,
  queryOrderRules,
  getByIdOrderRules,
  updateOrderRules,
} from './platformOrder.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /platform-orders/from-quote:
 *   post:
 *     summary: Create a platform order from an approved quote
 *     tags: [PlatformOrders]
 */
router.post(
  '/from-quote',
  isAuthenticated,
  validate(createOrderFromQuoteRules),
  platformOrderController.createFromQuote
);

/**
 * @swagger
 * /platform-orders:
 *   get:
 *     summary: Retrieve paginated platform orders
 *     tags: [PlatformOrders]
 */
router.get(
  '/',
  isAuthenticated,
  validate(queryOrderRules),
  platformOrderController.getAll
);

/**
 * @swagger
 * /platform-orders/number/{orderNumber}:
 *   get:
 *     summary: Retrieve platform order by order number
 *     tags: [PlatformOrders]
 */
router.get(
  '/number/:orderNumber',
  isAuthenticated,
  platformOrderController.getByNumber
);

/**
 * @swagger
 * /platform-orders/{id}:
 *   get:
 *     summary: Retrieve a single platform order by ID
 *     tags: [PlatformOrders]
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(getByIdOrderRules),
  platformOrderController.getById
);

/**
 * @swagger
 * /platform-orders/{id}/status:
 *   patch:
 *     summary: Update platform order status
 *     tags: [PlatformOrders]
 */
router.patch(
  '/:id/status',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateOrderStatusRules),
  platformOrderController.updateStatus
);

/**
 * @swagger
 * /platform-orders/{id}:
 *   put:
 *     summary: Update platform order details
 *     tags: [PlatformOrders]
 */
router.put(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateOrderRules),
  platformOrderController.update
);

/**
 * @swagger
 * /platform-orders/{id}:
 *   delete:
 *     summary: Delete a platform order
 *     tags: [PlatformOrders]
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN'),
  validate(getByIdOrderRules),
  platformOrderController.delete
);

export default router;
