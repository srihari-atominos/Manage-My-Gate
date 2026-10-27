import sharp from 'sharp';

// Three charts, each leading with a one-line takeaway:
//   1. Attendance at a glance  - attendance rate and how entries split by status
//   2. Day by day              - who was present vs absent each day
//   3. Staff overview          - one row per person: days present/absent, hours, needs attention
// All numbers come from the same report rows as the other sheets.

const FONT = 'font-family="Helvetica, Arial, sans-serif"';
const W = 640;
const H = 300;
const NAVY = '#1F3A5F';
const GREEN = '#15803D';
const RED = '#B91C1C';
const AMBER = '#B45309';
const MUTED = '#64748B';

export const STATUS_HEX = {
  Completed: GREEN,
  'Inside now': '#1D4ED8',
  'Missing check-out': AMBER,
  'Auto-closed (no check-out)': '#D97706',
  Absent: RED,
};
const FALLBACK_HEX = MUTED;

const ENTITIES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[<>&"']/g, (c) => ENTITIES[c]);
const clip = (v, n) => (String(v).length > n ? `${String(v).slice(0, n - 1)}…` : String(v));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const hoursText = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

const frame = (width, height, title, headline, headlineColor, body) => `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  <text x="20" y="28" ${FONT} font-size="16" font-weight="bold" fill="${NAVY}">${esc(title)}</text>
  <text x="20" y="50" ${FONT} font-size="12" font-weight="bold" fill="${headlineColor}">${esc(headline)}</text>
  ${body}
</svg>`;

const toPng = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const emptyChart = (title, message, width = W, height = H) =>
  toPng(
    frame(
      width,
      height,
      title,
      message,
      MUTED,
      `<text x="${width / 2}" y="${height / 2 + 16}" ${FONT} font-size="12" fill="#94A3B8" text-anchor="middle">Nothing to chart for the selected filters.</text>`
    )
  );

/** Aggregates everything the charts need from a built attendance report. */
export function buildChartData(report) {
  const rows = report.rows || [];

  const statusMap = new Map();
  rows.forEach((r) => statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1));
  const statusCounts = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const dayMap = new Map();
  rows.forEach((r) => {
    if (!r._dayKey) return;
    const d = dayMap.get(r._dayKey) || { day: r._dayKey, present: new Set(), absent: 0, minutes: 0 };
    if (r.status === 'Absent') d.absent += 1;
    else d.present.add(r._techId);
    d.minutes += r._minutes || 0;
    dayMap.set(r._dayKey, d);
  });
  const daily = [...dayMap.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({ day: d.day, present: d.present.size, absent: d.absent, hours: Number((d.minutes / 60).toFixed(2)) }));

  const staff = (report.staffSummary || []).map((s) => ({
    name: s.name,
    daysPresent: s.daysPresent,
    daysAbsent: s.daysAbsent,
    totalHours: s.totalHours,
    missingCheckouts: s.missingCheckouts || 0,
  }));

  return { statusCounts, daily, staff };
}

/** Chart 1: attendance rate headline plus one bar split by status. */
export async function statusChartPng({ statusCounts }) {
  const title = 'Attendance at a glance';
  const total = statusCounts.reduce((s, x) => s + x.count, 0);
  if (!total) return emptyChart(title, 'No attendance entries in this period.');

  const absent = statusCounts.find((s) => s.status === 'Absent')?.count || 0;
  const present = total - absent;
  const rate = Math.round((present / total) * 100);
  const headline = `${rate}% attendance — ${present} of ${plural(total, 'staff-day')} present.`;

  const barX = 20;
  const barW = W - 40;
  let x = barX;
  let bar = '';
  statusCounts.forEach(({ status, count }) => {
    const w = (count / total) * barW;
    bar += `<rect x="${x}" y="80" width="${Math.max(w, 2)}" height="34" fill="${STATUS_HEX[status] || FALLBACK_HEX}"/>`;
    if (w > 28) bar += `<text x="${x + w / 2}" y="102" ${FONT} font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${count}</text>`;
    x += w;
  });
  const legend = statusCounts
    .slice(0, 5)
    .map(({ status, count }, i) => {
      const y = 148 + i * 28;
      return `<rect x="20" y="${y}" width="12" height="12" rx="3" fill="${STATUS_HEX[status] || FALLBACK_HEX}"/>
        <text x="40" y="${y + 11}" ${FONT} font-size="12" fill="#1E293B">${esc(clip(status, 30))}</text>
        <text x="${W - 20}" y="${y + 11}" ${FONT} font-size="12" font-weight="bold" fill="#334155" text-anchor="end">${plural(count, 'entry').replace('entrys', 'entries')}</text>`;
    })
    .join('');
  return toPng(frame(W, H, title, headline, rate >= 90 ? GREEN : rate >= 70 ? AMBER : RED, `<rect x="${barX}" y="80" width="${barW}" height="34" rx="6" fill="#F1F5F9"/>${bar}${legend}`));
}

