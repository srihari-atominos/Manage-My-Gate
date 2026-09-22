import { body, param, query } from 'express-validator';

export const confirmReservationRules = [
  body('holdId').notEmpty().withMessage('holdId is required').isMongoId().withMessage('Invalid holdId'),
  body('paymentReference').optional().isString().trim(),
  body('notes').optional().isString().trim(),
];

export const cancelReservationRules = [
  param('reservationId').notEmpty().withMessage('reservationId parameter is required').isMongoId().withMessage('Invalid reservationId'),
  body('reason').optional().isString().trim(),
];

export const reviewReservationRules = [
  param('reservationId').notEmpty().withMessage('reservationId parameter is required').isMongoId().withMessage('Invalid reservationId'),
  body('action')
    .notEmpty()
    .withMessage('action is required')
    .isIn(['APPROVE', 'REJECT'])
    .withMessage("action must be 'APPROVE' or 'REJECT'"),
  body('rejectionReason').optional().isString().trim(),
];

export const reservationIdParamRules = [
  param('reservationId').notEmpty().withMessage('reservationId parameter is required').isMongoId().withMessage('Invalid reservationId'),
];

export const reservationNumberParamRules = [
  param('reservationNumber').notEmpty().withMessage('reservationNumber parameter is required').isString().trim(),
];

export const listReservationsRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be an integer >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('facilityId').optional().isMongoId().withMessage('Invalid facilityId filter'),
  query('resourceId').optional().isMongoId().withMessage('Invalid resourceId filter'),
  query('residentId').optional().isMongoId().withMessage('Invalid residentId filter'),
  query('unitId').optional().isMongoId().withMessage('Invalid unitId filter'),
  query('bookingStatus')
    .optional()
    .isIn(['PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED', 'REJECTED'])
    .withMessage('Invalid bookingStatus filter'),
  query('paymentStatus')
    .optional()
    .isIn(['NOT_REQUIRED', 'NOT_APPLICABLE', 'PENDING', 'HELD_AUTHORIZED', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED'])
    .withMessage('Invalid paymentStatus filter'),
  query('approvalStatus')
    .optional()
    .isIn(['NOT_REQUIRED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'])
    .withMessage('Invalid approvalStatus filter'),
  query('startDate').optional().isISO8601().withMessage('startDate must be valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be valid ISO8601 date'),
  query('search').optional().isString().trim(),
];
