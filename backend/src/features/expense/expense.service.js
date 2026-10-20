import mongoose from 'mongoose';
import expenseRepository from './expense.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import financialLedgerService from '../ledger/financialLedger.service.js';
import auditLogService from '../auditLog/auditLog.services.js';

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const statusFor = (total, paid) => paid <= 0 ? 'UNPAID' : paid >= total ? 'PAID' : 'PARTIALLY_PAID';
const numberFor = () => `EXP-${new Date().getFullYear()}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`;
const normalizeItems = (items = []) => items.map((item) => {
  const quantity = Number(item.quantity); const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new HttpError(400, 'Each item must have a valid quantity and unit price.');
  return { ...item, quantity, unitPrice, lineTotal: round(quantity * unitPrice) };
});
const filtersFor = (query = {}) => {
  const match = {};
  if (query.search) { const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); match.$or = [{ name: new RegExp(escaped, 'i') }, { expenseNumber: new RegExp(escaped, 'i') }, { 'vendor.name': new RegExp(escaped, 'i') }, { category: new RegExp(escaped, 'i') }]; }
  ['expenseType', 'category', 'settlementStatus'].forEach((key) => { if (query[key]) match[key] = query[key]; });
  if (query.startDate || query.endDate) { match.expenseDate = {}; if (query.startDate) match.expenseDate.$gte = new Date(query.startDate); if (query.endDate) match.expenseDate.$lte = new Date(query.endDate); }
  return match;
};

