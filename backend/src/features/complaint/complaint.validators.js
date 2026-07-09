import { body } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';

export const createComplaintValidator = validate([
  body('category').notEmpty().withMessage('Category is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority'),
  body('location').optional().isObject(),
  body('attachments').optional().isArray().custom((value) => {
    if (value && value.length > 5) {
      throw new Error('Maximum of 5 attachments allowed');
    }
    return true;
  })
]);

export const assignTechnicianValidator = validate([
  body('technicianId').optional().isString(),
  body('technicianIds').optional().isArray(),
  body('assignmentType').optional().isString(),
  body('technicianName').optional().isString(),
  body('vendor').optional().isString(),
  body('team').optional().isString(),
  body('instructions').optional().isString(),
  body('preferredVisitDate').optional(),
  body('preferredVisitTime').optional(),
  body('reassignmentReason').optional().isString()
]);

export const updateStatusValidator = validate([
  body('status').notEmpty().withMessage('Status is required')
    .isIn([
      'Submitted', 'Open', 'Waiting For Assignment', 'Waiting For Acceptance', 'Assigned', 'Accepted', 'In Progress', 
      'Work Completed', 'Waiting For Resident Confirmation', 
      'Completed', 'Closed', 'Rejected', 'Cancelled', 'Reopened', 'Escalated'
    ]).withMessage('Invalid status'),
  body('remarks').optional().isString(),
  body('attachments').optional().isArray()
]);

export const addCommentValidator = validate([
  body('remarks').notEmpty().withMessage('Remarks/Comment text is required'),
  body('attachments').optional().isArray()
]);
