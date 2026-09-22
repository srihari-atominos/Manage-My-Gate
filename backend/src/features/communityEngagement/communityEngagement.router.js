import { Router } from 'express';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import communityEngagementController from './communityEngagement.controller.js';
import { validateEngagementContent } from './communityEngagement.validate.js';
import {
  noticeUpload,
  noticeImageSignatureValidator,
} from '../noticeBoard/middlewares/noticeBoard.upload.js';

const router = Router();

// Enforce authentication and tenant isolation across all gateway routes
router.use(isAuthenticated);
router.use(tenantContext);

const CONTENT_MANAGE_PERMISSIONS = [
  'manage_notices',
  'create',
  'manage_polls',
  'polls:create',
  'notices:create',
  'manage_content',
  'content:create',
];

/**
 * @swagger
 * /community-engagement/content:
 *   post:
 *     summary: Unified creation gateway for Community Engagement content (NOTICE or POLL)
 *     tags: [CommunityEngagement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [NOTICE, POLL]
 *     responses:
 *       201:
 *         description: Content created successfully
 *       400:
 *         description: Validation error or invalid contentType
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/content',
  authorizePermission(['notices', 'polls', 'community_engagement'], CONTENT_MANAGE_PERMISSIONS),
  noticeUpload.array('images', 5),
  noticeImageSignatureValidator,
  validateEngagementContent,
  communityEngagementController.createContent
);

/**
 * @swagger
 * /community-engagement/preview:
 *   post:
 *     summary: Side-effect-free preview generator for Community Engagement content (NOTICE or POLL)
 *     tags: [CommunityEngagement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [NOTICE, POLL]
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       400:
 *         description: Validation error or invalid contentType
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/preview',
  authorizePermission(['notices', 'polls', 'community_engagement'], CONTENT_MANAGE_PERMISSIONS),
  noticeUpload.array('images', 5),
  noticeImageSignatureValidator,
  validateEngagementContent,
  communityEngagementController.previewContent
);

export default router;
