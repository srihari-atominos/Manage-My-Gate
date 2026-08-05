import { Router } from 'express';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validator.middleware.js';
import userPreferenceController from './userPreference.controller.js';
import { updateQuickActionsRules } from './userPreference.validator.js';

const router = Router();

// Protect all preferences routes
router.use(isAuthenticated);

/**
 * @swagger
 * /users/preferences:
 *   get:
 *     summary: Get user preferences and available feature catalog
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 */
router.get('/', userPreferenceController.getUserPreferences);

/**
 * @swagger
 * /users/preferences/quick-actions:
 *   patch:
 *     summary: Update active quick action feature IDs (max 7)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activeQuickActions
 *             properties:
 *               activeQuickActions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["billing_dues", "invite_guest", "helpdesk", "notice_board"]
 *     responses:
 *       200:
 *         description: Quick actions updated successfully
 *       400:
 *         description: Validation error
 */
router.patch('/quick-actions', validate(updateQuickActionsRules), userPreferenceController.updateQuickActions);

export default router;
