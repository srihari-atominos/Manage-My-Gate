import { Router } from 'express';
import integrationHubController from './integrationHub.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { connectRules, deleteConnectionRules, updateLabelRules, listRules } from './integrationHub.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all integration hub endpoints with authentication middleware
router.use(isAuthenticated);

/**
 * @swagger
 * /integrations/catalog:
 *   get:
 *     summary: Retrieve dynamic schema catalog of supported integrations
 *     tags:
 *       - Integration Hub
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dynamic form schema JSON array.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get('/catalog', integrationHubController.getCatalog);

/**
 * @swagger
 * /integrations/connect:
 *   post:
 *     summary: Verify, encrypt, and save integration connection credentials
 *     tags:
 *       - Integration Hub
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - accountLabel
 *               - credentials
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [openai, twilio, resend]
 *               accountLabel:
 *                 type: string
 *               credentials:
 *                 type: object
 *     responses:
 *       200:
 *         description: Connection established and credentials saved.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.post('/connect', validate(connectRules), integrationHubController.connectIntegration);

/**
 * @swagger
 * /integrations:
 *   get:
 *     summary: List all connected integrations for the authenticated user (paginated)
 *     tags:
 *       - Integration Hub
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated response payload.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get('/', validate(listRules), integrationHubController.getIntegrations);

/**
 * @swagger
 * /integrations/{id}:
 *   put:
 *     summary: Update account label of a connection
 *     tags:
 *       - Integration Hub
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountLabel
 *             properties:
 *               accountLabel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Label updated successfully.
 *       400:
 *         description: Invalid input or format.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Connection not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/:id', validate(updateLabelRules), integrationHubController.updateConnection);

/**
 * @swagger
 * /integrations/{id}:
 *   delete:
 *     summary: Disconnect and delete integration connection by ID
 *     tags:
 *       - Integration Hub
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection deleted.
 *       400:
 *         description: Invalid ID format.
 *       401:
 *         description: Unauthorized.
 *       409:
 *         description: Conflict. Connection is mapped to a role.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:id', validate(deleteConnectionRules), integrationHubController.disconnectIntegration);

export default router;
