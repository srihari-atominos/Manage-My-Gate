import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDateRange,
  calculateInvoiceSummary,
  calculateRunwayAnalytics,
  isCompletedRefund,
  isEligibleIncomePayment,
  isSuccessfulCollection,
  isSuccessfulPayment,
  parseCalendarDate,
  summarizeCollections,
  validateDashboardFilters,
} from '../src/features/communityFinance/communityFinance.service.js';

test('normal invoice reports its outstanding total', () => {
  const summary = calculateInvoiceSummary([{ _id: 'one', status: 'UNPAID', currentCharge: 100, outstandingAmount: 100 }]);
  assert.equal(summary.currentPeriodCharges, 100);
  assert.equal(summary.outstandingDues, 100);
  assert.equal(summary.outstandingDuesAllocationStatus, 'CANONICAL_INVOICE_TOTALS');
});

test('carry-forward successor is canonical while source balance is explicitly unallocated', () => {
  const summary = calculateInvoiceSummary([
    { _id: 'old', status: 'UNPAID', currentCharge: 100, outstandingAmount: 100 },
    { _id: 'new', status: 'UNPAID', currentCharge: 120, previousOutstanding: 100, outstandingAmount: 220, carryForwardHistory: [{ invoiceId: 'old', amount: 100 }] },
  ]);
  assert.equal(summary.outstandingDues, 220);
  assert.equal(summary.unallocatedCarryForwardSourceOutstanding, 100);
  assert.equal(summary.outstandingDuesAllocationStatus, 'CARRY_FORWARD_COMPONENT_ALLOCATION_UNAVAILABLE');
});

test('partially paid carry-forward successor is not combined with its source a second time', () => {
  const summary = calculateInvoiceSummary([
    { _id: 'old', status: 'UNPAID', outstandingAmount: 100 },
    { _id: 'new', status: 'PARTIALLY_PAID', currentCharge: 120, previousOutstanding: 100, paidAmount: 100, outstandingAmount: 120, carryForwardHistory: [{ invoiceId: 'old', amount: 100 }] },
  ]);
  assert.equal(summary.outstandingDues, 120);
  assert.equal(summary.unallocatedCarryForwardSourceOutstanding, 100);
});

test('missing or inconsistent carry-forward history does not discard invoices', () => {
  const summary = calculateInvoiceSummary([{ _id: 'new', status: 'UNPAID', outstandingAmount: 75, carryForwardHistory: [{ invoiceId: 'missing', amount: 50 }] }]);
  assert.equal(summary.outstandingDues, 75);
  assert.equal(summary.unallocatedCarryForwardSourceOutstanding, 0);
});

test('collections count multi-invoice payment once and completed refunds separately', () => {
  const summary = summarizeCollections([
    { _id: 'pay', domain: 'INVOICE', type: 'Payment', status: 'success', amount: 200, allocations: [{ invoiceId: 'a', amountApplied: 100 }, { invoiceId: 'b', amountApplied: 100 }] },
    { _id: 'refund', domain: 'INVOICE', type: 'Refund', parentPaymentId: 'pay', status: 'success', amount: -40 },
    { _id: 'pending-refund', domain: 'INVOICE', type: 'Refund', parentPaymentId: 'pay', status: 'processing', amount: -20 },
    { _id: 'failed-refund', domain: 'INVOICE', type: 'Refund', parentPaymentId: 'pay', status: 'failed', amount: -10 },
  ]);
  assert.equal(summary.grossSuccessfulCollections, 200);
  assert.equal(summary.completedRefunds, 40);
  assert.equal(summary.netCollectionsAfterRefunds, 160);
  assert.equal(summary.successfulCollections.length, 1);
  assert.equal(isCompletedRefund({ type: 'Refund', status: 'success' }), true);
  assert.equal(isSuccessfulCollection({ type: 'Refund', status: 'success' }), false);
});

