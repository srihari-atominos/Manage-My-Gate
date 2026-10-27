import React from 'react'
import PropTypes from 'prop-types'
import Card from './Card'

const KpiCard = ({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  icon,
  className = '',
  loading = false,
}) => {
  const isUp = trendDirection === 'up'
  const isDown = trendDirection === 'down'

  const trendBadgeBg = isUp
    ? 'rgba(29, 107, 58, 0.1)'
    : isDown
      ? 'rgba(180, 35, 24, 0.1)'
      : 'rgba(91, 102, 128, 0.08)'

  const trendColor = isUp
    ? 'var(--nahom-success, #1d6b3a)'
    : isDown
      ? 'var(--nahom-error, #b42318)'
      : 'var(--nahom-text-muted, #5b6680)'

  return (
    <Card className={`p-4 d-flex flex-column justify-content-between h-100 ${className}`}>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span
            className="text-uppercase fw-bold"
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.06em',
              color: 'var(--nahom-text-muted, #5b6680)',
            }}
          >
            {label}
          </span>
          {icon && (
            <div
              className="rounded-3 p-2 d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: 'rgba(194, 65, 12, 0.08)',
                color: 'var(--nahom-primary, #c2410c)',
              }}
            >
              {icon}
            </div>
          )}
        </div>

        {loading ? (
          <div className="dashboard-skeleton dashboard-skeleton--value my-2" />
        ) : (
          <div
            className="fw-extrabold my-1"
            style={{
              fontSize: '1.75rem',
              letterSpacing: '-0.03em',
              color: 'var(--nahom-text, #1e2a4a)',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
        )}
      </div>

      {trend && (
        <div className="d-flex align-items-center gap-1.5 mt-3 pt-2 border-top border-light-subtle">
          <span
            className="badge rounded-pill fw-semibold px-2 py-1 d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: trendBadgeBg,
              color: trendColor,
              fontSize: '0.75rem',
            }}
          >
            {isUp && <span>↑</span>}
            {isDown && <span>↓</span>}
            <span>{trend}</span>
          </span>
        </div>
      )}
    </Card>
  )
}

KpiCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  icon: PropTypes.node,
  className: PropTypes.string,
  loading: PropTypes.bool,
}

export default KpiCard
