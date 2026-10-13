import { Router } from 'express';
import staffUnitAssociationController from './staffUnitAssociation.controller.js';
import {
  validateAssociationCreate,
  validateAssociationDelete,
} from './staffUnitAssociation.validators.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// All staff association endpoints require authentication and active community context
router.use(isAuthenticated, tenantContext);

// Resident & Admin: Discover units caller is authorized to manage
router.get(
  '/my-units',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.getMyUnits
);

// Resident & Admin: Discover eligible active staff in the community
router.get(
  '/eligible-staff',
  authorizeAnyPermission(['staff:assign_unit', 'staff:view', 'staff:manage']),
  staffUnitAssociationController.getEligibleStaff
);

// Resident & Admin: List associations scoped to caller's authorized units (or all for admin)
router.get(
  '/',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.getAssociations
);

// Resident & Admin: Associate an eligible staff member with an authorized unit
router.post(
  '/',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  validateAssociationCreate,
  staffUnitAssociationController.create
);

// Staff self-service: Discover allocated units and pending household requests
router.get(
  '/my-allocations',
  authorizeAnyPermission(['staff:view_own', 'staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.getMyAllocations
);

// Resident & Admin: Check schedule conflict across units before assigning
router.post(
  '/check-conflict',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.checkConflict
);

// Staff & Admin: Accept an allocation request
router.post(
  '/:id/accept',
  authorizeAnyPermission(['staff:view_own', 'staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.accept
);

// Staff & Admin: Reject an allocation request
router.post(
  '/:id/reject',
  authorizeAnyPermission(['staff:view_own', 'staff:assign_unit', 'staff:manage']),
  staffUnitAssociationController.reject
);

// Resident & Admin: Remove (soft-deactivate) an association for an authorized unit
router.delete(
  '/:id',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  validateAssociationDelete,
  staffUnitAssociationController.delete
);

export default router;
