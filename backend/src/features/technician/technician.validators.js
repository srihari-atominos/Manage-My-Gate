import { body } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';

export const validateTechnicianCreate = validate([
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').optional().isEmail().withMessage('Invalid email format').trim(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('department').notEmpty().withMessage('Department is required').isIn(['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others']).withMessage('Invalid department'),
  body('type').notEmpty().withMessage('Type is required').isIn(['In-House Staff', 'External Vendor']).withMessage('Invalid type'),
]);

export const validateTechnicianUpdate = validate([
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('email').optional().isEmail().withMessage('Invalid email format').trim(),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('department').optional().isIn(['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others']).withMessage('Invalid department'),
  body('type').optional().isIn(['In-House Staff', 'External Vendor']).withMessage('Invalid type'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
]);
