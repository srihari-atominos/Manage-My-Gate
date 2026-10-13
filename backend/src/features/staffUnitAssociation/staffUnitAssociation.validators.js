import { body, param, query } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';

export const validateAssociationCreate = validate([
  body('villaId')
    .notEmpty().withMessage('Villa / Unit ID is required')
    .isMongoId().withMessage('Invalid Villa / Unit ID format'),
  body('technicianId')
    .notEmpty().withMessage('Staff / Technician ID is required')
    .isMongoId().withMessage('Invalid Staff / Technician ID format'),
  body('roleOrTrade')
    .optional()
    .isString().withMessage('Role or trade must be a string')
    .trim(),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .trim(),
  body('accessSchedule')
    .optional()
    .isObject().withMessage('Access schedule must be an object'),
]);

export const validateAssociationDelete = validate([
  param('id')
    .notEmpty().withMessage('Association ID is required')
    .isMongoId().withMessage('Invalid Association ID format'),
  body('reason')
    .optional()
    .isString().withMessage('Reason must be a string')
    .trim(),
]);
