import React, { memo } from 'react'

const money = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(val || 0))

/**
 * FinanceRunwayCard
 *
 * Unified Net Balance & Balance Runway 3D Card.
 * Consolidates Net Balance and Runway into a single space-efficient card with 3D tactile depth,
 * eliminating unnecessary individual cards while maintaining accurate calculations.
 */
const FinanceRunwayCard = memo(({ runway = null, overview = null, onOpenSimulator }) => {
  const remainingBalance = Number(
    runway?.remainingBalance ?? overview?.netSurplusOrDeficit ?? 0,
  )
  const isDeficit = remainingBalance < 0
  const monthlyExpenses = Number(
    runway?.averageMonthlyExpenses ||
      overview?.reconciledExpensePayments ||
      overview?.totalExpensesIncurred ||
      0,
  )
  const isSelfSustaining = runway?.isSelfSustaining ?? (runway && runway.netMonthlyBurn <= 0)
  const runwayMonths = runway?.runwayMonths
  const health = runway?.runwayHealth || (isSelfSustaining ? 'SURPLUS' : 'HEALTHY')
  const netMonthlyBurn = runway?.netMonthlyBurn ?? 0

  const getHealthBadge = () => {
    if (isSelfSustaining) {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill small">
          <i className="fa-solid fa-arrow-trend-up me-1" />
          Self-Sustaining
        </span>
      )
    }
    if (health === 'HEALTHY') {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill small">
          <i className="fa-solid fa-shield-halved me-1" />
          Healthy (≥ 6m)
        </span>
      )
    }
    if (health === 'CAUTION') {
      return (
        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 rounded-pill small">
          <i className="fa-solid fa-triangle-exclamation me-1" />
          Caution (3–6m)
        </span>
      )
    }
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill small">
        <i className="fa-solid fa-circle-exclamation me-1" />
        Critical (&lt; 3m)
      </span>
    )
  }

  return (
    <div className="net-balance-3d-card p-3 p-md-4 mb-4">
      <div className="row g-3 align-items-center">
        {/* ── Left: Net Balance with 3D Icon ── */}
        <div className="col-12 col-md-5 d-flex align-items-center gap-3">
          <div className="net-balance-3d-icon shrink-0">
            <i className={`fa-solid ${isDeficit ? 'fa-arrow-trend-down text-danger' : 'fa-wallet text-primary'} fs-4`} />
          </div>
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold text-uppercase tracking-wider">
                {isDeficit ? 'Net Deficit' : 'Net Balance'}
              </span>
              <span
                className={`badge px-2 py-0.5 rounded-pill small ${
                  isDeficit ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'
                }`}
              >
                {isDeficit ? 'Deficit' : 'Surplus'}
              </span>
            </div>
            <div className={`fs-3 fw-extrabold tracking-tight mt-0.5 ${isDeficit ? 'text-danger' : 'text-dark'}`}>
              {money(remainingBalance)}
            </div>
            <div className="small text-muted text-truncate">
              Collections: {money(overview?.netCollectionsAfterRefunds || 0)} &bull; Expenses: {money(monthlyExpenses)}
            </div>
          </div>
        </div>

        {/* ── Middle: Integrated Runway to Balance ── */}
        <div className="col-12 col-md-4 border-start-md ps-md-4">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="small text-muted fw-semibold text-uppercase">
              <i className="fa-solid fa-scale-balanced text-primary me-1" />
              Months to Balance
            </span>
            {getHealthBadge()}
          </div>
          <div className="d-flex align-items-baseline gap-2">
            <span className="fs-4 fw-bold text-primary">
              {isSelfSustaining
                ? 'Indefinite'
                : runwayMonths !== null && runwayMonths !== undefined
                ? `${runwayMonths} Months`
                : '—'}
            </span>
            <span className="small text-muted">
              {netMonthlyBurn > 0
                ? `(-${money(netMonthlyBurn)}/mo)`
                : `(+${money(Math.abs(netMonthlyBurn))}/mo)`}
            </span>
          </div>
          <div className="small text-muted mt-0.5 text-truncate">
            {runway?.projectedDepletionDate
              ? `Projected through ${runway.projectedDepletionDate}`
              : 'Monthly dues collection covers operational burn'}
          </div>
        </div>

        {/* ── Right: 3D Simulator Action CTA ── */}
        <div className="col-12 col-md-3 text-md-end">
          {onOpenSimulator && (
            <button
              type="button"
              className="btn btn-simulate-3d px-3 py-2 d-inline-flex align-items-center justify-content-center w-100 w-md-auto"
              onClick={onOpenSimulator}
            >
              <i className="fa-solid fa-calculator me-2" />
              Simulate Runway
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

FinanceRunwayCard.displayName = 'FinanceRunwayCard'
export default FinanceRunwayCard