/** Chart 2: staff present vs absent each day. */
export async function dailyChartPng({ daily }, width = W) {
  const title = 'Day by day';
  if (daily.length === 0) return emptyChart(title, 'No attendance entries in this period.', width);

  const shown = daily.slice(-14);
  const worst = [...shown].sort((a, b) => b.absent - a.absent)[0];
  const headline =
    worst.absent === 0
      ? 'No absences on any day in this period.'
      : `Most absences: ${worst.day.slice(5)} (${plural(worst.absent, 'person').replace('persons', 'people')} absent).`;

  const max = Math.ceil(Math.max(...shown.map((d) => Math.max(d.present, d.absent)), 1) / 4) * 4;
  const left = 36;
  const right = 16;
  const top = 96;
  const bottom = 40;
  const plotW = width - left - right;
  const plotH = H - top - bottom;
  const group = plotW / shown.length;
  const barW = Math.min(26, group / 2 - 4);

  let body = `<rect x="20" y="62" width="10" height="10" rx="2" fill="${GREEN}"/><text x="35" y="71" ${FONT} font-size="11" fill="#334155">Present</text>
    <rect x="92" y="62" width="10" height="10" rx="2" fill="${RED}"/><text x="107" y="71" ${FONT} font-size="11" fill="#334155">Absent</text>
    <line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" stroke="#CBD5E1"/>`;
  [0.5, 1].forEach((f) => {
    const gy = top + plotH - plotH * f;
    body += `<line x1="${left}" y1="${gy}" x2="${width - right}" y2="${gy}" stroke="#F1F5F9"/>
      <text x="${left - 6}" y="${gy + 3}" ${FONT} font-size="9" fill="#94A3B8" text-anchor="end">${Math.round(max * f)}</text>`;
  });
  shown.forEach((d, i) => {
    const gx = left + i * group + group / 2;
    const ph = (d.present / max) * plotH;
    const ah = (d.absent / max) * plotH;
    body += `<rect x="${gx - barW - 1}" y="${top + plotH - ph}" width="${barW}" height="${Math.max(ph, d.present ? 2 : 0)}" rx="3" fill="${GREEN}"/>
      <rect x="${gx + 1}" y="${top + plotH - ah}" width="${barW}" height="${Math.max(ah, d.absent ? 2 : 0)}" rx="3" fill="${RED}"/>
      <text x="${gx}" y="${H - 22}" ${FONT} font-size="10" fill="#475569" text-anchor="middle">${esc(d.day.slice(5))}</text>`;
    if (d.present) body += `<text x="${gx - barW / 2 - 1}" y="${top + plotH - ph - 4}" ${FONT} font-size="10" font-weight="bold" fill="${GREEN}" text-anchor="middle">${d.present}</text>`;
    if (d.absent) body += `<text x="${gx + barW / 2 + 1}" y="${top + plotH - ah - 4}" ${FONT} font-size="10" font-weight="bold" fill="${RED}" text-anchor="middle">${d.absent}</text>`;
  });
  if (daily.length > shown.length) body += `<text x="20" y="${H - 8}" ${FONT} font-size="9" fill="#94A3B8">Showing the latest ${shown.length} of ${daily.length} days</text>`;
  return toPng(frame(width, H, title, headline, NAVY, body));
}

export const STAFF_CHART_WIDTH = 1290;

