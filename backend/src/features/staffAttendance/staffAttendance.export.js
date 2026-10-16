import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import moment from 'moment-timezone';
import staffAttendanceRepository from './staffAttendance.repository.js';
import technicianService from '../technician/technician.service.js';
import HttpError from '../../utils/httpError.utils.js';

// Same community timezone the rest of the backend assumes (see amenity services).
const TIMEZONE = 'Asia/Kolkata';
const MAX_EXPORT_ROWS = 20000;
const MAX_ABSENT_DAYS = 62;
const MISSING_CHECKOUT_MS = 12 * 60 * 60 * 1000;
const EM_DASH = '-';

export const ATTENDANCE_COLUMNS = [
  { key: 'date', header: 'Date', width: 18 },
  { key: 'name', header: 'Staff Name', width: 24 },
  { key: 'staffCode', header: 'Staff Code', width: 13 },
  { key: 'role', header: 'Role', width: 18 },
  { key: 'status', header: 'Status', width: 22 },
  { key: 'checkIn', header: 'Check-In', width: 12 },
  { key: 'checkOut', header: 'Check-Out', width: 14 },
  { key: 'timeOnSite', header: 'Time on Site', width: 14 },
  { key: 'hours', header: 'Hours (decimal)', width: 15 },
  { key: 'entryGate', header: 'Entry Gate', width: 14 },
  { key: 'exitGate', header: 'Exit Gate', width: 14 },
  { key: 'checkedInBy', header: 'Checked In By', width: 18 },
  { key: 'checkedOutBy', header: 'Checked Out By', width: 18 },
  { key: 'entryMethod', header: 'Entry Method', width: 14 },
  { key: 'notes', header: 'Notes', width: 40 },
];

const STATUS_COLORS = {
  Completed: 'FF15803D',
  'Inside now': 'FF1D4ED8',
  'Missing check-out': 'FFB45309',
  'Auto-closed (no check-out)': 'FFB45309',
  Absent: 'FFB91C1C',
};

const toIstDate = (value) => moment.tz(value, TIMEZONE);

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return EM_DASH;
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** "Others" with a typed trade reads as that trade (e.g. "Others - Gardener"). */
export const departmentLabel = (tech = {}) =>
  tech.department === 'Others' && tech.departmentOther ? `Others - ${tech.departmentOther}` : tech.department || EM_DASH;

const guardName = (g) => g?.name || g?.username || EM_DASH;
const staffScopeLabel = (tech = {}) => {
  if (!tech?._id) return EM_DASH;
  return tech.staffCategory === 'UNIT' ? 'Unit Staff' : 'Community Staff';
};

function statusLabel(rec, now) {
  if (rec.status === 'Open') {
    return now - new Date(rec.checkInTime).getTime() > MISSING_CHECKOUT_MS ? 'Missing check-out' : 'Inside now';
  }
  return rec.autoClosed ? 'Auto-closed (no check-out)' : 'Completed';
}

/** Turns one attendance session into a friendly export row. */
export function sessionToRow(rec, now = Date.now()) {
  const tech = rec.technician || {};
  const checkIn = rec.checkInTime ? toIstDate(rec.checkInTime) : null;
  const checkOut = rec.checkOutTime ? toIstDate(rec.checkOutTime) : null;
  const minutes = checkIn && checkOut ? (checkOut.valueOf() - checkIn.valueOf()) / 60000 : null;
  const label = statusLabel(rec, now);

  return {
    _dayKey: checkIn ? checkIn.format('YYYY-MM-DD') : '',
    _techId: String(tech._id || ''),
    _minutes: minutes,
    date: checkIn ? checkIn.format('DD MMM YYYY (ddd)') : EM_DASH,
    name: tech.name || rec.staffCode || 'Staff Member',
    staffCode: rec.staffCode || tech.staffCode || EM_DASH,
    department: departmentLabel(tech),
    role: tech.designation || EM_DASH,
    staffCategory: staffScopeLabel(tech),
    type: tech.type || EM_DASH,
    status: label,
    checkIn: checkIn ? checkIn.format('hh:mm A') : EM_DASH,
    checkOut: checkOut ? checkOut.format('hh:mm A') : label === 'Inside now' ? 'Still inside' : EM_DASH,
    timeOnSite: formatDuration(minutes),
    hours: minutes === null ? null : Number((minutes / 60).toFixed(2)),
    entryGate: rec.checkInGate || EM_DASH,
    exitGate: rec.exitGate || EM_DASH,
    checkedInBy: guardName(rec.checkInGuard),
    checkedOutBy: rec.exitGuard ? guardName(rec.exitGuard) : EM_DASH,
    entryMethod: rec.isManualEntry ? 'Manual' : 'QR scan',
    notes: rec.notes || '',
  };
}

