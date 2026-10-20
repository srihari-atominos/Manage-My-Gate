import Expense from './expense.model.js';
import ExpensePayment from './expensePayment.model.js';

const activeSession = (session) => session && typeof session.inTransaction === 'function' && session.inTransaction() ? session : null;

class ExpenseRepository {
  async create(data, session = null) { const record = new Expense(data); const s = activeSession(session); return record.save(s ? { session: s } : undefined); }
  async save(expense, session = null) { const s = activeSession(session); return expense.save(s ? { session: s } : undefined); }
  async findById(id, orgId, session = null) { const q = Expense.findOne({ _id: id, orgId }); const s = activeSession(session); if (s) q.session(s); return q; }
  async findByIdempotencyKey(orgId, key, session = null) { if (!key) return null; const q = Expense.findOne({ orgId, idempotencyKey: key }); const s = activeSession(session); if (s) q.session(s); return q; }
  async list(orgId, match, { skip = 0, limit = 20 } = {}) { return Expense.find({ orgId, ...match }).sort({ expenseDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(); }
  async count(orgId, match) { return Expense.countDocuments({ orgId, ...match }); }
  async getPayments(expenseId, orgId) { return ExpensePayment.find({ expenseId, orgId }).sort({ paymentDate: -1 }).lean(); }
  async findPayment(id, expenseId, orgId, session = null) { const q = ExpensePayment.findOne({ _id: id, expenseId, orgId }); const s = activeSession(session); if (s) q.session(s); return q; }
  async savePayment(payment, session = null) { const s = activeSession(session); return payment.save(s ? { session: s } : undefined); }
  async findPaymentByIdempotencyKey(orgId, key, session = null) { if (!key) return null; const q = ExpensePayment.findOne({ orgId, idempotencyKey: key }); const s = activeSession(session); if (s) q.session(s); return q; }
  async findPaymentByReference(orgId, reference, session = null) { if (!reference) return null; const q = ExpensePayment.findOne({ orgId, transactionReference: reference }); const s = activeSession(session); if (s) q.session(s); return q; }
  async createPayment(data, session = null) { const record = new ExpensePayment(data); const s = activeSession(session); return record.save(s ? { session: s } : undefined); }
  async summary(orgId, match, todayStart) { const [result] = await Expense.aggregate([{ $match: { orgId, ...match } }, { $facet: { totals: [{ $group: { _id: null, totalExpenses: { $sum: '$totalAmount' }, recordedPaid: { $sum: '$recordedPaidAmount' }, unpaidBalance: { $sum: '$outstandingAmount' } } }], today: [{ $match: { expenseDate: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }] } }]); return result || {}; }
}
export default new ExpenseRepository();





