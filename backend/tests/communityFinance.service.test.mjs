import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDateRange,
  calculateInvoiceSummary,
  isCompletedRefund,
  isSuccessfulCollection,
  isSuccessfulPayment,
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
});

test('filters accept model statuses and reject malformed, impossible, or reversed dates', () => {
  assert.doesNotThrow(() => validateDashboardFilters({ invoiceStatus: 'VERIFICATION_PENDING', startDate: '2026-01-01', endDate: '2026-01-31' }));
  assert.throws(() => validateDashboardFilters({ invoiceStatus: 'UNKNOWN' }), /not supported/);
  assert.throws(() => buildDateRange({ startDate: '2026-02-30' }, 'createdAt'), /valid calendar date/);
  assert.throws(() => buildDateRange({ startDate: 'bad' }, 'createdAt'), /valid calendar date/);
  assert.throws(() => buildDateRange({ startDate: '2026-02-02', endDate: '2026-02-01' }, 'createdAt'), /not be earlier/);
  assert.equal(buildDateRange({ startDate: '2026-01-01' }, 'createdAt').createdAt.$gte.toISOString().slice(0, 10), '2026-01-01');
});