function absentRow(tech, dayKey) {
  return {
    _dayKey: dayKey,
    _techId: String(tech._id),
    _minutes: null,
    date: moment.tz(dayKey, 'YYYY-MM-DD', TIMEZONE).format('DD MMM YYYY (ddd)'),
    name: tech.name || 'Staff Member',
    staffCode: tech.staffCode || EM_DASH,
    department: departmentLabel(tech),
    role: tech.designation || EM_DASH,
    staffCategory: staffScopeLabel(tech),
    type: tech.type || EM_DASH,
    status: 'Absent',
    checkIn: EM_DASH,
    checkOut: EM_DASH,
    timeOnSite: EM_DASH,
    hours: null,
    entryGate: EM_DASH,
    exitGate: EM_DASH,
    checkedInBy: EM_DASH,
    checkedOutBy: EM_DASH,
    entryMethod: EM_DASH,
    notes: 'No gate check-in recorded',
  };
}

const isYmd = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());

function listDays(startYmd, endYmd) {
  const days = [];
  const cursor = moment.tz(startYmd, 'YYYY-MM-DD', TIMEZONE);
  const end = moment.tz(endYmd, 'YYYY-MM-DD', TIMEZONE);
  while (cursor.isSameOrBefore(end, 'day')) {
    days.push(cursor.format('YYYY-MM-DD'));
    cursor.add(1, 'day');
  }
  return days;
}

/** Plain-language description of the filters used, shown on the Summary sheet. */
function describeFilters(query) {
  const parts = [];
  if (query.status) parts.push(`Status: ${query.status}`);
  if (query.department && query.department !== 'ALL') parts.push(`Department: ${query.department}`);
  if (query.staffCategory && query.staffCategory !== 'ALL') {
    parts.push(`Staff scope: ${query.staffCategory === 'UNIT' ? 'Unit Staff' : 'Community Staff'}`);
  }
  if (query.departmentOther) parts.push(`Trade: ${query.departmentOther}`);
  if (query.type && query.type !== 'ALL') parts.push(`Employment type: ${query.type}`);
  if (query.gateId) parts.push(`Gate: ${query.gateId}`);
  if (query.technicianId) parts.push('One staff member');
  if (query.search) parts.push(`Search: "${String(query.search).slice(0, 60)}"`);
  return parts.length ? parts.join(' · ') : 'None (all attendance)';
}

/**
 * Builds the complete report model used by both CSV and Excel output.
 */
