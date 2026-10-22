import React, { useEffect, useState } from 'react'
import apiClient from '../../../services/apiClient.js'
const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
const Metric = ({ label, value, note }) => (
  <div className="card shadow-sm h-100">
    <div className="card-body">
      <div className="text-muted small text-uppercase fw-semibold">{label}</div>
      <div className="fs-5 fw-bold mt-1">{money(value)}</div>
      {note && <div className="small text-muted mt-1">{note}</div>}
    </div>
  </div>
)
export default function CommunityFinancePanel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    apiClient
      .get('/community-finance/dashboard')
      .then((r) => active && setData(r?.data?.data || r?.data))
      .catch(
        (err) =>
          active &&
          setError(
            err?.response?.data?.message ||
              err.message ||
              'Unable to load community finance dashboard.',
          ),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])
  if (loading)
    return (
      <div className="card mt-4">
        <div className="card-body text-muted">Loading community finance overview…</div>
      </div>
    )
  if (error)
    return (
      <div className="alert alert-warning mt-4 mb-0" role="alert">
        {error}
      </div>
    )
  const o = data?.overview || {}
  return (
    <section className="mt-4" aria-label="Community finance overview">
      <h5>Community Finance Overview</h5>
      <p className="text-muted small">
        Recorded financial movement only — not an actual bank balance.
      </p>
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Current-period charges" value={o.currentPeriodCharges} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric
            label="Outstanding dues"
            value={o.outstandingDues}
            note={
              o.outstandingDuesAllocationStatus === 'CARRY_FORWARD_COMPONENT_ALLOCATION_UNAVAILABLE'
                ? 'Carry-forward component allocation unavailable.'
                : null
            }
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Gross successful collections" value={o.grossSuccessfulCollections} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Completed refunds" value={o.completedRefunds} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Net collections after refunds" value={o.netCollectionsAfterRefunds} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Expenses incurred" value={o.totalExpensesIncurred} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Recorded expense payments" value={o.recordedExpensePayments} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <Metric label="Reconciled expense payments" value={o.reconciledExpensePayments} />
        </div>
      </div>
    </section>
  )
}
