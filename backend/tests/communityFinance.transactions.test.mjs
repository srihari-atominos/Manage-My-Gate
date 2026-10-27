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
import {
  validateTransactionFilters,
} from '../src/features/communityFinance/communityFinance.service.js';

describe('Community Finance Transactions API (Phase 2)', () => {
  let server, baseUrl, orgA, orgB, adminA, residentA, tokenA, residentToken, platformToken;
  let expA1, expUnpaid;

  const getTransactions = (token, orgId, query = '') =>
    fetch(`${baseUrl}/api/v1/community-finance/transactions${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Organization-Id': String(orgId) } : {}),
      },
    });

  const getCounts = async () =>
    Promise.all([
      Invoice.countDocuments(),
      Payment.countDocuments(),
      Expense.countDocuments(),
      ExpensePayment.countDocuments(),
      FinancialLedgerEntry.countDocuments(),
      ReconciliationException.countDocuments(),
    ]);

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const s = `${Date.now()}${Math.floor(Math.random() * 9999)}`;
    orgA = await Organization.create({
      name: `CF Tx Org A ${s}`,
      code: `CFA${s}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing'],
    });
    orgB = await Organization.create({
      name: `CF Tx Org B ${s}`,
      code: `CFB${s}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing'],
    });

    adminA = await User.create({
      name: 'CF Admin A',
      username: `cfa_tx_${s}`,
      email: `cfa_tx_${s}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      orgId: orgA._id,
      status: 'Active',
    });
    residentA = await User.create({
      name: 'CF Resident A',
      username: `cfr_tx_${s}`,
      email: `cfr_tx_${s}@example.com`,
      password: 'Password123!',
      role: 'Resident',
      orgId: orgA._id,
      status: 'Active',
    });
    const platform = await User.create({
      name: 'CF Platform Admin',
      username: `cfp_tx_${s}`,
      email: `cfp_tx_${s}@example.com`,
      password: 'Password123!',
      role: 'Platform SuperAdmin',
      status: 'Active',
    });

    await OrgMembership.create([
      { userId: adminA._id, orgId: orgA._id, status: 'Active' },
      { userId: residentA._id, orgId: orgA._id, status: 'Active' },
    ]);

    tokenA = signToken({ id: adminA._id, role: 'Community Admin', isPlatform: false, orgId: String(orgA._id) });
    residentToken = signToken({ id: residentA._id, role: 'Resident', isPlatform: false, orgId: String(orgA._id) });
    platformToken = signToken({ id: platform._id, role: 'Platform SuperAdmin', isPlatform: true });

    // Invoices
    const inv1 = await Invoice.create({
      invoiceNumber: `INV-A1-${s}`,
      communityId: orgA._id,
      orgId: orgA._id,
      assessmentId: new mongoose.Types.ObjectId(),
      targetUserId: residentA._id,
      unitId: new mongoose.Types.ObjectId(),
      billingPeriodString: '2026-10',
      dueDate: new Date('2026-11-01'),
      currentCharge: 1500,
      totalAmount: 1500,
      paidAmount: 1500,
      outstandingAmount: 0,
      status: 'PAID',
    });

    // 1. Invoice Payment 1 (Eligible income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      invoiceId: inv1._id,
      referenceId: inv1._id,
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 1500,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'UPI',
      receiptNumber: `REC-INV-1-${s}`,
      paymentDate: new Date('2026-10-05T10:00:00.000Z'),
    });

    // 2. Invoice Payment 2 (Eligible income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 2000,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'CARD',
      receiptNumber: `REC-INV-2-${s}`,
      paymentDate: new Date('2026-10-10T11:00:00.000Z'),
    });

    // 3. Amenity Usage Payment (Eligible income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'AmenityReservation',
      domain: 'AMENITY',
      amount: 500,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'UPI',
      receiptNumber: `REC-AMN-1-${s}`,
      paymentDate: new Date('2026-10-12T12:00:00.000Z'),
    });

    // 4. Wallet Top-Up (Liability: MUST BE EXCLUDED from income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'WalletRecharge',
      domain: 'WALLET',
      amount: 3000,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'UPI',
      receiptNumber: `REC-WLT-${s}`,
      paymentDate: new Date('2026-10-08T09:00:00.000Z'),
    });

    // 5. Refund Payment (Negative income adjustment)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: inv1._id,
      referenceType: 'Invoice',
      domain: 'INVOICE',
      type: 'Refund',
      amount: -200,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'UPI',
      receiptNumber: `REF-INV-1-${s}`,
      paymentDate: new Date('2026-10-15T15:00:00.000Z'),
    });

    // 6. Refundable Deposit Payment (Liability: MUST BE EXCLUDED)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'AmenityReservation',
      domain: 'AMENITY',
      amount: 1000,
      currency: 'INR',
      status: 'success',
      paymentMethod: 'UPI',
      metadata: { isDeposit: true },
      paymentDate: new Date('2026-10-14T14:00:00.000Z'),
    });

    // 7. Pending Payment (Not confirmed receipt: EXCLUDED from default)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: inv1._id,
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 400,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-10-16T16:00:00.000Z'),
    });

    // 8. Unpaid Expense (Obligation without disbursement: MUST NOT appear as cash outflow)
    expUnpaid = await Expense.create({
      orgId: orgA._id,
      expenseNumber: `EXP-UNPAID-${s}`,
      name: 'Unpaid Plumbing Repair',
      description: 'Pending vendor invoice for plumbing',
      expenseType: 'REPAIRS_MAINTENANCE',
      category: 'Plumbing',
      vendor: { name: 'Quick Plumber Co' },
      expenseDate: new Date('2026-10-02T10:00:00.000Z'),
      subtotal: 5000,
      totalAmount: 5000,
      outstandingAmount: 5000,
      settlementStatus: 'UNPAID',
      lifecycleStatus: 'ACTIVE',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-unpaid-${s}`,
    });

    // 9. Reconciled Expense (Confirmed cash disbursement)
    expA1 = await Expense.create({
      orgId: orgA._id,
      expenseNumber: `EXP-REC-${s}`,
      name: 'Elevator Monthly Servicing',
      description: 'Scheduled maintenance for Otis lifts',
      expenseType: 'SERVICES_LABOUR',
      category: 'Elevator',
      vendor: { name: 'Otis Elevators India' },
      expenseDate: new Date('2026-10-17T10:00:00.000Z'),
      subtotal: 1200,
      totalAmount: 1200,
      recordedPaidAmount: 1200,
      confirmedPaidAmount: 1200,
      outstandingAmount: 0,
      settlementStatus: 'PAID',
      lifecycleStatus: 'ACTIVE',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-rec-${s}`,
    });

    await ExpensePayment.create({
      orgId: orgA._id,
      expenseId: expA1._id,
      amount: 1200,
      paymentMethod: 'BANK_TRANSFER',
      fundingSource: 'COMMUNITY_BANK_ACCOUNT',
      paymentDate: new Date('2026-10-18T10:30:00.000Z'),
      transactionReference: `TXN-DISB-${s}`,
      verificationStatus: 'RECONCILED',
      recordType: 'RECORDED',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-pay1-${s}`,
    });

    // 10. Pending/Unreconciled Expense Disbursement (MUST BE EXCLUDED from default cash outflows)
    await ExpensePayment.create({
      orgId: orgA._id,
      expenseId: expA1._id,
      amount: 800,
      paymentMethod: 'UPI',
      fundingSource: 'PETTY_CASH',
      paymentDate: new Date('2026-10-20T10:00:00.000Z'),
      transactionReference: `TXN-PENDING-${s}`,
      verificationStatus: 'PENDING_VERIFICATION',
      recordType: 'RECORDED',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-pay2-${s}`,
    });

    // 11. Voided Expense Disbursement (MUST BE EXCLUDED)
    await ExpensePayment.create({
      orgId: orgA._id,
      expenseId: expA1._id,
      amount: 999,
      paymentMethod: 'CASH',
      fundingSource: 'PETTY_CASH',
      paymentDate: new Date('2026-10-21T10:00:00.000Z'),
      transactionReference: `TXN-VOIDED-${s}`,
      verificationStatus: 'VOIDED',
      recordType: 'RECORDED',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-pay3-${s}`,
    });

    // Org B records (for tenant isolation test)
    await Payment.create({
      orgId: orgB._id,
      userId: adminA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 9999,
      currency: 'INR',
      status: 'success',
      paymentDate: new Date('2026-10-10T10:00:00.000Z'),
    });
  });

  after(async () => {
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  });

  test('1. filter validation rejects invalid query parameters', () => {
    assert.throws(() => validateTransactionFilters({ type: 'invalid_type' }), /type must be one of/);
    assert.throws(() => validateTransactionFilters({ domain: 'INVALID_DOMAIN' }), /domain is not supported/);
    assert.throws(() => validateTransactionFilters({ page: 0 }), /positive integer/);
    assert.throws(() => validateTransactionFilters({ page: -5 }), /positive integer/);
    assert.throws(() => validateTransactionFilters({ limit: 0 }), /between 1 and 100/);
    assert.throws(() => validateTransactionFilters({ limit: 150 }), /between 1 and 100/);
    assert.throws(() => validateTransactionFilters({ status: 'UNSUPPORTED_STATUS' }), /status is not supported/);
    assert.throws(() => validateTransactionFilters({ startDate: 'bad-date' }), /valid calendar date/);
    assert.throws(() => validateTransactionFilters({ startDate: '2026-02-30' }), /valid calendar date/);
    assert.throws(() => validateTransactionFilters({ startDate: '2026-10-15', endDate: '2026-10-10' }), /not be earlier/);
  });

  test('2. unauthenticated requests to transactions endpoint are rejected with 401', async () => {
    const res = await getTransactions(null, orgA._id);
    assert.equal(res.status, 401);
  });

  test('3. unauthorized roles (Resident) are rejected with 403', async () => {
    const res = await getTransactions(residentToken, orgA._id);
    assert.equal(res.status, 403);
  });

  test('4. tenant isolation: Admin A only sees Org A records and cannot access Org B', async () => {
    const ownRes = await getTransactions(tokenA, orgA._id);
    assert.equal(ownRes.status, 200);

    const otherRes = await getTransactions(tokenA, orgB._id);
    assert.equal(otherRes.status, 403);
  });

  test('5. default query (type=all) returns confirmed receipts & disbursements, strictly excluding liabilities & unconfirmed records', async () => {
    const res = await getTransactions(tokenA, orgA._id);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.transactions));

    // Expected confirmed transactions:
    // Income: 2 invoice payments (1500, 2000) + 1 amenity payment (500) + 1 refund (-200) = 4
    // Expense: 1 reconciled payment (1200) = 1
    // Total = 5
    // Excluded: Wallet top-up (3000), deposit (1000), pending payment (400), unpaid expense (5000),
    //           pending expense payment (800), voided expense payment (999), Org B payment (9999)
    assert.equal(json.data.total, 5);
    assert.equal(json.data.transactions.length, 5);

    const types = json.data.transactions.map((t) => t.type);
    assert.equal(types.filter((t) => t === 'income').length, 4);
    assert.equal(types.filter((t) => t === 'expense').length, 1);

    // Verify wallet top-up (3000) is NOT present
    const amounts = json.data.transactions.map((t) => Math.abs(t.amount));
    assert.ok(!amounts.includes(3000), 'Wallet top-up of 3000 must be excluded');

    // Verify security deposit of 1000 is NOT present
    assert.ok(!amounts.includes(1000), 'Security deposit of 1000 must be excluded');

    // Verify unpaid obligation of 5000 is NOT present
    assert.ok(!amounts.includes(5000), 'Unpaid expense obligation of 5000 must be excluded');

    // Verify Org B payment of 9999 is NOT present
    assert.ok(!amounts.includes(9999), 'Org B payment of 9999 must not leak');
  });

  test('6. income filtering (type=income) returns only income transactions', async () => {
    const res = await getTransactions(tokenA, orgA._id, '?type=income');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.total, 4);
    assert.ok(json.data.transactions.every((t) => t.type === 'income'));
  });

  test('7. expense filtering (type=expense) returns only confirmed cash disbursements', async () => {
    const res = await getTransactions(tokenA, orgA._id, '?type=expense');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.total, 1);
    assert.equal(json.data.transactions[0].type, 'expense');
    assert.equal(json.data.transactions[0].amount, 1200);
    assert.equal(json.data.transactions[0].domain, 'EXPENSE');
  });

  test('8. domain filtering isolates transactions by domain source', async () => {
    // INVOICE domain: 2 payments + 1 refund = 3
    const invRes = await getTransactions(tokenA, orgA._id, '?domain=INVOICE');
    const invJson = await invRes.json();
    assert.equal(invJson.data.total, 3);
    assert.ok(invJson.data.transactions.every((t) => t.domain === 'INVOICE'));

    // AMENITY domain: 1 payment
    const amnRes = await getTransactions(tokenA, orgA._id, '?domain=AMENITY');
    const amnJson = await amnRes.json();
    assert.equal(amnJson.data.total, 1);
    assert.equal(amnJson.data.transactions[0].domain, 'AMENITY');
    assert.equal(amnJson.data.transactions[0].amount, 500);

    // EXPENSE domain: 1 disbursement
    const expRes = await getTransactions(tokenA, orgA._id, '?domain=EXPENSE');
    const expJson = await expRes.json();
    assert.equal(expJson.data.total, 1);
    assert.equal(expJson.data.transactions[0].domain, 'EXPENSE');

    // Incompatible combination (type=income & domain=EXPENSE) returns empty result
    const incExpRes = await getTransactions(tokenA, orgA._id, '?type=income&domain=EXPENSE');
    const incExpJson = await incExpRes.json();
    assert.equal(incExpJson.data.total, 0);
    assert.equal(incExpJson.data.transactions.length, 0);
  });

  test('9. search query matches transaction reference, description, or vendor', async () => {
    // Search by vendor / description
    const resVendor = await getTransactions(tokenA, orgA._id, '?search=Elevator');
    const jsonVendor = await resVendor.json();
    assert.equal(jsonVendor.data.total, 1);
    assert.ok(jsonVendor.data.transactions[0].description.includes('Elevator'));

    // Search by receipt number
    const resReceipt = await getTransactions(tokenA, orgA._id, '?search=REC-AMN-1');
    const jsonReceipt = await resReceipt.json();
    assert.equal(jsonReceipt.data.total, 1);
    assert.equal(jsonReceipt.data.transactions[0].domain, 'AMENITY');
  });

  test('10. date filtering restricts transactions to specified date range', async () => {
    // 2026-10-01 to 2026-10-06 should include only payment on 2026-10-05 (1500)
    const res = await getTransactions(tokenA, orgA._id, '?startDate=2026-10-01&endDate=2026-10-06');
    const json = await res.json();
    assert.equal(json.data.total, 1);
    assert.equal(json.data.transactions[0].amount, 1500);
  });

  test('11. server-side pagination returns correct slices, total, and totalPages', async () => {
    // Total is 5. With limit=2: Page 1 has 2 items, totalPages is 3
    const p1Res = await getTransactions(tokenA, orgA._id, '?page=1&limit=2');
    const p1 = await p1Res.json();
    assert.equal(p1.data.page, 1);
    assert.equal(p1.data.limit, 2);
    assert.equal(p1.data.total, 5);
    assert.equal(p1.data.totalPages, 3);
    assert.equal(p1.data.transactions.length, 2);

    const p2Res = await getTransactions(tokenA, orgA._id, '?page=2&limit=2');
    const p2 = await p2Res.json();
    assert.equal(p2.data.page, 2);
    assert.equal(p2.data.transactions.length, 2);

    const p3Res = await getTransactions(tokenA, orgA._id, '?page=3&limit=2');
    const p3 = await p3Res.json();
    assert.equal(p3.data.page, 3);
    assert.equal(p3.data.transactions.length, 1);

    // Verify ordering is strictly descending by date
    const d1 = new Date(p1.data.transactions[0].date).getTime();
    const d2 = new Date(p1.data.transactions[1].date).getTime();
    assert.ok(d1 >= d2, 'Transactions must be sorted date descending');
  });

  test('12. normalized transaction record contains all required fields without PII leakage', async () => {
    const res = await getTransactions(tokenA, orgA._id, '?limit=1');
    const json = await res.json();
    const tx = json.data.transactions[0];

    const requiredFields = [
      'id',
      'type',
      'amount',
      'currency',
      'date',
      'description',
      'domain',
      'status',
      'referenceId',
      'referenceType',
      'paymentMethod',
      'receiptNumber',
      'createdAt',
      'updatedAt',
    ];
    for (const f of requiredFields) {
      assert.ok(tx[f] !== undefined, `Field ${f} must exist in transaction record`);
    }

    // Ensure no sensitive payment info
    assert.equal(tx.cardNumber, undefined);
    assert.equal(tx.cvv, undefined);
    assert.equal(tx.bankSecret, undefined);
    assert.equal(tx.userPassword, undefined);
  });

  test('13. refund record is represented as negative amount or refund type', async () => {
    const res = await getTransactions(tokenA, orgA._id, '?search=REF-INV-1');
    const json = await res.json();
    assert.equal(json.data.total, 1);
    const refund = json.data.transactions[0];
    assert.equal(refund.type, 'income');
    assert.equal(refund.amount, -200);
    assert.ok(refund.description.toLowerCase().includes('refund'));
  });

  test('14. empty result returns consistent shape with zero values', async () => {
    const res = await getTransactions(tokenA, orgA._id, '?startDate=2025-01-01&endDate=2025-01-31');
    const json = await res.json();
    assert.equal(json.data.total, 0);
    assert.equal(json.data.totalPages, 0);
    assert.deepEqual(json.data.transactions, []);
  });

  test('15. read-only integrity: GET requests never mutate source financial records', async () => {
    const before = await getCounts();
    await getTransactions(tokenA, orgA._id);
    await getTransactions(tokenA, orgA._id, '?type=income');
    await getTransactions(tokenA, orgA._id, '?type=expense');
    await getTransactions(tokenA, orgA._id, '?search=Elevator');
    const afterCounts = await getCounts();
    assert.deepEqual(afterCounts, before);
  });
});