class ExpenseService {
  async create(payload, actor) {
    payload = { ...payload, idempotencyKey: payload.idempotencyKey || actor.idempotencyKey };
    const items = normalizeItems(payload.items || []); const itemSubtotal = round(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const suppliedSubtotal = round(payload.subtotal || 0); if (items.length && suppliedSubtotal !== itemSubtotal) throw new HttpError(400, 'Subtotal must equal recalculated item total.'); const subtotal = items.length ? itemSubtotal : suppliedSubtotal;
    const taxAmount = round(payload.taxAmount || 0); const additionalCharges = round(payload.additionalCharges || 0); const totalAmount = round(subtotal + taxAmount + additionalCharges);
    if (totalAmount <= 0) throw new HttpError(400, 'Expense total must be greater than zero.');
    const session = await mongoose.startSession();
    try {
      session.startTransaction(); const existing = await expenseRepository.findByIdempotencyKey(actor.orgId, payload.idempotencyKey, session);
      if (existing) { await session.abortTransaction(); return this.getById(existing._id, actor.orgId); }
      const expense = await expenseRepository.create({ orgId: actor.orgId, expenseNumber: numberFor(), name: payload.name, description: payload.description || '', expenseType: payload.expenseType, category: payload.category, vendor: payload.vendor || {}, expenseDate: payload.expenseDate, invoiceNumber: payload.invoiceNumber, invoiceDate: payload.invoiceDate, dueDate: payload.dueDate, items, subtotal, taxAmount, additionalCharges, totalAmount, outstandingAmount: totalAmount, attachments: payload.attachments || [], recordedBy: actor.userId, idempotencyKey: payload.idempotencyKey }, session);
      await financialLedgerService.recordExpenseIncurredEntry({ ...expense.toObject(), fundingSource: payload.initialPayment?.fundingSource }, session);
      if (payload.initialPayment) await this._recordPayment(expense, payload.initialPayment, actor, session);
      await session.commitTransaction(); return this.getById(expense._id, actor.orgId);
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }
  async _recordPayment(expense, payload, actor, session) {
    payload = { ...payload, idempotencyKey: payload.idempotencyKey || actor.idempotencyKey };
    const transactionReference = typeof payload.transactionReference === 'string' ? payload.transactionReference.trim() : null;
    const amount = round(payload.amount); const paid = round(expense.recordedPaidAmount || 0); if (amount <= 0 || amount + paid > round(expense.totalAmount)) throw new HttpError(400, 'Payment must be positive and cannot exceed outstanding amount.');
    const prior = await expenseRepository.findPaymentByIdempotencyKey(actor.orgId, payload.idempotencyKey, session); if (prior) return prior;
    if (transactionReference) { const duplicateReference = await expenseRepository.findPaymentByReference(actor.orgId, transactionReference, session); if (duplicateReference) throw new HttpError(409, 'This transaction reference has already been recorded.'); }
    const payment = await expenseRepository.createPayment({ orgId: actor.orgId, expenseId: expense._id, amount, paymentMethod: payload.paymentMethod, paymentApplication: payload.paymentApplication || 'NOT_SPECIFIED', fundingSource: payload.fundingSource, paymentDate: payload.paymentDate, transactionReference, attachmentUrl: payload.attachmentUrl || null, verificationStatus: payload.verificationStatus || 'RECORDED', recordedBy: actor.userId, idempotencyKey: payload.idempotencyKey }, session);
    expense.recordedPaidAmount = round(paid + amount); if (payment.verificationStatus === 'RECONCILED') { expense.confirmedPaidAmount = round((expense.confirmedPaidAmount || 0) + amount); await financialLedgerService.recordExpensePaymentEntry(expense, payment, session); }
    expense.outstandingAmount = round(expense.totalAmount - expense.recordedPaidAmount); expense.settlementStatus = statusFor(expense.totalAmount, expense.recordedPaidAmount); await expenseRepository.save(expense, session); return payment;
  }
  async reconcilePayment(id, paymentId, payload, actor) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session);
      if (!expense) throw new HttpError(404, 'Expense not found');
      const payment = await expenseRepository.findPayment(paymentId, id, actor.orgId, session);
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (payload.reconciliationResult !== 'CONFIRMED') throw new HttpError(400, 'A confirmed reconciliation result is required.');
      if (payment.verificationStatus === 'RECONCILED') {
        await session.abortTransaction();
        return this.getById(id, actor.orgId);
      }
      if (payment.verificationStatus !== 'RECORDED') throw new HttpError(409, 'Payment is not eligible for reconciliation.');
      const now = new Date();
      payment.verificationHistory.push({ fromStatus: payment.verificationStatus, toStatus: 'RECONCILED', changedBy: actor.userId, changedAt: now, note: payload.note || '' });
      payment.verificationStatus = 'RECONCILED';
      payment.reconciledAt = now;
      payment.reconciledBy = actor.userId;
      payment.reconciliationNote = payload.note || '';
      payment.reconciliationEvidence = Array.isArray(payload.evidence) ? payload.evidence.slice(0, 10) : [];
      await expenseRepository.savePayment(payment, session);
      expense.confirmedPaidAmount = round((expense.confirmedPaidAmount || 0) + Number(payment.amount));
      await financialLedgerService.recordExpensePaymentEntry(expense, payment, session);
      await expenseRepository.save(expense, session);
      await session.commitTransaction();
      try { await auditLogService.logEvent({ actorId: actor.userId, targetId: actor.orgId, action: 'EXPENSE_PAYMENT_RECONCILED', metadata: { expenseId: String(id), paymentId: String(paymentId), previousStatus: 'RECORDED', newStatus: 'RECONCILED', reconciledAt: now.toISOString() } }); } catch { /* audit failure does not undo committed financial data */ }
      return this.getById(id, actor.orgId);
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }
  async recordPayment(id, payload, actor) { const session = await mongoose.startSession(); try { session.startTransaction(); const expense = await expenseRepository.findById(id, actor.orgId, session); if (!expense) throw new HttpError(404, 'Expense not found'); await this._recordPayment(expense, payload, actor, session); await session.commitTransaction(); return this.getById(id, actor.orgId); } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); } }
  async getById(id, orgId) { const expense = await expenseRepository.findById(id, orgId); if (!expense) throw new HttpError(404, 'Expense not found'); return { ...(expense.toObject ? expense.toObject() : expense), payments: await expenseRepository.getPayments(id, orgId) }; }
  async list(orgId, query = {}) { const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); const match = filtersFor(query); const [records, total] = await Promise.all([expenseRepository.list(orgId, match, { skip: (page - 1) * limit, limit }), expenseRepository.count(orgId, match)]); return { records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
  async summary(orgId, query = {}) { const match = filtersFor(query); const today = new Date(); today.setHours(0, 0, 0, 0); const result = await expenseRepository.summary(orgId, match, today); return { totalExpenses: result.totals?.[0]?.totalExpenses || 0, recordedPaid: result.totals?.[0]?.recordedPaid || 0, unpaidBalance: result.totals?.[0]?.unpaidBalance || 0, todayExpenses: result.today?.[0]?.total || 0 }; }
}
export { normalizeItems, statusFor };
export default new ExpenseService();

















