import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import { PersonalExpenseService } from '../../src/features/personalExpense/personalExpense.service.js';

const user = { id: '507f1f77bcf86cd799439011', orgId: '507f191e810c19729de860ea' };
const otherUser = { id: '507f1f77bcf86cd799439012', orgId: '507f191e810c19729de860ea' };
const service = new PersonalExpenseService();

before(async () => connectDb());
beforeEach(async () => clearDb());
after(async () => closeDb());

test('persists paise and prevents cross-user reads in the same workspace', async () => {
  const created = await service.createTransaction(user, { type: 'EXPENSE', amount: '99.99', categoryId: 'food_dining', transactionDate: '2026-10-21', paymentMethod: 'UPI', merchantOrSource: 'Grocer' });
  assert.equal(created.transaction.amountMinor, 9999);
  await assert.rejects(service.getTransaction(otherUser, String(created.transaction._id)), /Transaction not found/);
  const listed = await service.listTransactions(user, { page: 1, limit: 10 });
  assert.equal(listed.total, 1);
  assert.equal(String(listed.items[0].orgId), user.orgId);
  assert.equal(mongoose.connection.readyState, 1);
});
test('prevents cross-user category and budget mutations, and cross-organization reads', async () => {
  const custom = await service.createCategory(user, { name: 'Pet care', type: 'EXPENSE' });
  const budget = await service.upsertBudget(user, { period: '2026-10', categoryId: String(custom._id), amount: '500.00' });
  await assert.rejects(service.deleteCategory(otherUser, String(custom._id)), /Category not found/);
  await assert.rejects(service.deleteBudget(otherUser, '2026-10', String(budget.categoryId)), /Budget not found/);

  const created = await service.createTransaction(user, { type: 'EXPENSE', amount: '10.00', categoryId: 'food_dining', transactionDate: '2026-10-21', paymentMethod: 'CASH' });
  const switchedOrganization = { ...user, orgId: '507f191e810c19729de860eb' };
  await assert.rejects(service.getTransaction(switchedOrganization, String(created.transaction._id)), /Transaction not found/);
  assert.equal((await service.listTransactions(switchedOrganization, { page: 1, limit: 10 })).total, 0);
  assert.equal((await service.listCategories(switchedOrganization)).some((category) => category.id === String(custom._id)), false);
});
test('persists explicit settlement status and isolates receipt operations', async () => {
  const created = await service.createTransaction(user, { type: 'EXPENSE', amount: '42.00', categoryId: 'food_dining', transactionDate: '2026-10-21', paymentMethod: 'UPI', paymentSettlement: 'PAID' });
  assert.equal(created.transaction.paymentSettlement, 'PAID');
  const uploaded = await service.uploadReceipt(user, String(created.transaction._id), { filename: 'receipt-test.jpg', originalname: 'receipt.jpg', mimetype: 'image/jpeg', size: 10, path: '' });
  assert.equal(uploaded.receipt.ocrStatus, 'FAILED');
  await assert.rejects(service.updateReceiptReview(otherUser, String(created.transaction._id), { totalMinor: 4200, confirmed: true }), /Transaction not found|Receipt not found/);
  await assert.rejects(service.removeReceipt(otherUser, String(created.transaction._id)), /Transaction not found|Receipt not found/);
  await assert.rejects(service.receiptFile(otherUser, String(created.transaction._id)), /Receipt not found/);
  const reviewed = await service.updateReceiptReview(user, String(created.transaction._id), { totalMinor: 4200, items: [{ description: 'Item', quantity: 1, amountMinor: 4200 }], confirmed: true });
  assert.equal(reviewed.receipt.ocr.totalMinor, 4200);
  const unpaid = await service.createTransaction(user, { type: 'EXPENSE', amount: '5.00', categoryId: 'food_dining', transactionDate: '2026-10-22', paymentMethod: 'CASH', paymentSettlement: 'UNPAID' });
  await assert.rejects(service.uploadReceipt(user, String(unpaid.transaction._id), { filename: 'receipt-unpaid.jpg', originalname: 'receipt.jpg', mimetype: 'image/jpeg', size: 10, path: '' }), /only be attached to a paid transaction/);
});