test('payment status filtering excludes pending and failed payments', () => {
  assert.equal(isSuccessfulPayment({ status: 'success' }), true);
  assert.equal(isSuccessfulPayment({ status: 'pending' }), false);
  assert.equal(isSuccessfulPayment({ status: 'failed' }), false);
  assert.equal(isSuccessfulPayment({ status: 'cancelled' }), false);
  assert.equal(isSuccessfulPayment({ status: 'VERIFICATION_PENDING' }), false);
});

test('filters accept model statuses and reject malformed, impossible, or reversed dates', () => {
  assert.doesNotThrow(() => validateDashboardFilters({ invoiceStatus: 'VERIFICATION_PENDING', startDate: '2026-01-01', endDate: '2026-01-31' }));
  assert.throws(() => validateDashboardFilters({ invoiceStatus: 'UNKNOWN' }), /not supported/);
  assert.throws(() => buildDateRange({ startDate: '2026-02-30' }, 'createdAt'), /valid calendar date/);
  assert.throws(() => buildDateRange({ startDate: 'bad' }, 'createdAt'), /valid calendar date/);
  assert.throws(() => buildDateRange({ startDate: '2026-02-02', endDate: '2026-02-01' }, 'createdAt'), /not be earlier/);
  assert.equal(buildDateRange({ startDate: '2026-01-01' }, 'createdAt').createdAt.$gte.toISOString().slice(0, 10), '2026-01-01');
});

test('amenity payments are included in community collections and categorized by source', () => {
  const summary = summarizeCollections([
    { _id: 'inv1', domain: 'INVOICE', referenceType: 'Invoice', type: 'Payment', status: 'success', amount: 500 },
    { _id: 'amn1', domain: 'AMENITY', referenceType: 'AmenityReservation', type: 'Payment', status: 'success', amount: 250 },
    { _id: 'wlt1', domain: 'WALLET', referenceType: 'WalletRecharge', type: 'Payment', status: 'success', amount: 1000 },
  ]);
  assert.equal(summary.maintenanceCollections, 500);
  assert.equal(summary.amenityCollections, 250);
  assert.equal(summary.grossSuccessfulCollections, 750); // Wallet top-up strictly excluded!
  assert.equal(summary.completedRefunds, 0);
  assert.equal(summary.netCollectionsAfterRefunds, 750);
  assert.equal(summary.successfulCollections.length, 2);
});

test('wallet top-up payments are strictly excluded from community income recognition', () => {
  assert.equal(isEligibleIncomePayment({ domain: 'WALLET', referenceType: 'WalletRecharge' }), false);
  assert.equal(isEligibleIncomePayment({ domain: 'WALLET', referenceType: 'Wallet' }), false);
  assert.equal(isEligibleIncomePayment({ domain: 'INVOICE', referenceType: 'Invoice' }), true);
  assert.equal(isEligibleIncomePayment({ domain: 'AMENITY', referenceType: 'AmenityReservation' }), true);
  assert.equal(isEligibleIncomePayment({ domain: 'AMENITY', referenceType: 'AmenityBooking' }), true);
});

test('timezone-aware date range handles Indian Standard Time (IST) calendar boundaries', () => {
  const range = buildDateRange(
    { startDate: '2026-10-01', endDate: '2026-10-31', timezone: 'Asia/Kolkata' },
    'paymentDate'
  );
  // 2026-10-01 00:00:00 IST is 2026-09-30 18:30:00 UTC
  assert.equal(range.paymentDate.$gte.toISOString(), '2026-09-30T18:30:00.000Z');
  // 2026-10-31 23:59:59.999 IST is 2026-10-31 18:29:59.999 UTC
  assert.equal(range.paymentDate.$lte.toISOString(), '2026-10-31T18:29:59.999Z');
});

test('partially paid invoice calculates correct remaining arrears balance', () => {
  const summary = calculateInvoiceSummary([
    {
      _id: 'inv-part',
      status: 'PARTIALLY_PAID',
      currentCharge: 10000,
      totalAmount: 10000,
      paidAmount: 7000,
      outstandingAmount: 3000,
    },
  ]);
  assert.equal(summary.currentPeriodCharges, 10000);
  assert.equal(summary.outstandingDues, 3000); // Does NOT report 10,000!
});

