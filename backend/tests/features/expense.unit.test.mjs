import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItems, statusFor } from '../../src/features/expense/expense.service.js';
describe('Expense pure business rules', () => {
  it('recalculates item line totals using monetary rounding', () => { const items = normalizeItems([{ itemName: 'Part', quantity: 3, unit: 'piece', unitPrice: 10.555 }]); assert.equal(items[0].lineTotal, 31.67); });
  it('rejects invalid item quantities and prices', () => { assert.throws(() => normalizeItems([{ itemName: 'Bad', quantity: 0, unit: 'piece', unitPrice: 10 }]), /valid quantity/); assert.throws(() => normalizeItems([{ itemName: 'Bad', quantity: 1, unit: 'piece', unitPrice: -1 }]), /valid quantity/); });
  it('maps recorded payment totals to settlement states', () => { assert.equal(statusFor(20000, 0), 'UNPAID'); assert.equal(statusFor(20000, 10000), 'PARTIALLY_PAID'); assert.equal(statusFor(20000, 20000), 'PAID'); });
});