/** Chart 3: one row per person - present/absent days bar, hours, and what needs attention. */
export async function staffOverviewChartPng({ staff }) {
  const title = 'Staff overview';
  const rows = staff.filter((s) => s.daysPresent + s.daysAbsent > 0);
  const width = STAFF_CHART_WIDTH;
  if (rows.length === 0) return emptyChart(title, 'No staff to show for this period.', width, H);

  // People who need a look first, then by name
  const ranked = [...rows]
    .sort((a, b) => b.daysAbsent + b.missingCheckouts - (a.daysAbsent + a.missingCheckouts) || a.name.localeCompare(b.name))
    .slice(0, 12);
  const attention = rows.filter((s) => s.daysAbsent > 0 || s.missingCheckouts > 0).length;
  const headline = attention === 0 ? 'Everyone was present with no missing check-outs.' : `${plural(attention, 'person').replace('persons', 'people')} need${attention === 1 ? 's' : ''} attention (absences or missing check-outs).`;

  const rowH = 30;
  const top = 92;
  const height = top + ranked.length * rowH + (rows.length > ranked.length ? 26 : 14);
  const nameX = 20;
  const barX = 250;
  const barMax = 520;
  const maxDays = Math.max(...ranked.map((s) => s.daysPresent + s.daysAbsent), 1);

  let body = `<text x="${nameX}" y="76" ${FONT} font-size="10" font-weight="bold" fill="${MUTED}">STAFF</text>
    <text x="${barX}" y="76" ${FONT} font-size="10" font-weight="bold" fill="${MUTED}">DAYS  <tspan fill="${GREEN}">■ present</tspan>  <tspan fill="${RED}">■ absent</tspan></text>
    <text x="${barX + barMax + 150}" y="76" ${FONT} font-size="10" font-weight="bold" fill="${MUTED}">HOURS ON SITE</text>
    <text x="${barX + barMax + 290}" y="76" ${FONT} font-size="10" font-weight="bold" fill="${MUTED}">NEEDS ATTENTION</text>`;
  ranked.forEach((s, i) => {
    const y = top + i * rowH;
    const pw = (s.daysPresent / maxDays) * barMax;
    const aw = (s.daysAbsent / maxDays) * barMax;
    if (i % 2 === 0) body += `<rect x="10" y="${y - 4}" width="${width - 20}" height="${rowH}" fill="#F8FAFC"/>`;
    const notes = [];
    if (s.daysAbsent) notes.push(`${plural(s.daysAbsent, 'day')} absent`);
    if (s.missingCheckouts) notes.push(`${plural(s.missingCheckouts, 'missing check-out')}`);
    body += `<text x="${nameX}" y="${y + 14}" ${FONT} font-size="12" fill="#1E293B">${esc(clip(s.name, 28))}</text>
      <rect x="${barX}" y="${y + 3}" width="${pw}" height="16" fill="${GREEN}"/>
      <rect x="${barX + pw}" y="${y + 3}" width="${aw}" height="16" fill="${RED}"/>
      <text x="${barX + pw + aw + 8}" y="${y + 15}" ${FONT} font-size="11" font-weight="bold" fill="#334155">${s.daysPresent} / ${s.daysAbsent}</text>
      <text x="${barX + barMax + 150}" y="${y + 15}" ${FONT} font-size="12" fill="#1E293B">${hoursText(s.totalHours)}</text>
      <text x="${barX + barMax + 290}" y="${y + 15}" ${FONT} font-size="12" font-weight="bold" fill="${notes.length ? AMBER : GREEN}">${notes.length ? esc(notes.join(', ')) : 'OK'}</text>`;
  });
  if (rows.length > ranked.length) {
    body += `<text x="20" y="${height - 8}" ${FONT} font-size="9" fill="#94A3B8">Showing 12 of ${rows.length} staff - see the Staff Summary sheet for everyone.</text>`;
  }
  return toPng(frame(width, height, title, headline, attention ? AMBER : GREEN, body));
}

// ---- Dashboard trio for the PDF (half-width cards, 420x300) ----
export const DASH_W = 420;

