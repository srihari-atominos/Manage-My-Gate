import mongoose from 'mongoose';
import moment from 'moment-timezone';
import Invoice from '../invoice/invoice.model.js';
import Payment from '../payment/payment.model.js';
import Expense from '../expense/expense.model.js';
import ExpensePayment from '../expense/expensePayment.model.js';
import FinancialLedgerEntry from '../ledger/financialLedgerEntry.model.js';
import ReconciliationException from '../ledger/reconciliation/models/reconciliationException.model.js';
import AmenityReservation from '../amenityManagement/reservations/amenityReservation.model.js';
import HttpError from '../../utils/httpError.utils.js';
import {
  assertExportFormat,
  exportFileName,
  buildExportReport,
  reportToCsv,
  reportToXlsxBuffer,
  reportToPdfBuffer,
} from './communityFinance.export.js';

export const INVOICE_STATUSES = new Set(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VERIFICATION_PENDING', 'CANCELLED']);
export const EXPORT_ROW_LIMIT = 20000;
const SUCCESS = new Set(['success', 'PAID']);
const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const id = (value) => String(value || '');

export const isSuccessfulPayment = (payment) => SUCCESS.has(payment?.status);
export const isCompletedRefund = (payment) => payment?.type === 'Refund' && SUCCESS.has(payment?.status);
export const isSuccessfulCollection = (payment) => isSuccessfulPayment(payment) && payment?.type !== 'Refund';

export const ELIGIBLE_INCOME_DOMAINS = new Set(['INVOICE', 'AMENITY']);
export const ELIGIBLE_INCOME_REF_TYPES = new Set([
  'Invoice',
  'MaintenanceFee',
  'AmenityBooking',
  'AmenityReservation',
  'AmenityReservationHold',
]);

export const isEligibleIncomePayment = (payment) => {
  if (!payment) return false;
  // Exclude wallet top-ups (resident deposit liabilities, not community revenue)
  if (
    payment.domain === 'WALLET' ||
    payment.referenceType === 'WalletRecharge' ||
    payment.referenceType === 'Wallet'
  ) {
    return false;
  }
  return (
    ELIGIBLE_INCOME_DOMAINS.has(payment.domain) ||
    ELIGIBLE_INCOME_REF_TYPES.has(payment.referenceType)
  );
};

export const parseCalendarDate = (value, name, endOfDay = false, timezone = null) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${name} must be a valid calendar date (YYYY-MM-DD).`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const testDate = new Date(Date.UTC(year, month - 1, day));
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${name} must be a valid calendar date (YYYY-MM-DD).`);
  }

  if (timezone) {
    const m = moment.tz(`${value}T00:00:00`, timezone);
    if (!m.isValid()) {
      throw new HttpError(400, `${name} must be a valid calendar date (YYYY-MM-DD).`);
    }
    if (endOfDay) {
      m.endOf('day');
    }
    return m.toDate();
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const buildDateRange = (query = {}, field = 'createdAt', defaultTimezone = null) => {
  if (!query.startDate && !query.endDate) return {};
  const tz = query.timezone || defaultTimezone;
  const range = {};
  if (query.startDate) range.$gte = parseCalendarDate(query.startDate, 'startDate', false, tz);
  if (query.endDate) range.$lte = parseCalendarDate(query.endDate, 'endDate', true, tz);
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw new HttpError(400, 'endDate must not be earlier than startDate.');
  }
  return { [field]: range };
};

export const validateDashboardFilters = (query = {}) => {
  if (query.invoiceStatus !== undefined && !INVOICE_STATUSES.has(query.invoiceStatus)) {
    throw new HttpError(400, 'invoiceStatus is not supported.');
  }
  if (query.timezone !== undefined && (typeof query.timezone !== 'string' || !moment.tz.zone(query.timezone))) {
    throw new HttpError(400, 'timezone is not supported.');
  }
  buildDateRange(query, 'createdAt', query.timezone || 'Asia/Kolkata');
};

export const SUPPORTED_TRANSACTION_TYPES = new Set(['all', 'income', 'expense']);
export const SUPPORTED_TRANSACTION_DOMAINS = new Set(['INVOICE', 'AMENITY', 'EXPENSE']);
export const SUPPORTED_TRANSACTION_STATUSES = new Set([
  'SUCCESS',
  'PENDING',
  'FAILED',
  'REFUNDED',
  'VERIFICATION_PENDING',
  'PAID',
  'RECONCILED',
  'RECORDED',
  'VOIDED',
]);

export const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const validateTransactionFilters = (query = {}) => {
  if (query.type !== undefined) {
    if (typeof query.type !== 'string' || !SUPPORTED_TRANSACTION_TYPES.has(query.type.toLowerCase())) {
      throw new HttpError(400, "type must be one of: 'all', 'income', 'expense'.");
    }
  }
  if (query.domain !== undefined && query.domain !== 'ALL') {
    if (typeof query.domain !== 'string' || !SUPPORTED_TRANSACTION_DOMAINS.has(query.domain.toUpperCase())) {
      throw new HttpError(400, 'domain is not supported.');
    }
  }
  if (query.timezone !== undefined && (typeof query.timezone !== 'string' || !moment.tz.zone(query.timezone))) {
    throw new HttpError(400, 'timezone is not supported.');
  }
  if (query.page !== undefined) {
    const pageNum = Number(query.page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      throw new HttpError(400, 'page must be a positive integer greater than or equal to 1.');
    }
  }
  if (query.limit !== undefined) {
    const limitNum = Number(query.limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new HttpError(400, 'limit must be a positive integer between 1 and 100.');
    }
  }
  if (query.status !== undefined && query.status !== 'ALL') {
    if (typeof query.status !== 'string' || !SUPPORTED_TRANSACTION_STATUSES.has(query.status.toUpperCase())) {
      throw new HttpError(400, 'status is not supported.');
    }
  }
  if (query.includeLiabilities !== undefined && query.includeLiabilities !== 'true' && query.includeLiabilities !== 'false') {
    throw new HttpError(400, 'includeLiabilities must be a boolean string.');
  }
  buildDateRange(query, 'date', query.timezone || 'Asia/Kolkata');
};

