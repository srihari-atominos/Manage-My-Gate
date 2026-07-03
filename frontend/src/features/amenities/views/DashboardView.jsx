import React from 'react';
import KpiWidget from '../components/dashboard/KpiWidget.jsx';
import RevenueChart from '../components/dashboard/RevenueChart.jsx';
import RecentActivityWidget from '../components/dashboard/RecentActivityWidget.jsx';
import '../styles/_amenities.scss';

const DashboardView = () => {
  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div className="view active" id="view-admin-dashboard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Management Overview</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Real-time metrics across all community facilities.</p>
            </div>
            <button className="btn btn-primary">
              <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i> Export Report
            </button>
          </div>
          
          <KpiWidget />

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <RevenueChart />
            </div>
            <RecentActivityWidget />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
