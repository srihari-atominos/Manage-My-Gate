import { Router } from 'express';
import platformQuoteController from './platformQuote.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createQuoteRules,
  rejectQuoteRules,
  queryQuoteRules,
  getByIdQuoteRules,
  updateQuoteRules,
} from './platformQuote.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import authorizeRoles from '../../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @swagger
 * /platform-quotes:
 *   post:
 *     summary: Create a new platform quote with automated discount approval threshold evaluation
 *     tags: [PlatformQuotes]
 */
router.post(
  '/',
  isAuthenticated,
  validate(createQuoteRules),
  platformQuoteController.create
);

/**
 * @swagger
 * /platform-quotes:
 *   get:
 *     summary: Retrieve paginated platform quotes
 *     tags: [PlatformQuotes]
 */
router.get(
  '/',
  isAuthenticated,
  validate(queryQuoteRules),
  platformQuoteController.getAll
);

/**
 * @swagger
 * /platform-quotes/number/{quoteNumber}:
 *   get:
 *     summary: Retrieve platform quote by quote number
 *     tags: [PlatformQuotes]
 */
router.get(
  '/number/:quoteNumber',
  isAuthenticated,
  platformQuoteController.getByNumber
);

/**
 * @swagger
 * /platform-quotes/{id}:
 *   get:
 *     summary: Retrieve a single platform quote by ID
 *     tags: [PlatformQuotes]
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(getByIdQuoteRules),
  platformQuoteController.getById
);

/**
 * @swagger
 * /platform-quotes/{id}/approve:
 *   post:
 *     summary: Manager approval for a platform quote exceeding discount threshold
 *     tags: [PlatformQuotes]
 */
router.post(
  '/:id/approve',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  validate(getByIdQuoteRules),
  platformQuoteController.approve
);

/**
 * @swagger
 * /platform-quotes/{id}/reject:
 *   post:
 *     summary: Manager rejection for a platform quote
 *     tags: [PlatformQuotes]
 */
router.post(
  '/:id/reject',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  validate(rejectQuoteRules),
  platformQuoteController.reject
);

/**
 * @swagger
 * /platform-quotes/{id}:
 *   put:
 *     summary: Update platform quote details
 *     tags: [PlatformQuotes]
 */
router.put(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateQuoteRules),
  platformQuoteController.update
);

/**
 * @swagger
 * /platform-quotes/{id}:
 *   delete:
 *     summary: Delete a platform quote
 *     tags: [PlatformQuotes]
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorizeRoles('SUPER_ADMIN'),
  validate(getByIdQuoteRules),
  platformQuoteController.delete
);

export default router;
