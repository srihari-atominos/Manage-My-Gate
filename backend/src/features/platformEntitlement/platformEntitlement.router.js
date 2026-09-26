import { Router } from 'express';
import platformEntitlementController from './platformEntitlement.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(isAuthenticated, tenantContext({ requirePlatformContext: true }));

router.get('/', platformEntitlementController.getEntitlements);
router.get('/organization/:organizationId', platformEntitlementController.getCurrent);

export default router;
