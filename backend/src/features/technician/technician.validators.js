import { body } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';
import { STAFF_CATEGORY_VALUES } from './staffCategory.utils.js';

export const validateTechnicianCreate = validate([
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').notEmpty().withMessage('Email is required').bail().isEmail().withMessage('Invalid email format').trim(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('department').notEmpty().withMessage('Department is required').isIn(['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others']).withMessage('Invalid department'),
  body('type').optional().isIn(['In-House Staff', 'External Vendor', 'Community Staff']).withMessage('Invalid type'),
  body('roleId').notEmpty().withMessage('A staff role is required').isMongoId().withMessage('Invalid role ID'),
  body('staffCategory').optional().isIn(STAFF_CATEGORY_VALUES).withMessage(`staffCategory must be one of: ${STAFF_CATEGORY_VALUES.join(', ')}`),
  body('communityOnly').optional().isBoolean().withMessage('communityOnly must be a boolean'),
  body('designation').optional().isString().trim(),
  body('staffCode').optional().isString().trim(),
  body('departmentOther').optional().isString().isLength({ max: 60 }).withMessage('Custom department must be at most 60 characters'),
  body('qrValidFrom').optional({ nullable: true }).isISO8601().withMessage('qrValidFrom must be an ISO date'),
  body('qrValidUntil').optional({ nullable: true }).isISO8601().withMessage('qrValidUntil must be an ISO date'),
  body('shiftWindow.startTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('shiftWindow.startTime must be HH:mm'),
  body('shiftWindow.endTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('shiftWindow.endTime must be HH:mm'),
  body('shiftWindow.daysOfWeek').optional().isArray().withMessage('shiftWindow.daysOfWeek must be an array'),
  body('shiftWindow.daysOfWeek.*').optional().isInt({ min: 0, max: 6 }).withMessage('daysOfWeek entries must be 0-6'),
]);


export const validateTechnicianUpdate = validate([
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('email').optional().isEmail().withMessage('Invalid email format').trim(),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('department').optional().isIn(['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Carpentry', 'Others']).withMessage('Invalid department'),
  body('type').optional().isIn(['In-House Staff', 'External Vendor', 'Community Staff']).withMessage('Invalid type'),
  body('roleId').optional().isMongoId().withMessage('Invalid role ID'),
  body('status').optional().isIn(['Active', 'Inactive', 'Pending']).withMessage('Invalid status'),
  body('staffCategory').optional().isIn(STAFF_CATEGORY_VALUES).withMessage(`staffCategory must be one of: ${STAFF_CATEGORY_VALUES.join(', ')}`),
  body('communityOnly').optional().isBoolean().withMessage('communityOnly must be a boolean'),
  body('departmentOther').optional().isString().isLength({ max: 60 }).withMessage('Custom department must be at most 60 characters'),
  body('designation').optional().isString().trim(),
  body('staffCode').optional().isString().trim(),
  body('qrValidFrom').optional({ nullable: true }).isISO8601().withMessage('qrValidFrom must be an ISO date'),
  body('qrValidUntil').optional({ nullable: true }).isISO8601().withMessage('qrValidUntil must be an ISO date'),
  body('shiftWindow.startTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('shiftWindow.startTime must be HH:mm'),
  body('shiftWindow.endTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('shiftWindow.endTime must be HH:mm'),
  body('shiftWindow.daysOfWeek').optional().isArray().withMessage('shiftWindow.daysOfWeek must be an array'),
  body('shiftWindow.daysOfWeek.*').optional().isInt({ min: 0, max: 6 }).withMessage('daysOfWeek entries must be 0-6'),
]);