test('calculateInvoiceSummary preserves cumulative arrears when historical active invoices are provided', () => {
  const periodInvoices = [
    { _id: 'oct-inv', status: 'UNPAID', currentCharge: 2000, outstandingAmount: 2000 },
  ];
  const allActiveInvoices = [
    { _id: 'sep-inv', status: 'UNPAID', currentCharge: 1500, outstandingAmount: 1500 },
    { _id: 'oct-inv', status: 'UNPAID', currentCharge: 2000, outstandingAmount: 2000 },
  ];
  const summary = calculateInvoiceSummary(periodInvoices, allActiveInvoices);
  assert.equal(summary.currentPeriodCharges, 2000); // Charges of current period
  assert.equal(summary.outstandingDues, 3500); // Total cumulative arrears across all canonical unpaid invoices
});

test('empty community records return safe zero-value metrics', () => {
  const invoiceSummary = calculateInvoiceSummary([]);
  assert.equal(invoiceSummary.invoiceCount, 0);
  assert.equal(invoiceSummary.currentPeriodCharges, 0);
  assert.equal(invoiceSummary.outstandingDues, 0);

  const collectionSummary = summarizeCollections([]);
  assert.equal(collectionSummary.grossSuccessfulCollections, 0);
  assert.equal(collectionSummary.maintenanceCollections, 0);
  assert.equal(collectionSummary.amenityCollections, 0);
  assert.equal(collectionSummary.completedRefunds, 0);
  assert.equal(collectionSummary.netCollectionsAfterRefunds, 0);
});

test('comprehensive synthetic financial dataset verifies cash-basis accounting policy end-to-end', () => {
  // 1. Invoices (Period + Older active)
  const periodInvoices = [
    { _id: 'inv-full', status: 'PAID', currentCharge: 5000, totalAmount: 5000, paidAmount: 5000, outstandingAmount: 0 },
    { _id: 'inv-part', status: 'PARTIALLY_PAID', currentCharge: 10000, totalAmount: 10000, paidAmount: 7000, outstandingAmount: 3000 },
    { _id: 'inv-unpaid', status: 'UNPAID', currentCharge: 4000, totalAmount: 4000, paidAmount: 0, outstandingAmount: 4000 },
  ];
  const allActiveInvoices = [
    { _id: 'inv-old', status: 'UNPAID', currentCharge: 1500, totalAmount: 1500, paidAmount: 0, outstandingAmount: 1500 },
    ...periodInvoices,
  ];

  const invoiceSummary = calculateInvoiceSummary(periodInvoices, allActiveInvoices);
  assert.equal(invoiceSummary.currentPeriodCharges, 19000); // 5000 + 10000 + 4000
  assert.equal(invoiceSummary.outstandingDues, 8500); // 3000 + 4000 + 1500 (historical arrear included!)

  // 2. Payments (Mixed statuses, domains, and refund)
  const samplePayments = [
    { _id: 'pay-1', domain: 'INVOICE', referenceType: 'Invoice', type: 'Payment', status: 'success', amount: 5000 },
    { _id: 'pay-2', domain: 'INVOICE', referenceType: 'Invoice', type: 'Payment', status: 'success', amount: 7000 },
    { _id: 'pay-3', domain: 'AMENITY', referenceType: 'AmenityBooking', type: 'Payment', status: 'success', amount: 1500 },
    { _id: 'pay-wlt', domain: 'WALLET', referenceType: 'WalletRecharge', type: 'Payment', status: 'success', amount: 3000 },
    { _id: 'pay-pending', domain: 'INVOICE', referenceType: 'Invoice', type: 'Payment', status: 'pending', amount: 1000 },
    { _id: 'pay-failed', domain: 'INVOICE', referenceType: 'Invoice', type: 'Payment', status: 'failed', amount: 2500 },
    { _id: 'pay-ref', domain: 'INVOICE', referenceType: 'Invoice', type: 'Refund', status: 'success', amount: -500 },
  ];

  const collectionSummary = summarizeCollections(samplePayments);
  assert.equal(collectionSummary.maintenanceCollections, 12000); // 5000 + 7000
  assert.equal(collectionSummary.amenityCollections, 1500);
  assert.equal(collectionSummary.grossSuccessfulCollections, 13500); // Excludes wallet (3000), pending (1000), failed (2500)
  assert.equal(collectionSummary.completedRefunds, 500);
  assert.equal(collectionSummary.netCollectionsAfterRefunds, 13000); // 13500 - 500

  // 3. Disbursements & Net Position
  const reconciledDisbursements = 6000; // Confirmed payment to vendor
  const netCashSurplus = collectionSummary.netCollectionsAfterRefunds - reconciledDisbursements;
  assert.equal(netCashSurplus, 7000); // 13000 - 6000
});

