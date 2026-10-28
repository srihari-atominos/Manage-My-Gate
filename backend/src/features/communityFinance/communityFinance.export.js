import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import moment from 'moment-timezone';
import HttpError from '../../utils/httpError.utils.js';
import {
  moneyInOutChartPng,
  rankedCategoryChartPng,
  trendChartPng,
  donutChartPng,
  columnChartPng,
  lineChartPng,
} from './communityFinance.charts.js';

const TIMEZONE = 'Asia/Kolkata';
const EM_DASH = '-';

export const TRANSACTION_EXPORT_COLUMNS = [
  { key: 'date', header: 'Date', width: 14 },
  { key: 'id', header: 'Transaction ID', width: 28 },
  { key: 'typeLabel', header: 'Type', width: 12 },
  { key: 'domainLabel', header: 'Domain', width: 24 },
  { key: 'category', header: 'Category', width: 24 },
  { key: 'description', header: 'Description', width: 38 },
  { key: 'amount', header: 'Amount', width: 16 },
  { key: 'currency', header: 'Currency', width: 10 },
  { key: 'status', header: 'Status', width: 18 },
  { key: 'paymentMethod', header: 'Payment Method', width: 18 },
  { key: 'receiptNumber', header: 'Receipt / Reference', width: 24 },
  { key: 'referenceId', header: 'Related Invoice / Expense ID', width: 28 },
];

const STATUS_COLORS = {
  SUCCESS: 'FF15803D',
  PAID: 'FF15803D',
  RECONCILED: 'FF15803D',
  RECORDED: 'FF1D4ED8',
  PENDING: 'FFB45309',
  PENDING_VERIFICATION: 'FFB45309',
  VERIFICATION_PENDING: 'FFB45309',
  UNPAID: 'FFB91C1C',
  REFUNDED: 'FF3B82F6',
  FAILED: 'FFB91C1C',
  VOIDED: 'FF6B7280',
};

const readable = (val) => String(val || '').replace(/_/g, ' ');

