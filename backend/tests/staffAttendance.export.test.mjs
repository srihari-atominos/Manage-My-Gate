import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const ExcelJS = (await import('exceljs')).default;
const repo = (await import('../src/features/staffAttendance/staffAttendance.repository.js')).default;
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const exp = await import('../src/features/staffAttendance/staffAttendance.export.js');

const ORG = '507f1f77bcf86cd799439011';
const T1 = '507f1f77bcf86cd799439088';
const T2 = '507f1f77bcf86cd799439089';

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

// 2026-03-10 09:30 IST == 04:00 UTC ; check-out 17:05 IST == 11:35 UTC
const closed = {
  status: 'Closed',
  staffCode: 'STF-1',
  checkInTime: new Date('2026-03-10T04:00:00Z'),
  checkOutTime: new Date('2026-03-10T11:35:00Z'),
  checkInGate: 'Main Gate',
  exitGate: 'North Gate',
  notes: '=HYPERLINK("http://evil")',
  technician: { _id: T1, name: 'Ali Ahmed', department: 'Plumbing', designation: 'Plumber', type: 'In-House Staff' },
  checkInGuard: { name: 'Guard One' },
  exitGuard: { username: 'guard2' },
};

const withStubs = (sessions, staff, fn) => async () => {
  const restore = [
    stub(repo, { findForExport: async () => ({ rows: sessions, truncated: false }) }),
    stub(technicianService, { getTechnicians: async () => staff }),
  ];
  try {
    await fn();
  } finally {
    restore.forEach((r) => r());
  }
};

test('formatDuration is human friendly', () => {
  assert.equal(exp.formatDuration(455), '7h 35m');
  assert.equal(exp.formatDuration(45), '45m');
  assert.equal(exp.formatDuration(null), '—');
});

test('sessionToRow renders friendly IST date/time, hours and guard names', () => {
  const row = exp.sessionToRow(closed, new Date('2026-03-10T12:00:00Z').getTime());
  assert.equal(row.date, '10 Mar 2026 (Tue)');
  assert.equal(row.checkIn, '09:30 AM');
  assert.equal(row.checkOut, '05:05 PM');
  assert.equal(row.timeOnSite, '7h 35m');
  assert.equal(row.hours, 7.58);
  assert.equal(row.status, 'Completed');
  assert.equal(row.checkedInBy, 'Guard One');
  assert.equal(row.checkedOutBy, 'guard2');
  assert.equal(row.entryMethod, 'QR scan');
});

test('status labels distinguish inside, missing check-out and auto-closed', () => {
  const now = new Date('2026-03-10T12:00:00Z').getTime();
  const base = { ...closed, checkOutTime: null };
  assert.equal(exp.sessionToRow({ ...base, status: 'Open', checkInTime: new Date(now - 3600e3) }, now).status, 'Inside now');
  assert.equal(exp.sessionToRow({ ...base, status: 'Open', checkInTime: new Date(now - 20 * 3600e3) }, now).status, 'Missing check-out');
  assert.equal(exp.sessionToRow({ ...base, status: 'Closed', autoClosed: true }, now).status, 'Auto-closed (no check-out)');
});

test(
  'report adds Absent rows per staff per day and summarises per person',
  withStubs(
    [closed],
    [
      { _id: T1, name: 'Ali Ahmed', department: 'Plumbing', type: 'In-House Staff', staffCode: 'STF-1' },
      { _id: T2, name: 'Bina Rao', department: 'Housekeeping', type: 'In-House Staff', staffCode: 'STF-2' },
    ],
    async () => {
      const report = await exp.buildAttendanceReport(ORG, { startDate: '2026-03-10', endDate: '2026-03-11' });
      const absent = report.rows.filter((r) => r.status === 'Absent');
      // Bina is absent both days, Ali absent on the 11th only
      assert.equal(absent.length, 3);
      assert.ok(absent.some((r) => r.name === 'Ali Ahmed' && r.date.startsWith('11 Mar 2026')));
      assert.ok(!absent.some((r) => r.name === 'Ali Ahmed' && r.date.startsWith('10 Mar 2026')));
      const ali = report.staffSummary.find((s) => s.name === 'Ali Ahmed');
      assert.equal(ali.daysPresent, 1);
      assert.equal(ali.daysAbsent, 1);
      assert.equal(ali.totalHours, 7.58);
    }
  )
);

test(
  'a status filter other than Absent never produces Absent rows; Absent shows only absentees',
  withStubs([closed], [{ _id: T2, name: 'Bina Rao', department: 'Housekeeping', type: 'In-House Staff' }], async () => {
    const closedOnly = await exp.buildAttendanceReport(ORG, { status: 'Closed', startDate: '2026-03-10', endDate: '2026-03-10' });
    assert.equal(closedOnly.rows.filter((r) => r.status === 'Absent').length, 0);
    const absentOnly = await exp.buildAttendanceReport(ORG, { status: 'Absent', startDate: '2026-03-10', endDate: '2026-03-10' });
    assert.ok(absentOnly.rows.length > 0 && absentOnly.rows.every((r) => r.status === 'Absent'));
  })
);

test(
  'CSV has a BOM, friendly headers, and neutralises formula injection',
  withStubs([closed], [], async () => {
    const report = await exp.buildAttendanceReport(ORG, { status: 'Closed', startDate: '2026-03-10', endDate: '2026-03-10' });
    const csv = exp.reportToCsv(report);
    assert.ok(csv.startsWith('﻿"Date","Staff Name"'));
    assert.ok(csv.includes('"\'=HYPERLINK'), 'formula cell must be prefixed with an apostrophe');
    assert.ok(csv.includes('"Ali Ahmed"') && csv.includes('"7h 35m"'));
  })
);

test(
  'Excel file has Summary, Attendance and Staff Summary sheets with real numbers',
  withStubs([closed], [], async () => {
    const report = await exp.buildAttendanceReport(ORG, { status: 'Closed', startDate: '2026-03-10', endDate: '2026-03-10' });
    const buffer = await exp.reportToXlsxBuffer(report);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Summary', 'Attendance', 'Staff Summary']);
    const att = wb.getWorksheet('Attendance');
    assert.equal(att.getRow(1).getCell(2).value, 'Staff Name');
    assert.equal(att.getRow(2).getCell(2).value, 'Ali Ahmed');
    assert.equal(typeof att.getRow(2).getCell(11).value, 'number');
  })
);

test('export file names and format validation', () => {
  assert.equal(exp.exportFileName('csv', { startDate: '2026-03-01', endDate: '2026-03-31' }), 'staff_attendance_2026-03-01_to_2026-03-31.csv');
  assert.throws(() => exp.assertFormat('pdf'), (e) => e.statusCode === 400);
  assert.equal(exp.assertFormat(undefined), 'xlsx');
});
