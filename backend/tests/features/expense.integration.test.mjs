import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import Expense from '../../src/features/expense/expense.model.js';
import ExpensePayment from '../../src/features/expense/expensePayment.model.js';
import Workspace from '../../src/features/workspace/workspace.model.js';
import FinancialLedgerEntry from '../../src/features/ledger/financialLedgerEntry.model.js';
import expenseService from '../../src/features/expense/expense.service.js';
import expenseController from '../../src/features/expense/expense.controller.js';
import financialLedgerService from '../../src/features/ledger/financialLedger.service.js';
import { reportToCsv, reportToXlsxBuffer, reportToPdfBuffer } from '../../src/features/expense/expense.export.js';
import { uploadDir } from '../../src/features/expense/expenseUpload.middleware.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const org = () => new mongoose.Types.ObjectId();
const actor = (orgId) => ({ orgId, userId: new mongoose.Types.ObjectId(), idempotencyKey: `expense-${new mongoose.Types.ObjectId()}` });

describe('Expense foundation', () => {
  before(async () => { await connectDb(); });
  after(async () => { await closeDb(); });
  beforeEach(async () => { await clearDb(); });

  it('returns only the configured organization payee for online payments', async () => {
    const orgId = org(); const user = actor(orgId);
    await Workspace.create({ workspaceName: 'Payee workspace', organizationId: orgId, createdBy: user.userId, settings: { expenseOnlinePayee: { name: 'Community account', upiId: 'community@upi' } } });
    const configured = await expenseService.getOnlinePayee(orgId);
    assert.deepEqual(configured, { configured: true, name: 'Community account', upiId: 'community@upi' });
    const missing = await expenseService.getOnlinePayee(org());
    assert.deepEqual(missing, { configured: false });
  });

  it('creates an itemized expense and posts the incurred ledger entry', async () => {
    const orgId = org(); const user = actor(orgId);
    const result = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Cleaning supplies', expenseType: 'PURCHASE', category: 'Cleaning Supplies', expenseDate: new Date(), subtotal: 3300, taxAmount: 0, additionalCharges: 0, items: [{ itemName: 'Liquid', quantity: 10, unit: 'Bottle', unitPrice: 150 }, { itemName: 'Bags', quantity: 20, unit: 'Pack', unitPrice: 50 }, { itemName: 'Brushes', quantity: 10, unit: 'Piece', unitPrice: 80 }] }, user);
    assert.equal(result.totalAmount, 3300); assert.equal(result.outstandingAmount, 3300); assert.equal(result.items.length, 3);
    assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'Expense' }), 1);
  });

  it('creates an expense with initial payment via NETBANKING and marks it paid', async () => {
    const orgId = org(); const user = actor(orgId);
    const created = await expenseService.create({
      idempotencyKey: user.idempotencyKey,
      name: 'Diesel generator maintenance',
      expenseType: 'REPAIRS_MAINTENANCE',
      category: 'Generator',
      expenseDate: new Date(),
      subtotal: 5500,
      initialPayment: {
        idempotencyKey: `${user.idempotencyKey}:PAYMENT`,
        amount: 5500,
        paymentMethod: 'BANK_TRANSFER',
        paymentApplication: 'NETBANKING',
        fundingSource: 'COMMUNITY_BANK_ACCOUNT',
        paymentDate: new Date().toISOString(),
        transactionReference: 'NEFT-889900',
      },
    }, user);
    assert.equal(created.totalAmount, 5500);
    assert.equal(created.settlementStatus, 'PAID');
    assert.equal(created.payments.length, 1);
    assert.equal(created.payments[0].paymentApplication, 'NETBANKING');
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
    assert.equal(second.recordedPaidAmount, 500); assert.equal(second.payments.length, 1); assert.equal(await ExpensePayment.countDocuments({ expenseId: expense._id }), 1); assert.equal(String(first.payments[0]._id), String(second.payments[0]._id));
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

  it('supports mark as paid with autoReconcile: true to immediately record and reconcile disbursement', async () => {
    const orgId = org(); const user = actor(orgId);
    const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Plumber Repair', expenseType: 'REPAIRS_MAINTENANCE', category: 'Plumbing', expenseDate: new Date(), subtotal: 1500 }, user);
    assert.equal(expense.settlementStatus, 'UNPAID');
    assert.equal(expense.confirmedPaidAmount, 0);

    const paidResult = await expenseService.recordPayment(expense._id, {
      idempotencyKey: 'direct-mark-paid',
      amount: 1500,
      paymentMethod: 'CASH',
      fundingSource: 'PETTY_CASH',
      paymentDate: new Date(),
      autoReconcile: true,
      reconciliationNote: 'Marked as paid in cash'
    }, user);

    assert.equal(paidResult.settlementStatus, 'PAID');
    assert.equal(paidResult.outstandingAmount, 0);
    assert.equal(paidResult.recordedPaidAmount, 1500);
    assert.equal(paidResult.confirmedPaidAmount, 1500);
    assert.equal(paidResult.payments[0].verificationStatus, 'RECONCILED');
    assert.equal(paidResult.payments[0].reconciliationNote, 'Marked as paid in cash');
    assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'ExpensePayment', referenceId: paidResult.payments[0]._id }), 1);
  });

  it('protects attachment access by organization and serves stored files', async () => {
    const orgA = org(); const orgB = org(); const user = actor(orgA); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Invoice attachment', expenseType: 'PURCHASE', category: 'Office', expenseDate: new Date(), subtotal: 100 }, user);
    const filename = `expense-test-${new mongoose.Types.ObjectId()}.png`; const filePath = path.join(uploadDir, filename); await fs.writeFile(filePath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    try {
      let uploaded; const response = { status: () => response, json: (value) => { uploaded = value.data; } };
      await expenseController.uploadAttachment({ file: { filename, path: filePath, originalname: 'receipt.png', mimetype: 'image/png' }, params: { id: String(expense._id) }, tenant: { orgId: orgA }, user: { id: user.userId } }, response, (error) => { throw error; });
      assert.equal(uploaded.filename, 'receipt.png');
      const stored = await expenseService.getById(expense._id, orgA); assert.equal(stored.attachments.length, 1);
      let served; const downloadResponse = { set: () => downloadResponse, sendFile: (file) => { served = file; } };
      await expenseController.downloadAttachment({ params: { id: String(expense._id), attachmentId: String(stored.attachments[0]._id) }, tenant: { orgId: orgA } }, downloadResponse, (error) => { throw error; });
      assert.equal(served, filePath);
      let denied; await expenseController.downloadAttachment({ params: { id: String(expense._id), attachmentId: String(stored.attachments[0]._id) }, tenant: { orgId: orgB } }, downloadResponse, (error) => { denied = error; });
      assert.equal(denied.statusCode, 404);
    } finally { await fs.rm(filePath, { force: true }); }
  });

  it('rolls back the expense when the incurred ledger write fails', async () => {
    const orgId = org(); const user = actor(orgId); const original = financialLedgerService.recordExpenseIncurredEntry;
    financialLedgerService.recordExpenseIncurredEntry = async () => { throw new Error('ledger unavailable'); };
    try { await assert.rejects(() => expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Rollback expense', expenseType: 'OTHER', category: 'Test', expenseDate: new Date(), subtotal: 100 }, user), /ledger unavailable/); assert.equal(await Expense.countDocuments({ orgId }), 0); } finally { financialLedgerService.recordExpenseIncurredEntry = original; }
  });
  it('reserves attempt balance and permits retry after not completed', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'UPI pump', expenseType: 'PURCHASE', category: 'Equipment', expenseDate: new Date(), subtotal: 1000, vendor: { name: 'Vendor', upiId: 'vendor@upi' } }, user);
    const attempt = await expenseService.createPaymentAttempt(expense._id, { idempotencyKey: 'attempt-1', amount: 700, paymentApplication: 'BHIM', paymentMethod: 'UPI', fundingSource: 'PERSONAL_ACCOUNT' }, user);
    const state = await expenseService.getById(expense._id, orgId); assert.equal(state.recordedPaidAmount, 0); assert.equal(state.outstandingAmount, 1000);
    await assert.rejects(() => expenseService.createPaymentAttempt(expense._id, { idempotencyKey: 'attempt-2', amount: 400, paymentApplication: 'BHIM', paymentMethod: 'UPI', fundingSource: 'PERSONAL_ACCOUNT' }, user), /outstanding balance|reserved/);
    await expenseService.updatePaymentAttempt(expense._id, attempt._id, { outcome: 'NOT_COMPLETED' }, user);
    const retry = await expenseService.createPaymentAttempt(expense._id, { idempotencyKey: 'attempt-3', amount: 1000, paymentApplication: 'BHIM', paymentMethod: 'UPI', fundingSource: 'PERSONAL_ACCOUNT' }, user); assert.equal(retry.recordType, 'ATTEMPT');
  });
  it('keeps completed reports pending until explicit reconciliation and posts ledger once', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'UPI service', expenseType: 'SERVICES_LABOUR', category: 'Repair', expenseDate: new Date(), subtotal: 500, vendor: { name: 'Vendor', upiId: 'vendor@upi' } }, user);
    const attempt = await expenseService.createPaymentAttempt(expense._id, { idempotencyKey: 'attempt-complete', amount: 500, paymentApplication: 'GOOGLE_PAY', paymentMethod: 'UPI', fundingSource: 'COMMUNITY_BANK_ACCOUNT' }, user);
    await expenseService.updatePaymentAttempt(expense._id, attempt._id, { outcome: 'COMPLETED', transactionReference: 'UPI-REF-1', response: { status: 'SUCCESS', transactionId: 'txn-1', approvalRefNo: 'utr-1', raw: 'status=SUCCESS&txnId=txn-1' }, evidence: ['receipt-id'] }, user);
    const duplicateOutcome = await expenseService.updatePaymentAttempt(expense._id, attempt._id, { outcome: 'COMPLETED', transactionReference: 'UPI-REF-CHANGED' }, user);
    assert.equal(duplicateOutcome.externalTransactionReference, 'UPI-REF-1');
    let state = await expenseService.getById(expense._id, orgId); assert.equal(state.recordedPaidAmount, 0); assert.equal(state.payments[0].verificationStatus, 'PENDING_VERIFICATION'); assert.equal(state.payments[0].externalTransactionReference, 'UPI-REF-1'); assert.deepEqual(state.payments[0].externalResponse, { status: 'SUCCESS', transactionId: 'txn-1', approvalRefNo: 'utr-1', raw: 'status=SUCCESS&txnId=txn-1' });
    state = await expenseService.reconcilePayment(expense._id, attempt._id, { reconciliationResult: 'CONFIRMED', note: 'Matched.' }, user); assert.equal(state.recordedPaidAmount, 500); assert.equal(state.confirmedPaidAmount, 500); assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'ExpensePayment', referenceId: attempt._id }), 1);
    const retry = await expenseService.reconcilePayment(expense._id, attempt._id, { reconciliationResult: 'CONFIRMED' }, user); assert.equal(retry.confirmedPaidAmount, 500); assert.equal(await FinancialLedgerEntry.countDocuments({ orgId, referenceType: 'ExpensePayment', referenceId: attempt._id }), 1);
  });
  it('allows only one concurrent attempt to reserve the same balance', async () => {
    const orgId = org(); const user = actor(orgId); const expense = await expenseService.create({ idempotencyKey: user.idempotencyKey, name: 'Concurrent UPI', expenseType: 'OTHER', category: 'Test', expenseDate: new Date(), subtotal: 1000, vendor: { name: 'Vendor', upiId: 'vendor@upi' } }, user);
    const results = await Promise.allSettled(['concurrent-a', 'concurrent-b'].map((key) => expenseService.createPaymentAttempt(expense._id, { idempotencyKey: key, amount: 1000, paymentApplication: 'PHONEPE', paymentMethod: 'UPI', fundingSource: 'PERSONAL_ACCOUNT' }, user)));
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1); assert.equal(await ExpensePayment.countDocuments({ expenseId: expense._id, recordType: 'ATTEMPT' }), 1);
  });

  it('aggregates summary accurately when orgId is passed as a string from tenant context', async () => {
    const orgId = org(); const user = actor(orgId);
    await expenseService.create({ idempotencyKey: 'sum-1', name: 'Plumber', expenseType: 'REPAIRS_MAINTENANCE', category: 'Repairs', expenseDate: new Date(), subtotal: 3000 }, user);
    const created = await expenseService.create({ idempotencyKey: 'sum-2', name: 'Bulbs', expenseType: 'PURCHASE', category: 'Electrical', expenseDate: new Date(), subtotal: 2000 }, user);
    await expenseService.recordPayment(created._id, { idempotencyKey: 'sum-pay', amount: 2000, paymentMethod: 'CASH', fundingSource: 'PETTY_CASH', paymentDate: new Date() }, user);

    const summary = await expenseService.summary(String(orgId));
    assert.equal(summary.totalExpenses, 5000);
    assert.equal(summary.recordedPaid, 2000);
    assert.equal(summary.unpaidBalance, 3000);
    assert.equal(summary.todayExpenses, 5000);
  });

  it('calculates period-specific analysis and category breakdown across TODAY, WEEKLY, MONTHLY, YEARLY', async () => {
    const orgId = org();
    const user = actor(orgId);
    const now = new Date();

    // 1. Today's expense
    await expenseService.create({
      idempotencyKey: 'period-today',
      name: 'Today Lift Fix',
      expenseType: 'REPAIRS_MAINTENANCE',
      category: 'Repairs',
      expenseDate: now,
      subtotal: 1000,
    }, user);

    // 2. Summary for TODAY
    const todaySummary = await expenseService.summary(String(orgId), { period: 'TODAY' });
    assert.equal(todaySummary.period, 'TODAY');
    assert.equal(todaySummary.totalExpenses, 1000);
    assert.equal(todaySummary.expenseCount, 1);
    assert.ok(todaySummary.categoryBreakdown.length > 0);
    assert.equal(todaySummary.categoryBreakdown[0].category, 'Repairs');
    assert.equal(todaySummary.categoryBreakdown[0].amount, 1000);
    assert.equal(todaySummary.categoryBreakdown[0].percentage, 100);

    // 3. Summary for WEEKLY, MONTHLY, YEARLY
    const weekSummary = await expenseService.summary(String(orgId), { period: 'WEEKLY' });
    assert.equal(weekSummary.period, 'WEEKLY');
    assert.equal(weekSummary.totalExpenses, 1000);

    const monthSummary = await expenseService.summary(String(orgId), { period: 'MONTHLY' });
    assert.equal(monthSummary.period, 'MONTHLY');
    assert.equal(monthSummary.totalExpenses, 1000);

    const yearSummary = await expenseService.summary(String(orgId), { period: 'YEARLY' });
    assert.equal(yearSummary.period, 'YEARLY');
    assert.equal(yearSummary.totalExpenses, 1000);
  });

  it('exports filtered expenses and includes filter parameters in the report metadata', async () => {
    const orgId = org();
    const user = actor(orgId);
    await expenseService.create({
      idempotencyKey: 'exp-rep-1',
      name: 'Generator Fuel',
      expenseType: 'BILLS_UTILITIES',
      category: 'Fuel',
      expenseDate: new Date(),
      subtotal: 4500,
      vendor: { name: 'Shell Fuel' },
    }, user);

    const report = await expenseService.export(orgId, { period: 'THIS_MONTH', category: 'Fuel' }, { generatedBy: 'Admin User' });
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].name, 'Generator Fuel');
    assert.equal(report.rows[0].totalAmount, 4500);

    // Verify filter parameters are recorded in the report summary
    const periodEntry = report.summary.find(([label]) => label === 'Active Filter: Period');
    assert.ok(periodEntry);
    assert.equal(periodEntry[1], 'THIS MONTH');

    const categoryEntry = report.summary.find(([label]) => label === 'Active Filter: Category');
    assert.ok(categoryEntry);
    assert.equal(categoryEntry[1], 'Fuel');

    // Verify CSV serializes with filter headers
    const csv = reportToCsv(report);
    assert.ok(csv.includes('# Active Filter: Period: THIS MONTH'));
    assert.ok(csv.includes('# Active Filter: Category: Fuel'));
    assert.ok(csv.includes('"Generator Fuel"'));

    // Verify Excel buffer creates valid xlsx
    const xlsx = await reportToXlsxBuffer(report);
    assert.ok(xlsx instanceof Buffer);
    assert.ok(xlsx.length > 0);

    // Verify PDF buffer creates valid pdf
    const pdf = await reportToPdfBuffer(report);
    assert.ok(pdf instanceof Buffer);
    assert.ok(pdf.length > 0);
  });
});
