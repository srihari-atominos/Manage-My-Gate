import React, { useState, useMemo, memo, useCallback } from 'react';

/**
 * BillingLedgerTable
 *
 * Admin data grid showing community invoicing activity.
 * Status badges, tooltips on VERIFICATION_PENDING, row-level actions.
 * Fully driven by local mock data — zero API/socket wiring.
 */

// ── Mock invoice data ─────────────────────────────────────────────────────

const MOCK_INVOICES = [
  {
    _id:           'inv1',
    invoiceNumber: 'INV-2026-07-001',
    unitNumber:    'Villa 14 - Block B',
    targetUser:    'Rahul Sharma',
    amount:         7000,
    currency:      '₹',
    status:        'PAID',
    paymentMethod: 'UPI',
    date:          '2026-07-01',
  },
  {
    _id:           'inv2',
    invoiceNumber: 'INV-2026-07-002',
    unitNumber:    'Villa 22 - Block A',
    targetUser:    'Priya Nair',
    amount:         7000,
    currency:      '₹',
    status:        'UNPAID',
    paymentMethod: '—',
    date:          '2026-07-01',
  },
  {
    _id:           'inv3',
    invoiceNumber: 'INV-2026-07-003',
    unitNumber:    'Villa 08 - Block C',
    targetUser:    'James Thompson',
    amount:         9500,
    currency:      '₹',
    status:        'VERIFICATION_PENDING',
    paymentMethod: 'Cheque #44892',
    date:          '2026-07-02',
  },
  {
    _id:           'inv4',
    invoiceNumber: 'INV-2026-07-004',
    unitNumber:    'Villa 33 - Block D',
    targetUser:    'Fatima Al-Zaabi',
    amount:         7000,
    currency:      '₹',
    status:        'PAID',
    paymentMethod: 'Bank Transfer',
    date:          '2026-07-03',
  },
  {
    _id:           'inv5',
    invoiceNumber: 'INV-2026-07-005',
    unitNumber:    'Villa 17 - Block A',
    targetUser:    'David Chen',
    amount:        12000,
    currency:      '₹',
    status:        'UNPAID',
    paymentMethod: '—',
    date:          '2026-07-03',
  },
  {
    _id:           'inv6',
    invoiceNumber: 'INV-2026-07-006',
    unitNumber:    'Villa 41 - Block B',
    targetUser:    'Sara Al-Mansouri',
    amount:         7000,
    currency:      '₹',
    status:        'VERIFICATION_PENDING',
    paymentMethod: 'Cheque #44901',
    date:          '2026-07-04',
  },
];