test('calculateRunwayAnalytics correctly identifies deficit burn rate and months to balance', () => {
  // Monthly series where expenses exceed income
  const timeSeries = [
    { periodKey: '2026-01', income: 100000, expense: 150000 },
    { periodKey: '2026-02', income: 100000, expense: 150000 },
  ];
  // Balance: 500,000, Burn: 50,000/mo -> 10 months runway
  const runway = calculateRunwayAnalytics(500000, timeSeries);
  assert.equal(runway.remainingBalance, 500000);
  assert.equal(runway.averageMonthlyExpenses, 150000);
  assert.equal(runway.averageMonthlyCollections, 100000);
  assert.equal(runway.netMonthlyBurn, 50000);
  assert.equal(runway.isSelfSustaining, false);
  assert.equal(runway.runwayMonths, 10);
  assert.equal(runway.grossRunwayMonths, 3.33); // 500000 / 150000
  assert.equal(runway.runwayHealth, 'HEALTHY'); // >= 6 months
  assert.ok(runway.projectedDepletionDate);
});

test('calculateRunwayAnalytics correctly tags self-sustaining surplus runway when income exceeds expenses', () => {
  const timeSeries = [
    { periodKey: '2026-01', income: 200000, expense: 120000 },
    { periodKey: '2026-02', income: 180000, expense: 140000 },
  ];
  const runway = calculateRunwayAnalytics(400000, timeSeries);
  assert.equal(runway.isSelfSustaining, true);
  assert.equal(runway.runwayMonths, null);
  assert.equal(runway.netMonthlyBurn, -60000); // Accumulating 60k surplus/mo
  assert.equal(runway.runwayHealth, 'SURPLUS');
  assert.equal(runway.projectedDepletionDate, null);
});

test('calculateRunwayAnalytics handles cautionary and critical runway health thresholds', () => {
  // 1. Caution (3 to 6 months)
  const cautionSeries = [{ periodKey: '2026-01', income: 50000, expense: 100000 }];
  const cautionRunway = calculateRunwayAnalytics(200000, cautionSeries); // 200k / 50k burn = 4 months
  assert.equal(cautionRunway.runwayMonths, 4);
  assert.equal(cautionRunway.runwayHealth, 'CAUTION');

  // 2. Critical (< 3 months)
  const criticalSeries = [{ periodKey: '2026-01', income: 50000, expense: 100000 }];
  const criticalRunway = calculateRunwayAnalytics(100000, criticalSeries); // 100k / 50k burn = 2 months
  assert.equal(criticalRunway.runwayMonths, 2);
  assert.equal(criticalRunway.runwayHealth, 'CRITICAL');

  // 3. Zero or negative balance
  const zeroRunway = calculateRunwayAnalytics(0, criticalSeries);
  assert.equal(zeroRunway.runwayMonths, 0);
  assert.equal(zeroRunway.runwayHealth, 'CRITICAL');

  const negativeRunway = calculateRunwayAnalytics(-15000, criticalSeries);
  assert.equal(negativeRunway.runwayMonths, 0);
  assert.equal(negativeRunway.runwayHealth, 'CRITICAL');
});


