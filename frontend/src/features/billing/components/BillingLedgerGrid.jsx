import React, { useState, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilXCircle, cilClock, cilSearch, cilInbox } from '@coreui/icons';
import '../styles/_billing.scss';

/**
 * Status badge component for Ledger Rows
 */
const StatusBadge = memo(({ status, paymentMethod }) => {
  const { t } = useTranslation();

  if (status === 'PAID') {
    return (
      <span className="billing-status-badge billing-status-badge--paid">
        <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
        {t('billing.status.paid', 'Paid')}
      </span>
    );
  }

  if (status === 'VERIFICATION_PENDING') {
    return (
      <span
        className="billing-status-badge billing-status-badge--pending"
        title={`${paymentMethod || 'Payment'} ${t('billing.status.pendingTooltip', 'clearing T+3')}`}
      >
        <CIcon icon={cilClock} size="sm" className="me-1" />
        {t('billing.status.pending', 'Pending')}
      </span>
    );
  }

  return (
    <span className="billing-status-badge billing-status-badge--unpaid">
      <CIcon icon={cilXCircle} size="sm" className="me-1" />
      {t('billing.status.unpaid', 'Unpaid')}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * Table row component for Billing Ledger Grid
 */
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
          {(invoice.targetUser || 'U').charAt(0)}
        </div>
        <span className="billing-ledger__user">{invoice.targetUser || 'Unknown'}</span>
      </div>
    </td>
    <td className="billing-ledger__cell billing-ledger__cell--amount">
      <span className="billing-ledger__amount">
        {invoice.currency || '₹'}{(invoice.amount || 0).toLocaleString('en-IN')}
      </span>
    </td>
    <td className="billing-ledger__cell">
      <StatusBadge status={invoice.status} paymentMethod={invoice.paymentMethod} />
    </td>
    <td className="billing-ledger__cell">
      <span className="billing-ledger__method">{invoice.paymentMethod || '—'}</span>
    </td>
    <td className="billing-ledger__cell billing-ledger__cell--actions text-end">
      <CButton
        color="success"
        size="sm"
        className="me-2 text-white"
        onClick={() => onMarkPaid(invoice._id)}
        disabled={invoice.status === 'PAID'}
      >
        Mark Paid
      </CButton>
      <CButton
        color="secondary"
        size="sm"
        variant="outline"
        onClick={() => onOfflineSettle(invoice._id)}
      >
        Settle
      </CButton>
    </td>
  </tr>
));

LedgerRow.displayName = 'LedgerRow';

/**
 * Isolated Billing Ledger Data Grid Component.
 * Relies strictly on database-level pagination stored in Redux (billingSlice.js).
 */
export const BillingLedgerGrid = memo(({
  kpis = { grossDemand: 0, totalCollected: 0, inTransitGateway: 0, totalUnpaidArrears: 0, grossDemandCount: 0 },
  invoices = [],
  pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
  loading = false,
  onPageChange,
  onSettleOffline,
  onApproveOffline,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [confirmPaidId, setConfirmPaidId] = useState(null);
  const [settleInvoiceId, setSettleInvoiceId] = useState(null);
  const [settleRef, setSettleRef] = useState('');

  const handleMarkPaid = useCallback((invoiceId) => {
    setConfirmPaidId(invoiceId);
  }, []);

  const handleConfirmMarkPaid = async () => {
    if (!confirmPaidId || !onApproveOffline) return;
    await onApproveOffline(confirmPaidId);
    setConfirmPaidId(null);
  };

  const handleOfflineSettle = useCallback((invoiceId) => {
    setSettleInvoiceId(invoiceId);
    setSettleRef('');
  }, []);

  const handleConfirmOfflineSettle = async () => {
    if (!settleInvoiceId || !settleRef.trim() || !onSettleOffline) return;
    await onSettleOffline(settleInvoiceId, { offlineReference: settleRef, paymentMethod: 'CHEQUE' });
    setSettleInvoiceId(null);
    setSettleRef('');
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
      {/* KPI Summary Strip */}
      <div className="billing-ledger__kpi-strip">
        <div className="billing-ledger__kpi-card">
          <div className="billing-ledger__kpi-value">{loading ? '…' : (kpis.grossDemandCount || 0)}</div>
          <div className="billing-ledger__kpi-label">{t('billing.kpi.totalInvoices', 'Total Invoices')}</div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--success">
          <div className="billing-ledger__kpi-value">₹{loading ? '…' : (kpis.totalCollected || 0).toLocaleString('en-IN')}</div>
          <div className="billing-ledger__kpi-label">{t('billing.kpi.collected', 'Paid')}</div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--danger">
          <div className="billing-ledger__kpi-value">₹{loading ? '…' : (kpis.totalUnpaidArrears || 0).toLocaleString('en-IN')}</div>
          <div className="billing-ledger__kpi-label">{t('billing.kpi.unpaid', 'Unpaid Arrears')}</div>
        </div>
        <div className="billing-ledger__kpi-card billing-ledger__kpi-card--info">
          <div className="billing-ledger__kpi-value">₹{loading ? '…' : (kpis.inTransitGateway || 0).toLocaleString('en-IN')}</div>
          <div className="billing-ledger__kpi-label">{t('billing.kpi.pending', 'Pending Clearance')}</div>
        </div>
      </div>

      {/* Toolbar: Search & Filter Pills */}
      <div className="billing-ledger__toolbar d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div className="billing-ledger__search-wrap position-relative">
          <CFormInput
            type="text"
            className="ps-4"
            placeholder={t('billing.grid.searchPlaceholder', 'Search invoice, unit, or resident...')}
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="billing-ledger__filter-pills d-flex gap-2">
          {['ALL', 'PAID', 'UNPAID', 'VERIFICATION_PENDING'].map((s) => (
            <CButton
              key={s}
              size="sm"
              color={statusFilter === s ? 'primary' : 'secondary'}
              variant={statusFilter === s ? 'solid' : 'ghost'}
              onClick={() => handleStatusFilterChange(s)}
            >
              {s === 'ALL' ? 'All' : s === 'VERIFICATION_PENDING' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()}
            </CButton>
          ))}
        </div>
      </div>

      {/* Database Paginated Table */}
      <div className="billing-ledger__table-wrap position-relative">
        {loading && (
          <div className="position-absolute top-0 bottom-0 start-0 end-0 bg-white bg-opacity-75 d-flex align-items-center justify-content-center z-3">
            <CSpinner color="primary" />
          </div>
        )}
        <table className="billing-ledger__table table align-middle">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Unit</th>
              <th>Resident</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  <CIcon icon={cilInbox} size="xl" className="mb-2 opacity-50" />
                  <p className="mb-0">{t('billing.grid.empty', 'No invoices match your search parameters.')}</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
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

      {/* Database Pagination Footer */}
      <div className="d-flex justify-content-between align-items-center mt-3 text-muted small">
        <span>
          Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total records)
        </span>
        <div className="d-flex gap-2">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            disabled={pagination.currentPage <= 1 || loading}
            onClick={() => onPageChange && onPageChange(pagination.currentPage - 1, { search, status: statusFilter })}
          >
            Previous
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            disabled={pagination.currentPage >= pagination.totalPages || loading}
            onClick={() => onPageChange && onPageChange(pagination.currentPage + 1, { search, status: statusFilter })}
          >
            Next
          </CButton>
        </div>
      </div>

      {/* Confirm Paid Modal */}
      <CModal visible={!!confirmPaidId} onClose={() => setConfirmPaidId(null)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Confirm Payment Clearance</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to mark this invoice as <strong>PAID</strong>?
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setConfirmPaidId(null)}>Cancel</CButton>
          <CButton color="primary" onClick={handleConfirmMarkPaid}>Confirm Clear</CButton>
        </CModalFooter>
      </CModal>

      {/* Offline Settle Modal */}
      <CModal visible={!!settleInvoiceId} onClose={() => setSettleInvoiceId(null)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Record Offline Settlement</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={(e) => { e.preventDefault(); handleConfirmOfflineSettle(); }}>
          <CModalBody>
            <CFormLabel className="fw-medium">Transaction ID / Reference Number *</CFormLabel>
            <CFormInput
              type="text"
              placeholder="e.g. UTR-98241 or CHQ-12345"
              value={settleRef}
              onChange={(e) => setSettleRef(e.target.value)}
              required
            />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setSettleInvoiceId(null)}>Cancel</CButton>
            <CButton color="primary" type="submit" disabled={!settleRef.trim()}>Save Settlement</CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </div>
  );
});

BillingLedgerGrid.propTypes = {
  kpis: PropTypes.object,
  invoices: PropTypes.array,
  pagination: PropTypes.shape({
    currentPage: PropTypes.number,
    totalPages: PropTypes.number,
    totalRecords: PropTypes.number,
    limit: PropTypes.number,
  }),
  loading: PropTypes.bool,
  onPageChange: PropTypes.func,
  onSettleOffline: PropTypes.func,
  onApproveOffline: PropTypes.func,
};

BillingLedgerGrid.displayName = 'BillingLedgerGrid';
export default BillingLedgerGrid;
