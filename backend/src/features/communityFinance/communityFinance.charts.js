import sharp from 'sharp';
import moment from 'moment-timezone';

// Three charts, each answering one plain question and leading with a one-line takeaway:
//   1. Money in vs money out  (and what is still waiting to settle)
//   2. Where the money went / came from  (top categories, ranked)
//   3. How it moved over time  (income vs expenses per period)
// Amounts are in INR and shown in short form (k / L / Cr) so labels never crowd.

const FONT = 'font-family="Helvetica, Arial, sans-serif"';
const W = 640;
const H = 300;
const GREEN = '#15803D';
const RED = '#B91C1C';
const AMBER = '#D97706';
const NAVY = '#1F3A5F';
const MUTED = '#64748B';

const ENTITIES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[<>&"']/g, (c) => ENTITIES[c]);
const clip = (v, n) => (String(v).length > n ? `${String(v).slice(0, n - 1)}…` : String(v));

export function shortAmount(value) {
  const n = Math.abs(Number(value || 0));
  const trim = (x) => String(Number(x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)));
  if (n >= 1e7) return `${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `${trim(n / 1e5)}L`;
  if (n >= 1e3) return `${trim(n / 1e3)}k`;
  return trim(n);
}

const toPng = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const frame = (title, headline, headlineColor, body) => `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <text x="20" y="28" ${FONT} font-size="16" font-weight="bold" fill="${NAVY}">${esc(title)}</text>
  <text x="20" y="50" ${FONT} font-size="12" font-weight="bold" fill="${headlineColor}">${esc(headline)}</text>
  ${body}
  <text x="${W - 16}" y="${H - 10}" ${FONT} font-size="9" fill="#94A3B8" text-anchor="end">Amounts in INR</text>
</svg>`;

const emptyChart = (title, message) =>
  toPng(
    frame(
      title,
      message,
      MUTED,
      `<text x="${W / 2}" y="${H / 2 + 16}" ${FONT} font-size="12" fill="#94A3B8" text-anchor="middle">Nothing to chart for the selected filters.</text>`
    )
  );

/** Chart 1: cash received vs paid, plus anything still waiting to settle. */
export async function moneyInOutChartPng(report) {
  const title = 'Money in vs money out';
  const income = Math.max(0, report.totalIncome || 0);
  const expense = Math.max(0, report.totalExpense || 0);
  const pendingIn = report.pendingIncome || 0;
  const pendingOut = report.pendingExpense || 0;
  if (!income && !expense && !pendingIn && !pendingOut) {
    return emptyChart(title, 'No completed payments in this period.');
  }

  const net = report.netCashMovement || 0;
  const headline =
    income > 0
      ? `${net >= 0 ? 'Surplus' : 'Deficit'} of ${shortAmount(net)} — paid out ${Math.round((expense / income) * 100)}% of what came in.`
      : `Paid out ${shortAmount(expense)} with no money received.`;

  const rows = [
    { label: 'Received', value: income, color: GREEN },
    { label: 'Paid out', value: expense, color: RED },
  ];
  if (pendingIn > 0) rows.push({ label: 'Still to receive', value: pendingIn, color: AMBER, soft: true });
  if (pendingOut > 0) rows.push({ label: 'Still to pay', value: pendingOut, color: AMBER, soft: true });

  const max = Math.max(...rows.map((r) => r.value), 1);
  const labelW = 120;
  const barMax = W - labelW - 110;
  const rowH = 44;
  let y = 76;
  let body = '';
  rows.forEach((r, i) => {
    if (r.soft && !rows[i - 1]?.soft) {
      body += `<line x1="20" y1="${y - 6}" x2="${W - 20}" y2="${y - 6}" stroke="#E2E8F0" stroke-dasharray="4 4"/>
        <text x="20" y="${y + 6}" ${FONT} font-size="9.5" fill="${MUTED}">NOT YET SETTLED (not counted above)</text>`;
      y += 16;
    }
    const w = Math.max(r.value ? 4 : 0, (r.value / max) * barMax);
    body += `<text x="${labelW - 10}" y="${y + 19}" ${FONT} font-size="12" fill="#1E293B" text-anchor="end">${r.label}</text>
      <rect x="${labelW}" y="${y + 4}" width="${w}" height="24" rx="4" fill="${r.color}" ${r.soft ? 'fill-opacity="0.35" stroke="' + r.color + '" stroke-dasharray="4 3"' : ''}/>
      <text x="${labelW + w + 8}" y="${y + 21}" ${FONT} font-size="13" font-weight="bold" fill="#1E293B">${shortAmount(r.value)}</text>`;
    y += rowH - (r.soft ? 8 : 0);
  });
  return toPng(frame(title, headline, net >= 0 ? GREEN : RED, body));
}

/** Chart 2: ranked categories (top 5 plus "Other"). `items` = [{ name, amount, percentage, count }]. */
export async function rankedCategoryChartPng(items, { title, noun, color }) {
  const positive = (items || []).filter((i) => i.amount > 0);
  if (positive.length === 0) return emptyChart(title, `No completed ${noun === 'cost' ? 'expenses' : 'income'} in this period.`);

  const total = positive.reduce((s, i) => s + i.amount, 0);
  const top = positive.slice(0, 5);
  const rest = positive.slice(5);
  const shown = [...top];
  if (rest.length) {
    const amount = rest.reduce((s, i) => s + i.amount, 0);
    shown.push({ name: `Other (${rest.length})`, amount, other: true });
  }
  const lead = top[0];
  const leadPct = Math.round((lead.amount / total) * 100);
  const headline =
    positive.length === 1
      ? `All of it is ${lead.name}.`
      : `${lead.name} is the biggest ${noun} — ${leadPct}% of the total.`;

  const labelW = 150;
  const barMax = W - labelW - 120;
  const rowH = Math.min(34, (H - 90) / shown.length);
  const max = Math.max(...shown.map((s) => s.amount));
  let body = '';
  shown.forEach((s, i) => {
    const y = 70 + i * rowH;
    const w = Math.max(4, (s.amount / max) * barMax);
    const pct = Math.round((s.amount / total) * 100);
    body += `<text x="${labelW - 10}" y="${y + rowH / 2 + 4}" ${FONT} font-size="12" fill="#1E293B" text-anchor="end">${esc(clip(s.name, 20))}</text>
      <rect x="${labelW}" y="${y + 3}" width="${w}" height="${rowH - 10}" rx="4" fill="${s.other ? '#94A3B8' : color}" ${i === 0 && !s.other ? '' : 'fill-opacity="0.85"'}/>
      <text x="${labelW + w + 8}" y="${y + rowH / 2 + 4}" ${FONT} font-size="12" font-weight="bold" fill="#1E293B">${shortAmount(s.amount)} <tspan font-weight="normal" fill="${MUTED}">· ${pct}%</tspan></text>`;
  });
  return toPng(frame(title, headline, NAVY, body));
}

const periodLabel = (key) => (key.length === 7 ? moment(key, 'YYYY-MM').format("MMM 'YY") : moment(key, 'YYYY-MM-DD').format('DD MMM'));

/** Chart 3: income vs expenses per period as paired columns. */
export async function trendChartPng(timeSeries, granularity = 'daily') {
  const title = `Income vs expenses by ${granularity === 'monthly' ? 'month' : 'day'}`;
  const series = (timeSeries || []).filter((p) => p.income || p.expense);
  if (series.length === 0) return emptyChart(title, 'No completed income or expenses in this period.');

  const shown = series.slice(-12);
  const best = [...shown].sort((a, b) => b.net - a.net)[0];
  const worst = [...shown].sort((a, b) => a.net - b.net)[0];
  const headline =
    shown.length < 2
      ? `Only one ${granularity === 'monthly' ? 'month' : 'day'} has activity: net ${best.net >= 0 ? '+' : '-'}${shortAmount(best.net)}.`
      : `Best: ${periodLabel(best.period)} (${best.net >= 0 ? '+' : '-'}${shortAmount(best.net)})   Weakest: ${periodLabel(worst.period)} (${worst.net >= 0 ? '+' : '-'}${shortAmount(worst.net)})`;

  const left = 44;
  const right = 16;
  const top = 96;
  const bottom = 40;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const max = Math.max(...shown.map((p) => Math.max(p.income, p.expense)), 1);
  const group = plotW / shown.length;
  const barW = Math.min(30, group / 2 - 4);
  const showValues = shown.length <= 8;

  let body = `<rect x="20" y="62" width="10" height="10" rx="2" fill="${GREEN}"/><text x="35" y="71" ${FONT} font-size="11" fill="#334155">Income</text>
    <rect x="92" y="62" width="10" height="10" rx="2" fill="${RED}"/><text x="107" y="71" ${FONT} font-size="11" fill="#334155">Expenses</text>
    <line x1="${left}" y1="${top + plotH}" x2="${W - right}" y2="${top + plotH}" stroke="#CBD5E1"/>`;
  // Light scale so bars can be read without value labels
  [0.5, 1].forEach((f) => {
    const gy = top + plotH - plotH * f;
    body += `<line x1="${left}" y1="${gy}" x2="${W - right}" y2="${gy}" stroke="#F1F5F9"/>
      <text x="${left - 6}" y="${gy + 3}" ${FONT} font-size="9" fill="#94A3B8" text-anchor="end">${shortAmount(max * f)}</text>`;
  });
  shown.forEach((p, i) => {
    const gx = left + i * group + group / 2;
    const ih = (p.income / max) * plotH;
    const eh = (p.expense / max) * plotH;
    body += `<rect x="${gx - barW - 1}" y="${top + plotH - ih}" width="${barW}" height="${Math.max(ih, p.income ? 2 : 0)}" rx="3" fill="${GREEN}"/>
      <rect x="${gx + 1}" y="${top + plotH - eh}" width="${barW}" height="${Math.max(eh, p.expense ? 2 : 0)}" rx="3" fill="${RED}"/>
      <text x="${gx}" y="${H - 22}" ${FONT} font-size="10" fill="#475569" text-anchor="middle">${esc(periodLabel(p.period))}</text>`;
    if (showValues) {
      if (p.income) body += `<text x="${gx - barW / 2 - 1}" y="${top + plotH - ih - 4}" ${FONT} font-size="9.5" font-weight="bold" fill="${GREEN}" text-anchor="middle">${shortAmount(p.income)}</text>`;
      if (p.expense) body += `<text x="${gx + barW / 2 + 1}" y="${top + plotH - eh - 4}" ${FONT} font-size="9.5" font-weight="bold" fill="${RED}" text-anchor="middle">${shortAmount(p.expense)}</text>`;
    }
  });
  const note = series.length > shown.length ? `Showing the latest ${shown.length} of ${series.length}` : '';
  return toPng(frame(title, headline, NAVY, body + (note ? `<text x="20" y="${H - 10}" ${FONT} font-size="9" fill="#94A3B8">${note}</text>` : '')));
}

// ==========================================
// Dashboard set: round chart, vertical columns, line graph (used together on one PDF page)
// Half-width charts are 420x300, the line graph is full width 900x280.
// ==========================================

const HW = 420;
const HH = 300;
const PALETTE = ['#B91C1C', '#D97706', '#1D4ED8', '#7C3AED', '#0F766E'];
const frameAt = (width, height, title, headline, headlineColor, body) => `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  <text x="16" y="26" ${FONT} font-size="15" font-weight="bold" fill="${NAVY}">${esc(title)}</text>
  <text x="16" y="46" ${FONT} font-size="11" font-weight="bold" fill="${headlineColor}">${esc(clip(headline, Math.floor(width / 6.2)))}</text>
  ${body}
</svg>`;
const emptyAt = (width, height, title, message) =>
  toPng(frameAt(width, height, title, message, MUTED, `<text x="${width / 2}" y="${height / 2 + 14}" ${FONT} font-size="12" fill="#94A3B8" text-anchor="middle">Nothing to chart for the selected filters.</text>`));

/** Round chart: share of each category (top 4 plus Other). */
export async function donutChartPng(items, { title, noun, colors = PALETTE }) {
  const positive = (items || []).filter((i) => i.amount > 0);
  if (!positive.length) return emptyAt(HW, HH, title, `No completed ${noun === 'cost' ? 'expenses' : 'income'} in this period.`);

  const total = positive.reduce((s, i) => s + i.amount, 0);
  const shown = positive.slice(0, 4);
  const rest = positive.slice(4);
  if (rest.length) shown.push({ name: `Other (${rest.length})`, amount: rest.reduce((s, i) => s + i.amount, 0), other: true });
  const lead = shown[0];
  const headline = shown.length === 1 ? `All of it is ${lead.name}.` : `${lead.name} is the biggest ${noun} — ${Math.round((lead.amount / total) * 100)}%.`;

  const cx = 110;
  const cy = 170;
  const R = 82;
  const r = 50;
  let angle = -Math.PI / 2;
  let arcs = '';
  shown.forEach((s, i) => {
    const color = s.other ? '#94A3B8' : colors[i % colors.length];
    const frac = s.amount / total;
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
  const centre = `<text x="${cx}" y="${cy + 2}" ${FONT} font-size="18" font-weight="bold" fill="${NAVY}" text-anchor="middle">${shortAmount(total)}</text>
    <text x="${cx}" y="${cy + 17}" ${FONT} font-size="9.5" fill="${MUTED}" text-anchor="middle">total</text>`;
  const legend = shown
    .map((s, i) => {
      const y = 92 + i * 34;
      const color = s.other ? '#94A3B8' : colors[i % colors.length];
      return `<rect x="218" y="${y}" width="12" height="12" rx="3" fill="${color}"/>
        <text x="238" y="${y + 10}" ${FONT} font-size="11.5" fill="#1E293B">${esc(clip(s.name, 14))}</text>
        <text x="238" y="${y + 24}" ${FONT} font-size="10" fill="${MUTED}">${shortAmount(s.amount)} · ${Math.round((s.amount / total) * 100)}%</text>`;
    })
    .join('');
  return toPng(frameAt(HW, HH, title, headline, NAVY, arcs + centre + legend));
}

/** Vertical columns: received, paid, net, and what is still waiting to settle. */
export async function columnChartPng(report) {
  const title = 'Money in vs money out';
  const cols = [
    { label: 'Received', value: Math.max(0, report.totalIncome || 0), color: GREEN },
    { label: 'Paid out', value: Math.max(0, report.totalExpense || 0), color: RED },
    { label: report.netCashMovement >= 0 ? 'Surplus' : 'Deficit', value: Math.abs(report.netCashMovement || 0), color: report.netCashMovement >= 0 ? '#1D4ED8' : RED, signed: report.netCashMovement < 0 },
    { label: 'To receive', value: report.pendingIncome || 0, color: AMBER, soft: true },
    { label: 'To pay', value: report.pendingExpense || 0, color: AMBER, soft: true },
  ];
  if (cols.every((c) => !c.value)) return emptyAt(HW, HH, title, 'No completed payments in this period.');

  const headline = (report.totalIncome || 0) > 0
    ? `Paid out ${Math.round(((report.totalExpense || 0) / report.totalIncome) * 100)}% of what came in.`
    : 'No money received in this period.';
  const left = 16;
  const top = 80;
  const bottom = 40;
  const plotH = HH - top - bottom;
  const plotW = HW - left * 2;
  const slot = plotW / cols.length;
  const barW = slot - 16;
  const max = Math.max(...cols.map((c) => c.value), 1);
  let body = `<line x1="${left}" y1="${top + plotH}" x2="${HW - left}" y2="${top + plotH}" stroke="#CBD5E1"/>`;
  cols.forEach((c, i) => {
    const h = Math.max(c.value ? 3 : 0, (c.value / max) * plotH);
    const x = left + i * slot + 8;
    body += `<rect x="${x}" y="${top + plotH - h}" width="${barW}" height="${h}" rx="4" fill="${c.color}" ${c.soft ? `fill-opacity="0.35" stroke="${c.color}" stroke-dasharray="4 3"` : ''}/>
      <text x="${x + barW / 2}" y="${top + plotH - h - 5}" ${FONT} font-size="11" font-weight="bold" fill="#1E293B" text-anchor="middle">${c.signed ? '-' : ''}${shortAmount(c.value)}</text>
      <text x="${x + barW / 2}" y="${HH - 20}" ${FONT} font-size="10" fill="#475569" text-anchor="middle">${c.label}</text>`;
  });
  body += `<text x="${HW - 16}" y="${HH - 5}" ${FONT} font-size="8.5" fill="#94A3B8" text-anchor="end">Dashed = not yet settled. Amounts in INR.</text>`;
  return toPng(frameAt(HW, HH, title, headline, (report.netCashMovement || 0) >= 0 ? GREEN : RED, body));
}

/** Line graph: income and expenses over time. */
export async function lineChartPng(timeSeries, granularity = 'daily') {
  const LW = 900;
  const LH = 280;
  const title = `Income vs expenses by ${granularity === 'monthly' ? 'month' : 'day'}`;
  const series = (timeSeries || []).filter((p) => p.income || p.expense);
  if (!series.length) return emptyAt(LW, LH, title, 'No completed income or expenses in this period.');

  const shown = series.slice(-31);
  const best = [...shown].sort((a, b) => b.net - a.net)[0];
  const worst = [...shown].sort((a, b) => a.net - b.net)[0];
  const sign = (n) => `${n >= 0 ? '+' : '-'}${shortAmount(n)}`;
  const headline = shown.length < 2
    ? `Only one ${granularity === 'monthly' ? 'month' : 'day'} has activity: net ${sign(best.net)}.`
    : `Best: ${periodLabel(best.period)} (${sign(best.net)})    Weakest: ${periodLabel(worst.period)} (${sign(worst.net)})`;

  const left = 52;
  const right = 24;
  const top = 80;
  const bottom = 38;
  const plotW = LW - left - right;
  const plotH = LH - top - bottom;
  const max = Math.max(...shown.map((p) => Math.max(p.income, p.expense)), 1);
  const x = (i) => left + (shown.length === 1 ? plotW / 2 : (i / (shown.length - 1)) * plotW);
  const y = (v) => top + plotH - (v / max) * plotH;
  const line = (key) => shown.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');

  let body = `<rect x="16" y="56" width="10" height="10" rx="2" fill="${GREEN}"/><text x="31" y="65" ${FONT} font-size="11" fill="#334155">Income</text>
    <rect x="88" y="56" width="10" height="10" rx="2" fill="${RED}"/><text x="103" y="65" ${FONT} font-size="11" fill="#334155">Expenses</text>`;
  [0, 0.5, 1].forEach((f) => {
    const gy = top + plotH - plotH * f;
    body += `<line x1="${left}" y1="${gy}" x2="${LW - right}" y2="${gy}" stroke="${f === 0 ? '#CBD5E1' : '#F1F5F9'}"/>
      <text x="${left - 8}" y="${gy + 3}" ${FONT} font-size="10" fill="#94A3B8" text-anchor="end">${shortAmount(max * f)}</text>`;
  });
  if (shown.length > 1) {
    body += `<polygon points="${x(0)},${top + plotH} ${line('income')} ${x(shown.length - 1)},${top + plotH}" fill="${GREEN}" fill-opacity="0.08"/>
      <polyline points="${line('income')}" fill="none" stroke="${GREEN}" stroke-width="2.5" stroke-linejoin="round"/>
      <polyline points="${line('expense')}" fill="none" stroke="${RED}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  const step = Math.ceil(shown.length / 10);
  shown.forEach((p, i) => {
    body += `<circle cx="${x(i)}" cy="${y(p.income)}" r="3.5" fill="${GREEN}" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="${x(i)}" cy="${y(p.expense)}" r="3.5" fill="${RED}" stroke="#FFFFFF" stroke-width="1.5"/>`;
    if (i % step === 0 || i === shown.length - 1) {
      body += `<text x="${x(i)}" y="${LH - 14}" ${FONT} font-size="10" fill="#475569" text-anchor="middle">${esc(periodLabel(p.period))}</text>`;
    }
  });
  return toPng(frameAt(LW, LH, title, headline, NAVY, body));
}