export async function buildAttendanceReport(orgId, query = {}, { generatedBy = '' } = {}) {
  const wantsAbsent = !query.status || query.status === 'Absent';
  const sessionFilter = { ...query };
  // "Absent" is not a stored status: it is derived below, so it must not filter the sessions query.
  if (query.status === 'Absent') delete sessionFilter.status;

  // Date-only filters are interpreted in the community timezone (not UTC) so a 10 PM scan stays on its day.
  const today = moment.tz(TIMEZONE).format('YYYY-MM-DD');
  const startYmd = isYmd(query.startDate) ? query.startDate.trim() : null;
  const endYmd = isYmd(query.endDate) ? query.endDate.trim() : null;
  if (startYmd) sessionFilter.startDate = moment.tz(startYmd, 'YYYY-MM-DD', TIMEZONE).startOf('day').toISOString();
  if (endYmd) sessionFilter.endDate = moment.tz(endYmd, 'YYYY-MM-DD', TIMEZONE).endOf('day').toISOString();

  const { rows: sessions, truncated } = await staffAttendanceRepository.findForExport(
    orgId,
    sessionFilter,
    MAX_EXPORT_ROWS
  );
  const now = Date.now();
  let presentRows = sessions.map((s) => sessionToRow(s, now));
  if (query.status === 'Absent') presentRows = [];

  // Absent rows: every matching active staff member with no session on a given day of the period.
  let absentRows = [];
  let absentNote = '';
  if (wantsAbsent) {
    const from = startYmd || endYmd || today;
    const to = endYmd || startYmd || today;
    const days = from <= to ? listDays(from, to) : [];
    if (days.length > MAX_ABSENT_DAYS) {
      absentNote = `Absent days were not calculated because the period is longer than ${MAX_ABSENT_DAYS} days.`;
    } else if (days.length > 0) {
      const techFilter = { status: 'Active', isDeleted: false };
      if (query.department && query.department !== 'ALL') techFilter.department = query.department;
      if (query.staffCategory && query.staffCategory !== 'ALL') techFilter.staffCategory = query.staffCategory === 'COMMUNITY' ? { $ne: 'UNIT' } : query.staffCategory;
      if (query.roleId) techFilter.roleId = query.roleId;
      if (query.departmentOther) {
        techFilter.department = 'Others';
        techFilter.departmentOther = query.departmentOther;
      }
      if (query.type && query.type !== 'ALL') techFilter.type = query.type;
      if (query.technicianId) techFilter._id = query.technicianId;
      let staff = (await technicianService.getTechnicians(orgId, techFilter)) || [];
      if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim().toLowerCase();
        staff = staff.filter(
          (t) => (t.name || '').toLowerCase().includes(term) || (t.staffCode || '').toLowerCase().includes(term)
        );
      }
      // For "Absent" the sessions list is unfiltered by status, so presence is judged on all sessions.
      const presentKeys = new Set(sessions.map((s) => `${s.technician?._id}|${toIstDate(s.checkInTime).format('YYYY-MM-DD')}`));
      for (const day of days) {
        for (const t of staff) {
          if (!presentKeys.has(`${t._id}|${day}`)) absentRows.push(absentRow(t, day));
        }
      }
    }
  }

  const rows = [...presentRows, ...absentRows].sort((a, b) => {
    if (a._dayKey !== b._dayKey) return a._dayKey < b._dayKey ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  // ---- summary ----
  const withHours = presentRows.filter((r) => r._minutes !== null);
  const totalMinutes = withHours.reduce((sum, r) => sum + r._minutes, 0);
  const statusCount = (label) => presentRows.filter((r) => r.status === label).length;

  const perStaff = new Map();
  for (const r of rows) {
    if (!perStaff.has(r._techId)) {
      perStaff.set(r._techId, {
        name: r.name,
        staffCode: r.staffCode,
        department: r.department,
        role: r.role,
        staffCategory: r.staffCategory,
        type: r.type,
        days: new Set(),
        absentDays: 0,
        minutes: 0,
        missing: 0,
      });
    }
    const entry = perStaff.get(r._techId);
    if (r.status === 'Absent') {
      entry.absentDays += 1;
    } else {
      entry.days.add(r._dayKey);
      entry.minutes += r._minutes || 0;
      if (r.status === 'Missing check-out' || r.status === 'Auto-closed (no check-out)') entry.missing += 1;
    }
  }
  const staffSummary = [...perStaff.values()]
    .map((e) => ({
      name: e.name,
      staffCode: e.staffCode,
      department: e.department,
      role: e.role,
      staffCategory: e.staffCategory,
      type: e.type,
      daysPresent: e.days.size,
      daysAbsent: e.absentDays,
      totalHours: Number((e.minutes / 60).toFixed(2)),
      avgHoursPerDay: e.days.size ? Number((e.minutes / 60 / e.days.size).toFixed(2)) : 0,
      missingCheckouts: e.missing,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const periodText =
    startYmd || endYmd
      ? `${moment.tz(startYmd || endYmd, 'YYYY-MM-DD', TIMEZONE).format('DD MMM YYYY')} to ${moment
          .tz(endYmd || startYmd, 'YYYY-MM-DD', TIMEZONE)
          .format('DD MMM YYYY')}`
      : 'All dates';

  return {
    rows,
    staffSummary,
    truncated,
    summary: [
      ['Report', 'Staff Attendance Report'],
      ['Period', periodText],
      ['Filters', describeFilters(query)],
      ['Generated on', moment.tz(TIMEZONE).format('DD MMM YYYY, hh:mm A') + ' (IST)'],
      ...(generatedBy ? [['Generated by', generatedBy]] : []),
      ['', ''],
      ['Attendance records', presentRows.length],
      ['Different staff present', new Set(presentRows.map((r) => r._techId)).size],
      ['Total hours on site', Number((totalMinutes / 60).toFixed(2))],
      [
        'Average hours per completed visit',
        withHours.length ? Number((totalMinutes / 60 / withHours.length).toFixed(2)) : 0,
      ],
      ['Completed visits', statusCount('Completed')],
      ['Currently inside', statusCount('Inside now')],
      ['Missing check-outs', statusCount('Missing check-out')],
      ['Auto-closed visits', statusCount('Auto-closed (no check-out)')],
      ['Absent entries (staff-days)', absentRows.length],
      ...(absentNote ? [['Note', absentNote]] : []),
      ...(truncated ? [['Note', `Only the newest ${MAX_EXPORT_ROWS} records are included. Narrow the dates to see all.`]] : []),
    ],
  };
}

// ---------------- CSV ----------------

// Spreadsheet apps execute cells that start with these characters as formulas.
const neutralizeFormula = (value) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value) : neutralizeFormula(String(value));
  return `"${text.replace(/"/g, '""')}"`;
};

export function reportToCsv(report) {
  const header = ATTENDANCE_COLUMNS.map((c) => csvCell(c.header)).join(',');
  const lines = report.rows.map((row) => ATTENDANCE_COLUMNS.map((c) => csvCell(row[c.key])).join(','));
  // UTF-8 BOM so Excel opens non-English names correctly.
  return `﻿${[header, ...lines].join('\r\n')}\r\n`;
}

// ---------------- Excel ----------------

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER = { style: 'thin', color: { argb: 'FFD1D5DB' } };

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
  row.height = 22;
}

export async function reportToXlsxBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nahom';
  workbook.created = new Date();

  // ---- Summary ----
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [{ width: 36 }, { width: 60 }];
  report.summary.forEach(([label, value], i) => {
    const row = summarySheet.addRow([label, value]);
    if (i === 0) {
      summarySheet.mergeCells(`A1:B1`);
      row.getCell(1).value = String(value);
      row.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F3A5F' } };
      row.height = 26;
    } else {
      row.getCell(1).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
    }
  });

  // ---- Attendance ----
  const sheet = workbook.addWorksheet('Attendance', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = ATTENDANCE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeader(sheet.getRow(1));

  const statusColIndex = ATTENDANCE_COLUMNS.findIndex((c) => c.key === 'status') + 1;
  report.rows.forEach((r, i) => {
    const row = sheet.addRow(ATTENDANCE_COLUMNS.map((c) => (c.key === 'hours' ? r.hours : r[c.key])));
    row.alignment = { vertical: 'middle' };
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      });
    }
    const statusCell = row.getCell(statusColIndex);
    statusCell.font = { bold: true, color: { argb: STATUS_COLORS[r.status] || 'FF111827' } };
  });
  const hoursCol = sheet.getColumn('hours');
  hoursCol.numFmt = '0.00';
  hoursCol.alignment = { horizontal: 'right' };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ATTENDANCE_COLUMNS.length } };

  // ---- Staff Summary (one line per person: payroll / review friendly) ----
  const staffSheet = workbook.addWorksheet('Staff Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  staffSheet.columns = [
    { header: 'Staff Name', key: 'name', width: 24 },
    { header: 'Staff Code', key: 'staffCode', width: 13 },
    { header: 'Role', key: 'role', width: 18 },
    { header: 'Days Present', key: 'daysPresent', width: 14 },
    { header: 'Days Absent', key: 'daysAbsent', width: 13 },
    { header: 'Total Hours', key: 'totalHours', width: 13 },
    { header: 'Avg Hours / Day', key: 'avgHoursPerDay', width: 16 },
    { header: 'Missing Check-outs', key: 'missingCheckouts', width: 19 },
  ];
  styleHeader(staffSheet.getRow(1));
  report.staffSummary.forEach((s) => staffSheet.addRow(s));
  ['totalHours', 'avgHoursPerDay'].forEach((k) => {
    staffSheet.getColumn(k).numFmt = '0.00';
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}


/** A compact, printable version of the same filtered attendance data. */
export function reportToPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const columns = [
      ['Date', 'date', 74], ['Staff Name', 'name', 106], ['Role', 'role', 96],
      ['Status', 'status', 76], ['Check-In', 'checkIn', 58], ['Check-Out', 'checkOut', 62],
    ];
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#1F3A5F').text('Staff Attendance Report');
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Period: ${report.summary?.[1]?.[1] || 'All dates'}`);
      doc.moveDown(0.8);
      let x = 32;
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
      columns.forEach(([header, , width]) => { doc.rect(x, doc.y, width, 16).fill('#1F3A5F'); doc.fillColor('#FFFFFF').text(header, x + 3, doc.y + 4, { width: width - 6, lineBreak: false }); x += width; });
      doc.moveDown(1.5);
    };
    const drawRow = (row, index) => {
      const y = doc.y;
      const rowHeight = 22;
      if (y + rowHeight > doc.page.height - 38) { doc.addPage(); drawHeader(); return drawRow(row, index); }
      let x = 32;
      if (index % 2) doc.rect(32, y - 2, 720, rowHeight).fill('#F3F4F6');
      doc.font('Helvetica').fontSize(6.5).fillColor('#111827');
      columns.forEach(([, key, width]) => { doc.text(String(row[key] ?? EM_DASH), x + 3, y + 3, { width: width - 6, height: 15, ellipsis: true }); x += width; });
      doc.y = y + rowHeight;
    };

    drawHeader();
    report.rows.forEach(drawRow);
    if (!report.rows.length) doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text('No attendance records match the selected filters.');
    doc.end();
  });
}
export function exportFileName(format, query = {}) {
  const stamp = moment.tz(TIMEZONE).format('YYYY-MM-DD');
  const period =
    isYmd(query.startDate) && isYmd(query.endDate) && query.startDate !== query.endDate
      ? `${query.startDate}_to_${query.endDate}`
      : isYmd(query.startDate)
      ? query.startDate
      : stamp;
  return `staff_attendance_${period}.${format}`;
}

export function assertFormat(format) {
  const f = String(format || 'xlsx').toLowerCase();
  if (!['csv', 'xlsx', 'pdf'].includes(f)) {
    throw new HttpError(400, 'Export format must be csv, xlsx, or pdf.');
  }
  return f;
}
