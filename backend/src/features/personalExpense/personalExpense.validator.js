import { body, param, query } from 'express-validator';
import { METHODS, SETTLEMENT_STATUSES, TYPES } from './personalExpense.constants.js';

const period = (field) => field.matches(/^\d{4}-(0[1-9]|1[0-2])$/);
const isTransactionDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid transaction date');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Invalid transaction date');
  return true;
};
const transactionDate = (field) => field.custom(isTransactionDate);
const editableFields = ['type', 'amount', 'categoryId', 'transactionDate', 'paymentMethod', 'paymentSettlement', 'merchantOrSource', 'notes', 'reference'];

export const createTransactionRules = [body('type').isIn(TYPES), body('amount').isFloat({ gt: 0 }), body('categoryId').isString().trim().notEmpty().isLength({ max: 64 }), transactionDate(body('transactionDate')), body('paymentMethod').isIn(METHODS), body('paymentSettlement').isIn(SETTLEMENT_STATUSES), body('merchantOrSource').optional().isString().trim().isLength({ max: 160 }), body('notes').optional().isString().trim().isLength({ max: 1000 }), body('reference').optional({ nullable: true }).isString().trim().isLength({ max: 128 })];
export const updateTransactionRules = [param('id').isMongoId(), body().custom((value) => { if (!Object.keys(value || {}).some((key) => editableFields.includes(key))) throw new Error('At least one editable transaction field is required'); return true; }), body('type').optional().isIn(TYPES), body('amount').optional().isFloat({ gt: 0 }), body('categoryId').optional().isString().trim().notEmpty().isLength({ max: 64 }), body('transactionDate').optional().custom(isTransactionDate), body('paymentMethod').optional().isIn(METHODS), body('paymentSettlement').optional().isIn(SETTLEMENT_STATUSES), body('merchantOrSource').optional().isString().trim().isLength({ max: 160 }), body('notes').optional().isString().trim().isLength({ max: 1000 }), body('reference').optional({ nullable: true }).isString().trim().isLength({ max: 128 })];
export const idRules = [param('id').isMongoId()];
export const listRules = [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('type').optional().isIn(TYPES), query('categoryId').optional().isString(), query('startDate').optional().custom(isTransactionDate), query('endDate').optional().custom(isTransactionDate)];
export const categoryRules = [body('name').isString().trim().notEmpty().isLength({ max: 80 }), body('type').isIn(TYPES)];
export const periodQueryRules = [period(query('period'))];
export const budgetRules = [period(body('period')), body('categoryId').optional({ nullable: true }).isString(), body('amount').isFloat({ gt: 0 })];
export const receiptReviewRules = [param('id').isMongoId(), body('merchant').optional({ nullable: true }).isString().trim().isLength({ max: 160 }), body('merchantAddress').optional({ nullable: true }).isString().trim().isLength({ max: 300 }), body('receiptNumber').optional({ nullable: true }).isString().trim().isLength({ max: 128 }), body('receiptDate').optional({ nullable: true }).isString().trim().isLength({ max: 32 }), body('currency').optional({ nullable: true }).equals('INR'), body('subtotalMinor').optional({ nullable: true }).isInt({ min: 0 }), body('taxMinor').optional({ nullable: true }).isInt({ min: 0 }), body('discountMinor').optional({ nullable: true }).isInt({ min: 0 }), body('additionalChargesMinor').optional({ nullable: true }).isInt({ min: 0 }), body('totalMinor').optional({ nullable: true }).isInt({ min: 0 }), body('items').optional().isArray({ max: 100 }), body('items.*.description').optional().isString().trim().isLength({ max: 160 }), body('items.*.quantity').optional().isFloat({ gt: 0, max: 100000 }), body('items.*.unitPriceMinor').optional().isInt({ min: 0 }), body('items.*.amountMinor').optional().isInt({ min: 0 }), body('confirmed').optional().isBoolean()];
