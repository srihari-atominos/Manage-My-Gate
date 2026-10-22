import EventEmitter from 'events';

class ExpenseEvents extends EventEmitter {}

export const expenseEventEmitter = new ExpenseEvents();

export const EXPENSE_CREATED = 'EXPENSE_CREATED';
export const EXPENSE_UPDATED = 'EXPENSE_UPDATED';
export const EXPENSE_PAYMENT_RECORDED = 'EXPENSE_PAYMENT_RECORDED';
export const EXPENSE_PAYMENT_RECONCILED = 'EXPENSE_PAYMENT_RECONCILED';
