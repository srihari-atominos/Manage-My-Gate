import React from 'react'

const KpiCard = ({ title, iconClass, iconColor, value, trendText, trendType }) => {
  // trendType can be 'success', 'warning', or 'neutral'
  let trendClass = ''
  let trendIcon = ''

  if (trendType === 'success') {
    trendClass = 'text-success'
    trendIcon = 'fa-solid fa-arrow-trend-up'
  } else if (trendType === 'warning') {
    trendClass = 'text-warning'
    trendIcon = 'fa-solid fa-arrow-trend-down'
  }

  return (
    <div className="card kpi-card card-hover">
      <div className="kpi-title">
        <i
          className={iconClass}
          style={{ color: iconColor || 'var(--primary)', marginRight: '6px' }}
        ></i>
        {title}
      </div>
      <div className="kpi-value">{value}</div>
      <div
        className={`kpi-trend ${trendClass}`}
        style={
          trendType === 'neutral'
            ? { color: 'var(--text-muted)', background: 'var(--surface-bg)' }
            : {}
        }
      >
        {trendIcon && <i className={trendIcon} style={{ marginRight: '6px' }}></i>}
        {trendText}
      </div>
    </div>
  )
}

export default KpiCard
