import React, { useState, useMemo, memo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput
} from '@coreui/react';

/**
 * BillingLedgerTable
 *
 * Admin data grid showing community invoicing activity.
 * Status badges, tooltips on VERIFICATION_PENDING, row-level actions.
 * Fully driven by local mock data — zero API/socket wiring.
 */



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
          {(invoice.targetUser || 'Unknown').charAt(0)}
        </div>
        <span className="billing-ledger__user">{invoice.targetUser || 'Unknown'}</span>
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

const BillingLedgerTable = memo(({
  kpis = { grossDemand: 0, totalCollected: 0, inTransitGateway: 0, totalUnpaidArrears: 0 },
  invoices = [],
  pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
  loading = false,
  onPageChange,
  onSettleOffline,
  onApproveOffline,
}) => {
  console.log('DEBUG [BillingLedgerTable] received props:', {
    onApproveOfflineType: typeof onApproveOffline,
    onSettleOfflineType: typeof onSettleOffline,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [confirmPaidId, setConfirmPaidId] = useState(null);
  const [settleInvoiceId, setSettleInvoiceId] = useState(null);
  const [settleRef, setSettleRef] = useState('');

  const handleMarkPaid = useCallback((invoiceId) => {
    setConfirmPaidId(invoiceId);
  }, []);

  const handleConfirmMarkPaid = async () => {
    if (!confirmPaidId) return;
    try {
      await onApproveOffline(confirmPaidId);
      toast.success('Invoice marked as paid successfully.');
    } catch (err) {
      toast.error('Failed to update invoice: ' + err.message);
    } finally {
      setConfirmPaidId(null);
    }
  };

  const handleOfflineSettle = useCallback((invoiceId) => {
    setSettleInvoiceId(invoiceId);
    setSettleRef('');
  }, []);

  const handleConfirmOfflineSettle = async () => {
    if (!settleInvoiceId || !settleRef.trim()) return;
    try {
      await onSettleOffline(settleInvoiceId, { offlineReference: settleRef, paymentMethod: 'CHEQUE' });
      toast.success('Offline payment verified and recorded successfully.');
    } catch (err) {
      toast.error('Failed to settle invoice: ' + err.message);
    } finally {
      setSettleInvoiceId(null);
      setSettleRef('');
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (onPageChange) {
      onPageChange(1, { search: val, status: statusFilter });
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    if (onPageChange) {
      onPageChange(1, { search, status });
    }
  };

  return (
    <div className="billing-ledger">

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="billing-ledger__kpi-strip">
        <div className="billing-ledger__kpi-card">
          <i className="fa-solid fa-file-invoice billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">
              {loading ? '…' : (kpis.grossDemandCount || 0)}
            </div>
            <div className="billing-ledger__kpi-label">Total Invoices</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--success">
          <i className="fa-solid fa-circle-check billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{loading ? '…' : kpis.totalCollected}</div>
            <div className="billing-ledger__kpi-label">Paid</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--danger">
          <i className="fa-solid fa-circle-xmark billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">
              {loading ? '…' : kpis.totalUnpaidArrears}
            </div>
            <div className="billing-ledger__kpi-label">Unpaid</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--info">
          <i className="fa-solid fa-clock-rotate-left billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">{loading ? '…' : kpis.inTransitGateway}</div>
            <div className="billing-ledger__kpi-label">Pending</div>
          </div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--primary">
          <i className="fa-solid fa-indian-rupee-sign billing-ledger__kpi-icon" />
          <div>
            <div className="billing-ledger__kpi-value">
              ₹{loading ? '…' : (kpis.grossDemand || 0).toLocaleString('en-IN')}
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
            onChange={handleSearchChange}
            aria-label="Search invoices"
          />
        </div>

        <div className="billing-ledger__filter-pills" role="group" aria-label="Filter by status">
          {['ALL', 'PAID', 'UNPAID', 'VERIFICATION_PENDING'].map(s => (
            <button
              key={s}
              type="button"
              className={`billing-ledger__filter-pill${statusFilter === s ? ' billing-ledger__filter-pill--active' : ''}`}
              onClick={() => handleStatusFilterChange(s)}
            >
              {s === 'ALL' ? 'All' : s === 'VERIFICATION_PENDING' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="billing-ledger__table-wrap" style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
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
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="billing-ledger__empty">
                  <i className="fa-solid fa-inbox" style={{ fontSize: '28px', opacity: 0.3 }} />
                  <p className="mt-2 mb-0">No invoices match your search.</p>
                </td>
              </tr>
            ) : (
              invoices.map(inv => (
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

      {/* ── Pagination Footer ─────────────────────────────────────────── */}
      <div className="table-pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
          Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total records)
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={pagination.currentPage <= 1 || loading}
            onClick={() => onPageChange && onPageChange(pagination.currentPage - 1, { search, status: statusFilter })}
            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={pagination.currentPage >= pagination.totalPages || loading}
            onClick={() => onPageChange && onPageChange(pagination.currentPage + 1, { search, status: statusFilter })}
            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Confirm Mark Paid Modal ────────────────────────────────────── */}
      <CModal visible={!!confirmPaidId} onClose={() => setConfirmPaidId(null)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Confirm Payment Clearance</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to mark this invoice as <strong>PAID</strong>? This will clear the outstanding balance.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" size="sm" onClick={() => setConfirmPaidId(null)}>
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={handleConfirmMarkPaid}>
            Confirm Clear
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Offline Settle Modal ───────────────────────────────────────── */}
      <CModal visible={!!settleInvoiceId} onClose={() => { setSettleInvoiceId(null); setSettleRef(''); }} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Enter Offline Settlement Details</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={(e) => { e.preventDefault(); handleConfirmOfflineSettle(); }}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="offline-ref" className="small fw-semibold">
                Transaction ID / Reference Number (Cheque/NEFT) *
              </CFormLabel>
              <CFormInput
                id="offline-ref"
                type="text"
                placeholder="e.g. CHQ-92842 or UTR-28194"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
                required
                autoFocus
                size="sm"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton type="button" color="secondary" size="sm" onClick={() => { setSettleInvoiceId(null); setSettleRef(''); }}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={!settleRef.trim()}>
              Record Settlement
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

    </div>
  );
});
BillingLedgerTable.displayName = 'BillingLedgerTable';

export default BillingLedgerTable;
