import Invoice from '../invoice/invoice.model.js';
import Payment from '../payment/payment.model.js';
import Expense from '../expense/expense.model.js';
import ExpensePayment from '../expense/expensePayment.model.js';
import FinancialLedgerEntry from '../ledger/financialLedgerEntry.model.js';
import ReconciliationException from '../ledger/reconciliation/models/reconciliationException.model.js';
import HttpError from '../../utils/httpError.utils.js';

export const INVOICE_STATUSES = new Set(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VERIFICATION_PENDING', 'CANCELLED']);
const SUCCESS = new Set(['success', 'PAID']);
const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const id = (value) => String(value || '');

export const isSuccessfulPayment = (payment) => SUCCESS.has(payment?.status);
export const isCompletedRefund = (payment) => payment?.type === 'Refund' && payment?.status === 'success';
export const isSuccessfulCollection = (payment) => isSuccessfulPayment(payment) && payment?.type !== 'Refund';

const parseCalendarDate = (value, name, endOfDay = false) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, `${name} must be a valid calendar date (YYYY-MM-DD).`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new HttpError(400, `${name} must be a valid calendar date (YYYY-MM-DD).`);
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const buildDateRange = (query, field) => {
  if (!query.startDate && !query.endDate) return {};
  const range = {};
  if (query.startDate) range.$gte = parseCalendarDate(query.startDate, 'startDate');
  if (query.endDate) range.$lte = parseCalendarDate(query.endDate, 'endDate', true);
  if (range.$gte && range.$lte && range.$gte > range.$lte) throw new HttpError(400, 'endDate must not be earlier than startDate.');
  return { [field]: range };
};

export const validateDashboardFilters = (query = {}) => {
  if (query.invoiceStatus !== undefined && !INVOICE_STATUSES.has(query.invoiceStatus)) throw new HttpError(400, 'invoiceStatus is not supported.');
  buildDateRange(query, 'createdAt');
};

export const calculateInvoiceSummary = (invoices = []) => {
  const active = invoices.filter((invoice) => !invoice.isDeleted && invoice.status !== 'CANCELLED');
  const carriedSourceIds = new Set();
  active.forEach((invoice) => (invoice.carryForwardHistory || []).forEach((history) => { if (history.invoiceId) carriedSourceIds.add(id(history.invoiceId)); }));
  // A successor is canonical at generation time. The model does not allocate a
  // partial payment between current and carried components, so source balances are
  // disclosed separately rather than added again to an exact-looking total.
  const canonicalInvoices = active.filter((invoice) => !carriedSourceIds.has(id(invoice._id)));
  const sourceInvoices = active.filter((invoice) => carriedSourceIds.has(id(invoice._id)));
  const statuses = Object.fromEntries(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE', 'VERIFICATION_PENDING'].map((status) => [status, 0]));
  active.forEach((invoice) => { if (statuses[invoice.status] !== undefined) statuses[invoice.status] += 1; });
  return {
    invoiceCount: active.length,
    statusCounts: statuses,
    currentPeriodCharges: round(active.reduce((sum, invoice) => sum + Number(invoice.currentCharge || 0), 0)),
    previousOutstandingCarried: round(active.reduce((sum, invoice) => sum + Number(invoice.previousOutstanding || 0), 0)),
    outstandingDues: round(canonicalInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0)),
    carryForwardSourceInvoicesExcluded: carriedSourceIds.size,
    unallocatedCarryForwardSourceOutstanding: round(sourceInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0)),
    outstandingDuesAllocationStatus: sourceInvoices.length ? 'CARRY_FORWARD_COMPONENT_ALLOCATION_UNAVAILABLE' : 'CANONICAL_INVOICE_TOTALS',
  };
};

export const summarizeCollections = (payments = []) => {
  const residentPayments = payments.filter((payment) => payment.domain === 'INVOICE' || payment.referenceType === 'Invoice');
  const successfulCollections = residentPayments.filter(isSuccessfulCollection);
  const completedRefunds = residentPayments.filter(isCompletedRefund);
  const grossSuccessfulCollections = round(successfulCollections.reduce((sum, payment) => sum + Math.abs(Number(payment.amount || 0)), 0));
  const completedRefundAmount = round(completedRefunds.reduce((sum, payment) => sum + Math.abs(Number(payment.amount || 0)), 0));
  return { grossSuccessfulCollections, completedRefunds: completedRefundAmount, netCollectionsAfterRefunds: round(grossSuccessfulCollections - completedRefundAmount), successfulCollections, completedRefundRecords: completedRefunds };
};

