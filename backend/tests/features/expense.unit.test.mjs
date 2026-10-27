import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItems, statusFor } from '../../src/features/expense/expense.service.js';
describe('Expense pure business rules', () => {
  it('recalculates item line totals using monetary rounding', () => { const items = normalizeItems([{ itemName: 'Part', quantity: 3, unit: 'piece', unitPrice: 10.555 }]); assert.equal(items[0].lineTotal, 31.67); });
  it('rejects invalid item quantities and prices', () => { assert.throws(() => normalizeItems([{ itemName: 'Bad', quantity: 0, unit: 'piece', unitPrice: 10 }]), /valid quantity/); assert.throws(() => normalizeItems([{ itemName: 'Bad', quantity: 1, unit: 'piece', unitPrice: -1 }]), /valid quantity/); });
  it('maps recorded payment totals to settlement states', () => { assert.equal(statusFor(20000, 0), 'UNPAID'); assert.equal(statusFor(20000, 10000), 'PARTIALLY_PAID'); assert.equal(statusFor(20000, 20000), 'PAID'); });
});

describe('Expense item normalisation for OCR-prefilled rows', () => {
  it('accepts a description-only row by defaulting itemName and unit instead of failing at save time', () => {
    const [item] = normalizeItems([{ description: 'Lorem', quantity: 1, unitPrice: 6.5 }]);
    assert.equal(item.itemName, 'Lorem');
    assert.equal(item.unit, 'nos');
    assert.equal(item.lineTotal, 6.5);
  });
  it('rejects a row that has no name at all', () => {
    assert.throws(() => normalizeItems([{ quantity: 1, unitPrice: 5 }]), /must have a name/);
  });
});
