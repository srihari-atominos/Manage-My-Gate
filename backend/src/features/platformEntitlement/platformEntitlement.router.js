import { Router } from 'express';
import platformEntitlementController from './platformEntitlement.controller.js';

const router = Router();

router.get('/', platformEntitlementController.getEntitlements);
router.get('/organization/:organizationId', platformEntitlementController.getCurrent);

export default router;