/** Round chart: attendance entries by status, with the attendance rate in the middle. */
export async function statusDonutPng({ statusCounts }) {
  const title = 'Attendance by status';
  const total = statusCounts.reduce((n, x) => n + x.count, 0);
  if (!total) return emptyChart(title, 'No attendance entries in this period.', DASH_W);
  const absent = statusCounts.find((x) => x.status === 'Absent')?.count || 0;
  const rate = Math.round(((total - absent) / total) * 100);
  const cx = 110;
  const cy = 170;
  const R = 82;
  const r = 50;
  let angle = -Math.PI / 2;
  let arcs = '';
  statusCounts.forEach(({ status, count }) => {
    const color = STATUS_HEX[status] || FALLBACK_HEX;
    const frac = count / total;
    if (frac >= 0.999) {
      arcs += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"/>`;
      return;
    }
    const a2 = angle + frac * Math.PI * 2;
    const pt = (rad, a) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    const large = a2 - angle > Math.PI ? 1 : 0;
    arcs += `<path d="M ${pt(R, angle)} A ${R} ${R} 0 ${large} 1 ${pt(R, a2)} L ${pt(r, a2)} A ${r} ${r} 0 ${large} 0 ${pt(r, angle)} Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
    angle = a2;
  });
  const centre = `<text x="${cx}" y="${cy + 4}" ${FONT} font-size="22" font-weight="bold" fill="${NAVY}" text-anchor="middle">${rate}%</text>
    <text x="${cx}" y="${cy + 19}" ${FONT} font-size="9.5" fill="${MUTED}" text-anchor="middle">present</text>`;
  const legend = statusCounts
    .slice(0, 5)
    .map(({ status, count }, i) => {
      const y = 92 + i * 34;
      return `<rect x="218" y="${y}" width="12" height="12" rx="3" fill="${STATUS_HEX[status] || FALLBACK_HEX}"/>
        <text x="238" y="${y + 10}" ${FONT} font-size="11.5" fill="#1E293B">${esc(clip(status, 17))}</text>
        <text x="238" y="${y + 24}" ${FONT} font-size="10" fill="${MUTED}">${count} · ${Math.round((count / total) * 100)}%</text>`;
    })
    .join('');
  return toPng(frame(DASH_W, H, title, `${rate}% attendance — ${total - absent} of ${total} staff-days present.`, rate >= 90 ? GREEN : rate >= 70 ? AMBER : RED, arcs + centre + legend));
}

/** Line graph: total hours on site per day. */
export async function hoursLinePng({ daily }) {
  const title = 'Hours on site per day';
  const shown = daily.slice(-14);
  if (!shown.length || shown.every((d) => !d.hours)) return emptyChart(title, 'No completed hours in this period.', DASH_W);
  const peak = [...shown].sort((a, b) => b.hours - a.hours)[0];
  const headline = `Busiest: ${peak.day.slice(5)} (${hoursText(peak.hours)}).`;
  const left = 40;
  const right = 20;
  const top = 80;
  const bottom = 40;
  const plotW = DASH_W - left - right;
  const plotH = H - top - bottom;
  const max = Math.max(...shown.map((d) => d.hours), 1);
  const x = (i) => left + (shown.length === 1 ? plotW / 2 : (i / (shown.length - 1)) * plotW);
  const y = (v) => top + plotH - (v / max) * plotH;
  const pts = shown.map((d, i) => `${x(i)},${y(d.hours)}`).join(' ');
  let body = '';
  [0, 0.5, 1].forEach((f) => {
    const gy = top + plotH - plotH * f;
    body += `<line x1="${left}" y1="${gy}" x2="${DASH_W - right}" y2="${gy}" stroke="${f === 0 ? '#CBD5E1' : '#F1F5F9'}"/>
      <text x="${left - 6}" y="${gy + 3}" ${FONT} font-size="9" fill="#94A3B8" text-anchor="end">${Math.round(max * f)}h</text>`;
  });
  if (shown.length > 1) {
    body += `<polygon points="${x(0)},${top + plotH} ${pts} ${x(shown.length - 1)},${top + plotH}" fill="${NAVY}" fill-opacity="0.08"/>
      <polyline points="${pts}" fill="none" stroke="${NAVY}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  const step = Math.ceil(shown.length / 6);
  shown.forEach((d, i) => {
    body += `<circle cx="${x(i)}" cy="${y(d.hours)}" r="3.5" fill="${NAVY}" stroke="#FFFFFF" stroke-width="1.5"/>`;
    if (i % step === 0 || i === shown.length - 1) body += `<text x="${x(i)}" y="${H - 20}" ${FONT} font-size="10" fill="#475569" text-anchor="middle">${esc(d.day.slice(5))}</text>`;
  });
  return toPng(frame(DASH_W, H, title, headline, NAVY, body));
}
