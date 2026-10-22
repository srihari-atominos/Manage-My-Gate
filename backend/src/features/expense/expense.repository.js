import mongoose from 'mongoose';
import Expense from './expense.model.js';
import ExpensePayment from './expensePayment.model.js';

const activeSession = (session) => session && typeof session.inTransaction === 'function' && session.inTransaction() ? session : null;
const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);

class ExpenseRepository {
  async create(data, session = null) { const record = new Expense(data); const s = activeSession(session); return record.save(s ? { session: s } : undefined); }
  async save(expense, session = null) { const s = activeSession(session); return expense.save(s ? { session: s } : undefined); }
  async findById(id, orgId, session = null) { const q = Expense.findOne({ _id: id, orgId }); const s = activeSession(session); if (s) q.session(s); return q; }
  async findByIdempotencyKey(orgId, key, session = null) { if (!key) return null; const q = Expense.findOne({ orgId, idempotencyKey: key }); const s = activeSession(session); if (s) q.session(s); return q; }
  async list(orgId, match, { skip = 0, limit = 20 } = {}) { return Expense.find({ orgId, ...match }).sort({ createdAt: -1, expenseDate: -1, _id: -1 }).skip(skip).limit(limit).lean(); }
  async count(orgId, match) { return Expense.countDocuments({ orgId, ...match }); }
  async getPayments(expenseId, orgId) { return ExpensePayment.find({ expenseId, orgId }).sort({ createdAt: -1, paymentDate: -1 }).lean(); }
  async findPayment(id, expenseId, orgId, session = null) { const q = ExpensePayment.findOne({ _id: id, expenseId, orgId }); const s = activeSession(session); if (s) q.session(s); return q; }
  async savePayment(payment, session = null) { const s = activeSession(session); return payment.save(s ? { session: s } : undefined); }
  async findPaymentByIdempotencyKey(orgId, key, session = null) { if (!key) return null; const q = ExpensePayment.findOne({ orgId, idempotencyKey: key }); const s = activeSession(session); if (s) q.session(s); return q; }
  async findPaymentByReference(orgId, reference, session = null) { if (!reference) return null; const q = ExpensePayment.findOne({ orgId, transactionReference: reference }); const s = activeSession(session); if (s) q.session(s); return q; }
  async findPaymentByAnyReference(orgId, reference, excludeId, session = null) { if (!reference) return null; const q = ExpensePayment.findOne({ orgId, _id: { $ne: excludeId }, verificationStatus: { $ne: 'VOIDED' }, $or: [{ transactionReference: reference }, { externalTransactionReference: reference }] }); const s = activeSession(session); if (s) q.session(s); return q; }
  async activeAttemptAmount(expenseId, orgId, session = null) { const orgObjectId = toObjectId(orgId); const expenseObjectId = toObjectId(expenseId); const q = ExpensePayment.aggregate([{ $match: { expenseId: expenseObjectId, orgId: orgObjectId, recordType: 'ATTEMPT', attemptStatus: { $in: ['CREATED','LAUNCHED','PENDING','USER_REPORTED_SUCCESS','UNKNOWN'] } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]); const result = await q; return Number(result[0]?.amount || 0); }
  async reserveAttempt(expenseId, orgId, amount, session = null) { const q = Expense.findOneAndUpdate({ _id: expenseId, orgId, $expr: { $gte: [{ $subtract: ['$totalAmount', { $add: ['$recordedPaidAmount', '$upiAttemptReservedAmount'] }] }, amount] } }, { $inc: { upiAttemptReservedAmount: amount } }, { returnDocument: 'after', session }); return q; }
  async releaseAttemptReservation(expenseId, orgId, amount, session = null) { return Expense.findOneAndUpdate({ _id: expenseId, orgId, upiAttemptReservedAmount: { $gte: amount } }, { $inc: { upiAttemptReservedAmount: -amount } }, { returnDocument: 'after', session }); }
  async findStaleAttempts(cutoff, limit = 200) { return ExpensePayment.find({ recordType: 'ATTEMPT', attemptStatus: { $in: ['CREATED', 'LAUNCHED', 'PENDING'] }, createdAt: { $lt: cutoff } }).sort({ createdAt: 1 }).limit(limit).select('_id expenseId orgId').lean(); }
  async countOpenAttempts(expenseId, orgId, session = null) { const q = ExpensePayment.countDocuments({ expenseId, orgId, recordType: 'ATTEMPT' }); const s = activeSession(session); if (s) q.session(s); return q; }
  async createPayment(data, session = null) { const record = new ExpensePayment(data); const s = activeSession(session); return record.save(s ? { session: s } : undefined); }
  async summary(orgId, match = {}, options = {}) {
    const orgObjectId = toObjectId(orgId);
    const now = new Date();
    const todayStart = options.todayStart || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = options.todayEnd || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const prevMatch = options.prevMatch;

    // Isolate date-specific match to allow 'today' facet to always reflect calendar today
    const rootMatch = { ...match };
    const dateMatch = rootMatch.createdAt ? { createdAt: rootMatch.createdAt } : null;
    if (dateMatch) {
      delete rootMatch.createdAt;
    }
    const periodStages = dateMatch ? [{ $match: dateMatch }] : [];

    const facetStages = {
      totals: [
        ...periodStages,
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$totalAmount' },
            recordedPaid: { $sum: '$recordedPaidAmount' },
            unpaidBalance: { $sum: '$outstandingAmount' },
            count: { $sum: 1 },
          },
        },
      ],
      today: [
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ],
      categoryBreakdown: [
        ...periodStages,
        {
          $group: {
            _id: { $ifNull: ['$category', 'Uncategorized'] },
            amount: { $sum: '$totalAmount' },
            recordedPaid: { $sum: '$recordedPaidAmount' },
            unpaidBalance: { $sum: '$outstandingAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ],
      typeBreakdown: [
        ...periodStages,
        {
          $group: {
            _id: { $ifNull: ['$expenseType', 'OTHER'] },
            amount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ],
    };

    const [result] = await Expense.aggregate([
      { $match: { orgId: orgObjectId, ...rootMatch } },
      { $facet: facetStages },
    ]);

    let previousTotals = null;
    if (prevMatch && Object.keys(prevMatch).length > 0) {
      const [prevResult] = await Expense.aggregate([
        { $match: { orgId: orgObjectId, ...prevMatch } },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]);
      previousTotals = prevResult || { totalExpenses: 0, count: 0 };
    }

    return { ...(result || {}), previousTotals };
  }
}

export default new ExpenseRepository();
