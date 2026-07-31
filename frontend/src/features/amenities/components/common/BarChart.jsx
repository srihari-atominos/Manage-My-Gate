import React from 'react'

const BarChart = ({ data }) => {
  // data = [{ label: 'Mon', primaryVal: 40, secondaryVal: 30 }, ...]
  return (
    <div className="bar-chart">
      {data.map((item, idx) => (
        <div className="bar-col" key={idx}>
          <div className="bar-primary" style={{ height: `${item.primaryVal}%` }}></div>
          <div className="bar-secondary" style={{ height: `${item.secondaryVal}%` }}></div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default BarChart
