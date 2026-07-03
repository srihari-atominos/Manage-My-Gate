import React from 'react';

const RevenueChart = () => {
  // Using static dummy data from HTML specification since the API isn't fully returning this array yet
  const chartData = [
    { label: 'Mon', rev: 40, occ: 30 },
    { label: 'Tue', rev: 60, occ: 45 },
    { label: 'Wed', rev: 45, occ: 35 },
    { label: 'Thu', rev: 80, occ: 60 },
    { label: 'Fri', rev: 95, occ: 75 },
    { label: 'Sat', rev: 100, occ: 85 },
    { label: 'Sun', rev: 85, occ: 65 },
  ];

  return (
    <div className="card">
      <h3 style={{ marginBottom: '8px' }}>Revenue & Occupancy Trend</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', fontWeight: '500' }}>Performance over the last 7 days</p>
      
      <div className="bar-chart">
        {chartData.map((data, index) => (
          <div className="bar-col" key={index}>
            <div className="bar-primary" style={{ height: `${data.rev}%` }}></div>
            <div className="bar-secondary" style={{ height: `${data.occ}%` }}></div>
            <span className="bar-label">{data.label}</span>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'var(--primary)' }}></span> Revenue
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'var(--info)', opacity: 0.5 }}></span> Occupancy
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