const formatCurrency = (val) => {
  const num = Number(val || 0);
  return 'INR ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const sanitizeForFileName = (str) => {
  return String(str || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
};

const neutralizeFormula = (value) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

const csvCell = (value) => {
  if (value === null || value === undefined) return '""';
  const text = typeof value === 'number' ? String(value) : neutralizeFormula(String(value));
  return `"${text.replace(/"/g, '""')}"`;
};

export function assertExportFormat(format) {
  const f = String(format || 'xlsx').toLowerCase();
  if (!['csv', 'xlsx', 'pdf'].includes(f)) {
    throw new HttpError(400, 'Export format must be csv, xlsx, or pdf.');
  }
  return f;
}

export function exportFileName(format, query = {}, meta = {}) {
  const stamp = moment.tz(query.timezone || TIMEZONE).format('YYYY-MM-DD');
  let datePart;
  if (query.startDate && query.endDate) {
    datePart =
      query.startDate.slice(0, 7) === query.endDate.slice(0, 7) &&
      query.startDate.endsWith('-01') &&
      moment(query.endDate).isSame(moment(query.endDate).endOf('month'), 'day')
        ? query.startDate.slice(0, 7)
        : `${query.startDate}_to_${query.endDate}`;
  } else if (query.startDate) {
    datePart = `from_${query.startDate}`;
  } else if (query.endDate) {
    datePart = `until_${query.endDate}`;
  } else {
    datePart = `All_Dates_${stamp}`;
  }
  const community = sanitizeForFileName(meta.communityName).replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
  return `${community || 'Community'}_Finance_${datePart}.${format}`;
}

// ---- Financial classification (integer paise to avoid float drift) ----
const toPaise = (n) => Math.round(Number(n || 0) * 100);
const fromPaise = (p) => p / 100;
const COMPLETED_STATUSES = new Set(['SUCCESS', 'PAID', 'RECONCILED', 'REFUNDED']);
const PENDING_STATUSES = new Set([
  'PENDING',
  'PENDING_VERIFICATION',
  'VERIFICATION_PENDING',
  'RECORDED',
  'UNPAID',
  'PARTIALLY_PAID',
]);

/**
 * received: completed income; refund: completed negative income row;
 * paid: completed expense; pendingIncome/pendingExpense: not yet settled;
 * excluded: failed / voided / cancelled or otherwise not a real movement.
 */
const classifyRow = (r) => {
  const completed = COMPLETED_STATUSES.has(r.status);
  const pending = PENDING_STATUSES.has(r.status);
  if (r.type === 'income') {
    if (r.amount < 0) return completed ? 'refund' : 'excluded';
    if (completed) return 'received';
    return pending ? 'pendingIncome' : 'excluded';
  }
  if (completed) return 'paid';
  return pending ? 'pendingExpense' : 'excluded';
};

const aggregateBy = (items, keyFn, totalPaise) => {
  const map = new Map();
  items.forEach(({ row, paise }) => {
    const key = keyFn(row);
    const entry = map.get(key) || { name: key, paise: 0, count: 0 };
    entry.paise += paise;
    entry.count += 1;
    map.set(key, entry);
  });
  return [...map.values()]
    .map((e) => ({
      name: e.name,
      amount: fromPaise(e.paise),
      count: e.count,
      percentage: totalPaise > 0 ? Math.round((e.paise / totalPaise) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

const describeFilters = (query, tz) => {
  const fmt = (d) => moment.tz(d, 'YYYY-MM-DD', tz).format('DD MMM YYYY');
  const typeLower = String(query.type || 'all').toLowerCase();
  const lines = [];
  lines.push([
    'Date range',
    query.startDate && query.endDate
      ? `${fmt(query.startDate)} - ${fmt(query.endDate)}`
      : query.startDate
      ? `From ${fmt(query.startDate)}`
      : query.endDate
      ? `Until ${fmt(query.endDate)}`
      : 'All dates',
  ]);
  lines.push(['Transaction type', typeLower === 'all' ? 'All transaction types' : readable(typeLower)]);
  lines.push(['Financial domain', query.domain && query.domain !== 'ALL' ? readable(query.domain) : 'All domains']);
  lines.push(['Payment status', query.status && query.status !== 'ALL' ? readable(query.status) : 'All statuses']);
  lines.push(['Search', query.search ? `"${query.search}"` : 'None']);
  return lines;
};

export function buildExportReport(transactions = [], query = {}, meta = {}) {
  const tz = query.timezone || TIMEZONE;
  const now = moment.tz(tz);

  const rows = transactions.map((t) => {
    const d = t.date ? moment.tz(t.date, tz) : null;
    const isIncome = t.type === 'income';
    const typeLabel = isIncome ? 'Income' : 'Expense';

    let domainLabel = 'Community Expense';
    if (t.domain === 'INVOICE') domainLabel = 'Maintenance / Invoice';
    else if (t.domain === 'AMENITY') domainLabel = 'Amenity Booking';
    else if (t.domain === 'EXPENSE') domainLabel = 'Community Expense';
    else if (t.domain) domainLabel = readable(t.domain);

    const row = {
      date: d && d.isValid() ? d.format('YYYY-MM-DD') : EM_DASH,
      id: t.id || EM_DASH,
      type: t.type,
      typeLabel,
      domain: t.domain || 'EXPENSE',
      domainLabel,
      description: t.description || (isIncome ? 'Income Payment' : 'Expense Disbursement'),
      amount: Number(Number(t.amount || 0).toFixed(2)),
      currency: t.currency || 'INR',
      status: String(t.status || 'SUCCESS').toUpperCase(),
      paymentMethod: t.paymentMethod || 'OTHER',
      referenceType: t.referenceType || (isIncome ? 'Invoice' : 'Expense'),
      referenceId: t.referenceId || EM_DASH,
      receiptNumber: t.receiptNumber || EM_DASH,
      category: t.category || (isIncome ? (t.domain === 'AMENITY' ? 'Amenity Booking' : 'Maintenance Dues') : 'Community Operations'),
    };
    row.bucket = classifyRow(row);
    return row;
  });

  let receivedP = 0;
  let refundP = 0;
  let paidP = 0;
  let pendingIncomeP = 0;
  let pendingExpenseP = 0;
  const incomeItems = [];
  const expenseItems = [];
  const statusMap = new Map();

  rows.forEach((r) => {
    const p = toPaise(r.amount);
    const s = statusMap.get(r.status) || { status: r.status, count: 0, paise: 0 };
    s.count += 1;
    s.paise += Math.abs(p);
    statusMap.set(r.status, s);

    if (r.bucket === 'received') {
      receivedP += p;
      incomeItems.push({ row: r, paise: p });
    } else if (r.bucket === 'refund') {
      refundP += Math.abs(p);
      incomeItems.push({ row: r, paise: p });
    } else if (r.bucket === 'paid') {
      paidP += Math.abs(p);
      expenseItems.push({ row: r, paise: Math.abs(p) });
    } else if (r.bucket === 'pendingIncome') {
      pendingIncomeP += p;
    } else if (r.bucket === 'pendingExpense') {
      pendingExpenseP += Math.abs(p);
    }
  });

  const incomeP = receivedP - refundP;
  const totalIncome = fromPaise(incomeP);
  const totalExpense = fromPaise(paidP);
  const netCashMovement = fromPaise(incomeP - paidP);
  const totalRefunds = fromPaise(refundP);
  const pendingIncome = fromPaise(pendingIncomeP);
  const pendingExpense = fromPaise(pendingExpenseP);

  const incomeByCategory = aggregateBy(incomeItems, (r) => r.category || 'General', incomeP);
  const incomeByDomain = aggregateBy(incomeItems, (r) => r.domainLabel, incomeP);
  const expenseByCategory = aggregateBy(expenseItems, (r) => r.category || 'General', paidP);
  const expenseByDomain = aggregateBy(expenseItems, (r) => r.domainLabel, paidP);

  const statusBreakdown = [...statusMap.values()].map((s) => ({
    status: s.status,
    count: s.count,
    totalAmount: fromPaise(s.paise),
  }));

  // Trend granularity: daily for ranges up to ~2 months, monthly beyond
  const datedRows = rows.filter((r) => r.date !== EM_DASH).map((r) => r.date).sort();
  const spanStart = query.startDate || datedRows[0];
  const spanEnd = query.endDate || datedRows[datedRows.length - 1];
  const isMultiMonth = Boolean(spanStart && spanEnd && moment(spanEnd).diff(moment(spanStart), 'days') > 62);
  const trendMap = new Map();
  [...incomeItems.map((i) => ({ ...i, kind: 'income' })), ...expenseItems.map((i) => ({ ...i, kind: 'expense' }))].forEach(
    ({ row, paise, kind }) => {
      if (row.date === EM_DASH) return;
      const key = isMultiMonth ? row.date.slice(0, 7) : row.date;
      const t = trendMap.get(key) || { period: key, incomeP: 0, expenseP: 0, count: 0 };
      if (kind === 'income') t.incomeP += paise;
      else t.expenseP += paise;
      t.count += 1;
      trendMap.set(key, t);
    }
  );
  const timeSeries = [...trendMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((t) => ({
      period: t.period,
      income: fromPaise(t.incomeP),
      expense: fromPaise(t.expenseP),
      net: fromPaise(t.incomeP - t.expenseP),
      count: t.count,
    }));

  // Combined lists kept for consumers that want one table
  const categoryBreakdown = [
    ...incomeByCategory.map((c) => ({ category: c.name, type: 'income', amount: c.amount, percentage: c.percentage, count: c.count })),
    ...expenseByCategory.map((c) => ({ category: c.name, type: 'expense', amount: c.amount, percentage: c.percentage, count: c.count })),
  ];
  const domainBreakdown = [
    ...incomeByDomain.map((d) => ({ domain: d.name, type: 'income', amount: d.amount, count: d.count })),
    ...expenseByDomain.map((d) => ({ domain: d.name, type: 'expense', amount: d.amount, count: d.count })),
  ];

  const filterLines = describeFilters(query, tz);
  const summary = [
    ['Report Title', 'Community Finance Report'],
    ['Community Name', meta.communityName],
    ['Generated On', now.format('DD MMM YYYY, hh:mm A z')],
    ['Generated By', meta.generatedBy || 'Community Administrator'],
    ['Currency', 'INR'],
    ...filterLines.map(([k, v]) => [`Filter: ${k}`, v]),
    ['Matching Transactions', rows.length],
    ['Cash Received (net of refunds)', totalIncome.toFixed(2)],
    ['Cash Paid', totalExpense.toFixed(2)],
    ['Net Cash Movement', netCashMovement.toFixed(2)],
    ['Pending Receipts (not yet received)', pendingIncome.toFixed(2)],
    ['Outstanding Payables (not yet paid)', pendingExpense.toFixed(2)],
  ];

  return {
    rows,
    summary,
    filterLines,
    communityName: meta.communityName,
    generatedAt: now.format('DD MMM YYYY, hh:mm A z'),
    truncated: Boolean(meta.truncated),
    totalMatching: meta.totalMatching ?? rows.length,
    exportLimit: meta.exportLimit,
    totalIncome,
    totalExpense,
    totalRefunds,
    netCashMovement,
    pendingIncome,
    pendingExpense,
    incomeByCategory,
    incomeByDomain,
    expenseByCategory,
    expenseByDomain,
    domainBreakdown,
    categoryBreakdown,
    statusBreakdown,
    timeSeries,
    trendGranularity: isMultiMonth ? 'monthly' : 'daily',
    query,
    meta,
  };
}

// ==========================================
// CSV Format Generator
// ==========================================
// The CSV is a pure, machine-readable transaction table (one header row, one row per
// transaction) so filtering and imports stay reliable. The community name and period are
// carried in the filename; the full summary lives in the Excel and PDF reports.

export function reportToCsv(report) {
  const header = TRANSACTION_EXPORT_COLUMNS.map((c) => csvCell(c.header)).join(',');
  const lines = report.rows.map((row) =>
    TRANSACTION_EXPORT_COLUMNS.map((c) => csvCell(row[c.key] === EM_DASH ? '' : row[c.key])).join(',')
  );
  return `﻿${[header, ...lines].join('\r\n')}\r\n`;
}

// ==========================================
// Excel (.xlsx) Format Generator
// ==========================================
// ExcelJS cannot author native chart objects, so charts are rendered from the same
// aggregated data as PNG images and the aggregate tables sit next to them for editing.

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER = { style: 'thin', color: { argb: 'FFD1D5DB' } };
const ZEBRA = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
const MONEY_FMT = '#,##0.00';

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
  row.height = 24;
}

// Writes a titled table at `startRow`; returns the next free row.
function addBlockTable(sheet, startRow, title, headers, dataRows, formats = {}) {
  sheet.getCell(startRow, 1).value = title;
  sheet.getCell(startRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1F3A5F' } };
  const headerRow = sheet.getRow(startRow + 1);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  styleHeaderRow(headerRow);
  dataRows.forEach((values, idx) => {
    const row = sheet.getRow(startRow + 2 + idx);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      if (formats[i]) cell.numFmt = formats[i];
      if (idx % 2 === 1) cell.fill = ZEBRA;
    });
  });
  return startRow + 2 + Math.max(dataRows.length, 1) + 1;
}

const buildCharts = (report) =>
  Promise.all([
    moneyInOutChartPng(report),
    rankedCategoryChartPng(report.expenseByCategory, { title: 'Where the money went', noun: 'cost', color: '#B91C1C' }),
    rankedCategoryChartPng(report.incomeByCategory, { title: 'Where the money came from', noun: 'source', color: '#15803D' }),
    trendChartPng(report.timeSeries, report.trendGranularity),
  ]);

export async function reportToXlsxBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NAHOM Community Management System';
  workbook.title = `${report.communityName} - Community Finance Report`;
  workbook.created = new Date();

  const [moneyPng, expensePng, incomePng, trendPng] = await buildCharts(report);

  const addPng = (sheet, png, col, row, width, height) => {
    if (!png) return;
    const id = workbook.addImage({ buffer: png, extension: 'png' });
    sheet.addImage(id, { tl: { col, row }, ext: { width, height } });
  };

  // ---------------- SHEET 1: Financial Overview ----------------
  const overview = workbook.addWorksheet('Financial Overview');
  overview.columns = [{ width: 38 }, { width: 46 }];
  overview.mergeCells('A1:B1');
  overview.getCell('A1').value = `${report.communityName} - Community Finance Report`;
  overview.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF1F3A5F' } };
  overview.getRow(1).height = 28;

  report.summary.slice(2).forEach(([label, value]) => {
    const row = overview.addRow([label, typeof value === 'string' && /^-?\d+\.\d{2}$/.test(value) ? Number(value) : value]);
    row.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
    row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
    if (typeof row.getCell(2).value === 'number' && label !== 'Matching Transactions') row.getCell(2).numFmt = MONEY_FMT;
  });

  overview.addRow([]);
  const notes = [
    'Cash received and cash paid count completed payments only (refunds netted off).',
    'Pending receipts and outstanding payables are not yet settled, so they are kept out of the cash totals.',
  ];
  if (report.truncated) {
    notes.unshift(
      `Only the first ${report.rows.length} of ${report.totalMatching} matching transactions are included (export limit). Narrow the filters to export the rest.`
    );
  }
  notes.forEach((n) => {
    const r = overview.addRow([n]);
    overview.mergeCells(`A${r.number}:B${r.number}`);
    r.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    r.getCell(1).font = { italic: true, color: { argb: 'FF475569' } };
    r.height = 30;
  });

  addPng(overview, moneyPng, 3, 1, 560, 262);

  // ---------------- SHEET 2: All Filtered Transactions ----------------
  const txSheet = workbook.addWorksheet('Transactions', { views: [{ state: 'frozen', ySplit: 1 }] });
  txSheet.columns = TRANSACTION_EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeaderRow(txSheet.getRow(1));

  const statusColIndex = TRANSACTION_EXPORT_COLUMNS.findIndex((c) => c.key === 'status') + 1;
  const amountColIndex = TRANSACTION_EXPORT_COLUMNS.findIndex((c) => c.key === 'amount') + 1;

  report.rows.forEach((r, idx) => {
    const row = txSheet.addRow(
      TRANSACTION_EXPORT_COLUMNS.map((c) => {
        const v = r[c.key];
        if (v === EM_DASH) return '';
        // Neutralise spreadsheet formulas in text cells; numbers pass through untouched
        return typeof v === 'string' ? neutralizeFormula(v) : v;
      })
    );
    if (idx % 2 === 1) row.eachCell((cell) => (cell.fill = ZEBRA));
    row.getCell(statusColIndex).font = { bold: true, color: { argb: STATUS_COLORS[r.status] || 'FF1E293B' } };
    row.getCell(amountColIndex).font = { bold: true, color: { argb: r.type === 'income' ? 'FF15803D' : 'FFB91C1C' } };
  });
  txSheet.getColumn('amount').numFmt = MONEY_FMT;
  txSheet.getColumn('amount').alignment = { horizontal: 'right' };
  txSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TRANSACTION_EXPORT_COLUMNS.length } };

  // ---------------- SHEET 3 & 4: Income / Expense analysis (chart + one table each) ----------------
  const pctRows = (list) => list.map((c) => [c.name, c.amount, c.percentage / 100, c.count]);
  const analysisSheet = (name, emptyText, tableTitle, list, png) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [{ width: 30 }, { width: 18 }, { width: 12 }, { width: 14 }];
    if (list.length === 0) {
      sheet.getCell('A1').value = emptyText;
      return;
    }
    addBlockTable(sheet, 1, tableTitle, ['Category', 'Amount (INR)', 'Share', 'Transactions'], pctRows(list), { 1: MONEY_FMT, 2: '0.0%' });
    addPng(sheet, png, 5, 1, 560, 262);
  };
  analysisSheet('Income Analysis', 'No completed income matches the selected filters.', 'Income by category', report.incomeByCategory, incomePng);
  analysisSheet('Expense Analysis', 'No completed expense payments match the selected filters.', 'Expenses by category (highest first)', report.expenseByCategory, expensePng);

  // ---------------- SHEET 5: Financial Trends ----------------
  const trendSheet = workbook.addWorksheet('Financial Trends');
  trendSheet.columns = [{ width: 16 }, { width: 18 }, { width: 18 }, { width: 22 }];
  addBlockTable(
    trendSheet,
    1,
    `Cash movement by ${report.trendGranularity === 'monthly' ? 'month' : 'day'}`,
    ['Period', 'Income (INR)', 'Expenses (INR)', 'Net (INR)'],
    report.timeSeries.map((t) => [t.period, t.income, t.expense, t.net]),
    { 1: MONEY_FMT, 2: MONEY_FMT, 3: MONEY_FMT }
  );
  addPng(trendSheet, trendPng, 5, 1, 560, 262);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ==========================================
// Professional PDF Report Generator
// ==========================================

const PDF_MARGIN = 32;

const STATUS_PILL_STYLES = {
  SUCCESS: { bg: '#DCFCE7', text: '#15803D', label: 'SUCCESS' },
  PAID: { bg: '#DCFCE7', text: '#15803D', label: 'PAID' },
  RECONCILED: { bg: '#DCFCE7', text: '#15803D', label: 'RECONCILED' },
  RECORDED: { bg: '#DBEAFE', text: '#1D4ED8', label: 'RECORDED' },
  PENDING: { bg: '#FEF3C7', text: '#B45309', label: 'PENDING' },
  PENDING_VERIFICATION: { bg: '#FEF3C7', text: '#B45309', label: 'VERIFY' },
  VERIFICATION_PENDING: { bg: '#FEF3C7', text: '#B45309', label: 'VERIFY' },
  UNPAID: { bg: '#FEE2E2', text: '#B91C1C', label: 'UNPAID' },
  PARTIALLY_PAID: { bg: '#FFEDD5', text: '#C2410C', label: 'PARTIAL' },
  REFUNDED: { bg: '#EFF6FF', text: '#2563EB', label: 'REFUNDED' },
  FAILED: { bg: '#FEE2E2', text: '#B91C1C', label: 'FAILED' },
  VOIDED: { bg: '#F1F5F9', text: '#64748B', label: 'VOIDED' },
};

const formatShortVoucher = (r) => {
  if (r.receiptNumber && r.receiptNumber !== EM_DASH) {
    return String(r.receiptNumber);
  }
  if (r.referenceId && r.referenceId !== EM_DASH && !/^[0-9a-f]{24}$/i.test(r.referenceId)) {
    return String(r.referenceId);
  }
  if (r.id && r.id !== EM_DASH) {
    const s = String(r.id);
    if (/^[0-9a-f]{24}$/i.test(s)) {
      return '#' + s.slice(-8).toUpperCase();
    }
    return s.length > 12 ? s.slice(0, 4) + '...' + s.slice(-4) : s;
  }
  return EM_DASH;
};

const formatDisplayDate = (dStr) => {
  if (!dStr || dStr === EM_DASH) return EM_DASH;
  const m = moment(dStr);
  return m.isValid() ? m.format('DD MMM YYYY') : dStr;
};

const formatCleanCurrency = (val, { absolute = false } = {}) => {
  const num = Number(val || 0);
  const absFormatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (absolute) return 'INR ' + absFormatted;
  if (num < 0) return '- INR ' + absFormatted;
  return 'INR ' + absFormatted;
};

export async function reportToPdfBuffer(report) {
  const [donutPng, columnsPng, linePng] = await Promise.all([
    donutChartPng(report.expenseByCategory, { title: 'Where the money went', noun: 'cost' }),
    columnChartPng(report),
    lineChartPng(report.timeSeries, report.trendGranularity),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PDF_MARGIN,
      bufferPages: true,
      info: { Title: `${report.communityName} - Community Finance Report`, Author: 'NAHOM Community Management' },
    });

    const chunks = [];
    const contentW = doc.page.width - PDF_MARGIN * 2;
    const bottomLimit = () => doc.page.height - 40;
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fMap = new Map(report.filterLines);
    const dateRangeStr = fMap.get('Date range') || 'All dates';

    const drawRunningHeader = () => {
      const topY = 18;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B')
        .text(`${report.communityName.toUpperCase()} · COMMUNITY FINANCIAL REPORT`, PDF_MARGIN, topY, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
        .text(`Statement Period: ${dateRangeStr}`, PDF_MARGIN + 200, topY, { width: contentW - 200, align: 'right', lineBreak: false });
      doc.rect(PDF_MARGIN, topY + 13, contentW, 0.75).fill('#E2E8F0');
      doc.y = topY + 24;
    };

    const ensureSpace = (needed) => {
      if (doc.y + needed > bottomLimit()) {
        doc.addPage();
        drawRunningHeader();
      }
    };

    // Generic styled table with repeated headers and optional summary footer
    const drawTable = (columns, dataRows, { fontSize = 7.5, rowHeight = 18, emptyText, title, summaryRow } = {}) => {
      const header = () => {
        const y = doc.y;
        let x = PDF_MARGIN;
        columns.forEach((col) => {
          doc.rect(x, y, col.width, 18).fill('#0F172A');
          doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#FFFFFF')
            .text(col.header, x + 4, y + 5, { width: col.width - 8, lineBreak: false, align: col.align || 'left' });
          x += col.width;
        });
        doc.y = y + 18;
      };

      ensureSpace(title ? 70 : 45);
      if (title) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text(title, PDF_MARGIN, doc.y);
        doc.moveDown(0.3);
      }
      header();

      if (!dataRows || dataRows.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(emptyText || 'No data.', PDF_MARGIN + 4, doc.y + 6);
        doc.moveDown(0.8);
        return;
      }

      dataRows.forEach((row, idx) => {
        if (doc.y + rowHeight > bottomLimit()) {
          doc.addPage();
          drawRunningHeader();
          header();
        }
        const y = doc.y;
        if (idx % 2 === 1) {
          doc.rect(PDF_MARGIN, y, contentW, rowHeight).fill('#F8FAFC');
        }
        doc.rect(PDF_MARGIN, y + rowHeight - 0.5, contentW, 0.5).fill('#F1F5F9');

        let x = PDF_MARGIN;
        columns.forEach((col) => {
          const cell = col.render(row);
          if (cell.badge) {
            const bStyle = STATUS_PILL_STYLES[cell.badge] || { bg: '#F1F5F9', text: '#64748B', label: cell.badge };
            const bw = col.width - 12;
            const bh = 12;
            const bx = x + 6;
            const by = y + (rowHeight - bh) / 2;
            doc.roundedRect(bx, by, bw, bh, 3).fill(bStyle.bg);
            doc.font('Helvetica-Bold').fontSize(6).fillColor(bStyle.text)
              .text(bStyle.label || cell.text, bx, by + 2.5, { width: bw, align: 'center', lineBreak: false });
          } else {
            doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(cell.color || '#334155')
              .text(cell.text, x + 4, y + 4.5, {
                width: col.width - 8,
                height: rowHeight - 4,
                ellipsis: true,
                lineBreak: false,
                align: col.align || 'left',
              });
          }
          x += col.width;
        });
        doc.y = y + rowHeight;
      });

      if (summaryRow) {
        if (doc.y + rowHeight > bottomLimit()) {
          doc.addPage();
          drawRunningHeader();
          header();
        }
        const y = doc.y;
        doc.rect(PDF_MARGIN, y, contentW, rowHeight).fill('#F1F5F9');
        doc.rect(PDF_MARGIN, y, contentW, 1).fill('#CBD5E1');
        let x = PDF_MARGIN;
        columns.forEach((col, cIdx) => {
          const val = summaryRow[cIdx];
          if (val) {
            doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(val.color || '#0F172A')
              .text(val.text, x + 4, y + 4.5, { width: col.width - 8, align: col.align || 'left', lineBreak: false });
          }
          x += col.width;
        });
        doc.y = y + rowHeight;
      }
      doc.moveDown(0.6);
    };

    // ==========================================
    // PAGE 1: Executive Overview & Visual Analytics
    // ==========================================

    // 1. Executive Header Banner
    const bannerH = 48;
    doc.rect(PDF_MARGIN, PDF_MARGIN, contentW, bannerH).fill('#0F172A');
    doc.rect(PDF_MARGIN, PDF_MARGIN, 4, bannerH).fill('#0EA5E9');

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF')
      .text(report.communityName.toUpperCase(), PDF_MARGIN + 12, PDF_MARGIN + 10, { width: contentW - 200, ellipsis: true });
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
      .text('OFFICIAL COMMUNITY FINANCIAL STATEMENT & AUDIT LEDGER', PDF_MARGIN + 12, PDF_MARGIN + 28);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#F1F5F9')
      .text('CURRENCY: INR', PDF_MARGIN + contentW - 190, PDF_MARGIN + 10, { width: 180, align: 'right' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
      .text(`Generated: ${report.generatedAt}`, PDF_MARGIN + contentW - 220, PDF_MARGIN + 26, { width: 210, align: 'right' });

    doc.y = PDF_MARGIN + bannerH + 8;

    // 2. Statement Scope Strip
    const scopeH = 34;
    const scopeY = doc.y;
    doc.roundedRect(PDF_MARGIN, scopeY, contentW, scopeH, 4).fill('#F8FAFC');
    doc.roundedRect(PDF_MARGIN, scopeY, contentW, scopeH, 4).stroke('#E2E8F0');

    const scopeItems = [
      { label: 'STATEMENT PERIOD', val: fMap.get('Date range') || 'All dates' },
      { label: 'TRANSACTION TYPE', val: fMap.get('Transaction type') || 'All types' },
      { label: 'FINANCIAL DOMAIN', val: fMap.get('Financial domain') || 'All domains' },
      { label: 'RECONCILIATION STATUS', val: fMap.get('Payment status') || 'All statuses' },
    ];
    const sColW = contentW / 4;
    scopeItems.forEach((item, i) => {
      const sx = PDF_MARGIN + i * sColW + 8;
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text(item.label, sx, scopeY + 6);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1E293B').text(item.val, sx, scopeY + 17, { width: sColW - 14, ellipsis: true });
    });
    doc.y = scopeY + scopeH + 8;

    // Truncation Notice (if limit reached)
    if (report.truncated) {
      doc.roundedRect(PDF_MARGIN, doc.y, contentW, 26, 4).fill('#FEF2F2');
      doc.roundedRect(PDF_MARGIN, doc.y, contentW, 26, 4).stroke('#FCA5A5');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#B91C1C').text(
        `Export limit reached: Showing first ${report.rows.length} of ${report.totalMatching} transactions. Narrow filter range or use Excel/CSV for full dataset.`,
        PDF_MARGIN + 8,
        doc.y + 8,
        { width: contentW - 16 }
      );
      doc.y += 32;
    }

    // 3. Executive Summary Highlight Callout
    const isSurplus = report.netCashMovement >= 0;
    const calloutBg = isSurplus ? '#F0FDF4' : '#FFF1F2';
    const calloutBorder = isSurplus ? '#10B981' : '#F43F5E';
    const calloutTitle = isSurplus ? 'EXECUTIVE SUMMARY  ·  NET SURPLUS PERIOD' : 'EXECUTIVE SUMMARY  ·  NET DEFICIT PERIOD';
    const calloutColor = isSurplus ? '#047857' : '#B91C1C';

    const sentences = [
      `During this statement period, ${report.rows.length} transaction${report.rows.length === 1 ? '' : 's'} were recorded.`,
      `Total cash received was ${formatCleanCurrency(report.totalIncome)} and cash paid out was ${formatCleanCurrency(report.totalExpense)}, resulting in a net cash ${isSurplus ? 'surplus' : 'deficit'} of ${formatCleanCurrency(report.netCashMovement, { absolute: true })}.`,
      report.expenseByCategory[0]
        ? `Primary expenditure driver: ${report.expenseByCategory[0].name} (${formatCleanCurrency(report.expenseByCategory[0].amount)}, ${report.expenseByCategory[0].percentage}% of total outflows).`
        : null,
      report.pendingIncome > 0 || report.pendingExpense > 0
        ? `Unsettled pipeline (excluded from cash totals): ${formatCleanCurrency(report.pendingIncome)} in pending collections and ${formatCleanCurrency(report.pendingExpense)} in outstanding payables.`
        : null,
    ].filter(Boolean).join(' ');

    const calloutY = doc.y;
    doc.font('Helvetica').fontSize(8);
    const textH = doc.heightOfString(sentences, { width: contentW - 24 });
    const calloutH = Math.max(38, textH + 18);

    doc.roundedRect(PDF_MARGIN, calloutY, contentW, calloutH, 4).fill(calloutBg);
    doc.roundedRect(PDF_MARGIN, calloutY, contentW, calloutH, 4).stroke(isSurplus ? '#BBF7D0' : '#FECDD3');
    doc.rect(PDF_MARGIN, calloutY, 3.5, calloutH).fill(calloutBorder);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(calloutColor).text(calloutTitle, PDF_MARGIN + 10, calloutY + 6);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(sentences, PDF_MARGIN + 10, calloutY + 18, { width: contentW - 20, lineGap: 1.5 });
    doc.y = calloutY + calloutH + 8;

    // 4. Six Financial Health Cards (KPIs)
    const kpis = [
      { label: 'CASH RECEIVED (INFLOW)', val: formatCleanCurrency(report.totalIncome), color: '#047857', sub: 'Completed collections', border: '#10B981' },
      { label: 'CASH PAID (OUTFLOW)', val: formatCleanCurrency(report.totalExpense), color: '#DC2626', sub: 'Completed disbursements', border: '#EF4444' },
      {
        label: isSurplus ? 'NET CASH SURPLUS' : 'NET CASH DEFICIT',
        val: formatCleanCurrency(report.netCashMovement, { absolute: true }),
        color: isSurplus ? '#047857' : '#DC2626',
        sub: isSurplus ? 'Collections exceeded outflows' : 'Outflows exceeded collections',
        border: isSurplus ? '#10B981' : '#EF4444',
      },
      { label: 'AUDITED TRANSACTIONS', val: `${report.rows.length} Records`, color: '#1E293B', sub: 'Matching scope criteria', border: '#64748B' },
      { label: 'PENDING RECEIPTS', val: formatCleanCurrency(report.pendingIncome), color: '#D97706', sub: 'Unsettled incoming dues', border: '#F59E0B' },
      { label: 'OUTSTANDING PAYABLES', val: formatCleanCurrency(report.pendingExpense), color: '#D97706', sub: 'Approved unpaid bills', border: '#F59E0B' },
    ];

    const kpiCols = 3;
    const kpiGap = 6;
    const kpiCardW = (contentW - kpiGap * (kpiCols - 1)) / kpiCols;
    const kpiCardH = 42;
    const kpiTop = doc.y;

    kpis.forEach((kpi, idx) => {
      const kx = PDF_MARGIN + (idx % kpiCols) * (kpiCardW + kpiGap);
      const ky = kpiTop + Math.floor(idx / kpiCols) * (kpiCardH + kpiGap);
      doc.roundedRect(kx, ky, kpiCardW, kpiCardH, 4).fill('#FFFFFF');
      doc.roundedRect(kx, ky, kpiCardW, kpiCardH, 4).stroke('#E2E8F0');
      doc.rect(kx, ky, kpiCardW, 2.5).fill(kpi.border);

      doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text(kpi.label, kx + 8, ky + 6);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(kpi.color).text(kpi.val, kx + 8, ky + 17, { width: kpiCardW - 16, ellipsis: true });
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8').text(kpi.sub, kx + 8, ky + 30, { width: kpiCardW - 16, ellipsis: true });
    });
    doc.y = kpiTop + 2 * (kpiCardH + kpiGap) + 6;

    // 5. Visual Analytics Section (Donut & Column side-by-side)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text('FINANCIAL DASHBOARD & ANALYTICS', PDF_MARGIN, doc.y);
    doc.moveDown(0.3);

    const half = (contentW - 8) / 2;
    const halfH = 155;
    const dashTop = doc.y;
    doc.roundedRect(PDF_MARGIN, dashTop, half, halfH, 4).stroke('#E2E8F0');
    doc.roundedRect(PDF_MARGIN + half + 8, dashTop, half, halfH, 4).stroke('#E2E8F0');
    doc.image(donutPng, PDF_MARGIN + 2, dashTop + 2, { width: half - 4, height: halfH - 4 });
    doc.image(columnsPng, PDF_MARGIN + half + 10, dashTop + 2, { width: half - 4, height: halfH - 4 });
    doc.y = dashTop + halfH + 10;

    // ==========================================
    // SECTION: Trend & Period Analysis (if multi-period)
    // ==========================================
    const hasMultiplePeriods = report.timeSeries.length > 1;

    if (hasMultiplePeriods) {
      doc.addPage();
      drawRunningHeader();

      const lineH = Math.min(145, (contentW * 260) / 900);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text('FINANCIAL TREND OVER TIME', PDF_MARGIN, doc.y);
      doc.moveDown(0.3);
      const lineTop = doc.y;
      doc.roundedRect(PDF_MARGIN, lineTop, contentW, lineH, 4).stroke('#E2E8F0');
      doc.image(linePng, PDF_MARGIN + 2, lineTop + 2, { width: contentW - 4, height: lineH - 4 });
      doc.y = lineTop + lineH + 10;

      drawTable(
        [
          { header: 'PERIOD', width: 100, render: (r) => ({ text: formatDisplayDate(r.period) }) },
          { header: 'INCOME (INR)', width: 130, align: 'right', render: (r) => ({ text: formatCleanCurrency(r.income), color: '#047857' }) },
          { header: 'EXPENSES (INR)', width: 130, align: 'right', render: (r) => ({ text: formatCleanCurrency(r.expense), color: '#DC2626' }) },
          {
            header: 'NET (INR)',
            width: contentW - 360,
            align: 'right',
            render: (r) => ({
              text: (r.net >= 0 ? '+ ' : '- ') + formatCleanCurrency(r.net, { absolute: true }),
              bold: true,
              color: r.net >= 0 ? '#047857' : '#DC2626',
            }),
          },
        ],
        report.timeSeries,
        {
          title: `PERIOD BREAKDOWN (${report.timeSeries.length} ${report.trendGranularity === 'monthly' ? 'Months' : 'Days'})`,
          emptyText: 'No periodic activity recorded.',
        }
      );
    } else if (report.categoryBreakdown.length > 0) {
      drawTable(
        [
          { header: 'CATEGORY', width: 160, render: (r) => ({ text: r.category, bold: true }) },
          { header: 'FLOW TYPE', width: 90, render: (r) => ({ text: r.type.toUpperCase(), color: r.type === 'income' ? '#047857' : '#DC2626' }) },
          { header: 'AMOUNT (INR)', width: 120, align: 'right', render: (r) => ({ text: formatCleanCurrency(r.amount), bold: true }) },
          { header: 'SHARE', width: 80, align: 'right', render: (r) => ({ text: `${r.percentage.toFixed(1)}%` }) },
          { header: 'TXN COUNT', width: contentW - 450, align: 'right', render: (r) => ({ text: String(r.count) }) },
        ],
        report.categoryBreakdown,
        {
          title: `CATEGORY ALLOCATION SUMMARY (${report.categoryBreakdown.length} Categories)`,
          emptyText: 'No categorized records.',
        }
      );
    }

    // ==========================================
    // SECTION: Filtered Transaction Ledger
    // ==========================================
    const spaceLeft = bottomLimit() - doc.y;
    const neededForTxn = 20 + report.rows.length * 18 + 24;

    if (spaceLeft < neededForTxn && (report.rows.length > 5 || hasMultiplePeriods)) {
      doc.addPage();
      drawRunningHeader();
    }

    const txColumns = [
      { header: 'DATE', width: 62, render: (r) => ({ text: formatDisplayDate(r.date) }) },
      { header: 'REF #', width: 66, render: (r) => ({ text: formatShortVoucher(r), color: '#475569' }) },
      { header: 'TYPE', width: 48, align: 'center', render: (r) => ({ text: r.typeLabel.toUpperCase(), bold: true, color: r.type === 'income' ? '#047857' : '#DC2626' }) },
      { header: 'CATEGORY / DOMAIN', width: 110, render: (r) => ({ text: `${r.category} · ${r.domainLabel}`, color: '#1E293B' }) },
      { header: 'DESCRIPTION', width: 120, render: (r) => ({ text: r.description }) },
      {
        header: 'AMOUNT (INR)',
        width: 65,
        align: 'right',
        render: (r) => ({
          text: (r.type === 'income' ? '+ ₹' : '- ₹') + Math.abs(Number(r.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          bold: true,
          color: r.type === 'income' ? '#047857' : '#DC2626',
        }),
      },
      { header: 'STATUS', width: 60, align: 'center', render: (r) => ({ text: r.status, badge: r.status }) },
    ];

    const netFormatted = (report.netCashMovement >= 0 ? '+' : '-') + ' ₹' + Math.abs(report.netCashMovement).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const ledgerSummaryRow = {
      0: { text: `TOTALS (${report.rows.length})`, color: '#0F172A' },
      5: { text: netFormatted, color: report.netCashMovement >= 0 ? '#047857' : '#DC2626' },
    };

    drawTable(txColumns, report.rows, {
      title: `TRANSACTION AUDIT LEDGER (${report.rows.length} Records)`,
      summaryRow: ledgerSummaryRow,
      emptyText: 'No transactions match the selected filters.',
    });

    // ==========================================
    // Running Footers on All Pages
    // ==========================================
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 24;
      doc.rect(PDF_MARGIN, footerY - 6, contentW, 0.5).fill('#E2E8F0');
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8');
      doc.text(
        `${report.communityName.toUpperCase()}  |  COMMUNITY FINANCE AUDIT REPORT  |  CONFIDENTIAL`,
        PDF_MARGIN,
        footerY,
        { lineBreak: false, width: 280 }
      );
      doc.text(
        `Page ${i + 1} of ${range.count}`,
        PDF_MARGIN + contentW - 80,
        footerY,
        { align: 'right', lineBreak: false, width: 80 }
      );
    }

    doc.end();
  });
}
