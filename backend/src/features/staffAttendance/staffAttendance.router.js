import { Router } from 'express';
import staffAttendanceController from './staffAttendance.controller.js';
import {
  validateGateScan,
  validateHistoryQuery,
  validateSessionId,
  validateManualCheckout,
  validateExportQuery,
} from './staffAttendance.validators.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { authorizeAnyPermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// All staff attendance routes require authentication and tenant context
router.use(isAuthenticated, tenantContext);

// Gate check-in / check-out scan: authorized for Security Guards and Staff Managers
router.post(
  '/scan',
  authorizeAnyPermission(['staff:attendance', 'visitor:guard', 'staff:manage']),
  validateGateScan,
  staffAttendanceController.scan
);

// Verify a scanned staff pass and report current gate status WITHOUT recording anything
router.post(
  '/lookup',
  authorizeAnyPermission(['staff:attendance', 'visitor:guard', 'staff:manage']),
  validateGateScan,
  staffAttendanceController.lookup
);

// Real-time active open sessions at the gates
router.get(
  '/active',
  authorizeAnyPermission(['staff:attendance', 'visitor:guard', 'staff:manage', 'staff:view']),
  staffAttendanceController.getActive
);

// Resident view: which staff allocated to my units are inside the community right now
router.get(
  '/my-units/active',
  authorizeAnyPermission(['staff:assign_unit', 'staff:manage']),
  staffAttendanceController.getActiveForMyUnits
);

// Staff self-service: retrieve own attendance history
router.get(
  '/me',
  authorizeAnyPermission(['staff:view_own', 'staff:manage', 'staff:view']),
  validateHistoryQuery,
  staffAttendanceController.getMyAttendance
);

// Community attendance history: authorized for Staff Managers, Viewers, and Attendance Monitors
router.get(
  '/',
  authorizeAnyPermission(['staff:attendance', 'staff:manage', 'staff:view']),
  validateHistoryQuery,
  staffAttendanceController.getHistory
);

// Friendly CSV / Excel download of the attendance report (same permissions as viewing history)
router.get(
  '/export',
  authorizeAnyPermission(['staff:attendance', 'staff:manage', 'staff:view']),
  validateExportQuery,
  staffAttendanceController.exportAttendance
);

// Community attendance summary statistics: authorized for Staff Managers, Viewers, and Attendance Monitors
router.get(
  '/stats',
  authorizeAnyPermission(['staff:attendance', 'staff:manage', 'staff:view']),
  validateHistoryQuery,
  staffAttendanceController.getStats
);

// Manual administrative checkout for stuck/open sessions
router.post(
  '/:id/checkout',
  authorizeAnyPermission(['staff:manage', 'visitor:guard', 'staff:attendance']),
  validateManualCheckout,
  staffAttendanceController.manualCheckout
);

// View specific session details
router.get(
  '/:id',
  authorizeAnyPermission(['staff:attendance', 'staff:manage']),
  validateSessionId,
  staffAttendanceController.getById
);

export default router;
