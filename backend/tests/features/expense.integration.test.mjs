import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import Expense from '../../src/features/expense/expense.model.js';
import ExpensePayment from '../../src/features/expense/expensePayment.model.js';
import FinancialLedgerEntry from '../../src/features/ledger/financialLedgerEntry.model.js';
import expenseService from '../../src/features/expense/expense.service.js';

const org = () => new mongoose.Types.ObjectId();
const actor = (orgId) => ({ orgId, userId: new mongoose.Types.ObjectId(), idempotencyKey: `expense-${new mongoose.Types.ObjectId()}` });

describe('Expense foundation', () => {
  before(async () => { await connectDb(); });
  after(async () => { await closeDb(); });
  beforeEach(async () => { await clearDb(); });

  it('creates an itemized expense and posts the incurred ledger entry', async () => {
    const orgId = org(); const user = actor(orgId);
    const result = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Cleaning supplies', expenseType: 'PURCHASE', category: 'Cleaning Supplies', expenseDate: new Date(), subtotal: 3300, taxAmount: 0, additionalCharges: 0, items: [{ itemName: 'Liquid', quantity: 10, unit: 'Bottle', unitPrice: 150 }, { itemName: 'Bags', quantity: 20, unit: 'Pack', unitPrice: 50 }, { itemName: 'Brushes', quantity: 10, unit: 'Piece', unitPrice: 80 }] }, user);
    assert.equal(result.totalAmount, 3300); assert.equal(result.outstandingAmount, 3300); assert.equal(result.items.length, 3);
    assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'Expense' }), 1);
  });

  it('records unpaid, partial, and completed payments against one expense', async () => {
    const orgId = org(); const user = actor(orgId);
    const created = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Pump repair', expenseType: 'REPAIRS_MAINTENANCE', category: 'Plumbing Repairs', expenseDate: new Date(), subtotal: 20000 }, user);
    const first = await expenseService.recordPayment(created._id, { idempotencyKey: 'payment-one', amount: 10000, paymentMethod: 'UPI', paymentApplication: 'GOOGLE_PAY', fundingSource: 'PERSONAL_ACCOUNT', paymentDate: new Date() }, user);
    assert.equal(first.outstandingAmount, 10000); assert.equal(first.settlementStatus, 'PARTIALLY_PAID');
    const second = await expenseService.recordPayment(created._id, { idempotencyKey: 'payment-two', amount: 10000, paymentMethod: 'BANK_TRANSFER', fundingSource: 'COMMUNITY_BANK_ACCOUNT', paymentDate: new Date() }, user);
    assert.equal(second.outstandingAmount, 0); assert.equal(second.settlementStatus, 'PAID'); assert.equal(second.payments.length, 2);
  });

  it('returns the same expense for a repeated create idempotency key', async () => {
    const orgId = org(); const user = actor(orgId); const payload = { idempotencyKey: user.idempotencyKey, name: 'Water bill', expenseType: 'BILLS_UTILITIES', category: 'Water Supply', expenseDate: new Date(), subtotal: 500 };
    const first = await expenseService.create(payload, user); const second = await expenseService.create(payload, user);
    assert.equal(String(first._id), String(second._id)); assert.equal(await Expense.countDocuments({ orgId }), 1);
  });

  it('returns the same payment for a repeated payment idempotency key', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Security service', expenseType: 'SERVICES_LABOUR', category: 'Security Services', expenseDate: new Date(), subtotal: 1000 }, user);
    const payload = { idempotencyKey: 'same-payment', amount: 500, paymentMethod: 'CASH', fundingSource: 'PETTY_CASH', paymentDate: new Date() };
    const first = await expenseService.recordPayment(expense._id, payload, user); const second = await expenseService.recordPayment(expense._id, payload, user);
    assert.equal(second.recordedPaidAmount, 500); assert.equal(second.payments.length, 1); assert.equal(await ExpensePayment.countDocuments({ expenseId: expense._id }), 1); assert.equal(String(first._id), String(second.payments[0]._id));
  });

  it('isolates records by organization', async () => {
    const orgA = org(); const orgB = org(); const user = actor(orgA); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Garden supplies', expenseType: 'PURCHASE', category: 'Gardening', expenseDate: new Date(), subtotal: 250 }, user);
    await assert.rejects(() => expenseService.getById(expense._id, orgB), /Expense not found/);
    await assert.rejects(() => expenseService.recordPayment(expense._id, { idempotencyKey: 'wrong-org', amount: 1, paymentMethod: 'CASH', fundingSource: 'PETTY_CASH', paymentDate: new Date() }, actor(orgB)), /Expense not found/);
  });
  it('rejects overpayments and duplicate external transaction references', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Lift service', expenseType: 'SERVICES_LABOUR', category: 'Lift', expenseDate: new Date(), subtotal: 1000 }, user);
    await assert.rejects(() => expenseService.recordPayment(expense._id, { idempotencyKey: 'overpay', amount: 1001, paymentMethod: 'CASH', fundingSource: 'PETTY_CASH', paymentDate: new Date() }, user), /cannot exceed/);
    await expenseService.recordPayment(expense._id, { idempotencyKey: 'ref-one', amount: 500, paymentMethod: 'UPI', paymentApplication: 'BHIM', fundingSource: 'COMMUNITY_BANK_ACCOUNT', paymentDate: new Date(), transactionReference: 'BANK-REF-1' }, user);
    await assert.rejects(() => expenseService.recordPayment(expense._id, { idempotencyKey: 'ref-two', amount: 100, paymentMethod: 'UPI', paymentApplication: 'BHIM', fundingSource: 'COMMUNITY_BANK_ACCOUNT', paymentDate: new Date(), transactionReference: 'BANK-REF-1' }, user), /already been recorded/);
  });

  it('reconciles a recorded payment once and rejects invalid transitions', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Generator fuel', expenseType: 'OTHER', category: 'Fuel', expenseDate: new Date(), subtotal: 1000 }, user);
    const payment = await expenseService.recordPayment(expense._id, { idempotencyKey: 'reconcile-payment', amount: 1000, paymentMethod: 'BANK_TRANSFER', fundingSource: 'COMMUNITY_BANK_ACCOUNT', paymentDate: new Date() }, user);
    const reconciled = await expenseService.reconcilePayment(expense._id, payment.payments[0]._id, { reconciliationResult: 'CONFIRMED', note: 'Matched bank statement.' }, user);
    assert.equal(reconciled.confirmedPaidAmount, 1000); assert.equal(reconciled.payments[0].verificationStatus, 'RECONCILED');
    assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'ExpensePayment', referenceId: payment.payments[0]._id }), 1);
    const retry = await expenseService.reconcilePayment(expense._id, payment.payments[0]._id, { reconciliationResult: 'CONFIRMED' }, user);
    assert.equal(retry.confirmedPaidAmount, 1000); assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'ExpensePayment', referenceId: payment.payments[0]._id }), 1);
  });
});

