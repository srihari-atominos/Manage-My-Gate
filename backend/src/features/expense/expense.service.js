import mongoose from 'mongoose';
import expenseRepository from './expense.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import financialLedgerService from '../ledger/financialLedger.service.js';
import auditLogService from '../auditLog/auditLog.services.js';
import Workspace from '../workspace/workspace.model.js';
import { buildExpenseReport } from './expense.export.js';
import {
  expenseEventEmitter,
  EXPENSE_CREATED,
  EXPENSE_UPDATED,
  EXPENSE_PAYMENT_RECORDED,
  EXPENSE_PAYMENT_RECONCILED,
} from './expense.events.js';

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const statusFor = (total, paid) => paid <= 0 ? 'UNPAID' : paid >= total ? 'PAID' : 'PARTIALLY_PAID';
const ATTEMPT_TTL_MS = 30 * 60 * 1000;
const EXPORT_ROW_LIMIT = 20000;
const EXPORT_PAGE_SIZE = 2000;
const assertActive = (expense) => { if (expense.lifecycleStatus === 'CANCELLED') throw new HttpError(409, 'This expense has been cancelled.'); };
const numberFor = () => `EXP-${new Date().getFullYear()}-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`;
const normalizeItems = (items = []) => items.map((item) => {
  const quantity = Number(item.quantity); const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new HttpError(400, 'Each item must have a valid quantity and unit price.');
  // OCR-prefilled rows carry only a description; the model requires itemName and unit, so default them instead of failing at save time.
  const itemName = String(item.itemName || item.description || '').trim();
  if (!itemName) throw new HttpError(400, 'Each item must have a name.');
  return { ...item, itemName, unit: String(item.unit || '').trim() || 'nos', quantity, unitPrice, lineTotal: round(quantity * unitPrice) };
});
const normalizeExternalResponse = (response) => {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  const allowed = ['status', 'transactionId', 'referenceId', 'responseCode', 'approvalRefNo', 'errorCode', 'raw'];
  const result = {};
  allowed.forEach((key) => { if (typeof response[key] === 'string' && response[key].trim()) result[key] = response[key].trim().slice(0, key === 'raw' ? 2000 : 200); });
  return Object.keys(result).length ? result : null;
};
const resolvePeriodBounds = (period, customStart, customEnd) => {
  const p = String(period || 'ALL_TIME').toUpperCase();
  const now = new Date();
  let start = null;
  let end = null;
  let prevStart = null;
  let prevEnd = null;

  if (p === 'TODAY') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (p === 'WEEKLY' || p === 'THIS_WEEK') {
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = new Date(start.getTime() - 1);
  } else if (p === 'MONTHLY' || p === 'THIS_MONTH') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (p === 'YEARLY' || p === 'THIS_YEAR') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else if (customStart || customEnd) {
    start = customStart ? new Date(customStart) : null;
    end = customEnd ? new Date(customEnd) : null;
  }

  return { period: p, start, end, prevStart, prevEnd };
};

const filtersFor = (query = {}) => {
  const match = {};
  if (query.search) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { name: new RegExp(escaped, 'i') },
      { expenseNumber: new RegExp(escaped, 'i') },
      { 'vendor.name': new RegExp(escaped, 'i') },
      { category: new RegExp(escaped, 'i') },
    ];
  }
  if (String(query.includeCancelled) !== 'true') match.lifecycleStatus = { $ne: 'CANCELLED' };
  ['expenseType', 'category', 'settlementStatus'].forEach((key) => {
    if (query[key] && typeof query[key] === 'string') match[key] = query[key];
  });

  const periodBounds = resolvePeriodBounds(query.period, query.startDate, query.endDate);
  const parseDate = (value, endOfDay) => {
    if (typeof value !== 'string') throw new HttpError(400, 'Invalid date filter.');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Invalid date filter.');
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  };
  const effectiveStart = query.startDate ? parseDate(query.startDate, false) : periodBounds.start;
  const effectiveEnd = query.endDate ? parseDate(query.endDate, true) : periodBounds.end;

  if (effectiveStart || effectiveEnd) {
    // Filter on the date the expense happened, not when it was keyed in: a bill dated last month and entered today belongs to last month.
    match.expenseDate = {};
    if (effectiveStart) match.expenseDate.$gte = effectiveStart;
    if (effectiveEnd) match.expenseDate.$lte = effectiveEnd;
  }
  return match;
};

