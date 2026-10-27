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
const COMPLETED_STATUSES = new Set(['SUCCESS', 'PAID', 'RECONCILED', 'RECORDED', 'REFUNDED']);
const PENDING_STATUSES = new Set([
  'PENDING',
  'PENDING_VERIFICATION',
  'VERIFICATION_PENDING',
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
    const bottomLimit = () => doc.page.height - 44;
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ensureSpace = (needed) => {
      if (doc.y + needed > bottomLimit()) doc.addPage();
    };
    const heading = (text, sub) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text(text, PDF_MARGIN, doc.y);
      if (sub) doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(sub);
      doc.moveDown(0.6);
    };
    const image = (png, height) => {
      if (!png) return;
      ensureSpace(height + 10);
      doc.image(png, PDF_MARGIN, doc.y, { fit: [contentW, height] });
      doc.y += height + 10;
    };

    // Generic table with repeated header on page breaks
    const drawTable = (columns, dataRows, { fontSize = 8, rowHeight = 16, emptyText, title } = {}) => {
      const header = () => {
        const y = doc.y;
        let x = PDF_MARGIN;
        columns.forEach((col) => {
          doc.rect(x, y, col.width, 16).fill('#1E293B');
          doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#FFFFFF')
            .text(col.header, x + 3, y + 4, { width: col.width - 6, lineBreak: false, align: col.align || 'left' });
          x += col.width;
        });
        doc.y = y + 18;
      };
      ensureSpace(title ? 90 : 60);
      if (title) {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1E293B').text(title, PDF_MARGIN, doc.y);
        doc.moveDown(0.4);
      }
      header();
      if (dataRows.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(emptyText || 'No data.', PDF_MARGIN, doc.y + 4);
        doc.moveDown(1);
        return;
      }
      dataRows.forEach((row, idx) => {
        if (doc.y + rowHeight > bottomLimit()) {
          doc.addPage();
          header();
        }
        const y = doc.y;
        if (idx % 2 === 1) doc.rect(PDF_MARGIN, y - 1, contentW, rowHeight).fill('#F8FAFC');
        let x = PDF_MARGIN;
        columns.forEach((col) => {
          const cell = col.render(row);
          doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(cell.color || '#334155')
            .text(cell.text, x + 3, y + 3, { width: col.width - 6, height: rowHeight - 4, ellipsis: true, lineBreak: false, align: col.align || 'left' });
          x += col.width;
        });
        doc.y = y + rowHeight;
      });
      doc.moveDown(0.8);
    };

    const plain = (text) => ({ text: String(text ?? '') });

    // ---------------- PAGE 1: Overview ----------------
    doc.rect(PDF_MARGIN, PDF_MARGIN, contentW, 44).fill('#1E293B');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF').text(report.communityName, PDF_MARGIN + 12, PDF_MARGIN + 9, { width: contentW - 24, ellipsis: true, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor('#CBD5E1').text(`Community Finance Report  |  Generated ${report.generatedAt}  |  Currency: INR`, PDF_MARGIN + 12, PDF_MARGIN + 28, { width: contentW - 24, lineBreak: false });
    doc.y = PDF_MARGIN + 58;

    const filterText = report.filterLines.map(([k, v]) => `${k}: ${v}`).join('   |   ');
    const filterBoxY = doc.y;
    doc.font('Helvetica').fontSize(8);
    const filterH = doc.heightOfString(filterText, { width: contentW - 20 }) + 26;
    doc.rect(PDF_MARGIN, filterBoxY, contentW, filterH).fill('#F8FAFC');
    doc.rect(PDF_MARGIN, filterBoxY, contentW, filterH).stroke('#E2E8F0');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Applied filters', PDF_MARGIN + 10, filterBoxY + 7);
    doc.font('Helvetica').fontSize(8).fillColor('#475569').text(filterText, PDF_MARGIN + 10, filterBoxY + 20, { width: contentW - 20 });
    doc.y = filterBoxY + filterH + 10;

    if (report.truncated) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B91C1C').text(
        `Export limit reached: showing ${report.rows.length} of ${report.totalMatching} matching transactions. Narrow the filters, or use the CSV/Excel export, to obtain the remainder.`,
        PDF_MARGIN, doc.y, { width: contentW }
      );
      doc.moveDown(0.6);
    }

    const kpis = [
      { label: 'Cash Received', val: formatCurrency(report.totalIncome), color: '#047857' },
      { label: 'Cash Paid', val: formatCurrency(report.totalExpense), color: '#B91C1C' },
      { label: report.netCashMovement >= 0 ? 'Net Surplus' : 'Net Deficit', val: formatCurrency(report.netCashMovement), color: report.netCashMovement >= 0 ? '#047857' : '#B91C1C' },
      { label: 'Matching Transactions', val: String(report.rows.length), color: '#1E293B' },
      { label: 'Pending Receipts', val: formatCurrency(report.pendingIncome), color: '#B45309' },
      { label: 'Outstanding Payables', val: formatCurrency(report.pendingExpense), color: '#B45309' },
    ];
    const cols = 3;
    const gap = 8;
    const cardW = (contentW - gap * (cols - 1)) / cols;
    const cardH = 46;
    const kpiTop = doc.y;
    kpis.forEach((kpi, idx) => {
      const kx = PDF_MARGIN + (idx % cols) * (cardW + gap);
      const ky = kpiTop + Math.floor(idx / cols) * (cardH + gap);
      doc.rect(kx, ky, cardW, cardH).fill('#FFFFFF');
      doc.rect(kx, ky, cardW, cardH).stroke('#E2E8F0');
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(kpi.label, kx + 8, ky + 9, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(kpi.color).text(kpi.val, kx + 8, ky + 23, { width: cardW - 16, ellipsis: true, lineBreak: false });
    });
    doc.y = kpiTop + 2 * (cardH + gap) + 4;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text('Summary', PDF_MARGIN, doc.y);
    doc.moveDown(0.3);
    const topExpense = report.expenseByCategory[0];
    const topIncome = report.incomeByCategory[0];
    const sentences = [
      `${report.rows.length} transaction${report.rows.length === 1 ? '' : 's'} match the applied filters.`,
      `Cash received was ${formatCurrency(report.totalIncome)} and cash paid was ${formatCurrency(report.totalExpense)}, a net ${report.netCashMovement >= 0 ? 'surplus' : 'deficit'} of ${formatCurrency(Math.abs(report.netCashMovement))}.`,
      topIncome ? `Largest income category: ${topIncome.name} (${formatCurrency(topIncome.amount)}, ${topIncome.percentage}%).` : null,
      topExpense ? `Largest expense category: ${topExpense.name} (${formatCurrency(topExpense.amount)}, ${topExpense.percentage}%).` : null,
      report.pendingIncome > 0 || report.pendingExpense > 0
        ? `Not yet settled and excluded from the cash figures: ${formatCurrency(report.pendingIncome)} pending receipts and ${formatCurrency(report.pendingExpense)} outstanding payables.`
        : null,
    ].filter(Boolean);
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(sentences.join(' '), { width: contentW });
    doc.moveDown(0.8);

    // ---------------- Dashboard: round chart, vertical columns, line graph on one page ----------------
    const half = (contentW - 8) / 2;
    const halfH = (half * 300) / 420;
    const lineH = (contentW * 280) / 900;
    ensureSpace(14 + halfH + 8 + lineH + 8);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text('Dashboard', PDF_MARGIN, doc.y);
    doc.moveDown(0.4);
    const dashTop = doc.y;
    doc.rect(PDF_MARGIN, dashTop, half, halfH).stroke('#E2E8F0');
    doc.rect(PDF_MARGIN + half + 8, dashTop, half, halfH).stroke('#E2E8F0');
    doc.image(donutPng, PDF_MARGIN, dashTop, { width: half });
    doc.image(columnsPng, PDF_MARGIN + half + 8, dashTop, { width: half });
    doc.rect(PDF_MARGIN, dashTop + halfH + 8, contentW, lineH).stroke('#E2E8F0');
    doc.image(linePng, PDF_MARGIN, dashTop + halfH + 8, { width: contentW });
    doc.y = dashTop + halfH + 8 + lineH + 14;
    doc.x = PDF_MARGIN;

    // ---------------- Period breakdown (table only; the line graph above shows the shape) ----------------
    ensureSpace(120);
    heading('Period breakdown', `Completed income and expenses by ${report.trendGranularity === 'monthly' ? 'month' : 'day'}.`);
    drawTable(
      [
        { header: 'Period', width: 100, render: (r) => plain(r.period) },
        { header: 'Income (INR)', width: 130, align: 'right', render: (r) => plain(formatCurrency(r.income)) },
        { header: 'Expenses (INR)', width: 130, align: 'right', render: (r) => plain(formatCurrency(r.expense)) },
        { header: 'Net (INR)', width: contentW - 360, align: 'right', render: (r) => ({ text: formatCurrency(r.net), bold: true, color: r.net >= 0 ? '#047857' : '#B91C1C' }) },
      ],
      report.timeSeries,
      { emptyText: 'No completed income or expenses in the selected period.' }
    );

    // ---------------- PAGE 5+: Transactions ----------------
    doc.addPage();
    heading('Filtered Transactions', `${report.rows.length} record${report.rows.length === 1 ? '' : 's'} matching the applied filters${report.truncated ? ` (limited from ${report.totalMatching})` : ''}.`);
    drawTable(
      [
        { header: 'Date', width: 56, render: (r) => plain(r.date) },
        { header: 'Reference', width: 92, render: (r) => plain(r.receiptNumber !== EM_DASH ? r.receiptNumber : r.id) },
        { header: 'Type', width: 44, render: (r) => plain(r.typeLabel) },
        { header: 'Domain', width: 82, render: (r) => plain(r.domainLabel) },
        { header: 'Description', width: 120, render: (r) => plain(r.description) },
        { header: 'Amount (INR)', width: 66, align: 'right', render: (r) => ({ text: formatCurrency(r.amount).replace('INR ', ''), bold: true, color: r.type === 'income' ? '#047857' : '#B91C1C' }) },
        { header: 'Status', width: contentW - 460, render: (r) => ({ text: readable(r.status), bold: true, color: '#' + (STATUS_COLORS[r.status] || 'FF1E293B').slice(-6) }) },
      ],
      report.rows,
      { fontSize: 7, rowHeight: 15, emptyText: 'No transactions match the selected filters.' }
    );

    // Header-independent footer on every page: community, report name, page x of y
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // allow footer below content area without spawning a page
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8');
      doc.text(
        `${report.communityName}  |  Community Finance Report  |  Page ${i + 1} of ${range.count}`,
        PDF_MARGIN,
        doc.page.height - 26,
        { align: 'center', width: contentW, lineBreak: false }
      );
    }
    doc.end();
  });
}