export const calculateInvoiceSummary = (invoices = [], allActiveInvoices = null) => {
  const active = invoices.filter((invoice) => !invoice.isDeleted && invoice.status !== 'CANCELLED');
  const carriedSourceIds = new Set();
  active.forEach((invoice) =>
    (invoice.carryForwardHistory || []).forEach((history) => {
      if (history.invoiceId) carriedSourceIds.add(id(history.invoiceId));
    })
  );
  const canonicalInvoices = active.filter((invoice) => !carriedSourceIds.has(id(invoice._id)));
  const sourceInvoices = active.filter((invoice) => carriedSourceIds.has(id(invoice._id)));
  const statuses = Object.fromEntries(
    ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE', 'VERIFICATION_PENDING'].map((status) => [status, 0])
  );
  active.forEach((invoice) => {
    if (statuses[invoice.status] !== undefined) statuses[invoice.status] += 1;
  });

  // Calculate outstanding dues: if allActiveInvoices provided (from getDashboard),
  // calculate cumulative canonical arrears across all active invoices so date filter doesn't truncate past arrears.
  let outstandingDues = 0;
  let sourceInvoicesCount = sourceInvoices.length;
  let unallocatedCarryForward = round(
    sourceInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0)
  );

  if (allActiveInvoices && Array.isArray(allActiveInvoices)) {
    const allCarriedSourceIds = new Set();
    allActiveInvoices.forEach((inv) =>
      (inv.carryForwardHistory || []).forEach((h) => {
        if (h.invoiceId) allCarriedSourceIds.add(id(h.invoiceId));
      })
    );
    const allCanonical = allActiveInvoices.filter((inv) => !allCarriedSourceIds.has(id(inv._id)));
    const allSource = allActiveInvoices.filter((inv) => allCarriedSourceIds.has(id(inv._id)));
    outstandingDues = round(allCanonical.reduce((sum, inv) => sum + Number(inv.outstandingAmount || 0), 0));
    sourceInvoicesCount = allSource.length;
    unallocatedCarryForward = round(
      allSource.reduce((sum, inv) => sum + Number(inv.outstandingAmount || 0), 0)
    );
  } else {
    outstandingDues = round(
      canonicalInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0)
    );
  }

  return {
    invoiceCount: active.length,
    statusCounts: statuses,
    currentPeriodCharges: round(active.reduce((sum, invoice) => sum + Number(invoice.currentCharge || 0), 0)),
    previousOutstandingCarried: round(
      active.reduce((sum, invoice) => sum + Number(invoice.previousOutstanding || 0), 0)
    ),
    outstandingDues,
    carryForwardSourceInvoicesExcluded: carriedSourceIds.size,
    unallocatedCarryForwardSourceOutstanding: unallocatedCarryForward,
    outstandingDuesAllocationStatus: sourceInvoicesCount
      ? 'CARRY_FORWARD_COMPONENT_ALLOCATION_UNAVAILABLE'
      : 'CANONICAL_INVOICE_TOTALS',
  };
};

export const summarizeCollections = (payments = []) => {
  const eligiblePayments = payments.filter(isEligibleIncomePayment);
  const successfulCollections = eligiblePayments.filter(isSuccessfulCollection);
  const completedRefunds = eligiblePayments.filter(isCompletedRefund);

  const maintenancePayments = successfulCollections.filter(
    (p) => p.domain === 'INVOICE' || p.referenceType === 'Invoice' || p.referenceType === 'MaintenanceFee'
  );
  const amenityPayments = successfulCollections.filter(
    (p) => p.domain === 'AMENITY' || ['AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'].includes(p.referenceType)
  );

  const maintenanceCollections = round(
    maintenancePayments.reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)
  );
  const amenityCollections = round(
    amenityPayments.reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)
  );
  const grossSuccessfulCollections = round(maintenanceCollections + amenityCollections);
  const completedRefundAmount = round(
    completedRefunds.reduce((sum, payment) => sum + Math.abs(Number(payment.amount || 0)), 0)
  );

  return {
    grossSuccessfulCollections,
    maintenanceCollections,
    amenityCollections,
    completedRefunds: completedRefundAmount,
    netCollectionsAfterRefunds: round(grossSuccessfulCollections - completedRefundAmount),
    successfulCollections,
    completedRefundRecords: completedRefunds,
  };
};

export const calculateRunwayAnalytics = (remainingBalance = 0, timeSeries = [], options = {}) => {
  const remBalance = round(remainingBalance);
  
  let avgMonthlyExpenses = 0;
  let avgMonthlyCollections = 0;

  const validSeries = Array.isArray(timeSeries) ? timeSeries : [];
  if (validSeries.length > 0) {
    const totalExpenses = validSeries.reduce((sum, item) => sum + Number(item.expense || 0), 0);
    const totalIncome = validSeries.reduce((sum, item) => sum + Number(item.income || 0), 0);
    
    const isDaily = validSeries[0]?.periodKey?.length === 10;
    if (isDaily) {
      avgMonthlyExpenses = round(options.fallbackMonthlyExpenses != null ? options.fallbackMonthlyExpenses : totalExpenses);
      avgMonthlyCollections = round(options.fallbackMonthlyCollections != null ? options.fallbackMonthlyCollections : totalIncome);
    } else {
      const monthsCount = Math.max(1, validSeries.length);
      avgMonthlyExpenses = round(totalExpenses / monthsCount);
      avgMonthlyCollections = round(totalIncome / monthsCount);
    }
  }

  if (avgMonthlyExpenses === 0 && options.fallbackMonthlyExpenses) {
    avgMonthlyExpenses = round(options.fallbackMonthlyExpenses);
  }
  if (avgMonthlyCollections === 0 && options.fallbackMonthlyCollections) {
    avgMonthlyCollections = round(options.fallbackMonthlyCollections);
  }

  const netMonthlyBurn = round(avgMonthlyExpenses - avgMonthlyCollections);
  
  let runwayMonths = null;
  let isSelfSustaining = false;

  if (remBalance <= 0) {
    runwayMonths = 0;
  } else if (netMonthlyBurn <= 0) {
    isSelfSustaining = true;
    runwayMonths = null;
  } else {
    runwayMonths = round(remBalance / netMonthlyBurn);
  }

  const grossRunwayMonths = (remBalance > 0 && avgMonthlyExpenses > 0)
    ? round(remBalance / avgMonthlyExpenses)
    : (remBalance <= 0 ? 0 : null);

  let runwayHealth = 'HEALTHY';
  if (remBalance <= 0) {
    runwayHealth = 'CRITICAL';
  } else if (isSelfSustaining) {
    runwayHealth = 'SURPLUS';
  } else if (runwayMonths !== null) {
    if (runwayMonths >= 6) {
      runwayHealth = 'HEALTHY';
    } else if (runwayMonths >= 3) {
      runwayHealth = 'CAUTION';
    } else {
      runwayHealth = 'CRITICAL';
    }
  }

  let projectedDepletionDate = null;
  if (!isSelfSustaining && runwayMonths !== null && runwayMonths > 0) {
    const depletionDate = moment().add(runwayMonths, 'months');
    projectedDepletionDate = depletionDate.format('YYYY-MM-DD');
  }

  return {
    remainingBalance: remBalance,
    averageMonthlyExpenses: avgMonthlyExpenses,
    averageMonthlyCollections: avgMonthlyCollections,
    netMonthlyBurn,
    isSelfSustaining,
    runwayMonths,
    grossRunwayMonths,
    runwayHealth,
    projectedDepletionDate,
  };
};

