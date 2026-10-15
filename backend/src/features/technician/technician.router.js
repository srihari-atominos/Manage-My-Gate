import { Router } from 'express';
import technicianController from './technician.controller.js';
import { validateTechnicianCreate, validateTechnicianUpdate } from './technician.validators.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizePermission, authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';
import staffPhotoUpload from './technician.photoUpload.middleware.js';

const router = Router();

// Signed-link photo image: must stay BEFORE the auth middleware so a plain <Image> can load it.
// Access is the unguessable HMAC signature bound to the staff id and current photo version.
router.get('/:id/photo', technicianController.servePhoto);

// All other technician routes require authentication and tenant context
router.use(isAuthenticated, tenantContext);

// Read staff / technicians workload analytics: requires staff management or complaint analytics permissions
router.get(
  '/analytics/workload',
  authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:dashboard']),
  technicianController.getAnalytics
);

// Authenticated staff self-service: retrieve own verified staff profile
router.get(
  '/me',
  authorizeAnyPermission(['staff:view_own', 'staff:view', 'staff:manage']),
  technicianController.getMe
);

// Authenticated staff self-service: retrieve own secure QR pass
router.get(
  '/me/qr',
  authorizeAnyPermission(['staff:view_own', 'staff:manage']),
  technicianController.getMyQr
);

// Read community-wide staff registry: requires staff:view, staff:manage, or complaint management/staff assignment permissions
router.get(
  '/',
  authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:assign', 'complaints:settings']),
  technicianController.getAll
);

// Staff photo upload / removal
router.post(
  '/me/photo',
  authorizeAnyPermission(['staff:view_own']),
  staffPhotoUpload,
  technicianController.uploadMyPhoto
);

// Used by the invite flow: the photo is attached right after the staff user is created
router.post(
  '/by-user/:userId/photo',
  authorizeAnyPermission(['staff:manage', 'users:create']),
  staffPhotoUpload,
  technicianController.uploadPhotoForUser
);

router.post(
  '/:id/photo',
  authorizeAnyPermission(['staff:manage']),
  staffPhotoUpload,
  technicianController.uploadPhoto
);

router.delete(
  '/:id/photo',
  authorizeAnyPermission(['staff:manage']),
  technicianController.deletePhoto
);

// Read specific technician QR pass: requires staff:manage
router.get(
  '/:id/qr',
  authorizeAnyPermission(['staff:manage']),
  technicianController.getStaffQr
);

// Revoke all issued passes for a staff member and issue a fresh one: requires staff:manage
router.post(
  '/:id/qr/rotate',
  authorizeAnyPermission(['staff:manage']),
  technicianController.rotateStaffQr
);

// Read specific technician by ID: requires staff:view, staff:manage, or complaint assignment permissions
router.get(
  '/:id',
  authorizeAnyPermission(['staff:view', 'staff:manage', 'complaints:staff', 'complaints:assign', 'complaints:settings']),
  technicianController.getById
);

// Manage staff / technicians: requires staff:manage, complaints:settings, or admin
router.post(
  '/',
  authorizeAnyPermission(['staff:manage', 'complaints:settings']),
  validateTechnicianCreate,
  technicianController.create
);

router.put(
  '/:id',
  authorizeAnyPermission(['staff:manage', 'complaints:settings']),
  validateTechnicianUpdate,
  technicianController.update
);

router.delete(
  '/:id',
  authorizeAnyPermission(['staff:manage', 'complaints:settings']),
  technicianController.delete
);

export default router;
