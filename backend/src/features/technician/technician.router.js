import { Router } from 'express';
import technicianController from './technician.controller.js';
import { validateTechnicianCreate, validateTechnicianUpdate } from './technician.validators.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// All technician routes require authentication and tenant context
router.use(isAuthenticated, tenantContext);

// Residents or others might need to see list of techs for some reason, but typically only Admin manages them
router.get('/analytics/workload', authorizePermission('complaints', 'view'), technicianController.getAnalytics);
router.get('/', technicianController.getAll);
router.get('/:id', technicianController.getById);

// Only admins or managers should manage technicians
router.post(
  '/', 
  authorizePermission('complaints', 'settings'), 
  validateTechnicianCreate, 
  technicianController.create
);

router.put(
  '/:id', 
  authorizePermission('complaints', 'settings'), 
  validateTechnicianUpdate, 
  technicianController.update
);

router.delete(
  '/:id', 
  authorizePermission('complaints', 'settings'), 
  technicianController.delete
);

export default router;
