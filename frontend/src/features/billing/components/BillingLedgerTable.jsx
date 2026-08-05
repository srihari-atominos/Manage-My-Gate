import React, { useState, memo, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react'
import BillingLedgerRow from './BillingLedgerRow.jsx'
import OfflineSettleModal from './OfflineSettleModal.jsx'
import { triggerInvoiceGenerationThunk } from '../store/billingSlice.js'

/**
 * BillingLedgerTable
 *
 * Admin data grid showing community invoicing activity.
 * Status badges, tooltips on VERIFICATION_PENDING, row-level actions.
 */
const BillingLedgerTable = memo(
  ({
    kpis = { grossDemand: 0, totalCollected: 0, inTransitGateway: 0, totalUnpaidArrears: 0 },
    invoices = [],
    pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
    loading = false,
    onPageChange,
    onSettleOffline,
    onApproveOffline,
  }) => {
    const dispatch = useDispatch()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    // Modal states
    const [confirmPaidId, setConfirmPaidId] = useState(null)
    const [settleInvoiceId, setSettleInvoiceId] = useState(null)
    const [settleRef, setSettleRef] = useState('')
    const [settleAmount, setSettleAmount] = useState('')

    // Debounce search query to prevent API request spam on every keystroke
    useEffect(() => {
      const timer = setTimeout(() => {
        if (onPageChange) {
          onPageChange(1, { search, status: statusFilter })
        }
      }, 300)

      return () => clearTimeout(timer)
    }, [search, statusFilter, onPageChange])

    const handleMarkPaid = useCallback((invoiceId) => {
      setConfirmPaidId(invoiceId)
    }, [])

    const handleConfirmMarkPaid = async () => {
      if (!confirmPaidId) return
      try {
        const res = await onApproveOffline(confirmPaidId)
        if (res && typeof res.unwrap === 'function') {
          await res.unwrap()
        }
        toast.success('Invoice marked as paid successfully.')
      } catch (err) {
        toast.error('Failed to update invoice: ' + (err?.message || err || 'Unknown error'))
      } finally {
        setConfirmPaidId(null)
      }
    }

    const handleOfflineSettle = useCallback(
      (invoiceId) => {
        setSettleInvoiceId(invoiceId)
        setSettleRef('')
        const inv = invoices.find((i) => i._id === invoiceId)
        if (inv) {
          setSettleAmount(inv.outstandingAmount ?? inv.amount ?? inv.totalDue ?? '')
        } else {
          setSettleAmount('')
        }
      },
      [invoices],
    )

    const handleConfirmOfflineSettle = async () => {
      if (!settleInvoiceId || !settleRef.trim() || !settleAmount || settleAmount <= 0) return
      try {
        const res = await onSettleOffline(settleInvoiceId, {
          offlineReference: settleRef,
          offlineAmount: Number(settleAmount),
          paymentMethod: 'CHEQUE',
        })
        if (res && typeof res.unwrap === 'function') {
          await res.unwrap()
        }
        toast.success('Offline payment verified and recorded successfully.')
      } catch (err) {
        toast.error('Failed to settle invoice: ' + (err?.message || err || 'Unknown error'))
      } finally {
        setSettleInvoiceId(null)
        setSettleRef('')
        setSettleAmount('')
      }
    }

    const handleSearchChange = (e) => {
      setSearch(e.target.value)
    }

    const handleStatusFilterChange = (status) => {
      setStatusFilter(status)
    }

    return (
      <div className="billing-ledger">
        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <div className="billing-ledger__kpi-strip">
          <div className="billing-ledger__kpi-card">
            <i className="fa-solid fa-file-invoice billing-ledger__kpi-icon" />
            <div>
              <div className="billing-ledger__kpi-value">
                {loading ? '…' : kpis.grossDemandCount || 0}
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
              <div className="billing-ledger__kpi-value">
                {loading ? '…' : kpis.inTransitGateway}
              </div>
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
            {['ALL', 'PAID', 'UNPAID', 'VERIFICATION_PENDING'].map((s) => (
              <button
                key={s}
                type="button"
                className={`billing-ledger__filter-pill${statusFilter === s ? ' billing-ledger__filter-pill--active' : ''}`}
                onClick={() => handleStatusFilterChange(s)}
              >
                {s === 'ALL'
                  ? 'All'
                  : s === 'VERIFICATION_PENDING'
                    ? 'Pending'
                    : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="billing-ledger__table-wrap position-relative">
          {loading && (
            <div className="position-absolute top-0 bottom-0 start-0 end-0 bg-white-75 d-flex align-items-center justify-content-center z-3">
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
                  <td colSpan={7} className="billing-ledger__empty text-center p-4">
                    <i className="fa-solid fa-inbox text-muted opacity-25 fs-2" />
                    <p className="mt-2 mb-0 text-muted">No invoices match your search.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <BillingLedgerRow
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
        <div className="table-pagination-footer d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords}{' '}
            total records)
          </span>
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 extra-small"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() =>
                onPageChange &&
                onPageChange(pagination.currentPage - 1, { search, status: statusFilter })
              }
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 extra-small"
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() =>
                onPageChange &&
                onPageChange(pagination.currentPage + 1, { search, status: statusFilter })
              }
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
            Are you sure you want to mark this invoice as <strong>PAID</strong>? This will clear the
            outstanding balance.
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
        <OfflineSettleModal
          visible={!!settleInvoiceId}
          onClose={() => {
            setSettleInvoiceId(null)
            setSettleRef('')
            setSettleAmount('')
          }}
          settleRef={settleRef}
          setSettleRef={setSettleRef}
          settleAmount={settleAmount}
          setSettleAmount={setSettleAmount}
          maxAmount={invoices.find((inv) => inv._id === settleInvoiceId)?.amount || 0}
          onSubmit={handleConfirmOfflineSettle}
        />
      </div>
    )
  },
)

BillingLedgerTable.displayName = 'BillingLedgerTable'

BillingLedgerTable.propTypes = {
  kpis: PropTypes.object,
  invoices: PropTypes.array,
  pagination: PropTypes.object,
  loading: PropTypes.bool,
  onPageChange: PropTypes.func,
  onSettleOffline: PropTypes.func,
  onApproveOffline: PropTypes.func,
}

export default BillingLedgerTable
