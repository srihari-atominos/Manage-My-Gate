import React, { useEffect, useState } from 'react'
import { useBilling } from '../hooks/useBilling'
import FinanceRunwayCard from './FinanceRunwayCard.jsx'
import FinanceRunwaySimulatorModal from './FinanceRunwaySimulatorModal.jsx'
import InflowBreakdownCard from './InflowBreakdownCard.jsx'

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
  const { communityFinance, loadCommunityFinance } = useBilling()
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  useEffect(() => {
    loadCommunityFinance()
  }, [loadCommunityFinance])

  const { data, loading, error } = communityFinance || {}

  if (loading && !data) {
    return (
      <div className="card mt-4">
        <div className="card-body text-muted">Loading community finance overview…</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="alert alert-warning mt-4 mb-0" role="alert">
        {error}
      </div>
    )
  }

  const o = data?.overview || {}
  const runway = data?.runway || o?.runway || null

  return (
    <section className="mt-4" aria-label="Community finance overview">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h5 className="mb-1">Community Finance Overview</h5>
          <p className="text-muted small mb-0">
            Recorded financial movement and operating balance projection.
          </p>
        </div>
      </div>

      {/* ── 1. Operating Runway & Balance Coverage Card ── */}
      <FinanceRunwayCard
        runway={runway}
        overview={o}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* ── 2. Interactive Runtime Simulator Modal ── */}
      <FinanceRunwaySimulatorModal
        visible={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        initialRunway={runway}
        overview={o}
      />

      {/* ── 3. Operational Financial Metrics Grid ── */}
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

      {/* ── 4. Inflows & Revenue Streams Section ── */}
      <InflowBreakdownCard
        incomeBreakdown={data?.breakdowns?.income || []}
        receipts={data?.receipts || []}
        grossTotal={o.grossSuccessfulCollections || 0}
      />
    </section>
  )
}
