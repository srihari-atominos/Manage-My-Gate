import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
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

describe('Community Finance Export & Financial Reporting System', () => {
  let server, baseUrl, orgA, orgB, adminA, residentA, tokenA, residentToken;

  const exportRequest = (token, orgId, body = {}, method = 'POST', query = '') =>
    fetch(`${baseUrl}/api/v1/community-finance/exports${query}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Organization-Id': String(orgId) } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const s = `${Date.now()}${Math.floor(Math.random() * 9999)}`;
    orgA = await Organization.create({
      name: `CF Export Org A ${s}`,
      code: `EXPA${s}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing'],
    });
    orgB = await Organization.create({
      name: `CF Export Org B ${s}`,
      code: `EXPB${s}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing'],
    });

    adminA = await User.create({
      name: 'CF Export Admin',
      username: `cfa_exp_${s}`,
      email: `cfa_exp_${s}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      orgId: orgA._id,
      status: 'Active',
    });
    residentA = await User.create({
      name: 'CF Export Resident',
      username: `cfr_exp_${s}`,
      email: `cfr_exp_${s}@example.com`,
      password: 'Password123!',
      role: 'Resident',
      orgId: orgA._id,
      status: 'Active',
    });

    await OrgMembership.create([
      { userId: adminA._id, orgId: orgA._id, status: 'Active' },
      { userId: residentA._id, orgId: orgA._id, status: 'Active' },
    ]);

    tokenA = signToken({ id: adminA._id, role: 'Community Admin', isPlatform: false, orgId: String(orgA._id) });
    residentToken = signToken({ id: residentA._id, role: 'Resident', isPlatform: false, orgId: String(orgA._id) });

    // Seed test financial data for Org A
    const invA = await Invoice.create({
      invoiceNumber: `INV-EXP-${s}`,
      communityId: orgA._id,
      orgId: orgA._id,
      assessmentId: new mongoose.Types.ObjectId(),
      targetUserId: residentA._id,
      unitId: new mongoose.Types.ObjectId(),
      billingPeriodString: '2026-10',
      currentCharge: 12000,
      totalAmount: 12000,
      paidAmount: 12000,
      outstandingAmount: 0,
      status: 'PAID',
      dueDate: new Date('2026-10-15'),
      invoiceDate: new Date('2026-10-01'),
      createdAt: new Date('2026-10-01'),
    });

    // 1. Payment 1 (Maintenance Income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      invoiceId: invA._id,
      referenceId: invA._id,
      amount: 12000,
      currency: 'INR',
      status: 'success',
      paymentDate: new Date('2026-10-05T10:00:00Z'),
      domain: 'INVOICE',
      referenceType: 'Invoice',
      paymentMethod: 'UPI',
      receiptNumber: `REC-EXP-001-${s}`,
      payerNotes: 'Generator maintenance share',
      createdAt: new Date('2026-10-05T10:00:00Z'),
    });

    // 2. Payment 2 (Amenity Income)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      amount: 3500,
      currency: 'INR',
      status: 'success',
      paymentDate: new Date('2026-10-10T14:30:00Z'),
      domain: 'AMENITY',
      referenceType: 'AmenityBooking',
      paymentMethod: 'CARD',
      receiptNumber: `REC-EXP-002-${s}`,
      payerNotes: 'Clubhouse party booking',
      createdAt: new Date('2026-10-10T14:30:00Z'),
    });

    // 3. Payment 3 (Refund)
    await Payment.create({
      orgId: orgA._id,
      userId: residentA._id,
      referenceId: new mongoose.Types.ObjectId(),
      amount: -500,
      currency: 'INR',
      status: 'success',
      type: 'Refund',
      paymentDate: new Date('2026-10-12T09:00:00Z'),
      domain: 'AMENITY',
      referenceType: 'AmenityBooking',
      paymentMethod: 'UPI',
      receiptNumber: `REC-EXP-REF-${s}`,
      payerNotes: 'Cancelled booking refund',
      createdAt: new Date('2026-10-12T09:00:00Z'),
    });

    // 4. Expense 1 (Paid Expense with ExpensePayment)
    const exp1 = await Expense.create({
      orgId: orgA._id,
      expenseNumber: `EXP-101-${s}`,
      name: 'Diesel Generator Fuel',
      description: 'Fuel for backup generator',
      expenseType: 'BILLS_UTILITIES',
      category: 'Utilities',
      vendor: { name: 'Bharat Petroleum' },
      subtotal: 8500,
      totalAmount: 8500,
      recordedPaidAmount: 8500,
      confirmedPaidAmount: 8500,
      outstandingAmount: 0,
      settlementStatus: 'PAID',
      lifecycleStatus: 'ACTIVE',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-101-${s}`,
      expenseDate: new Date('2026-10-08T11:00:00Z'),
      createdAt: new Date('2026-10-08T11:00:00Z'),
    });

    await ExpensePayment.create({
      orgId: orgA._id,
      expenseId: exp1._id,
      amount: 8500,
      paymentMethod: 'BANK_TRANSFER',
      fundingSource: 'COMMUNITY_BANK_ACCOUNT',
      recordedBy: adminA._id,
      verificationStatus: 'RECONCILED',
      recordType: 'RECORDED',
      paymentDate: new Date('2026-10-08T11:30:00Z'),
      transactionReference: `UTR-FUEL-${s}`,
      createdAt: new Date('2026-10-08T11:30:00Z'),
    });

    // 5. Expense 2 (Unpaid/Pending Expense)
    await Expense.create({
      orgId: orgA._id,
      expenseNumber: `EXP-102-${s}`,
      name: 'Elevator AMC Repair',
      description: 'Elevator servicing',
      expenseType: 'REPAIRS_MAINTENANCE',
      category: 'Elevator',
      vendor: { name: 'Otis Elevators' },
      subtotal: 15000,
      totalAmount: 15000,
      recordedPaidAmount: 0,
      outstandingAmount: 15000,
      settlementStatus: 'UNPAID',
      lifecycleStatus: 'ACTIVE',
      recordedBy: adminA._id,
      idempotencyKey: `idemp-102-${s}`,
      expenseDate: new Date('2026-10-20T16:00:00Z'),
      createdAt: new Date('2026-10-20T16:00:00Z'),
    });

    // 6. Org B Data (for tenant isolation check)
    await Payment.create({
      orgId: orgB._id,
      userId: new mongoose.Types.ObjectId(),
      referenceId: new mongoose.Types.ObjectId(),
      amount: 99999,
      currency: 'INR',
      status: 'success',
      paymentDate: new Date('2026-10-05T10:00:00Z'),
      domain: 'INVOICE',
      referenceType: 'Invoice',
      paymentMethod: 'CASH',
      receiptNumber: `REC-ORGB-${s}`,
      payerNotes: 'Sensitive Org B transaction',
      createdAt: new Date('2026-10-05T10:00:00Z'),
    });
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  });

  test('1. Authentication: rejects export requests without token (401)', async () => {
    const res = await exportRequest(null, orgA._id, { format: 'csv' });
    assert.equal(res.status, 401);
  });

  test('2. Authorization: rejects export requests from unauthorized roles (403)', async () => {
    const res = await exportRequest(residentToken, orgA._id, { format: 'csv' });
    assert.equal(res.status, 403);
  });

  test('3. Validation: rejects invalid export formats (400)', async () => {
    const res = await exportRequest(tokenA, orgA._id, { format: 'pptx' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /format must be csv, xlsx, or pdf/i);
  });

  test('4. CSV Export: downloads valid CSV with UTF-8 BOM, headers, and neutralized formulas', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    assert.ok(res.headers.get('content-disposition')?.includes('attachment; filename='));
    assert.ok(res.headers.get('content-disposition')?.endsWith('.csv"'));

    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    // Verify UTF-8 BOM bytes (0xEF, 0xBB, 0xBF)
    assert.equal(buf[0], 0xef);
    assert.equal(buf[1], 0xbb);
    assert.equal(buf[2], 0xbf);

    const csvText = buf.toString('utf-8');

    // CSV is a clean machine-readable table: first line is the header, no metadata preamble
    const firstLine = csvText.replace(/^﻿/, '').split('\r\n')[0];
    assert.equal(
      firstLine,
      '"Date","Transaction ID","Type","Domain","Category","Description","Amount","Currency","Status","Payment Method","Receipt / Reference","Related Invoice / Expense ID"'
    );
    assert.ok(!csvText.includes('# '), 'CSV must not contain comment metadata lines');
    // Filename carries the authoritative community name and reporting month
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition.includes(orgA.name.replace(/[^a-zA-Z0-9_\-]/g, '_')), 'filename should contain community name');
    assert.ok(disposition.includes('_Finance_2026-10.csv'));

    // Verify matching transactions are present
    assert.ok(csvText.includes('REC-EXP-001'));
    assert.ok(csvText.includes('Diesel Generator Fuel'));

    // Verify Org B sensitive data is excluded
    assert.ok(!csvText.includes('REC-ORGB'));
  });

  test('5. Excel (.xlsx) Export: generates multi-sheet workbook with summaries and transactions', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'xlsx',
      filters: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /openxmlformats-officedocument/);
    assert.ok(res.headers.get('content-disposition')?.endsWith('.xlsx"'));

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    assert.ok(buffer.length > 5000, 'Excel file buffer should be substantial');

    // Inspect workbook with ExcelJS parser
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Check expected worksheets exist
    const sheetNames = workbook.worksheets.map((s) => s.name);
    for (const name of ['Financial Overview', 'Transactions', 'Income Analysis', 'Expense Analysis', 'Financial Trends']) {
      assert.ok(sheetNames.includes(name), `${name} sheet missing`);
    }

    const txSheet = workbook.getWorksheet('Transactions');
    assert.ok(txSheet.rowCount >= 4, 'Transactions sheet should have rows for filtered data');

    // Check summary sheet has title and metrics
    const summarySheet = workbook.getWorksheet('Financial Overview');
    assert.ok(String(summarySheet.getCell('A1').value).includes(orgA.name), 'overview must name the community');
    const labels = [];
    summarySheet.eachRow((row) => labels.push(String(row.getCell(1).value)));
    assert.ok(labels.includes('Cash Received (net of refunds)'));
    assert.ok(labels.includes('Outstanding Payables (not yet paid)'));
  });

  test('6. PDF (.pdf) Export: generates professional multi-page document starting with %PDF', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'pdf',
      filters: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/pdf/);
    assert.ok(res.headers.get('content-disposition')?.endsWith('.pdf"'));

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF files start with magic header %PDF-
    const headerMagic = buffer.slice(0, 5).toString('utf-8');
    assert.equal(headerMagic, '%PDF-');
    assert.ok(buffer.length > 3000, 'PDF buffer should be non-empty');
  });

  test('7. Filter Awareness: Date Range filter excludes transactions outside window', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: {
        startDate: '2026-10-01',
        endDate: '2026-10-07',
      },
    });

    assert.equal(res.status, 200);
    const csv = await res.text();
    assert.ok(csv.includes('REC-EXP-001'));
    assert.ok(!csv.includes('REC-EXP-002'));
  });

  test('8. Filter Awareness: Direction filter (income vs expense)', async () => {
    const resIncome = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: { type: 'income' },
    });
    const csvIncome = await resIncome.text();
    assert.ok(csvIncome.includes('REC-EXP-001'));
    assert.ok(!csvIncome.includes('Diesel Generator Fuel'));

    const resExpense = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: { type: 'expense' },
    });
    const csvExpense = await resExpense.text();
    assert.ok(csvExpense.includes('Diesel Generator Fuel'));
    assert.ok(!csvExpense.includes('REC-EXP-001'));
  });

  test('9. Filter Awareness: Domain filter (INVOICE vs AMENITY vs EXPENSE)', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: { domain: 'AMENITY' },
    });
    const csv = await res.text();
    assert.ok(csv.includes('REC-EXP-002'));
    assert.ok(!csv.includes('REC-EXP-001'));
    assert.ok(!csv.includes('Diesel Generator Fuel'));
  });

  test('10. Filter Awareness: Search query filter matches description and reference', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: { search: 'Generator' },
    });
    const csv = await res.text();
    assert.ok(csv.includes('Diesel Generator Fuel') || csv.includes('REC-EXP-001'));
    assert.ok(!csv.includes('Clubhouse party booking'));
  });

  test('11. Multi-Tenant Isolation: Org B user cannot export Org A data', async () => {
    const s = `${Date.now()}`;
    const adminB = await User.create({
      name: 'CF Admin B',
      username: `cfa_b_${s}`,
      email: `cfa_b_${s}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      orgId: orgB._id,
      status: 'Active',
    });
    await OrgMembership.create({ userId: adminB._id, orgId: orgB._id, status: 'Active' });
    const tokenB = signToken({ id: adminB._id, role: 'Community Admin', isPlatform: false, orgId: String(orgB._id) });

    const res = await exportRequest(tokenB, orgB._id, { format: 'csv' });
    const csv = await res.text();
    assert.ok(csv.includes('REC-ORGB'));
    assert.ok(!csv.includes('REC-EXP-001'));
    assert.ok(!csv.includes('Diesel Generator Fuel'));
  });

  test('12. Large dataset handling: exports full matching dataset without pagination truncation', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'csv',
      filters: { type: 'all' },
    });
    const rowHeaderCount = (await res.headers.get('x-export-rows')) || '0';
    assert.ok(Number(rowHeaderCount) >= 4, 'Should export all 4 matching transactions');
  });

  test('13. Empty Result handling: returns clean report without server crash', async () => {
    const res = await exportRequest(tokenA, orgA._id, {
      format: 'xlsx',
      filters: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
    });
    assert.equal(res.status, 200);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length > 1000);
  });

  test('14. GET endpoint compatibility: GET /community-finance/export?format=csv works', async () => {
    const res = await exportRequest(tokenA, orgA._id, {}, 'GET', '?format=csv&type=income');
    assert.equal(res.status, 200);
    const csv = await res.text();
    assert.ok(csv.includes('REC-EXP-001'));
  });
});
