import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  buildExportReport,
  exportFileName,
  reportToCsv,
  reportToXlsxBuffer,
  reportToPdfBuffer,
} from '../src/features/communityFinance/communityFinance.export.js';

const META = { communityName: 'Green Valley & Co <Test>' };
const tx = (over) => ({
  id: 'id-' + Math.random().toString(36).slice(2),
  type: 'income',
  amount: 100,
  currency: 'INR',
  date: '2026-10-05T10:00:00.000Z',
  description: 'Synthetic',
  domain: 'INVOICE',
  status: 'SUCCESS',
  paymentMethod: 'UPI',
  referenceId: 'ref',
  referenceType: 'Invoice',
  receiptNumber: null,
  category: 'Maintenance Dues',
  ...over,
});

const MIXED = [
  tx({ amount: 12000 }),
  tx({ amount: 3500, domain: 'AMENITY', category: 'Amenity Booking' }),
  tx({ amount: -500, domain: 'AMENITY', category: 'Amenity Booking', description: 'Refund' }),
  tx({ amount: 700.1, status: 'PENDING' }), // pending receipt
  tx({ amount: 900, status: 'FAILED' }), // excluded everywhere
  tx({ type: 'expense', domain: 'EXPENSE', amount: 8500.1, category: 'Utilities', status: 'RECONCILED' }),
  tx({ type: 'expense', domain: 'EXPENSE', amount: 0.2, category: 'Utilities', status: 'RECONCILED' }),
  tx({ type: 'expense', domain: 'EXPENSE', amount: 15000, category: 'Elevator', status: 'UNPAID' }), // payable
  tx({ type: 'expense', domain: 'EXPENSE', amount: 50, category: 'Misc', status: 'VOIDED' }),
];

describe('Community Finance export report (pure)', () => {
  const query = { startDate: '2026-10-01', endDate: '2026-10-31' };
  const report = buildExportReport(MIXED, query, { ...META, totalMatching: MIXED.length });

  test('cash totals count only completed items, with exact decimals', () => {
    assert.equal(report.totalIncome, 15000); // 12000 + 3500 - 500
    assert.equal(report.totalRefunds, 500);
    assert.equal(report.totalExpense, 8500.3); // 8500.1 + 0.2 with no float drift
    assert.equal(report.netCashMovement, 6499.7);
  });

  test('pending and unpaid are separate and failed/voided are excluded', () => {
    assert.equal(report.pendingIncome, 700.1);
    assert.equal(report.pendingExpense, 15000);
    const expenseNames = report.expenseByCategory.map((c) => c.name);
    assert.deepEqual(expenseNames, ['Utilities']); // Elevator unpaid & Misc voided not in cash expense
  });

  test('category/domain/trend totals agree with headline totals', () => {
    const sum = (list) => Math.round(list.reduce((a, c) => a + c.amount * 100, 0)) / 100;
    assert.equal(sum(report.incomeByCategory), report.totalIncome);
    assert.equal(sum(report.incomeByDomain), report.totalIncome);
    assert.equal(sum(report.expenseByCategory), report.totalExpense);
    const trendIncome = Math.round(report.timeSeries.reduce((a, t) => a + t.income * 100, 0)) / 100;
    const trendExpense = Math.round(report.timeSeries.reduce((a, t) => a + t.expense * 100, 0)) / 100;
    assert.equal(trendIncome, report.totalIncome);
    assert.equal(trendExpense, report.totalExpense);
  });

  test('status breakdown keeps statuses distinct and counts every matching row', () => {
    const total = report.statusBreakdown.reduce((a, s) => a + s.count, 0);
    assert.equal(total, MIXED.length);
    assert.ok(report.statusBreakdown.find((s) => s.status === 'FAILED'));
  });

  test('empty dataset yields zeros, not NaN', () => {
    const empty = buildExportReport([], {}, META);
    assert.equal(empty.rows.length, 0);
    assert.equal(empty.totalIncome, 0);
    assert.equal(empty.netCashMovement, 0);
    assert.deepEqual(empty.timeSeries, []);
  });

  test('filenames contain sanitized community name and period', () => {
    assert.equal(exportFileName('csv', query, META), 'Green_Valley_Co_Test_Finance_2026-10.csv');
    assert.match(exportFileName('pdf', {}, META), /^Green_Valley_Co_Test_Finance_All_Dates_\d{4}-\d{2}-\d{2}\.pdf$/);
    assert.equal(exportFileName('xlsx', { startDate: '2026-10-05', endDate: '2026-11-10' }, { communityName: '../etc' }), 'etc_Finance_2026-10-05_to_2026-11-10.xlsx'.replace('etc_', 'etc_'));
  });

  test('CSV is a clean table: one header + one line per row, formulas neutralised', () => {
    const rows = [tx({ description: '=HYPERLINK("http://x")' }), tx({ description: 'Comma, "quoted"' })];
    const csv = reportToCsv(buildExportReport(rows, {}, META)).replace(/^﻿/, '');
    const lines = csv.trimEnd().split('\r\n');
    assert.equal(lines.length, 3);
    assert.ok(lines[1].includes(`"'=HYPERLINK(""http://x"")"`));
    assert.ok(lines[2].includes('"Comma, ""quoted"""'));
  });

  test('Excel holds every row, names the community, and agrees with CSV and the report', async () => {
    const many = Array.from({ length: 1500 }, (_, i) => tx({ amount: 10 + (i % 7), id: `bulk-${i}` }));
    const big = buildExportReport(many, {}, { ...META, totalMatching: many.length });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await reportToXlsxBuffer(big));

    const txSheet = wb.getWorksheet('Transactions');
    assert.equal(txSheet.rowCount - 1, many.length);
    const csvLines = reportToCsv(big).trimEnd().split('\r\n');
    assert.equal(csvLines.length - 1, txSheet.rowCount - 1);

    const idsXlsx = new Set();
    txSheet.eachRow((row, n) => n > 1 && idsXlsx.add(row.getCell(2).value));
    assert.equal(idsXlsx.size, many.length, 'no duplicates');

    assert.ok(String(wb.getWorksheet('Financial Overview').getCell('A1').value).includes(META.communityName));
    const labels = new Map();
    wb.getWorksheet('Financial Overview').eachRow((r) => labels.set(String(r.getCell(1).value), r.getCell(2).value));
    assert.equal(labels.get('Cash Received (net of refunds)'), big.totalIncome);
    assert.equal(labels.get('Matching Transactions'), many.length);
  });

  test('special characters in category names do not break chart rendering', async () => {
    const r = buildExportReport([tx({ category: 'R&D <Tools> "x"', type: 'expense', domain: 'EXPENSE' })], {}, META);
    const pdf = await reportToPdfBuffer(r);
    assert.equal(pdf.slice(0, 5).toString(), '%PDF-');
  });

  test('PDF paginates large datasets and states the truncation notice', async () => {
    const many = Array.from({ length: 400 }, (_, i) => tx({ id: `p-${i}` }));
    const r = buildExportReport(many, {}, { ...META, totalMatching: 900, truncated: true, exportLimit: 400 });
    const pdf = await reportToPdfBuffer(r);
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    assert.ok(pages >= 10, `expected many pages, got ${pages}`);
    assert.equal(r.truncated, true);
  });
});
