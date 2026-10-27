import React, { memo } from 'react'

const money = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(val || 0))

/**
 * FinanceRunwayTrajectoryChart
 *
 * Visual milestone progression showing projected balance depletion or accumulation
 * at 1, 3, 6, 12, and 24 month horizons.
 */
const FinanceRunwayTrajectoryChart = memo(({ milestones = [], startingBalance = 0 }) => {
  if (!milestones || milestones.length === 0) return null

  const maxVal = Math.max(
    startingBalance,
    ...milestones.map((m) => Math.max(0, m.projectedBalance)),
    1,
  )

  return (
    <div className="runway-trajectory-chart mt-3 p-3 bg-light rounded-3 border">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small fw-bold text-uppercase text-muted">
          <i className="fa-solid fa-chart-line me-1" />
          Projected Balance Trajectory
        </span>
        <span className="small text-muted">Starting: {money(startingBalance)}</span>
      </div>

      <div className="row g-2">
        {milestones.map((m) => {
          const isNegative = m.projectedBalance <= 0
          const pct = Math.min(100, Math.max(0, (m.projectedBalance / maxVal) * 100))
          const barClass = isNegative ? 'bg-danger' : pct < 25 ? 'bg-warning' : 'bg-primary'

          return (
            <div key={m.months} className="col">
              <div className="text-center p-2 rounded bg-white border h-100 shadow-xs">
                <div className="small fw-semibold text-secondary">{m.label}</div>
                <div
                  className={`fw-bold small my-1 ${
                    isNegative ? 'text-danger' : 'text-dark'
                  }`}
                >
                  {isNegative ? 'Exhausted' : money(m.projectedBalance)}
                </div>
                <div
                  className="progress"
                  style={{ height: '6px' }}
                  aria-label={`${m.label} trajectory`}
                >
                  <div
                    className={`progress-bar ${barClass}`}
                    role="progressbar"
                    style={{ width: `${isNegative ? 0 : pct}%` }}
                    aria-valuenow={isNegative ? 0 : pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

FinanceRunwayTrajectoryChart.displayName = 'FinanceRunwayTrajectoryChart'
export default FinanceRunwayTrajectoryChart
