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

  body('paymentReference')
    .optional()
    .isString()
    .withMessage('Payment reference must be a string')
    .trim(),

  body('offlineReference')
    .optional()
    .isString()
    .withMessage('Offline reference must be a string')
    .trim(),

  body('paymentMethod')
    .optional()
    .isIn(['BANK_TRANSFER', 'NEFT', 'UPI', 'CHEQUE', 'CASH', 'DEMAND_DRAFT'])
    .withMessage('Payment method must be BANK_TRANSFER, NEFT, UPI, CHEQUE, CASH, or DEMAND_DRAFT'),

  body('amountPaid')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount paid must be a number strictly greater than 0'),

  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a number strictly greater than 0'),

  body('paymentDate')
    .optional()
    .isString()
    .withMessage('Payment date must be a valid date string'),

  body('paymentScreenshot')
    .optional()
    .isString()
    .withMessage('Payment screenshot must be a valid file reference or string'),

  body('payerNotes')
    .optional()
    .isString()
    .withMessage('Payer notes must be a string')
    .trim(),
];

export const approveInvoiceSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),

  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a number strictly greater than 0'),

  body('settlementType')
    .optional()
    .isIn(['FULL', 'CUSTOM'])
    .withMessage('Settlement type must be either FULL or CUSTOM'),

  body('paymentMethod')
    .optional()
    .isIn(['BANK_TRANSFER', 'CASH', 'NEFT', 'UPI', 'CHEQUE', 'DEMAND_DRAFT'])
    .withMessage('Payment method must be BANK_TRANSFER, CASH, NEFT, UPI, CHEQUE, or DEMAND_DRAFT'),

  body('paymentReference')
    .optional()
    .isString()
    .withMessage('Payment reference must be a string')
    .trim(),

  body('reference')
    .optional()
    .isString()
    .withMessage('Payment reference must be a string')
    .trim(),

  body('notes')
    .optional()
    .isString()
    .trim(),

  body('paymentScreenshot')
    .optional()
    .isString()
    .withMessage('Payment screenshot must be a valid file reference or string'),
];

export const rejectOfflineSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),

  body('rejectionReason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string')
    .trim(),

  body('reason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string')
    .trim(),
];

export const rejectInvoiceSchema = rejectOfflineSchema;

export const recordCashPaymentSchema = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID or Number path parameter is required')
    .isString()
    .withMessage('Invoice ID must be a valid string')
    .trim(),

  body('amount')
    .notEmpty()
    .withMessage('Cash amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Cash amount must be a number strictly greater than 0'),

  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'BANK_TRANSFER', 'NEFT', 'UPI', 'CHEQUE', 'DEMAND_DRAFT']),

  body('reference')
    .optional()
    .isString()
    .trim(),
];
