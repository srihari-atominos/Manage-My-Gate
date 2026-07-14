import { Router } from 'express'
import noticeController from './noticeBoard.controller.js'
import { validate } from '../../middlewares/validator.middleware.js'
import {
  createNoticeRules,
  updateNoticeRules,
  noticeParamRules,
  pinNoticeRules,
} from './noticeBoard.validator.js'
import isAuthenticated from '../../middlewares/auth.middleware.js'
import { authorizePermission } from '../../middlewares/rbac.middleware.js'
import tenantContext from '../../middlewares/tenant.middleware.js'
import {
  noticeUpload,
  noticeImageSignatureValidator,
} from './middlewares/noticeBoard.upload.js'

const router = Router()

// Protect all notice routes with authentication
router.use(isAuthenticated)

/**
 * @swagger
 * /notices:
 *   post:
 *     summary: Create a new notice
 */
router.post(
  '/',
  tenantContext,
  authorizePermission('notices', 'create'),
  noticeUpload.array('images', 5),
  noticeImageSignatureValidator,
  validate(createNoticeRules),
  noticeController.create,
)

/**
 * @swagger
 * /notices:
 *   get:
 *     summary: Get all notices with filters, search, and pagination
 */
router.get(
  '/',
  tenantContext,
  authorizePermission('notices', 'read'),
  noticeController.getAll,
)

/**
 * @swagger
 * /notices/stats:
 *   get:
 *     summary: Get notice statistics and dashboard overview
 */
router.get(
  '/stats',
  tenantContext,
  authorizePermission('notices', 'read'),
  noticeController.getStats,
)

/**
 * @swagger
 * /notices/{id}:
 *   get:
 *     summary: Get a notice by ID
 */
router.get(
  '/:id',
  tenantContext,
  authorizePermission('notices', 'read'),
  validate(noticeParamRules),
  noticeController.getById,
)

/**
 * @swagger
 * /notices/{id}:
 *   put:
 *     summary: Update an existing notice
 */
router.put(
  '/:id',
  tenantContext,
  authorizePermission('notices', 'update'),
  noticeUpload.array('images', 5),
  noticeImageSignatureValidator,
  validate(updateNoticeRules),
  noticeController.update,
)

/**
 * @swagger
 * /notices/{id}:
 *   delete:
 *     summary: Delete a notice
 */
router.delete(
  '/:id',
  tenantContext,
  authorizePermission('notices', 'delete'),
  validate(noticeParamRules),
  noticeController.delete,
)

/**
 * @swagger
 * /notices/{id}/pin:
 *   patch:
 *     summary: Pin or unpin a notice
 */
router.patch(
  '/:id/pin',
  tenantContext,
  authorizePermission('notices', 'update'),
  validate(pinNoticeRules),
  noticeController.togglePin,
)

/**
 * @swagger
 * /notices/{id}/read:
 *   patch:
 *     summary: Mark notice as read
 */
router.patch(
  '/:id/read',
  tenantContext,
  authorizePermission('notices', 'read'),
  validate(noticeParamRules),
  noticeController.markAsRead,
)

/**
 * @swagger
 * /notices/{id}/bookmark:
 *   patch:
 *     summary: Bookmark notice
 */
router.patch(
  '/:id/bookmark',
  tenantContext,
  authorizePermission('notices', 'read'),
  validate(noticeParamRules),
  noticeController.bookmark,
)

export default router
