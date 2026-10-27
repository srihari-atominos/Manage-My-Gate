import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { signToken } from '../src/utils/jwt.utils.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import User from '../src/features/user/user.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import Payment from '../src/features/payment/payment.model.js';
import Expense from '../src/features/expense/expense.model.js';
import ExpensePayment from '../src/features/expense/expensePayment.model.js';
import FinancialLedgerEntry from '../src/features/ledger/financialLedgerEntry.model.js';
import ReconciliationException from '../src/features/ledger/reconciliation/models/reconciliationException.model.js';

const paths = ['dashboard', 'collections', 'outstanding', 'expenses', 'receipts', 'exceptions', 'transactions'];
const counts = async () => Promise.all([Invoice.countDocuments(), Payment.countDocuments(), Expense.countDocuments(), ExpensePayment.countDocuments(), FinancialLedgerEntry.countDocuments(), ReconciliationException.countDocuments()]);

describe('Community Finance HTTP API security', () => {
  let server, baseUrl, orgA, orgB, adminA, residentA, tokenA, residentToken, platformToken;
  const get = (path, token, orgId, query = '') => fetch(`${baseUrl}/api/v1/community-finance/${path}${query}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(orgId ? { 'X-Organization-Id': String(orgId) } : {}) } });
  before(async () => {
    await connectToDb(); server = http.createServer(app); await new Promise((r) => server.listen(0, r)); baseUrl = `http://127.0.0.1:${server.address().port}`;
    const s = `${Date.now()}${Math.floor(Math.random() * 9999)}`;
    orgA = await Organization.create({ name: `CF A ${s}`, code: `CFA${s}`, organizationType: 'Residential', status: 'Active', allowedFeatures: ['billing'] });
    orgB = await Organization.create({ name: `CF B ${s}`, code: `CFB${s}`, organizationType: 'Residential', status: 'Active', allowedFeatures: ['billing'] });
    adminA = await User.create({ name: 'CF Admin', username: `cfa${s}`, email: `cfa${s}@example.com`, password: 'Password123!', role: 'Community Admin', orgId: orgA._id, status: 'Active' });
    residentA = await User.create({ name: 'CF Resident', username: `cfr${s}`, email: `cfr${s}@example.com`, password: 'Password123!', role: 'Resident', orgId: orgA._id, status: 'Active' });
    const platform = await User.create({ name: 'CF Platform', username: `cfp${s}`, email: `cfp${s}@example.com`, password: 'Password123!', role: 'Platform SuperAdmin', status: 'Active' });
    await OrgMembership.create([{ userId: adminA._id, orgId: orgA._id, status: 'Active' }, { userId: residentA._id, orgId: orgA._id, status: 'Active' }]);
    tokenA = signToken({ id: adminA._id, role: 'Community Admin', isPlatform: false, orgId: String(orgA._id) }); residentToken = signToken({ id: residentA._id, role: 'Resident', isPlatform: false, orgId: String(orgA._id) }); platformToken = signToken({ id: platform._id, role: 'Platform SuperAdmin', isPlatform: true });
    await Invoice.create({ invoiceNumber: `CF-A-${s}`, communityId: orgA._id, orgId: orgA._id, assessmentId: new mongoose.Types.ObjectId(), targetUserId: residentA._id, unitId: new mongoose.Types.ObjectId(), billingPeriodString: '2026-10', dueDate: new Date('2026-11-01'), currentCharge: 101, totalAmount: 101, outstandingAmount: 101, status: 'UNPAID' });
    await Invoice.create({ invoiceNumber: `CF-B-${s}`, communityId: orgB._id, orgId: orgB._id, assessmentId: new mongoose.Types.ObjectId(), targetUserId: residentA._id, unitId: new mongoose.Types.ObjectId(), billingPeriodString: '2026-10', dueDate: new Date('2026-11-01'), currentCharge: 202, totalAmount: 202, outstandingAmount: 202, status: 'UNPAID' });
  });
  after(async () => { await new Promise((r) => server.close(r)); await mongoose.disconnect(); });
  test('all endpoints enforce authentication and billing authorization', async () => { for (const path of paths) { assert.equal((await get(path)).status, 401, path); assert.equal((await get(path, residentToken, orgA._id)).status, 403, path); assert.equal((await get(path, tokenA, orgA._id)).status, 200, path); } });
  test('all endpoints isolate tenant data and reject header manipulation', async () => { for (const path of paths) { const own = await get(path, tokenA, orgA._id); assert.equal(own.status, 200, path); assert.equal((await get(path, tokenA, orgB._id)).status, 403, path); } });
  test('platform administrator may select an organization under existing platform rules', async () => { assert.equal((await get('dashboard', platformToken, orgA._id)).status, 200); });
  test('filters are validated and GET requests do not mutate financial records', async () => { const before = await counts(); for (const q of ['?invoiceStatus=BAD', '?startDate=bad', '?startDate=2026-02-30', '?startDate=2026-02-02&endDate=2026-02-01']) assert.equal((await get('dashboard', tokenA, orgA._id, q)).status, 400, q); assert.equal((await get('dashboard', tokenA, orgA._id, '?invoiceStatus=UNPAID&startDate=2026-10-01&endDate=2026-10-31')).status, 200); for (const path of paths) assert.equal((await get(path, tokenA, orgA._id)).status, 200); assert.deepEqual(await counts(), before); });
});
