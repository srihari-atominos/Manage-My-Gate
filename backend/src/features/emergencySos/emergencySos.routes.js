import { Router } from 'express';
import emergencySosController from './emergencySos.controller.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  triggerSosRules,
  cancelSosRules,
  acknowledgeSosRules,
  resolveSosRules,
  listSosRules,
} from './emergencySos.validator.js';

const router = Router();

// All emergency routes require authentication and tenant context
router.use(isAuthenticated, tenantContext);

// Resident operations
router.post('/', validate(triggerSosRules), emergencySosController.triggerSos);
router.get('/active', emergencySosController.getActiveSos);
router.patch('/:id/cancel', validate(cancelSosRules), emergencySosController.cancelSos);

// Guardhouse / Security staff / Admin operations
router.get('/', validate(listSosRules), emergencySosController.listAlerts);
router.patch('/:id/acknowledge', validate(acknowledgeSosRules), emergencySosController.acknowledgeSos);
router.patch('/:id/resolve', validate(resolveSosRules), emergencySosController.resolveSos);

export default router;