// ── Status badge config ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  PAID: {
    className: 'billing-status-badge billing-status-badge--paid',
    label:     'Paid',
    icon:      'fa-circle-check',
  },
  UNPAID: {
    className: 'billing-status-badge billing-status-badge--unpaid',
    label:     'Unpaid',
    icon:      'fa-circle-xmark',
  },
  VERIFICATION_PENDING: {
    className: 'billing-status-badge billing-status-badge--pending',
    label:     'Pending',
    icon:      'fa-clock-rotate-left',
    tooltip:   'Cheque #44892 currently clearing T+3',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────

const StatusBadge = memo(({ status, paymentMethod }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNPAID;
  const tooltipText = status === 'VERIFICATION_PENDING'
    ? `${paymentMethod} currently clearing T+3`
    : undefined;

  return (
    <span
      className={cfg.className}
      title={tooltipText}
      data-bs-toggle={tooltipText ? 'tooltip' : undefined}
      data-bs-title={tooltipText}
    >
      <i className={`fa-solid ${cfg.icon} me-1`} />
      {cfg.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const LedgerRow = memo(({ invoice, onMarkPaid, onOfflineSettle }) => (
  <tr className="billing-ledger__row">
    <td className="billing-ledger__cell">
      <span className="billing-ledger__invoice-num">{invoice.invoiceNumber}</span>
      <div className="billing-ledger__date">{invoice.date}</div>
    </td>
    <td className="billing-ledger__cell">
      <span className="billing-ledger__unit">{invoice.unitNumber}</span>
    </td>
    <td className="billing-ledger__cell">
      <div className="d-flex align-items-center gap-2">
        <div className="billing-ledger__avatar">
          {invoice.targetUser.charAt(0)}
        </div>
        <span className="billing-ledger__user">{invoice.targetUser}</span>
      </div>
    </td>
    <td className="billing-ledger__cell billing-ledger__cell--amount">
      <span className="billing-ledger__amount">
        {invoice.currency}{invoice.amount.toLocaleString('en-IN')}
      </span>
    </td>
    <td className="billing-ledger__cell">
      <StatusBadge status={invoice.status} paymentMethod={invoice.paymentMethod} />
    </td>
    <td className="billing-ledger__cell">
      <span className="billing-ledger__method">{invoice.paymentMethod}</span>
    </td>
    <td className="billing-ledger__cell billing-ledger__cell--actions">
      <button
        type="button"
        className="billing-ledger__action-btn billing-ledger__action-btn--primary"
        onClick={() => onMarkPaid(invoice._id)}
        disabled={invoice.status === 'PAID'}
        title="Mark as Paid"
      >
        <i className="fa-solid fa-check me-1" />
        Mark Paid
      </button>
      <button
        type="button"
        className="billing-ledger__action-btn billing-ledger__action-btn--secondary"
        onClick={() => onOfflineSettle(invoice._id)}
        title="Settle offline"
      >
        <i className="fa-solid fa-handshake me-1" />
        Settle
      </button>
    </td>
  </tr>
));
LedgerRow.displayName = 'LedgerRow';

// ── Main Component ────────────────────────────────────────────────────────

const BillingLedgerTable = memo(() => {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleMarkPaid    = useCallback((id) => console.log('[BillingLedgerTable] Mark Paid:', id),   []);
  const handleOfflineSettle = useCallback((id) => console.log('[BillingLedgerTable] Offline Settle:', id), []);

  const filtered = useMemo(() => {
    let rows = MOCK_INVOICES;
    if (statusFilter !== 'ALL') rows = rows.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.invoiceNumber.toLowerCase().includes(q)
        || r.unitNumber.toLowerCase().includes(q)
        || r.targetUser.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [search, statusFilter]);

  const summary = useMemo(() => ({
    total:   MOCK_INVOICES.length,
    paid:    MOCK_INVOICES.filter(r => r.status === 'PAID').length,
    unpaid:  MOCK_INVOICES.filter(r => r.status === 'UNPAID').length,
    pending: MOCK_INVOICES.filter(r => r.status === 'VERIFICATION_PENDING').length,
    totalAmount: MOCK_INVOICES.reduce((s, r) => s + r.amount, 0),
  }), []);

  return (
    <div className="billing-ledger">

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="billing-ledger__kpi-strip">
        <div className="billing-ledger__kpi-card">
          <i className="fa-solid fa-file-invoice billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{summary.total}</div>
            <div className="billing-ledger__kpi-label">Total Invoices</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--success">
          <i className="fa-solid fa-circle-check billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{summary.paid}</div>
            <div className="billing-ledger__kpi-label">Paid</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--danger">
          <i className="fa-solid fa-circle-xmark billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{summary.unpaid}</div>
            <div className="billing-ledger__kpi-label">Unpaid</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--info">
          <i className="fa-solid fa-clock-rotate-left billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{summary.pending}</div>
            <div className="billing-ledger__kpi-label">Pending</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--primary">
          <i className="fa-solid fa-indian-rupee-sign billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">
              ₹{summary.totalAmount.toLocaleString('en-IN')}
            </div>
            <div className="billing-ledger__kpi-label">Total Billed</div>
          </div>
        </div>
      </div>

      {/* ── Table header / toolbar ────────────────────────────────────── */}
      <div className="billing-ledger__toolbar">
        <div className="billing-ledger__search-wrap">
          <i className="fa-solid fa-magnifying-glass billing-ledger__search-icon" />
          <input
            type="text"
            className="billing-ledger__search"
            placeholder="Search invoice, unit, or resident…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search invoices"
          />
        </div>

        <div className="billing-ledger__filter-pills" role="group" aria-label="Filter by status">
          {['ALL', 'PAID', 'UNPAID', 'VERIFICATION_PENDING'].map(s => (
            <button
              key={s}
              type="button"
              className={`billing-ledger__filter-pill${statusFilter === s ? ' billing-ledger__filter-pill--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL' ? 'All' : s === 'VERIFICATION_PENDING' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="billing-ledger__table-wrap">
        <table className="billing-ledger__table">
          <thead>
            <tr className="billing-ledger__thead-row">
              <th className="billing-ledger__th">Invoice</th>
              <th className="billing-ledger__th">Unit</th>
              <th className="billing-ledger__th">Resident</th>
              <th className="billing-ledger__th">Amount</th>
              <th className="billing-ledger__th">Status</th>
              <th className="billing-ledger__th">Method</th>
              <th className="billing-ledger__th text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="billing-ledger__empty">
                  <i className="fa-solid fa-inbox" style={{ fontSize: '28px', opacity: 0.3 }} />
                  <p className="mt-2 mb-0">No invoices match your search.</p>
                </td>
              </tr>
            ) : (
              filtered.map(inv => (
                <LedgerRow
                  key={inv._id}
                  invoice={inv}
                  onMarkPaid={handleMarkPaid}
                  onOfflineSettle={handleOfflineSettle}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
});
BillingLedgerTable.displayName = 'BillingLedgerTable';

export default BillingLedgerTable;
