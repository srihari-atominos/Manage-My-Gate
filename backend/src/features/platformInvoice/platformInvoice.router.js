import { Router } from 'express';
import platformInvoiceController from './platformInvoice.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  generateInvoiceFromOrderRules,
  updateInvoiceStatusRules,
  queryInvoiceRules,
  getByIdInvoiceRules,
  updateInvoiceRules,
} from './platformInvoice.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /platform-invoices/from-order:
 *   post:
 *     summary: Generate a platform invoice from an order
 *     tags: [PlatformInvoices]
 */
router.post(
  '/from-order',
  isAuthenticated,
  validate(generateInvoiceFromOrderRules),
  platformInvoiceController.generateFromOrder
);

/**
 * @swagger
 * /platform-invoices:
 *   get:
 *     summary: Retrieve paginated platform invoices
 *     tags: [PlatformInvoices]
 */
router.get(
  '/',
  isAuthenticated,
  validate(queryInvoiceRules),
  platformInvoiceController.getAll
);

/**
 * @swagger
 * /platform-invoices/number/{invoiceNumber}:
 *   get:
 *     summary: Retrieve platform invoice by invoice number
 *     tags: [PlatformInvoices]
 */
router.get(
  '/number/:invoiceNumber',
  isAuthenticated,
  platformInvoiceController.getByNumber
);

/**
 * @swagger
 * /platform-invoices/{id}:
 *   get:
 *     summary: Retrieve a single platform invoice by ID
 *     tags: [PlatformInvoices]
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(getByIdInvoiceRules),
  platformInvoiceController.getById
);

/**
 * @swagger
 * /platform-invoices/{id}/status:
 *   patch:
 *     summary: Update platform invoice status
 *     tags: [PlatformInvoices]
 */
router.patch(
  '/:id/status',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateInvoiceStatusRules),
  platformInvoiceController.updateStatus
);

/**
 * @swagger
 * /platform-invoices/{id}:
 *   put:
 *     summary: Update platform invoice details
 *     tags: [PlatformInvoices]
 */
router.put(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateInvoiceRules),
  platformInvoiceController.update
);

/**
 * @swagger
 * /platform-invoices/{id}:
 *   delete:
 *     summary: Delete a platform invoice
 *     tags: [PlatformInvoices]
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN'),
  validate(getByIdInvoiceRules),
  platformInvoiceController.delete
);

export default router;
