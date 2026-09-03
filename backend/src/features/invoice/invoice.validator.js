import { body, param } from 'express-validator';

export const manualTriggerSchema = [
  body('assessmentId')
    .notEmpty()
    .withMessage('Assessment ID is required')
    .isMongoId()
    .withMessage('Assessment ID must be a valid Mongo ObjectId'),

  body('billingPeriodString')
    .notEmpty()
    .withMessage('Billing period string is required')
    .matches(/^\d{4}-(?:0[1-9]|1[0-2]|Q[1-4]|W(?:0[1-9]|[1-4][0-9]|5[0-3]))$/)
    .withMessage('Billing period string must match format YYYY-MM, YYYY-Qx, or YYYY-Wxx (e.g. 2026-07, 2026-Q3, or 2026-W36)'),
];

export const offlineSettleSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),

  body('offlineReference')
    .notEmpty()
    .withMessage('Offline reference (cheque # / NEFT UTR) is required')
    .isString()
    .withMessage('Offline reference must be a string')
    .trim(),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['CHEQUE', 'NEFT', 'CASH'])
    .withMessage('Payment method must be one of CHEQUE, NEFT, or CASH'),

  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a number strictly greater than 0'),
];

export const approveInvoiceSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),
];

export const rejectInvoiceSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),

  body('reason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string')
    .trim(),
];

