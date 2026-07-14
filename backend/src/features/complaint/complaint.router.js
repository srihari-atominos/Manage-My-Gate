import express from 'express';
import complaintController from './complaint.controller.js';
import { 
  createComplaintValidator, 
  assignTechnicianValidator, 
  updateStatusValidator, 
  addCommentValidator 
} from './complaint.validators.js';
import { authorizePermission } from '../../middlewares/rbac.middleware.js';
import isAuthenticated from '../../middlewares/auth.middleware.js';
import tenantContext from '../../middlewares/tenant.middleware.js';
import { upload } from './middlewares/upload.middleware.js';

const router = express.Router();

router.use(isAuthenticated, tenantContext);

// Dashboard Analytics (Unified)
router.get(
  '/dashboard/analytics',
  authorizePermission('complaints', 'dashboard'),
  complaintController.getDashboardAnalytics
);

// Calendar Events
router.get(
  '/calendar/events',
  authorizePermission('complaints', 'calendar'),
  complaintController.getCalendarEvents
);

// Export
router.get(
  '/export',
  authorizePermission('complaints', 'view'),
  complaintController.exportComplaints
);

// Get all complaints with filters/pagination
router.get(
  '/',
  authorizePermission('complaints', ['view', 'create', 'complaint_management', 'track_requests', 'assignee']),
  complaintController.getAll
);

// Get complaint by ID
router.get(
  '/:id',
  authorizePermission('complaints', ['view', 'create', 'complaint_management', 'track_requests', 'assignee']),
  complaintController.getById
);

// Upload Attachments
router.post(
  '/upload',
  authorizePermission('complaints', ['create', 'raise_ticket', 'track_requests', 'complaint_management']),
  upload.array('attachments', 5),
  complaintController.uploadAttachments
);

// Create new complaint
router.post(
  '/',
  authorizePermission('complaints', ['create', 'raise_ticket']),
  createComplaintValidator,
  complaintController.create
);

// Assign technician
router.put(
  '/:id/assign',
  authorizePermission('complaints', 'assign'),
  assignTechnicianValidator,
  complaintController.assignTechnician
);

// Update status
router.put(
  '/:id/status',
  authorizePermission('complaints', 'update'),
  updateStatusValidator,
  complaintController.updateStatus
);

// Add Comment
router.post(
  '/:id/comments',
  authorizePermission('complaints', ['comments', 'create', 'track_requests']),
  addCommentValidator,
  complaintController.addComment
);

// Add Feedback
router.post(
  '/:id/feedback',
  authorizePermission('complaints', ['comments', 'create', 'track_requests']), // Resusing comments or custom feedback perm
  complaintController.addFeedback
);

// Delete Complaint
router.delete(
  '/:id',
  authorizePermission('complaints', 'delete'),
  complaintController.delete
);

// Assignee Workflow Routes
router.post(
  '/:id/accept',
  authorizePermission('complaints', ['view', 'assignee']), // Assuming assignees only need view permission at minimum
  complaintController.acceptAssignment
);
router.post(
  '/:id/reject',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.rejectAssignment
);
router.post(
  '/:id/start-work',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.startWork
);
router.post(
  '/:id/pause-work',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.pauseWork
);
router.post(
  '/:id/resume-work',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.resumeWork
);
router.post(
  '/:id/mark-completed',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.markWorkCompleted
);
router.post(
  '/:id/upload-work',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.uploadWorkAttachments
);
router.post(
  '/:id/work-notes',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.addWorkNotes
);
router.post(
  '/:id/confirm',
  authorizePermission('complaints', ['view', 'assignee']),
  complaintController.confirmCompletion
);

export default router;
