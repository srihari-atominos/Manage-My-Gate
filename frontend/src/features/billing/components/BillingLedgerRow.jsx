import React, { memo } from 'react'
import PropTypes from 'prop-types'

const STATUS_CONFIG = {
  PAID: {
    className: 'billing-status-badge billing-status-badge--paid',
    label: 'Paid',
    icon: 'fa-circle-check',
  },
  UNPAID: {
    className: 'billing-status-badge billing-status-badge--unpaid',
    label: 'Unpaid',
    icon: 'fa-circle-xmark',
  },
  VERIFICATION_PENDING: {
    className: 'billing-status-badge billing-status-badge--pending',
    label: 'Pending',
    icon: 'fa-clock-rotate-left',
  },
}

const StatusBadge = memo(({ status, paymentMethod }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNPAID
  const tooltipText =
    status === 'VERIFICATION_PENDING'
      ? `${paymentMethod || 'Cheque/NEFT'} currently clearing T+3`
      : undefined

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
  )
})
StatusBadge.displayName = 'StatusBadge'

export const BillingLedgerRow = memo(({ invoice, onMarkPaid, onOfflineSettle }) => (
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
        <div className="billing-ledger__avatar">{(invoice.targetUser || 'Unknown').charAt(0)}</div>
        <span className="billing-ledger__user">{invoice.targetUser || 'Unknown'}</span>
      </div>
    </td>
    <td className="billing-ledger__cell billing-ledger__cell--amount">
      <span className="billing-ledger__amount">
        {invoice.currency === 'INR' ? '₹' : invoice.currency}
        {(invoice.amount || 0).toLocaleString('en-IN')}
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
))

BillingLedgerRow.displayName = 'BillingLedgerRow'

BillingLedgerRow.propTypes = {
  invoice: PropTypes.object.isRequired,
  onMarkPaid: PropTypes.func.isRequired,
  onOfflineSettle: PropTypes.func.isRequired,
}

export default BillingLedgerRow
