import React from 'react';
import { useDashboard } from '../../hooks/useDashboard.js';

const RevenueChart = () => {
  const { revenue, loading } = useDashboard();
  
  if (loading) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '8px' }}>Revenue Trend</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading trends...</div>
      </div>
    );
  }

  const revenueTrend = revenue || [];

  // Determine max value to calculate percentage heights
  const maxRevenue = Math.max(...revenueTrend.map(t => t.revenue), 1); // Avoid division by zero

  const formatMonth = (monthStr) => {
    // monthStr is like "2026-07"
    if (!monthStr) return '';
    const date = new Date(monthStr + '-01');
    return date.toLocaleString('default', { month: 'short' });
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '8px' }}>Revenue Trend</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }} className="fw-medium small">Performance over the last 6 months</p>
      
      {revenueTrend.length > 0 ? (
        <div className="bar-chart">
          {revenueTrend.map((data, index) => {
            const height = Math.min((data.revenue / maxRevenue) * 100, 100);
            return (
              <div className="bar-col" key={index} title={`₹${data.revenue}`}>
                <div className="bar-primary" style={{ height: `${height}%` }}></div>
                <span className="bar-label">{formatMonth(data.month)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No trend data available for the selected period.
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }} className="fw-semibold small">
          <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'var(--primary)' }}></span> Revenue
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