class CommunityFinanceService {
  async getDashboard(orgId, query = {}) {
    validateDashboardFilters(query);
    const targetTimezone = query.timezone || 'Asia/Kolkata';
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const orgMatch = mongoose.Types.ObjectId.isValid(orgId) ? { $in: [orgObjectId, String(orgId)] } : orgId;

    // 1. Invoices filter for current period charges
    const invoiceFilter = {
      orgId: orgMatch,
      isDeleted: { $ne: true },
      ...buildDateRange(query, 'createdAt', targetTimezone),
    };
    if (query.invoiceStatus) invoiceFilter.status = query.invoiceStatus;

    // 2. Expenses filter for incurred expenses (checks expenseDate with fallback to createdAt)
    const expenseDateRange = buildDateRange(query, 'expenseDate', targetTimezone);
    const createdAtRange = buildDateRange(query, 'createdAt', targetTimezone);
    const nowBoundary = new Date(Date.now() + 86400000);
    const expenseFilter = {
      orgId: orgMatch,
      lifecycleStatus: { $ne: 'CANCELLED' },
    };
    if (expenseDateRange.expenseDate) {
      expenseFilter.$or = [
        { expenseDate: expenseDateRange.expenseDate },
        { expenseDate: null, createdAt: createdAtRange.createdAt },
        { expenseDate: { $exists: false }, createdAt: createdAtRange.createdAt },
        { expenseDate: { $gt: nowBoundary }, createdAt: createdAtRange.createdAt },
      ];
    }

    // 3. Payment filter: Use paymentDate with fallback to createdAt
    const paymentFilter = { orgId: orgMatch, isDeleted: { $ne: true } };
    const paymentDateRange = buildDateRange(query, 'paymentDate', targetTimezone);
    if (paymentDateRange.paymentDate) {
      paymentFilter.$or = [
        { paymentDate: paymentDateRange.paymentDate },
        { paymentDate: null, createdAt: createdAtRange.createdAt },
        { paymentDate: { $exists: false }, createdAt: createdAtRange.createdAt },
        { paymentDate: { $gt: nowBoundary }, createdAt: createdAtRange.createdAt },
      ];
    }

    // 4. ExpensePayment filter: Use paymentDate with fallback to createdAt
    const expPaymentDateRange = buildDateRange(query, 'paymentDate', targetTimezone);
    const expensePaymentFilter = {
      orgId: orgMatch,
      verificationStatus: { $ne: 'VOIDED' },
    };
    if (expPaymentDateRange.paymentDate) {
      expensePaymentFilter.$or = [
        { paymentDate: expPaymentDateRange.paymentDate },
        { paymentDate: null, createdAt: createdAtRange.createdAt },
        { paymentDate: { $exists: false }, createdAt: createdAtRange.createdAt },
        { paymentDate: { $gt: nowBoundary }, createdAt: createdAtRange.createdAt },
      ];
    }

    const { $or: _paymentDateOr, ...paymentFilterWithoutDate } = paymentFilter;

    const [
      invoices,
      allActiveInvoices,
      paymentAggregates,
      paymentsSample,
      expenses,
      expenseAggregates,
      expensePaymentAggregates,
      expensePaymentsSample,
      unresolvedCount,
      unresolvedSample,
      unbalancedLedgerEntries,
      heldDepositsAggregate,
      expenseCategoryAggregates,
      paymentTimeSeriesAggregates,
      expenseTimeSeriesAggregates,
      monthlyPaymentAggregates,
      monthlyExpenseAggregates,
    ] = await Promise.all([
      // Period invoices
      Invoice.find(invoiceFilter)
        .select('status currentCharge previousOutstanding carryForwardHistory outstandingAmount paidAmount totalAmount invoiceNumber createdAt')
        .lean(),

      // All active canonical unpaid invoices (for cumulative arrears unaffected by date filters)
      Invoice.find({
        orgId,
        isDeleted: { $ne: true },
        status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE', 'VERIFICATION_PENDING'] },
      })
        .select('status carryForwardHistory outstandingAmount')
        .lean(),

      // Complete database aggregation of Payments (NO hardcoded limits)
      Payment.aggregate([
        { $match: paymentFilter },
        {
          $group: {
            _id: {
              domain: '$domain',
              referenceType: '$referenceType',
              type: '$type',
              status: '$status',
              paymentCategory: '$paymentCategory',
              isDeposit: { $ifNull: ['$metadata.isDeposit', false] },
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Sample payments for list endpoints
      Payment.find(paymentFilter)
        .select('status type parentPaymentId amount paymentMethod paymentReference gatewayTransactionId receiptNumber referenceId referenceType domain paymentCategory paymentDate createdAt')
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(200)
        .lean(),

      // Expenses for the period
      Expense.find(expenseFilter)
        .select('_id expenseNumber name category vendor totalAmount recordedPaidAmount confirmedPaidAmount outstandingAmount settlementStatus expenseDate createdAt')
        .lean(),

      // Complete database aggregation of Expenses
      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: null,
            totalExpensesIncurred: { $sum: '$totalAmount' },
            outstandingVendorLiabilities: { $sum: '$outstandingAmount' },
            recordedExpensePayments: { $sum: '$recordedPaidAmount' },
            confirmedPaidAmount: { $sum: '$confirmedPaidAmount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Complete database aggregation of ExpensePayments (NO hardcoded limits)
      ExpensePayment.aggregate([
        { $match: expensePaymentFilter },
        {
          $group: {
            _id: {
              verificationStatus: '$verificationStatus',
              recordType: '$recordType',
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Sample expense payments for list endpoints
      ExpensePayment.find(expensePaymentFilter)
        .select('expenseId amount verificationStatus recordType paymentMethod transactionReference externalTransactionReference paymentDate')
        .sort({ paymentDate: -1 })
        .limit(200)
        .lean(),

      // Exact count of unresolved exceptions (NO hardcoded limit)
      ReconciliationException.countDocuments({
        orgId,
        status: { $in: ['OPEN', 'UNDER_REVIEW', 'REVIEWED'] },
      }),

      // Sample reconciliation exceptions for list endpoint
      ReconciliationException.find({
        orgId,
        status: { $in: ['OPEN', 'UNDER_REVIEW', 'REVIEWED'] },
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      // Unbalanced ledger entries (computed in the database, capped)
      FinancialLedgerEntry.aggregate([
        { $match: { orgId: orgMatch } },
        {
          $addFields: {
            debitTotal: {
              $sum: {
                $map: { input: { $filter: { input: { $ifNull: ['$entries', []] }, as: 'e', cond: { $eq: ['$$e.entryType', 'DEBIT'] } } }, as: 'e', in: { $ifNull: ['$$e.amount', 0] } },
              },
            },
            creditTotal: {
              $sum: {
                $map: { input: { $filter: { input: { $ifNull: ['$entries', []] }, as: 'e', cond: { $eq: ['$$e.entryType', 'CREDIT'] } } }, as: 'e', in: { $ifNull: ['$$e.amount', 0] } },
              },
            },
          },
        },
        { $match: { $expr: { $ne: [{ $round: ['$debitTotal', 2] }, { $round: ['$creditTotal', 2] }] } } },
        { $project: { paymentId: 1, transactionId: 1, entries: 1 } },
        { $limit: 200 },
      ]).catch(() => []),

      // Refundable amenity security deposits currently held
      AmenityReservation.aggregate([
        {
          $match: {
            orgId: orgObjectId,
            bookingStatus: { $in: ['CONFIRMED', 'PENDING_APPROVAL', 'CHECKED_IN'] },
            'depositSettlement.settledAt': null,
          },
        },
        {
          $group: {
            _id: null,
            totalDeposit: {
              $sum: {
                $ifNull: ['$amountSchedule.depositAmount', { $ifNull: ['$depositAmount', 0] }],
              },
            },
          },
        },
      ]).catch(() => []),

      // Incurred expenses and disbursements grouped by Category (for Expense Breakdown)
      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: { $ifNull: ['$category', 'Uncategorised'] },
            amount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]).catch(() => []),

      // Payment Time Series Aggregates (Income vs Time)
      Payment.aggregate([
        {
          $match: {
            ...paymentFilterWithoutDate,
            status: { $in: ['success', 'PAID'] },
            domain: { $ne: 'WALLET' },
            referenceType: { $nin: ['WalletRecharge', 'Wallet'] },
            'metadata.isDeposit': { $ne: true },
            // Both conditions are $or groups, so they must be $and-ed; a second top-level $or would silently replace the date filter.
            $and: [
              ...(paymentFilter.$or ? [{ $or: paymentFilter.$or }] : []),
              {
                $or: [
                  { domain: { $in: ['INVOICE', 'AMENITY'] } },
                  {
                    referenceType: {
                      $in: ['Invoice', 'MaintenanceFee', 'AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'],
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  query.startDate &&
                  query.endDate &&
                  new Date(query.endDate) - new Date(query.startDate) <= 32 * 86400000
                    ? '%Y-%m-%d'
                    : '%Y-%m',
                date: { $ifNull: ['$paymentDate', '$createdAt'] },
                timezone: targetTimezone,
              },
            },
            grossIncome: {
              $sum: {
                $cond: [{ $eq: ['$type', 'Refund'] }, 0, '$amount'],
              },
            },
            refunds: {
              $sum: {
                $cond: [{ $eq: ['$type', 'Refund'] }, { $abs: '$amount' }, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),

      // Expense Time Series Aggregates (Expenses vs Time: both incurred expenses and disbursements)
      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  query.startDate &&
                  query.endDate &&
                  new Date(query.endDate) - new Date(query.startDate) <= 32 * 86400000
                    ? '%Y-%m-%d'
                    : '%Y-%m',
                date: {
                  $cond: [
                    {
                      $and: [
                        { $gte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date('2020-01-01')] },
                        { $lte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date(Date.now() + 86400000)] },
                      ],
                    },
                    { $ifNull: ['$expenseDate', '$createdAt'] },
                    '$createdAt',
                  ],
                },
                timezone: targetTimezone,
              },
            },
            expense: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),

      // Complete Historical Monthly Payment Aggregates (Income vs Time across all recorded months)
      Payment.aggregate([
        {
          $match: {
            orgId: orgMatch,
            status: { $in: ['success', 'PAID'] },
            domain: { $ne: 'WALLET' },
            referenceType: { $nin: ['WalletRecharge', 'Wallet'] },
            'metadata.isDeposit': { $ne: true },
            $or: [
              { domain: { $in: ['INVOICE', 'AMENITY'] } },
              {
                referenceType: {
                  $in: ['Invoice', 'MaintenanceFee', 'AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'],
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$paymentDate', '$createdAt'] },
                timezone: targetTimezone,
              },
            },
            grossIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'Refund'] }, 0, '$amount'] },
            },
            refunds: {
              $sum: { $cond: [{ $eq: ['$type', 'Refund'] }, { $abs: '$amount' }, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),

      // Complete Historical Monthly Expense Aggregates (Expenses vs Time across all recorded months)
      Expense.aggregate([
        {
          $match: {
            orgId: orgMatch,
            lifecycleStatus: { $ne: 'CANCELLED' },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: {
                  $cond: [
                    {
                      $and: [
                        { $gte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date('2020-01-01')] },
                        { $lte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date(Date.now() + 86400000)] },
                      ],
                    },
                    { $ifNull: ['$expenseDate', '$createdAt'] },
                    '$createdAt',
                  ],
                },
                timezone: targetTimezone,
              },
            },
            expense: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
    ]);

    // Compute complete collection metrics from database aggregates
    let aggMaintenanceCollections = 0;
    let aggAmenityCollections = 0;
    let aggCompletedRefunds = 0;
    let aggPendingOffline = 0;
    let aggWalletTopUps = 0;

    for (const group of paymentAggregates) {
      const g = group._id || {};
      const amt = Number(group.totalAmount || 0);
      const isSuccess = SUCCESS.has(g.status) && g.type !== 'Refund';
      const isRefund = g.type === 'Refund' && SUCCESS.has(g.status);
      const isPending = g.status === 'VERIFICATION_PENDING' || (g.paymentCategory === 'OFFLINE' && g.status === 'pending');
      const isWallet = g.domain === 'WALLET' || g.referenceType === 'WalletRecharge' || g.referenceType === 'Wallet';
      const isInvoice = (g.domain === 'INVOICE' || g.referenceType === 'Invoice' || g.referenceType === 'MaintenanceFee') && !isWallet;
      const isAmenity = (g.domain === 'AMENITY' || ['AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'].includes(g.referenceType)) && !isWallet;

      // Deposits are liabilities, not income (matches time-series/transactions filters)
      if (g.isDeposit === true) continue;

      if (isWallet && isSuccess) {
        aggWalletTopUps += amt;
      }
      if (isPending && (isInvoice || isAmenity)) {
        aggPendingOffline += amt;
      }
      if (isInvoice && isSuccess) {
        aggMaintenanceCollections += amt;
      }
      if (isAmenity && isSuccess) {
        aggAmenityCollections += amt;
      }
      if (isRefund && (isInvoice || isAmenity)) {
        aggCompletedRefunds += Math.abs(amt);
      }
    }

    const grossSuccessfulCollections = round(aggMaintenanceCollections + aggAmenityCollections);
    const completedRefunds = round(aggCompletedRefunds);
    const netCollectionsAfterRefunds = round(grossSuccessfulCollections - completedRefunds);
    const refundableDepositsHeld = round(heldDepositsAggregate[0]?.totalDeposit || 0);
    const walletTopUpsExcludedFromIncome = round(aggWalletTopUps);

    // Compute complete expense metrics from database aggregates
    let aggReconciledDisbursements = 0;
    let aggPendingExpenseVerification = 0;

    for (const group of expensePaymentAggregates) {
      const g = group._id || {};
      const amt = Number(group.totalAmount || 0);
      if (g.verificationStatus === 'RECONCILED' && g.recordType !== 'ATTEMPT') {
        aggReconciledDisbursements += amt;
      }
      if (['PENDING_VERIFICATION', 'RECORDED'].includes(g.verificationStatus) && g.recordType !== 'ATTEMPT') {
        aggPendingExpenseVerification += amt;
      }
    }

    const expAgg = expenseAggregates[0] || {};
    const totalExpensesIncurred = round(expAgg.totalExpensesIncurred || 0);
    const outstandingVendorLiabilities = round(expAgg.outstandingVendorLiabilities || 0);
    const recordedExpensePayments = round(expAgg.recordedExpensePayments || 0);
    // Use actual reconciled disbursements for cash basis, fallback to confirmedPaidAmount
    const reconciledExpensePayments = round(aggReconciledDisbursements || expAgg.confirmedPaidAmount || 0);
    const effectiveExpenseDisbursements =
      reconciledExpensePayments > 0
        ? reconciledExpensePayments
        : totalExpensesIncurred > 0
        ? totalExpensesIncurred
        : recordedExpensePayments;

    // Cash-basis Net Surplus/Deficit = Eligible Confirmed Receipts - Effective Disbursements/Liabilities
    const netSurplusOrDeficit = round(netCollectionsAfterRefunds - effectiveExpenseDisbursements);
    const accrualSurplusOrDeficit = round(
      (invoices.reduce((sum, inv) => sum + Number(inv.currentCharge || 0), 0) + aggAmenityCollections) - totalExpensesIncurred
    );

    const activeExpenseIds = new Set(expenses.map((expense) => id(expense._id)));
    const linkedExpensePayments = expensePaymentsSample.filter((payment) => activeExpenseIds.has(id(payment.expenseId)));
    const excludedExpensePayments = expensePaymentsSample.filter((payment) => !activeExpenseIds.has(id(payment.expenseId)));

    const invoiceSummary = calculateInvoiceSummary(invoices, allActiveInvoices);
    const collectionSummary = summarizeCollections(paymentsSample);

    const expenseSummary = {
      totalExpensesIncurred,
      recordedExpensePayments,
      reconciledExpensePayments,
      outstandingVendorLiabilities,
      pendingExpenseVerification: round(aggPendingExpenseVerification),
      expensePaymentsExcludedWithoutActiveParent: excludedExpensePayments.length,
      confirmedExpenseDisbursements: effectiveExpenseDisbursements,
    };

    const samplePaymentIds = collectionSummary.successfulCollections.map((payment) => payment._id);
    const sampleLedgers = samplePaymentIds.length
      ? await FinancialLedgerEntry.find({ orgId, paymentId: { $in: samplePaymentIds } }).select('paymentId').lean()
      : [];
    const ledgerPaymentIds = new Set(sampleLedgers.map((ledger) => id(ledger.paymentId)).filter(Boolean));
    const paymentsWithoutLedger = collectionSummary.successfulCollections.filter((payment) => !ledgerPaymentIds.has(id(payment._id)));
    const invoiceBalanceDiscrepancies = invoices.filter(
      (invoice) =>
        Math.abs(
          Number(invoice.totalAmount || 0) -
            Number(invoice.paidAmount || 0) -
            Number(invoice.outstandingAmount || 0)
        ) > 0.05
    );

    const timeSeries = Array.from(
      new Set([
        ...(paymentTimeSeriesAggregates || []).map((p) => p._id).filter(Boolean),
        ...(expenseTimeSeriesAggregates || []).map((e) => e._id).filter(Boolean),
      ])
    )
      .sort()
      .map((key) => {
        const pay = (paymentTimeSeriesAggregates || []).find((p) => p._id === key) || {};
        const exp = (expenseTimeSeriesAggregates || []).find((e) => e._id === key) || {};
        const gross = Number(pay.grossIncome || 0);
        const ref = Number(pay.refunds || 0);
        const inc = round(gross - ref);
        const dis = round(exp.expense || 0);
        return {
          periodKey: key,
          label:
            key.length === 10
              ? moment.tz(key, targetTimezone).format('DD MMM')
              : moment.tz(key, 'YYYY-MM', targetTimezone).format('MMM YY'),
          income: inc,
          expense: dis,
          netSurplus: round(inc - dis),
        };
      });

    // Complete Historical Monthly Time Series
    const monthlyTimeSeries = Array.from(
      new Set([
        ...(monthlyPaymentAggregates || []).map((p) => p._id).filter(Boolean),
        ...(monthlyExpenseAggregates || []).map((e) => e._id).filter(Boolean),
      ])
    )
      .sort()
      .map((key) => {
        const pay = (monthlyPaymentAggregates || []).find((p) => p._id === key) || {};
        const exp = (monthlyExpenseAggregates || []).find((e) => e._id === key) || {};
        const gross = Number(pay.grossIncome || 0);
        const ref = Number(pay.refunds || 0);
        const inc = round(gross - ref);
        const dis = round(exp.expense || 0);
        return {
          periodKey: key,
          label: moment.tz(key, 'YYYY-MM', targetTimezone).format('MMM YY'),
          income: inc,
          expense: dis,
          netSurplus: round(inc - dis),
        };
      });

    // Historical Yearly Time Series
    const yearlyMap = new Map();
    for (const point of monthlyTimeSeries) {
      const yearKey = point.periodKey ? point.periodKey.substring(0, 4) : '2026';
      const existing = yearlyMap.get(yearKey) || { income: 0, expense: 0, label: yearKey };
      existing.income += Number(point.income || 0);
      existing.expense += Number(point.expense || 0);
      yearlyMap.set(yearKey, existing);
    }

    const yearlyTimeSeries = Array.from(yearlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, val]) => ({
        periodKey,
        label: val.label,
        income: round(val.income),
        expense: round(val.expense),
        netSurplus: round(val.income - val.expense),
      }));

    const dailyTimeSeries = timeSeries.filter((p) => p.periodKey && p.periodKey.length === 10);

    const runwaySeries = monthlyTimeSeries.length > 0 ? monthlyTimeSeries : timeSeries;
    const runway = calculateRunwayAnalytics(netSurplusOrDeficit, runwaySeries, {
      fallbackMonthlyExpenses: effectiveExpenseDisbursements,
      fallbackMonthlyCollections: netCollectionsAfterRefunds,
    });

    return {
      generatedAt: new Date(),
      filters: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
        invoiceStatus: query.invoiceStatus || null,
        timezone: query.timezone || targetTimezone,
      },
      runway,
      overview: {
        ...invoiceSummary,
        grossSuccessfulCollections,
        maintenanceCollections: round(aggMaintenanceCollections),
        amenityCollections: round(aggAmenityCollections),
        completedRefunds,
        netCollectionsAfterRefunds,
        refundableDepositsHeld,
        walletTopUpsExcludedFromIncome,
        pendingOfflinePaymentVerifications: round(aggPendingOffline),
        unresolvedReconciliationExceptions: unresolvedCount,
        ...expenseSummary,
        netSurplusOrDeficit,
        accrualSurplusOrDeficit,
        runway,
        actualBankBalance: null,
        actualBankBalanceNote:
          'Not available: dashboard reports recorded financial movement, not bank balances.',
      },
      collections: collectionSummary.successfulCollections.map((payment) => ({
        ...payment,
        transactionReference: payment.gatewayTransactionId || payment.paymentReference || null,
      })),
      outstanding: invoices.filter((invoice) => invoice.status !== 'CANCELLED'),
      expenses: {
        summary: expenseSummary,
        records: expenses,
        payments: linkedExpensePayments,
        excludedPaymentsWithoutActiveParent: excludedExpensePayments.map((payment) => ({
          expenseId: payment.expenseId,
          paymentId: payment._id,
          reason: 'PARENT_EXPENSE_CANCELLED_OR_NOT_IN_SELECTED_ORGANIZATION',
        })),
      },
      receipts: paymentsSample.map((payment) => ({
        paymentId: payment._id,
        status: payment.status,
        type: payment.type,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber || null,
        paymentReference: payment.gatewayTransactionId || payment.paymentReference || null,
        availability:
          payment.status === 'VERIFICATION_PENDING'
            ? 'PENDING_ACKNOWLEDGMENT'
            : payment.receiptNumber
              ? 'OFFICIAL_RECEIPT_NUMBER_AVAILABLE'
              : 'RECEIPT_INFORMATION_MISSING',
      })),
      exceptions: {
        unresolved: unresolvedSample,
        unresolvedCount,
        paymentsWithoutLedger,
        invoiceBalanceDiscrepancies,
        unbalancedLedgerEntries,
      },
      breakdowns: {
        income: [
          {
            source: 'Maintenance Collections',
            domain: 'INVOICE',
            amount: round(aggMaintenanceCollections),
            percentage:
              grossSuccessfulCollections > 0
                ? round((aggMaintenanceCollections / grossSuccessfulCollections) * 100)
                : 0,
          },
          {
            source: 'Amenity Usage Fees',
            domain: 'AMENITY',
            amount: round(aggAmenityCollections),
            percentage:
              grossSuccessfulCollections > 0
                ? round((aggAmenityCollections / grossSuccessfulCollections) * 100)
                : 0,
          },
          ...(completedRefunds > 0
            ? [
                {
                  source: 'Completed Refunds',
                  domain: 'INVOICE',
                  amount: -round(completedRefunds),
                  percentage:
                    grossSuccessfulCollections > 0
                      ? round((completedRefunds / grossSuccessfulCollections) * 100)
                      : 0,
                },
              ]
            : []),
        ],
        expense: (expenseCategoryAggregates || []).map((cat) => ({
          category: cat._id || 'Uncategorised',
          amount: round(cat.amount || 0),
          count: cat.count || 0,
          // Category amounts are incurred totals, so the share is of total incurred (not of reconciled payments, which can be smaller).
          percentage: totalExpensesIncurred > 0 ? round((Number(cat.amount || 0) / totalExpensesIncurred) * 100) : 0,
        })),
      },
      timeSeries,
      dailyTimeSeries: dailyTimeSeries.length > 0 ? dailyTimeSeries : timeSeries,
      monthlyTimeSeries: monthlyTimeSeries.length > 0 ? monthlyTimeSeries : timeSeries,
      yearlyTimeSeries: yearlyTimeSeries.length > 0 ? yearlyTimeSeries : timeSeries,
      allTimeSeries: monthlyTimeSeries.length > 0 ? monthlyTimeSeries : timeSeries,
    };
  }

  async _queryTransactions(orgId, query = {}, options = {}) {
    const isExport = options.unpaginated === true;
    const maxLimit = options.maxLimit || 20000;
    const cleanQuery = { ...query };
    if (cleanQuery.domain === 'ALL') delete cleanQuery.domain;
    if (isExport) {
      delete cleanQuery.page;
      delete cleanQuery.limit;
    }
    validateTransactionFilters(cleanQuery);
    const targetTimezone = cleanQuery.timezone || 'Asia/Kolkata';
    const type = (cleanQuery.type || 'all').toLowerCase();
    const domain = cleanQuery.domain ? cleanQuery.domain.toUpperCase() : null;
    const page = cleanQuery.page !== undefined ? parseInt(cleanQuery.page, 10) : 1;
    const limit = cleanQuery.limit !== undefined ? parseInt(cleanQuery.limit, 10) : (isExport ? maxLimit : 20);
    const skip = (page - 1) * limit;
    const search = typeof cleanQuery.search === 'string' && cleanQuery.search.trim() ? cleanQuery.search.trim() : null;
    const status = cleanQuery.status ? cleanQuery.status.toUpperCase() : null;

    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const orgMatch = { $in: [orgObjectId, String(orgId)] };

    // Incompatible type and domain combinations return empty result immediately
    if (type === 'income' && domain === 'EXPENSE') {
      return { transactions: [], page, limit, total: 0, totalPages: 0 };
    }
    if (type === 'expense' && (domain === 'INVOICE' || domain === 'AMENITY')) {
      return { transactions: [], page, limit, total: 0, totalPages: 0 };
    }

    const searchRegex = search ? new RegExp(escapeRegex(search), 'i') : null;

    // --- 1. Payment (Income) Query Match ---
    const paymentMatch = {
      orgId: orgMatch,
      isDeleted: { $ne: true },
      domain: { $ne: 'WALLET' },
      referenceType: { $nin: ['WalletRecharge', 'Wallet'] },
      'metadata.isDeposit': { $ne: true },
    };

    if (domain === 'INVOICE') {
      paymentMatch.$or = [
        { domain: 'INVOICE' },
        { referenceType: { $in: ['Invoice', 'MaintenanceFee'] } },
      ];
    } else if (domain === 'AMENITY') {
      paymentMatch.$or = [
        { domain: 'AMENITY' },
        { referenceType: { $in: ['AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'] } },
      ];
    } else {
      paymentMatch.$or = [
        { domain: { $in: ['INVOICE', 'AMENITY'] } },
        { referenceType: { $in: ['Invoice', 'MaintenanceFee', 'AmenityBooking', 'AmenityReservation', 'AmenityReservationHold'] } },
      ];
    }

    const paymentDateRange = buildDateRange(query, 'paymentDate', targetTimezone);
    if (paymentDateRange.paymentDate) {
      paymentMatch.$and = paymentMatch.$and || [];
      paymentMatch.$and.push({
        $or: [
          { paymentDate: paymentDateRange.paymentDate },
          { paymentDate: null, createdAt: paymentDateRange.paymentDate },
          { paymentDate: { $exists: false }, createdAt: paymentDateRange.paymentDate },
        ],
      });
    }

    const includeLiabilities = query.includeLiabilities === 'true' || query.includeLiabilities === true;

    if (status) {
      if (status === 'SUCCESS') {
        paymentMatch.status = { $in: ['success', 'PAID'] };
      } else if (status === 'REFUNDED') {
        // Use $and so the domain/referenceType $or above is not overwritten
        paymentMatch.$and = paymentMatch.$and || [];
        paymentMatch.$and.push({ $or: [{ status: 'refunded' }, { type: 'Refund' }] });
      } else if (status === 'PENDING') {
        paymentMatch.status = { $in: ['pending', 'VERIFICATION_PENDING'] };
      } else if (['RECONCILED', 'RECORDED', 'VOIDED'].includes(status)) {
        paymentMatch.status = '__NONE__';
      } else if (status === 'ALL') {
        paymentMatch.status = { $in: ['success', 'PAID', 'pending', 'VERIFICATION_PENDING', 'refunded'] };
      } else if (status === 'PAID' || status === 'VERIFICATION_PENDING') {
        // Stored upper-case; lower-casing would never match
        paymentMatch.status = status;
      } else {
        paymentMatch.status = status.toLowerCase();
      }
    } else if (includeLiabilities) {
      paymentMatch.status = { $in: ['success', 'PAID', 'pending', 'VERIFICATION_PENDING', 'refunded'] };
    } else {
      paymentMatch.status = { $in: ['success', 'PAID'] };
    }

    const paymentSearchMatch = searchRegex
      ? {
          $or: [
            { receiptNumber: searchRegex },
            { gatewayTransactionId: searchRegex },
            { paymentReference: searchRegex },
            { payerNotes: searchRegex },
            { 'invoiceDoc.invoiceNumber': searchRegex },
          ],
        }
      : null;

    // --- 2. ExpensePayment (Expense) Query Match ---
    const expensePaymentMatch = {
      orgId: orgMatch,
      verificationStatus: { $ne: 'VOIDED' },
    };

    const expDateRange = buildDateRange(query, 'paymentDate', targetTimezone);
    const txCreatedAtRange = buildDateRange(query, 'createdAt', targetTimezone);
    const txNowBoundary = new Date(Date.now() + 86400000);
    if (expDateRange.paymentDate) {
      expensePaymentMatch.$or = [
        { paymentDate: expDateRange.paymentDate },
        { paymentDate: null, createdAt: txCreatedAtRange.createdAt },
        { paymentDate: { $exists: false }, createdAt: txCreatedAtRange.createdAt },
        { paymentDate: { $gt: txNowBoundary }, createdAt: txCreatedAtRange.createdAt },
      ];
    }

    if (status && status !== 'ALL') {
      if (['RECONCILED', 'RECORDED', 'PENDING_VERIFICATION', 'VOIDED'].includes(status)) {
        expensePaymentMatch.verificationStatus = status;
      } else if (status === 'SUCCESS') {
        expensePaymentMatch.verificationStatus = 'RECONCILED';
      } else if (status === 'PENDING') {
        expensePaymentMatch.verificationStatus = { $in: ['PENDING_VERIFICATION', 'RECORDED'] };
      } else {
        expensePaymentMatch.verificationStatus = '__NONE__';
      }
    } else if (status === 'ALL' || includeLiabilities) {
      expensePaymentMatch.verificationStatus = { $ne: 'VOIDED' };
      expensePaymentMatch.recordType = { $ne: 'ATTEMPT' };
    } else {
      expensePaymentMatch.verificationStatus = 'RECONCILED';
    }
    // Un-reconciled UPI attempts are not transactions (the dashboard excludes them too); a reconciled attempt becomes a RECORDED payment.
    expensePaymentMatch.recordType = { $ne: 'ATTEMPT' };

    const directExpenseDateRange = buildDateRange(query, 'expenseDate', targetTimezone);
    const directExpenseSearchMatch = searchRegex
      ? {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { expenseNumber: searchRegex },
            { category: searchRegex },
            { 'vendor.name': searchRegex },
          ],
        }
      : null;

    // The date range and the search term are both $or groups; they must be $and-ed, or the later one replaces the earlier.
    const directExpenseAnd = [
      ...(directExpenseDateRange.expenseDate
        ? [
            {
              $or: [
                { expenseDate: directExpenseDateRange.expenseDate },
                { expenseDate: null, createdAt: txCreatedAtRange.createdAt },
                { expenseDate: { $exists: false }, createdAt: txCreatedAtRange.createdAt },
                { expenseDate: { $gt: txNowBoundary }, createdAt: txCreatedAtRange.createdAt },
              ],
            },
          ]
        : []),
      ...(directExpenseSearchMatch ? [directExpenseSearchMatch] : []),
    ];

    const directExpensesPipeline = [
      {
        $match: {
          orgId: orgMatch,
          lifecycleStatus: { $ne: 'CANCELLED' },
          ...(status && status !== 'ALL'
            ? {
                settlementStatus:
                  status === 'SUCCESS' ? 'PAID' : status === 'PENDING' ? 'UNPAID' : status,
              }
            : {}),
          ...(directExpenseAnd.length ? { $and: directExpenseAnd } : {}),
        },
      },
      {
        $lookup: {
          from: 'expensepayments',
          localField: '_id',
          foreignField: 'expenseId',
          as: 'payments',
        },
      },
      {
        $match: {
          'payments.0': { $exists: false },
        },
      },
      {
        $project: {
          _id: 1,
          type: { $literal: 'expense' },
          amount: { $abs: '$totalAmount' },
          currency: { $literal: 'INR' },
          date: {
            $cond: [
              {
                $and: [
                  { $gte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date('2020-01-01')] },
                  { $lte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, new Date(Date.now() + 86400000)] },
                ],
              },
              { $ifNull: ['$expenseDate', '$createdAt'] },
              '$createdAt',
            ],
          },
          description: {
            $concat: [
              'Expense - ',
              { $ifNull: ['$name', { $ifNull: ['$expenseNumber', 'Incurred Expense'] }] },
            ],
          },
          domain: { $literal: 'EXPENSE' },
          status: { $ifNull: ['$settlementStatus', 'UNPAID'] },
          referenceId: { $toString: '$_id' },
          referenceType: { $literal: 'Expense' },
          category: { $ifNull: ['$category', null] },
          paymentMethod: { $ifNull: ['$paymentMethod', 'OTHER'] },
          receiptNumber: { $ifNull: ['$expenseNumber', null] },
          createdAt: '$createdAt',
          updatedAt: '$updatedAt',
        },
      },
    ];

    const expenseSearchMatch = searchRegex
      ? {
          $or: [
            { transactionReference: searchRegex },
            { externalTransactionReference: searchRegex },
            { 'parentExpense.name': searchRegex },
            { 'parentExpense.description': searchRegex },
            { 'parentExpense.expenseNumber': searchRegex },
            { 'parentExpense.category': searchRegex },
            { 'parentExpense.vendor.name': searchRegex },
          ],
        }
      : null;

    const paymentProjection = {
      $project: {
        _id: 1,
        type: { $literal: 'income' },
        amount: {
          $cond: [
            { $eq: ['$type', 'Refund'] },
            { $multiply: [-1, { $abs: '$amount' }] },
            { $abs: '$amount' },
          ],
        },
        currency: { $ifNull: ['$currency', 'INR'] },
        date: { $ifNull: ['$paymentDate', '$createdAt'] },
        description: {
          $cond: [
            { $eq: ['$type', 'Refund'] },
            { $concat: ['Refund - ', { $ifNull: ['$referenceType', 'Payment'] }] },
            {
              $cond: [
                { $eq: ['$domain', 'AMENITY'] },
                { $concat: ['Amenity Booking - ', { $ifNull: ['$referenceType', 'Reservation'] }] },
                {
                  $concat: [
                    'Maintenance Payment - ',
                    { $ifNull: ['$invoiceDoc.invoiceNumber', { $ifNull: ['$receiptNumber', 'Invoice'] }] },
                  ],
                },
              ],
            },
          ],
        },
        domain: { $ifNull: ['$domain', 'INVOICE'] },
        status: { $toUpper: '$status' },
        referenceId: { $ifNull: [{ $toString: '$referenceId' }, { $toString: '$invoiceId' }] },
        referenceType: { $ifNull: ['$referenceType', 'Invoice'] },
        paymentMethod: { $ifNull: ['$paymentMethod', 'OTHER'] },
        receiptNumber: { $ifNull: ['$receiptNumber', null] },
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    };

    const expenseProjection = {
      $project: {
        _id: 1,
        type: { $literal: 'expense' },
        amount: { $abs: '$amount' },
        currency: { $literal: 'INR' },
        date: '$paymentDate',
        description: {
          $concat: [
            'Expense - ',
            { $ifNull: ['$parentExpense.name', { $ifNull: ['$parentExpense.expenseNumber', 'Disbursement'] }] },
          ],
        },
        domain: { $literal: 'EXPENSE' },
        status: { $toUpper: '$verificationStatus' },
        referenceId: { $toString: '$expenseId' },
        referenceType: { $literal: 'Expense' },
        category: { $ifNull: ['$parentExpense.category', null] },
        paymentMethod: { $ifNull: ['$paymentMethod', 'OTHER'] },
        receiptNumber: { $ifNull: ['$transactionReference', { $ifNull: ['$externalTransactionReference', null] }] },
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    };

    const facetStage = isExport
      ? {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $limit: maxLimit }],
          },
        }
      : {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: skip }, { $limit: limit }],
          },
        };

    let result;
    const shouldIncludeIncome = type === 'income' || (type === 'all' && domain !== 'EXPENSE');
    const shouldIncludeExpense = type === 'expense' || (type === 'all' && domain !== 'INVOICE' && domain !== 'AMENITY');

    const includeDirectExpenses = includeLiabilities || ['ALL', 'PENDING', 'UNPAID'].includes(status);

    if (shouldIncludeIncome && !shouldIncludeExpense) {
      result = await Payment.aggregate([
        { $match: paymentMatch },
        {
          $lookup: {
            from: 'invoices',
            localField: 'invoiceId',
            foreignField: '_id',
            as: 'invoiceDoc',
          },
        },
        { $unwind: { path: '$invoiceDoc', preserveNullAndEmptyArrays: true } },
        ...(paymentSearchMatch ? [{ $match: paymentSearchMatch }] : []),
        paymentProjection,
        { $sort: { date: -1, _id: -1 } },
        facetStage,
      ]);
    } else if (shouldIncludeExpense && !shouldIncludeIncome) {
      result = await ExpensePayment.aggregate([
        { $match: expensePaymentMatch },
        {
          $lookup: {
            from: 'expenses',
            localField: 'expenseId',
            foreignField: '_id',
            as: 'parentExpense',
          },
        },
        { $unwind: { path: '$parentExpense', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'parentExpense.lifecycleStatus': { $ne: 'CANCELLED' },
            ...(expenseSearchMatch ? expenseSearchMatch : {}),
          },
        },
        expenseProjection,
        ...(includeDirectExpenses
          ? [
              {
                $unionWith: {
                  coll: 'expenses',
                  pipeline: directExpensesPipeline,
                },
              },
            ]
          : []),
        { $sort: { date: -1, _id: -1 } },
        facetStage,
      ]);
    } else {
      const [paymentTotalCount, expensePaymentTotalCount] = await Promise.all([
        Payment.countDocuments({ orgId: orgMatch }),
        ExpensePayment.countDocuments({ orgId: orgMatch }),
      ]);

      if (paymentTotalCount === 0 && expensePaymentTotalCount > 0) {
        result = await ExpensePayment.aggregate([
          { $match: expensePaymentMatch },
          {
            $lookup: {
              from: 'expenses',
              localField: 'expenseId',
              foreignField: '_id',
              as: 'parentExpense',
            },
          },
          { $unwind: { path: '$parentExpense', preserveNullAndEmptyArrays: true } },
          {
            $match: {
              'parentExpense.lifecycleStatus': { $ne: 'CANCELLED' },
              ...(expenseSearchMatch ? expenseSearchMatch : {}),
            },
          },
          expenseProjection,
          ...(includeDirectExpenses
            ? [
                {
                  $unionWith: {
                    coll: 'expenses',
                    pipeline: directExpensesPipeline,
                  },
                },
              ]
            : []),
          { $sort: { date: -1, _id: -1 } },
          facetStage,
        ]);
      } else {
        result = await Payment.aggregate([
          { $match: paymentMatch },
          {
            $lookup: {
              from: 'invoices',
              localField: 'invoiceId',
              foreignField: '_id',
              as: 'invoiceDoc',
            },
          },
          { $unwind: { path: '$invoiceDoc', preserveNullAndEmptyArrays: true } },
          ...(paymentSearchMatch ? [{ $match: paymentSearchMatch }] : []),
          paymentProjection,
          {
            $unionWith: {
              coll: 'expensepayments',
              pipeline: [
                { $match: expensePaymentMatch },
                {
                  $lookup: {
                    from: 'expenses',
                    localField: 'expenseId',
                    foreignField: '_id',
                    as: 'parentExpense',
                  },
                },
                { $unwind: { path: '$parentExpense', preserveNullAndEmptyArrays: true } },
                {
                  $match: {
                    'parentExpense.lifecycleStatus': { $ne: 'CANCELLED' },
                    ...(expenseSearchMatch ? expenseSearchMatch : {}),
                  },
                },
                expenseProjection,
              ],
            },
          },
          ...(includeDirectExpenses
            ? [
                {
                  $unionWith: {
                    coll: 'expenses',
                    pipeline: directExpensesPipeline,
                  },
                },
              ]
            : []),
          { $sort: { date: -1, _id: -1 } },
          facetStage,
        ]);
      }
    }

    const total = result[0]?.metadata[0]?.total || 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const transactions = (result[0]?.data || []).map((tx) => ({
      id: String(tx._id),
      type: tx.type,
      amount: round(tx.amount),
      currency: tx.currency || 'INR',
      date: tx.date ? new Date(tx.date).toISOString() : null,
      description: tx.description || (tx.type === 'income' ? 'Income Payment' : 'Expense Disbursement'),
      domain: tx.domain || (tx.type === 'income' ? 'INVOICE' : 'EXPENSE'),
      status: tx.status,
      referenceId: tx.referenceId ? String(tx.referenceId) : null,
      referenceType: tx.referenceType || (tx.type === 'income' ? 'Invoice' : 'Expense'),
      paymentMethod: tx.paymentMethod || 'OTHER',
      receiptNumber: tx.receiptNumber || null,
      category: tx.category || (tx.type === 'income' ? (tx.domain === 'AMENITY' ? 'Amenity Booking' : 'Maintenance Dues') : 'General Operations'),
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : null,
      updatedAt: tx.updatedAt ? new Date(tx.updatedAt).toISOString() : null,
    }));

    return {
      transactions,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getTransactions(orgId, query = {}) {
    return this._queryTransactions(orgId, query, { unpaginated: false });
  }

  async getAllFilteredTransactions(orgId, query = {}, safetyLimit = EXPORT_ROW_LIMIT) {
    const res = await this._queryTransactions(orgId, query, { unpaginated: true, maxLimit: safetyLimit });
    return res?.transactions || [];
  }

  async _loadExportDataset(orgId, query = {}, meta = {}) {
    const res = await this._queryTransactions(orgId, query, { unpaginated: true, maxLimit: EXPORT_ROW_LIMIT });
    const transactions = res?.transactions || [];
    const total = res?.total || transactions.length;
    return {
      transactions,
      meta: {
        ...meta,
        totalMatching: total,
        truncated: total > transactions.length,
        exportLimit: EXPORT_ROW_LIMIT,
      },
    };
  }

  async getExportReportData(orgId, query = {}, meta = {}) {
    const dataset = await this._loadExportDataset(orgId, query, meta);
    return buildExportReport(dataset.transactions, query, dataset.meta);
  }

  async generateExport(orgId, query = {}, meta = {}) {
    const format = assertExportFormat(query.format);
    const dataset = await this._loadExportDataset(orgId, query, meta);
    const report = buildExportReport(dataset.transactions, query, dataset.meta);
    const fileName = exportFileName(format, query, dataset.meta);

    let buffer;
    let contentType;

    if (format === 'csv') {
      buffer = Buffer.from(reportToCsv(report), 'utf8');
      contentType = 'text/csv; charset=utf-8';
    } else if (format === 'xlsx') {
      buffer = await reportToXlsxBuffer(report);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await reportToPdfBuffer(report);
      contentType = 'application/pdf';
    }

    return {
      buffer,
      fileName,
      contentType,
      rowCount: report.rows.length,
      totalMatching: dataset.meta.totalMatching,
      truncated: dataset.meta.truncated,
      report,
    };
  }
}

export default new CommunityFinanceService();
