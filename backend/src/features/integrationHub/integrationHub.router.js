import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import integrationHubController from './integrationHub.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  connectRules,
  deleteConnectionRules,
  updateLabelRules,
  testConnectionRules,
  listRules,
} from './integrationHub.validator.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Every endpoint needs a signed-in member of the community...
router.use(isAuthenticated);
router.use(tenantContext);

// ...and a specific permission. Integration credentials (payment keys, mail accounts) are the most sensitive
// data a community holds: being a member is never enough. Community and platform admins pass by role.
const canRead = authorizeAnyPermission(['integrations:read', 'roles:create', 'roles:update']);
const canCreate = authorizeAnyPermission(['integrations:create']);
const canUpdate = authorizeAnyPermission(['integrations:update']);
const canDelete = authorizeAnyPermission(['integrations:delete']);

// Connecting/testing contacts external services, so it is limited per signed-in user.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // IPv6 clients are grouped by network prefix so one person cannot dodge the limit with many addresses.
  keyGenerator: (req) => String(req.user?.id || req.user?._id || ipKeyGenerator(req.ip)),
  message: { success: false, message: 'Too many connection attempts. Please wait a few minutes and try again.' },
});

/**
 * @swagger
 * /integrations/catalog:
 *   get:
 *     summary: Integrations the caller may configure (fields, description, category)
 *     tags: [Integration Hub]
 */
router.get('/catalog', canRead, integrationHubController.getCatalog);

/**
 * @swagger
 * /integrations/connect:
 *   post:
 *     summary: Verify, encrypt, and save integration connection credentials
 *     tags: [Integration Hub]
 */
router.post('/connect', canCreate, verifyLimiter, validate(connectRules), integrationHubController.connectIntegration);

/**
 * @swagger
 * /integrations:
 *   get:
 *     summary: List the community's integrations (paginated, never returns secrets)
 *     tags: [Integration Hub]
 */
router.get('/', canRead, validate(listRules), integrationHubController.getIntegrations);

/**
 * @swagger
 * /integrations/{id}/test:
 *   post:
 *     summary: Re-verify the stored credentials with the provider
 *     tags: [Integration Hub]
 */
router.post('/:id/test', canUpdate, verifyLimiter, validate(testConnectionRules), integrationHubController.testConnection);

/**
 * @swagger
 * /integrations/{id}:
 *   put:
 *     summary: Rename a connection and/or rotate its credentials (blank fields keep the stored value)
 *     tags: [Integration Hub]
 */
router.put('/:id', canUpdate, verifyLimiter, validate(updateLabelRules), integrationHubController.updateConnection);

/**
 * @swagger
 * /integrations/{id}:
 *   delete:
 *     summary: Disconnect and delete an integration connection
 *     tags: [Integration Hub]
 */
router.delete('/:id', canDelete, validate(deleteConnectionRules), integrationHubController.disconnectIntegration);

export default router;