class CommunityFinanceService {
  async getDashboard(orgId, query = {}) {
    validateDashboardFilters(query);
    const invoiceFilter = { orgId, isDeleted: { $ne: true }, ...buildDateRange(query, 'createdAt') };
    if (query.invoiceStatus) invoiceFilter.status = query.invoiceStatus;
    const expenseFilter = { orgId, lifecycleStatus: { $ne: 'CANCELLED' }, ...buildDateRange(query, 'expenseDate') };
    const paymentFilter = { orgId, isDeleted: { $ne: true }, ...buildDateRange(query, 'createdAt') };
    const expensePaymentFilter = { orgId, verificationStatus: { $ne: 'VOIDED' }, ...buildDateRange(query, 'paymentDate') };
    const [invoices, payments, expenses, expensePayments, unresolved, ledgers] = await Promise.all([
      Invoice.find(invoiceFilter).select('status currentCharge previousOutstanding carryForwardHistory outstandingAmount paidAmount totalAmount invoiceNumber createdAt').lean(),
      Payment.find(paymentFilter).select('status type parentPaymentId amount paymentMethod paymentReference gatewayTransactionId receiptNumber referenceId referenceType domain paymentCategory createdAt').sort({ createdAt: -1 }).limit(200).lean(),
      Expense.find(expenseFilter).select('_id expenseNumber totalAmount recordedPaidAmount confirmedPaidAmount outstandingAmount settlementStatus expenseDate').lean(),
      ExpensePayment.find(expensePaymentFilter).select('expenseId amount verificationStatus recordType paymentMethod transactionReference externalTransactionReference paymentDate').sort({ paymentDate: -1 }).limit(200).lean(),
      ReconciliationException.find({ orgId, status: { $in: ['OPEN', 'UNDER_REVIEW', 'REVIEWED'] } }).sort({ createdAt: -1 }).limit(100).lean(),
      FinancialLedgerEntry.find({ orgId }).select('paymentId entries transactionId').lean(),
    ]);
    const activeExpenseIds = new Set(expenses.map((expense) => id(expense._id)));
    const linkedExpensePayments = expensePayments.filter((payment) => activeExpenseIds.has(id(payment.expenseId)));
    const excludedExpensePayments = expensePayments.filter((payment) => !activeExpenseIds.has(id(payment.expenseId)));
    const invoiceSummary = calculateInvoiceSummary(invoices);
    const collectionSummary = summarizeCollections(payments);
    const pending = payments.filter((payment) => payment.status === 'VERIFICATION_PENDING' || (payment.paymentCategory === 'OFFLINE' && payment.status === 'pending'));
    const ledgerPaymentIds = new Set(ledgers.map((ledger) => id(ledger.paymentId)).filter(Boolean));
    const expenseSummary = {
      totalExpensesIncurred: round(expenses.reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0)),
      recordedExpensePayments: round(expenses.reduce((sum, expense) => sum + Number(expense.recordedPaidAmount || 0), 0)),
      reconciledExpensePayments: round(expenses.reduce((sum, expense) => sum + Number(expense.confirmedPaidAmount || 0), 0)),
      outstandingVendorLiabilities: round(expenses.reduce((sum, expense) => sum + Number(expense.outstandingAmount || 0), 0)),
      pendingExpenseVerification: round(linkedExpensePayments.filter((payment) => ['PENDING_VERIFICATION', 'RECORDED'].includes(payment.verificationStatus)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
      expensePaymentsExcludedWithoutActiveParent: excludedExpensePayments.length,
    };
    const paymentsWithoutLedger = collectionSummary.successfulCollections.filter((payment) => !ledgerPaymentIds.has(id(payment._id)));
    const invoiceBalanceDiscrepancies = invoices.filter((invoice) => Math.abs(Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0) - Number(invoice.outstandingAmount || 0)) > 0.05);
    const unbalancedLedgerEntries = ledgers.filter((ledger) => round((ledger.entries || []).filter((entry) => entry.entryType === 'DEBIT').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)) !== round((ledger.entries || []).filter((entry) => entry.entryType === 'CREDIT').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)));
    return {
      generatedAt: new Date(), filters: { startDate: query.startDate || null, endDate: query.endDate || null, invoiceStatus: query.invoiceStatus || null },
      overview: { ...invoiceSummary, grossSuccessfulCollections: collectionSummary.grossSuccessfulCollections, completedRefunds: collectionSummary.completedRefunds, netCollectionsAfterRefunds: collectionSummary.netCollectionsAfterRefunds, pendingOfflinePaymentVerifications: round(pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)), unresolvedReconciliationExceptions: unresolved.length, ...expenseSummary, actualBankBalance: null, actualBankBalanceNote: 'Not available: dashboard reports recorded financial movement, not bank balances.' },
      collections: collectionSummary.successfulCollections.map((payment) => ({ ...payment, transactionReference: payment.gatewayTransactionId || payment.paymentReference || null })),
      outstanding: invoices.filter((invoice) => invoice.status !== 'CANCELLED'),
      expenses: { summary: expenseSummary, records: expenses, payments: linkedExpensePayments, excludedPaymentsWithoutActiveParent: excludedExpensePayments.map((payment) => ({ expenseId: payment.expenseId, paymentId: payment._id, reason: 'PARENT_EXPENSE_CANCELLED_OR_NOT_IN_SELECTED_ORGANIZATION' })) },
      receipts: payments.map((payment) => ({ paymentId: payment._id, status: payment.status, type: payment.type, amount: payment.amount, paymentMethod: payment.paymentMethod, receiptNumber: payment.receiptNumber || null, paymentReference: payment.gatewayTransactionId || payment.paymentReference || null, availability: payment.status === 'VERIFICATION_PENDING' ? 'PENDING_ACKNOWLEDGMENT' : payment.receiptNumber ? 'OFFICIAL_RECEIPT_NUMBER_AVAILABLE' : 'RECEIPT_INFORMATION_MISSING' })),
      exceptions: { unresolved, paymentsWithoutLedger, invoiceBalanceDiscrepancies, unbalancedLedgerEntries },
    };
  }
}
export default new CommunityFinanceService();