class ExpenseService {
  async getOnlinePayee(orgId) {
    const workspace = await Workspace.findOne({ organizationId: orgId }).select('settings').lean();
    const settings = workspace?.settings && typeof workspace.settings === 'object' ? workspace.settings : {};
    const configured = settings.expenseOnlinePayee && typeof settings.expenseOnlinePayee === 'object' ? settings.expenseOnlinePayee : {};
    const upiId = String(configured.upiId || '').trim();
    const name = String(configured.name || 'Community payee').trim();
    const valid = /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(upiId);
    return valid ? { configured: true, name, upiId } : { configured: false };
  }

  async create(payload, actor) {
    payload = { ...payload, idempotencyKey: payload.idempotencyKey || actor.idempotencyKey };
    const items = normalizeItems(payload.items || []); const itemSubtotal = round(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const suppliedSubtotal = round(payload.subtotal || 0); if (items.length && suppliedSubtotal !== itemSubtotal) throw new HttpError(400, 'Subtotal must equal recalculated item total.'); const subtotal = items.length ? itemSubtotal : suppliedSubtotal;
    const cgst = round(payload.cgst || 0); const sgst = round(payload.sgst || 0); const calculatedTax = round(cgst + sgst); const taxAmount = round(payload.taxAmount !== undefined ? payload.taxAmount : calculatedTax); const additionalCharges = round(payload.additionalCharges || 0); const totalAmount = round(subtotal + taxAmount + additionalCharges);
    if (totalAmount <= 0) throw new HttpError(400, 'Expense total must be greater than zero.');
    const session = await mongoose.startSession();
    try {
      session.startTransaction(); const existing = await expenseRepository.findByIdempotencyKey(actor.orgId, payload.idempotencyKey, session);
      if (existing) { await session.abortTransaction(); return this.getById(existing._id, actor.orgId); }
      const expense = await expenseRepository.create({ orgId: actor.orgId, expenseNumber: numberFor(), name: payload.name, description: payload.description || '', expenseType: payload.expenseType, category: payload.category, vendor: payload.vendor || {}, expenseDate: payload.expenseDate, invoiceNumber: payload.invoiceNumber, invoiceDate: payload.invoiceDate, dueDate: payload.dueDate, items, subtotal, cgst, sgst, taxAmount, additionalCharges, totalAmount, outstandingAmount: totalAmount, attachments: payload.attachments || [], recordedBy: actor.userId, idempotencyKey: payload.idempotencyKey }, session);
      await financialLedgerService.recordExpenseIncurredEntry({ ...expense.toObject(), fundingSource: payload.initialPayment?.fundingSource }, session);
      if (payload.initialPayment) await this._recordPayment(expense, payload.initialPayment, actor, session);
      await session.commitTransaction();
      const saved = await this.getById(expense._id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_CREATED, saved); } catch {}
      return saved;
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }
  async _recordPayment(expense, payload, actor, session) {
    payload = { ...payload, idempotencyKey: payload.idempotencyKey || actor.idempotencyKey };
    const transactionReference = typeof payload.transactionReference === 'string' ? payload.transactionReference.trim() : null;
    const prior = await expenseRepository.findPaymentByIdempotencyKey(actor.orgId, payload.idempotencyKey, session); if (prior) return prior;
    assertActive(expense);
    const amount = round(payload.amount); const paid = round(expense.recordedPaidAmount || 0); const reserved = round(expense.upiAttemptReservedAmount || 0);
    if (!(amount > 0) || amount + paid > round(expense.totalAmount)) throw new HttpError(400, 'Payment must be positive and cannot exceed outstanding amount.');
    if (amount + paid + reserved > round(expense.totalAmount)) throw new HttpError(409, 'Part of the outstanding balance is held by a pending UPI payment attempt.');
    if (transactionReference) { const duplicateReference = await expenseRepository.findPaymentByReference(actor.orgId, transactionReference, session); if (duplicateReference) throw new HttpError(409, 'This transaction reference has already been recorded.'); }
    const isAutoReconcile = Boolean(payload.autoReconcile);
    const initialVerificationStatus = isAutoReconcile ? 'RECONCILED' : 'RECORDED';
    const now = new Date();
    const payment = await expenseRepository.createPayment({
      orgId: actor.orgId,
      expenseId: expense._id,
      amount,
      paymentMethod: payload.paymentMethod,
      paymentApplication: payload.paymentApplication || 'NOT_SPECIFIED',
      fundingSource: payload.fundingSource,
      paymentDate: payload.paymentDate,
      transactionReference,
      attachmentUrl: payload.attachmentUrl || null,
      verificationStatus: initialVerificationStatus,
      reconciledAt: isAutoReconcile ? now : null,
      reconciledBy: isAutoReconcile ? actor.userId : null,
      reconciliationNote: isAutoReconcile ? (payload.reconciliationNote || 'Direct settlement confirmed by user') : '',
      verificationHistory: isAutoReconcile ? [{ fromStatus: 'RECORDED', toStatus: 'RECONCILED', changedBy: actor.userId, changedAt: now, note: payload.reconciliationNote || 'Direct settlement confirmed by user' }] : [],
      recordedBy: actor.userId,
      idempotencyKey: payload.idempotencyKey
    }, session);
    expense.recordedPaidAmount = round(paid + amount); if (payment.verificationStatus === 'RECONCILED') { expense.confirmedPaidAmount = round((expense.confirmedPaidAmount || 0) + amount); await financialLedgerService.recordExpensePaymentEntry(expense, payment, session); }
    expense.outstandingAmount = round(expense.totalAmount - expense.recordedPaidAmount); expense.settlementStatus = statusFor(expense.totalAmount, expense.recordedPaidAmount); await expenseRepository.save(expense, session); return payment;
  }
  async createPaymentAttempt(id, payload, actor) {
    const session = await mongoose.startSession();
    try { session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session); if (!expense) throw new HttpError(404, 'Expense not found'); assertActive(expense);
      const replay = await expenseRepository.findPaymentByIdempotencyKey(actor.orgId, payload.idempotencyKey, session);
      if (replay) { await session.abortTransaction(); return replay; }
      const amount = round(payload.amount); const outstanding = round(expense.totalAmount - Number(expense.recordedPaidAmount || 0)); const vendorUpiId = String(expense.vendor?.upiId || '').trim(); if (!/^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(vendorUpiId)) throw new HttpError(400, 'A valid vendor UPI ID is required for online payment.');
      if (amount <= 0 || amount > outstanding) throw new HttpError(400, 'Attempt amount must be positive and no greater than the outstanding balance.'); const reservedExpense = await expenseRepository.reserveAttempt(expense._id, actor.orgId, amount, session); if (!reservedExpense) throw new HttpError(409, 'The available outstanding balance is reserved by another payment attempt.');
      const attempt = await expenseRepository.createPayment({ orgId: actor.orgId, expenseId: expense._id, amount, paymentMethod: 'UPI', paymentApplication: payload.paymentApplication, fundingSource: payload.fundingSource, paymentDate: new Date(), recordedBy: actor.userId, idempotencyKey: payload.idempotencyKey, recordType: 'ATTEMPT', attemptStatus: 'CREATED', verificationStatus: 'PENDING_VERIFICATION', externalTransactionReference: null }, session);
      await session.commitTransaction(); return attempt;
    } catch(e) { if(session.inTransaction()) await session.abortTransaction(); throw e; } finally { await session.endSession(); }
  }
  async getPaymentAttempt(id, paymentId, actor) { const expense=await expenseRepository.findById(id,actor.orgId); if(!expense) throw new HttpError(404,'Expense not found'); const payment=await expenseRepository.findPayment(paymentId,id,actor.orgId); if(!payment || payment.recordType !== 'ATTEMPT') throw new HttpError(404,'Payment attempt not found'); return payment; }
  async updatePaymentAttempt(id, paymentId, payload, actor) {
    const session=await mongoose.startSession(); try { session.startTransaction();
      const expense=await expenseRepository.findById(id,actor.orgId,session); if(!expense) throw new HttpError(404,'Expense not found');
      const attempt=await expenseRepository.findPayment(paymentId,id,actor.orgId,session); if(!attempt || attempt.recordType !== 'ATTEMPT') throw new HttpError(404,'Payment attempt not found');
      if(['USER_REPORTED_SUCCESS','USER_REPORTED_FAILED','CANCELLED'].includes(attempt.attemptStatus) || (attempt.attemptStatus === 'UNKNOWN' && payload.outcome === 'UNKNOWN')) { await session.abortTransaction(); return attempt; }
      const reference = typeof payload.transactionReference === 'string' ? payload.transactionReference.trim() : '';
      // One UTR can only settle one payment, so the same screenshot cannot be reused for another expense.
      if (payload.outcome === 'COMPLETED' && reference && await expenseRepository.findPaymentByAnyReference(actor.orgId, reference, attempt._id, session)) throw new HttpError(409, 'This transaction reference has already been used for another payment.');
      if (payload.paymentDate) { const reportedDate = new Date(payload.paymentDate); if (!Number.isNaN(reportedDate.getTime()) && reportedDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000) attempt.paymentDate = reportedDate; }
      const map={COMPLETED:'USER_REPORTED_SUCCESS',NOT_COMPLETED:'USER_REPORTED_FAILED',UNKNOWN:'UNKNOWN'}; attempt.attemptStatus=map[payload.outcome]; attempt.userReportedOutcome=payload.outcome; attempt.userReportedAt=new Date(); attempt.externalTransactionReference=reference || attempt.externalTransactionReference; attempt.externalResponse=normalizeExternalResponse(payload.response) || attempt.externalResponse; attempt.userReportedAmount=payload.amount == null ? attempt.userReportedAmount : round(payload.amount); if(payload.outcome==='NOT_COMPLETED') await expenseRepository.releaseAttemptReservation(expense._id, actor.orgId, Number(attempt.amount), session); attempt.userReportedEvidence = Array.isArray(payload.evidence) ? payload.evidence.slice(0, 10) : attempt.userReportedEvidence; if(payload.outcome==='COMPLETED') attempt.verificationStatus='PENDING_VERIFICATION'; await expenseRepository.savePayment(attempt,session); await session.commitTransaction(); return attempt;
    } catch(e) { if(session.inTransaction()) await session.abortTransaction(); throw e; } finally { await session.endSession(); }
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
      const isAttemptReconciliation = payment.recordType === 'ATTEMPT';
      if (isAttemptReconciliation && payment.userReportedOutcome !== 'COMPLETED') throw new HttpError(409, 'Only a user-reported completed attempt can be reconciled after independent verification.');
      if (!isAttemptReconciliation && payment.verificationStatus !== 'RECORDED') throw new HttpError(409, 'Payment is not eligible for reconciliation.');
      const previousVerificationStatus = payment.verificationStatus;
      if (isAttemptReconciliation) {
        if (round((expense.recordedPaidAmount || 0) + Number(payment.amount)) > round(expense.totalAmount)) throw new HttpError(409, 'Reconciling this payment would exceed the expense total.');
        const reference = payment.externalTransactionReference || payment.transactionReference;
        if (reference) {
          const duplicate = await expenseRepository.findPaymentByReference(actor.orgId, reference, session);
          if (duplicate && String(duplicate._id) !== String(payment._id)) throw new HttpError(409, 'This transaction reference has already been recorded.');
          payment.transactionReference = reference;
        }
        payment.recordType = 'RECORDED'; payment.attemptStatus = null; payment.verificationStatus = 'RECORDED';
      }
      const now = new Date();
      payment.verificationHistory.push({ fromStatus: previousVerificationStatus, toStatus: 'RECONCILED', changedBy: actor.userId, changedAt: now, note: payload.note || '' });
      payment.verificationStatus = 'RECONCILED';
      payment.reconciledAt = now;
      payment.reconciledBy = actor.userId;
      payment.reconciliationNote = payload.note || '';
      payment.reconciliationEvidence = Array.isArray(payload.evidence) ? payload.evidence.slice(0, 10) : [];
      await expenseRepository.savePayment(payment, session);
      if (isAttemptReconciliation) { expense.recordedPaidAmount = round((expense.recordedPaidAmount || 0) + Number(payment.amount)); await expenseRepository.releaseAttemptReservation(expense._id, actor.orgId, Number(payment.amount), session); expense.outstandingAmount = round(expense.totalAmount - expense.recordedPaidAmount); expense.settlementStatus = statusFor(expense.totalAmount, expense.recordedPaidAmount); }
      expense.confirmedPaidAmount = round((expense.confirmedPaidAmount || 0) + Number(payment.amount));
      await financialLedgerService.recordExpensePaymentEntry(expense, payment, session);
      await expenseRepository.save(expense, session);
      await session.commitTransaction();
      try { await auditLogService.logEvent({ actorId: actor.userId, targetId: actor.orgId, action: 'EXPENSE_PAYMENT_RECONCILED', metadata: { expenseId: String(id), paymentId: String(paymentId), previousStatus: 'RECORDED', newStatus: 'RECONCILED', reconciledAt: now.toISOString() } }); } catch { /* audit failure does not undo committed financial data */ }
      const saved = await this.getById(id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_PAYMENT_RECONCILED, { expense: saved, payment }); } catch {}
      return saved;
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }
  async recordPayment(id, payload, actor) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session);
      if (!expense) throw new HttpError(404, 'Expense not found');
      const payment = await this._recordPayment(expense, payload, actor, session);
      await session.commitTransaction();
      const saved = await this.getById(id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_PAYMENT_RECORDED, { expense: saved, payment }); } catch {}
      return saved;
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
  async getById(id, orgId) { const expense = await expenseRepository.findById(id, orgId); if (!expense) throw new HttpError(404, 'Expense not found'); return { ...(expense.toObject ? expense.toObject() : expense), payments: await expenseRepository.getPayments(id, orgId) }; }
  async list(orgId, query = {}) { const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); const match = filtersFor(query); const [records, total] = await Promise.all([expenseRepository.list(orgId, match, { skip: (page - 1) * limit, limit }), expenseRepository.count(orgId, match)]); return { records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
  async summary(orgId, query = {}) {
    const match = filtersFor(query);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const periodInfo = resolvePeriodBounds(query.period, query.startDate, query.endDate);
    let prevMatch = null;
    if (periodInfo.prevStart && periodInfo.prevEnd) {
      prevMatch = { ...match };
      prevMatch.expenseDate = {
        $gte: periodInfo.prevStart,
        $lte: periodInfo.prevEnd,
      };
    }

    const result = await expenseRepository.summary(orgId, match, {
      todayStart,
      todayEnd,
      prevMatch,
    });

    const totalExpenses = result.totals?.[0]?.totalExpenses || 0;
    const recordedPaid = result.totals?.[0]?.recordedPaid || 0;
    const unpaidBalance = result.totals?.[0]?.unpaidBalance || 0;
    const expenseCount = result.totals?.[0]?.count || 0;
    const todayExpenses = result.today?.[0]?.total || 0;

    const categories = (result.categoryBreakdown || []).map((cat) => ({
      category: cat._id,
      amount: cat.amount || 0,
      recordedPaid: cat.recordedPaid || 0,
      unpaidBalance: cat.unpaidBalance || 0,
      count: cat.count || 0,
      percentage: totalExpenses > 0 ? Math.round(((cat.amount || 0) / totalExpenses) * 1000) / 10 : 0,
    }));

    const types = (result.typeBreakdown || []).map((t) => ({
      type: t._id,
      amount: t.amount || 0,
      count: t.count || 0,
    }));

    const prevTotal = result.previousTotals?.totalExpenses || 0;
    const difference = totalExpenses - prevTotal;
    let percentageChange = null;
    let trendDirection = 'flat';
    if (prevTotal > 0) {
      percentageChange = Math.round(((totalExpenses - prevTotal) / prevTotal) * 1000) / 10;
      trendDirection = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'flat';
    } else if (totalExpenses > 0) {
      percentageChange = 100;
      trendDirection = 'up';
    }

    return {
      period: periodInfo.period,
      startDate: periodInfo.start ? periodInfo.start.toISOString() : null,
      endDate: periodInfo.end ? periodInfo.end.toISOString() : null,
      totalExpenses,
      recordedPaid,
      unpaidBalance,
      todayExpenses,
      expenseCount,
      categoryBreakdown: categories,
      typeBreakdown: types,
      comparison: {
        previousTotal: prevTotal,
        difference,
        percentageChange,
        trendDirection,
      },
    };
  }

  async expireStaleAttempts(now = new Date()) {
    const stale = await expenseRepository.findStaleAttempts(new Date(now.getTime() - ATTEMPT_TTL_MS));
    let expired = 0;
    for (const ref of stale) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const attempt = await expenseRepository.findPayment(ref._id, ref.expenseId, ref.orgId, session);
        if (!attempt || attempt.recordType !== 'ATTEMPT' || !['CREATED', 'LAUNCHED', 'PENDING'].includes(attempt.attemptStatus)) { await session.abortTransaction(); continue; }
        attempt.attemptStatus = 'CANCELLED';
        attempt.verificationHistory.push({ fromStatus: attempt.verificationStatus, toStatus: attempt.verificationStatus, changedAt: now, note: 'Attempt expired without a reported outcome.' });
        await expenseRepository.savePayment(attempt, session);
        await expenseRepository.releaseAttemptReservation(attempt.expenseId, attempt.orgId, Number(attempt.amount), session);
        await session.commitTransaction();
        expired += 1;
      } catch (error) { if (session.inTransaction()) await session.abortTransaction(); } finally { await session.endSession(); }
    }
    return { expired };
  }

  async update(id, payload, actor) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session);
      if (!expense) throw new HttpError(404, 'Expense not found');
      assertActive(expense);
      ['name', 'description', 'expenseType', 'category', 'invoiceNumber', 'invoiceDate', 'dueDate', 'expenseDate'].forEach((key) => { if (payload[key] !== undefined) expense[key] = payload[key]; });
      if (payload.vendor && typeof payload.vendor === 'object') expense.vendor = { ...(expense.vendor?.toObject?.() || expense.vendor || {}), ...payload.vendor };
      const financial = ['items', 'subtotal', 'cgst', 'sgst', 'taxAmount', 'additionalCharges'].some((key) => payload[key] !== undefined);
      if (financial) {
        if (round(expense.recordedPaidAmount || 0) > 0 || round(expense.upiAttemptReservedAmount || 0) > 0 || await expenseRepository.countOpenAttempts(expense._id, actor.orgId, session)) throw new HttpError(409, 'Amounts cannot be changed once a payment or payment attempt exists. Void the payments first.');
        const items = payload.items !== undefined ? normalizeItems(payload.items) : expense.items.map((item) => item.toObject());
        const itemSubtotal = round(items.reduce((sum, item) => sum + item.lineTotal, 0));
        if (payload.items !== undefined && items.length && payload.subtotal !== undefined && round(payload.subtotal) !== itemSubtotal) throw new HttpError(400, 'Subtotal must equal recalculated item total.');
        const subtotal = items.length ? itemSubtotal : round(payload.subtotal !== undefined ? payload.subtotal : expense.subtotal);
        const cgst = round(payload.cgst !== undefined ? payload.cgst : (expense.cgst || 0));
        const sgst = round(payload.sgst !== undefined ? payload.sgst : (expense.sgst || 0));
        const calculatedTax = (payload.cgst !== undefined || payload.sgst !== undefined) ? round(cgst + sgst) : undefined;
        const taxAmount = round(payload.taxAmount !== undefined ? payload.taxAmount : (calculatedTax !== undefined ? calculatedTax : expense.taxAmount));
        const additionalCharges = round(payload.additionalCharges !== undefined ? payload.additionalCharges : expense.additionalCharges);
        const totalAmount = round(subtotal + taxAmount + additionalCharges);
        if (totalAmount <= 0) throw new HttpError(400, 'Expense total must be greater than zero.');
        const delta = round(totalAmount - expense.totalAmount);
        expense.items = items; expense.subtotal = subtotal; expense.cgst = cgst; expense.sgst = sgst; expense.taxAmount = taxAmount; expense.additionalCharges = additionalCharges;
        if (delta !== 0) {
          expense.revision = (expense.revision || 0) + 1;
          expense.totalAmount = totalAmount; expense.outstandingAmount = totalAmount;
          await financialLedgerService.recordExpenseAdjustmentEntry(expense, delta, expense.revision, session);
        }
      }
      await expenseRepository.save(expense, session);
      await session.commitTransaction();
      try { await auditLogService.logEvent({ actorId: actor.userId, targetId: actor.orgId, action: 'EXPENSE_UPDATED', metadata: { expenseId: String(id), fields: Object.keys(payload) } }); } catch { /* audit failure does not undo committed financial data */ }
      const saved = await this.getById(id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_UPDATED, saved); } catch {}
      return saved;
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }

  async cancel(id, payload, actor) {
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new HttpError(400, 'A cancellation reason is required.');
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session);
      if (!expense) throw new HttpError(404, 'Expense not found');
      if (expense.lifecycleStatus === 'CANCELLED') { await session.abortTransaction(); return this.getById(id, actor.orgId); }
      if (round(expense.recordedPaidAmount || 0) > 0 || round(expense.upiAttemptReservedAmount || 0) > 0) throw new HttpError(409, 'Void all payments and resolve pending payment attempts before cancelling this expense.');
      await financialLedgerService.reverseExpenseEntry(expense, `${expense._id}:EXPENSE_INCURRED`, `${expense._id}:EXPENSE_CANCELLATION`, `Community expense cancelled: ${expense.expenseNumber}`, session);
      // Later amount adjustments moved the accrued total; reverse each so the ledger nets to zero.
      for (let revision = 1; revision <= (expense.revision || 0); revision += 1) await financialLedgerService.reverseExpenseEntry(expense, `${expense._id}:EXPENSE_ADJUSTMENT:${revision}`, `${expense._id}:EXPENSE_ADJUSTMENT_CANCELLATION:${revision}`, `Community expense cancelled: ${expense.expenseNumber}`, session);
      expense.lifecycleStatus = 'CANCELLED'; expense.cancelledAt = new Date(); expense.cancelledBy = actor.userId; expense.cancellationReason = reason.slice(0, 500);
      expense.outstandingAmount = 0;
      await expenseRepository.save(expense, session);
      await session.commitTransaction();
      try { await auditLogService.logEvent({ actorId: actor.userId, targetId: actor.orgId, action: 'EXPENSE_CANCELLED', metadata: { expenseId: String(id), reason: reason.slice(0, 500) } }); } catch { /* audit failure does not undo committed financial data */ }
      const saved = await this.getById(id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_UPDATED, saved); } catch {}
      return saved;
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }

  async voidPayment(id, paymentId, payload, actor) {
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new HttpError(400, 'A void reason is required.');
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await expenseRepository.findById(id, actor.orgId, session);
      if (!expense) throw new HttpError(404, 'Expense not found');
      const payment = await expenseRepository.findPayment(paymentId, id, actor.orgId, session);
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (payment.verificationStatus === 'VOIDED') { await session.abortTransaction(); return this.getById(id, actor.orgId); }
      if (payment.recordType === 'ATTEMPT') throw new HttpError(409, 'Payment attempts cannot be voided; they expire or are resolved by the payer.');
      const wasReconciled = payment.verificationStatus === 'RECONCILED';
      const now = new Date();
      payment.verificationHistory.push({ fromStatus: payment.verificationStatus, toStatus: 'VOIDED', changedBy: actor.userId, changedAt: now, note: reason.slice(0, 500) });
      payment.verificationStatus = 'VOIDED'; payment.voidedAt = now; payment.voidedBy = actor.userId; payment.voidReason = reason.slice(0, 500);
      // Free the reference so the corrected payment can be re-entered with the same UTR.
      payment.voidedTransactionReference = payment.transactionReference; payment.transactionReference = null;
      await expenseRepository.savePayment(payment, session);
      if (wasReconciled) {
        await financialLedgerService.reverseExpenseEntry(expense, `${payment._id}:EXPENSE_PAYMENT`, `${payment._id}:EXPENSE_PAYMENT_VOID`, `Voided expense payment for ${expense.expenseNumber}`, session);
        expense.confirmedPaidAmount = Math.max(0, round((expense.confirmedPaidAmount || 0) - Number(payment.amount)));
      }
      expense.recordedPaidAmount = Math.max(0, round((expense.recordedPaidAmount || 0) - Number(payment.amount)));
      expense.outstandingAmount = round(expense.totalAmount - expense.recordedPaidAmount);
      expense.settlementStatus = statusFor(expense.totalAmount, expense.recordedPaidAmount);
      await expenseRepository.save(expense, session);
      await session.commitTransaction();
      try { await auditLogService.logEvent({ actorId: actor.userId, targetId: actor.orgId, action: 'EXPENSE_PAYMENT_VOIDED', metadata: { expenseId: String(id), paymentId: String(paymentId), reason: reason.slice(0, 500), wasReconciled } }); } catch { /* audit failure does not undo committed financial data */ }
      const saved = await this.getById(id, actor.orgId);
      try { expenseEventEmitter.emit(EXPENSE_UPDATED, saved); } catch {}
      return saved;
    } catch (error) { if (session.inTransaction()) await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }

  async export(orgId, query = {}, meta = {}) {
    const match = filtersFor(query);
    const total = await expenseRepository.count(orgId, match);
    if (total > EXPORT_ROW_LIMIT) throw new HttpError(413, `Export has ${total} rows, above the ${EXPORT_ROW_LIMIT} row limit. Narrow the date range or filters.`);
    const records = [];
    for (let skip = 0; skip < total; skip += EXPORT_PAGE_SIZE) {
      records.push(...await expenseRepository.list(orgId, match, { skip, limit: EXPORT_PAGE_SIZE }));
    }

    if (records.length > 0) {
      const expenseIds = records.map((r) => r._id);
      const ExpensePayment = (await import('./expensePayment.model.js')).default;
      const payments = await ExpensePayment.find({
        expenseId: { $in: expenseIds },
        verificationStatus: { $ne: 'VOIDED' },
      }).sort({ paymentDate: -1, createdAt: -1 }).lean();

      const paymentMap = new Map();
      payments.forEach((p) => {
        const idStr = String(p.expenseId);
        if (!paymentMap.has(idStr)) paymentMap.set(idStr, []);
        paymentMap.get(idStr).push(p);
      });

      records.forEach((r) => {
        r.payments = paymentMap.get(String(r._id)) || [];
      });
    }

    return buildExpenseReport(records, query, meta);
  }
}
export { normalizeItems, statusFor };
export default new ExpenseService();

















