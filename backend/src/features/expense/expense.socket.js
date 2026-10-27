import { getIO } from '../../config/socket.js';
import {
  expenseEventEmitter,
  EXPENSE_CREATED,
  EXPENSE_UPDATED,
  EXPENSE_PAYMENT_RECORDED,
  EXPENSE_PAYMENT_RECONCILED,
} from './expense.events.js';

export const initExpenseSockets = () => {
  let io;
  try {
    io = getIO();
  } catch (err) {
    console.warn('[Expense Sockets] Socket.io not initialized yet:', err?.message);
    return;
  }

  expenseEventEmitter.on(EXPENSE_CREATED, (expense) => {
    try {
      if (expense?.orgId) {
        io.to(`org:${expense.orgId}`).emit('expense_created', expense);
        io.to(`org:${expense.orgId}`).emit('EXPENSE_CREATED', expense);
      }
    } catch (err) {
      console.error('[Expense Sockets] Error broadcasting EXPENSE_CREATED event:', err);
    }
  });

  expenseEventEmitter.on(EXPENSE_UPDATED, (expense) => {
    try {
      if (expense?.orgId) {
        io.to(`org:${expense.orgId}`).emit('expense_updated', expense);
        io.to(`org:${expense.orgId}`).emit('EXPENSE_UPDATED', expense);
      }
    } catch (err) {
      console.error('[Expense Sockets] Error broadcasting EXPENSE_UPDATED event:', err);
    }
  });

  expenseEventEmitter.on(EXPENSE_PAYMENT_RECORDED, ({ expense, payment } = {}) => {
    try {
      const orgId = expense?.orgId || payment?.orgId;
      if (orgId) {
        io.to(`org:${orgId}`).emit('expense_payment_recorded', { expense, payment });
        io.to(`org:${orgId}`).emit('expense_updated', expense);
        io.to(`org:${orgId}`).emit('EXPENSE_UPDATED', expense);
      }
    } catch (err) {
      console.error('[Expense Sockets] Error broadcasting EXPENSE_PAYMENT_RECORDED event:', err);
    }
  });

  expenseEventEmitter.on(EXPENSE_PAYMENT_RECONCILED, ({ expense, payment } = {}) => {
    try {
      const orgId = expense?.orgId || payment?.orgId;
      if (orgId) {
        io.to(`org:${orgId}`).emit('expense_payment_reconciled', { expense, payment });
        io.to(`org:${orgId}`).emit('expense_updated', expense);
        io.to(`org:${orgId}`).emit('EXPENSE_UPDATED', expense);
      }
    } catch (err) {
      console.error('[Expense Sockets] Error broadcasting EXPENSE_PAYMENT_RECONCILED event:', err);
    }
  });
};
