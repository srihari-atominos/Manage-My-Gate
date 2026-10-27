import React from 'react'

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export default function InflowBreakdownCard({ incomeBreakdown = [], receipts = [], grossTotal = 0 }) {
  const hasIncome = Array.isArray(incomeBreakdown) && incomeBreakdown.length > 0
  const recentReceipts = Array.isArray(receipts) ? receipts.slice(0, 5) : []

  return (
    <div className="card shadow-sm mt-4 border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
            style={{ width: '38px', height: '38px' }}
          >
            <i className="bi bi-arrow-down-left-circle-fill fs-5" aria-hidden="true" />
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Inflow Streams & Revenue Sources</h6>
            <p className="text-muted small mb-0">
              Verified resident maintenance assessments, facility reservations & booking fees.
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill fw-bold">
            Gross Collections: {money(grossTotal)}
          </span>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Stream Breakdown Bars */}
        {hasIncome ? (
          <div className="row g-4 mb-4">
            {incomeBreakdown.map((item, idx) => {
              const isRefund = item.amount < 0
              const barClass = isRefund
                ? 'bg-danger'
                : item.domain === 'AMENITY'
                ? 'bg-info'
                : 'bg-success'

              return (
                <div key={idx} className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold text-secondary small">{item.source}</span>
                        <span
                          className={`badge ${
                            isRefund
                              ? 'bg-danger-subtle text-danger'
                              : item.domain === 'AMENITY'
                              ? 'bg-info-subtle text-info-emphasis'
                              : 'bg-success-subtle text-success'
                          } rounded-pill`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                      <div className={`fs-5 fw-bold ${isRefund ? 'text-danger' : 'text-dark'}`}>
                        {money(item.amount)}
                      </div>
                    </div>
                    <div className="progress mt-3" style={{ height: '6px' }}>
                      <div
                        className={`progress-bar ${barClass}`}
                        role="progressbar"
                        style={{ width: `${Math.min(Math.abs(item.percentage), 100)}%` }}
                        aria-valuenow={Math.abs(item.percentage)}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted small mb-4">No income breakdown recorded for the selected period.</p>
        )}

        {/* Recent Inflow Transactions Table */}
        {recentReceipts.length > 0 && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-uppercase text-muted fw-semibold small">
                Recent Inflow Receipts ({receipts.length} Total)
              </span>
            </div>
            <div className="table-responsive rounded-3 border">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th scope="col" className="ps-3">Receipt / Ref</th>
                    <th scope="col">Payment Method</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="text-end">Amount</th>
                    <th scope="col" className="text-center pe-3">Status</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {recentReceipts.map((rcpt, i) => {
                    const isRefund = rcpt.type === 'Refund' || rcpt.amount < 0
                    return (
                      <tr key={rcpt.paymentId || i}>
                        <td className="ps-3 fw-semibold text-dark">
                          <div>{rcpt.receiptNumber || 'Official Receipt Pending'}</div>
                          {rcpt.paymentReference && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {rcpt.paymentReference}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">
                            {rcpt.paymentMethod || 'ONLINE'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isRefund
                                ? 'bg-danger-subtle text-danger'
                                : 'bg-primary-subtle text-primary'
                            } rounded-pill`}
                          >
                            {isRefund ? 'Refund' : 'Collection'}
                          </span>
                        </td>
                        <td
                          className={`text-end fw-bold ${
                            isRefund ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {isRefund ? '-' : '+'}
                          {money(Math.abs(rcpt.amount))}
                        </td>
                        <td className="text-center pe-3">
                          <span className="badge bg-success-subtle text-success rounded-pill px-2 py-1">
                            {rcpt.status?.toUpperCase() || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
