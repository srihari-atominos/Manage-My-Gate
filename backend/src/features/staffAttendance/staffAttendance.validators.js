import { body, param, query } from 'express-validator';
import validate from '../../middlewares/validator.middleware.js';

export const validateGateScan = validate([
  body('scannedPayload')
    .notEmpty().withMessage('Scanned QR code payload is required')
    .isString().withMessage('Scanned payload must be a string')
    .trim(),
  body('gateId')
    .optional()
    .isString().withMessage('Gate ID must be a string')
    .trim(),
  body('action')
    .optional()
    .isIn(['ENTRY', 'EXIT', 'AUTO', 'entry', 'exit', 'auto']).withMessage('Action must be ENTRY, EXIT, or AUTO'),
  body('idempotencyKey')
    .optional()
    .isString().withMessage('Idempotency key must be a string')
    .trim(),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .trim(),
  body('isManualEntry')
    .optional()
    .isBoolean().withMessage('isManualEntry must be a boolean'),
]);

export const validateHistoryQuery = validate([
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('technicianId')
    .optional()
    .isMongoId().withMessage('Invalid technician ID format'),
  query('status')
    .optional()
    .isIn(['Open', 'Closed']).withMessage('Status must be Open or Closed'),
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('gateId')
    .optional()
    .isString().withMessage('Gate ID must be a string')
    .trim(),
]);

export const validateSessionId = validate([
  param('id')
    .notEmpty().withMessage('Session ID is required')
    .isMongoId().withMessage('Invalid Session ID format'),
]);

export const validateManualCheckout = validate([
  param('id')
    .notEmpty().withMessage('Session ID is required')
    .isMongoId().withMessage('Invalid Session ID format'),
  body('checkOutTime')
    .optional()
    .isISO8601().withMessage('Checkout time must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .trim(),
  body('gateId')
    .optional()
    .isString().withMessage('Gate ID must be a string')
    .trim(),
]);
