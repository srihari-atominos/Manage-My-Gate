import React from 'react';
import { useDashboard } from '../../hooks/useDashboard.js';

const KpiWidget = () => {
  const { kpis } = useDashboard();

  return (
    <div className="dashboard-grid">
      <div className="card kpi-card card-hover">
        <div className="kpi-title"><i className="fa-solid fa-building-circle-check" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Confirmed Check-ins</div>
        <div className="kpi-value">{kpis?.checkIns || 128}</div>
        <div className="kpi-trend text-success"><i className="fa-solid fa-arrow-trend-up" style={{ marginRight: '6px' }}></i> +14% vs yesterday</div>
      </div>
      <div className="card kpi-card card-hover">
        <div className="kpi-title"><i className="fa-solid fa-indian-rupee-sign" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Daily Revenue</div>
        <div className="kpi-value">₹{kpis?.revenue?.toLocaleString() || '24,500'}</div>
        <div className="kpi-trend text-success"><i className="fa-solid fa-arrow-trend-up" style={{ marginRight: '6px' }}></i> +5% vs yesterday</div>
      </div>
      <div className="card kpi-card card-hover">
        <div className="kpi-title"><i className="fa-solid fa-users" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Avg Occupancy</div>
        <div className="kpi-value">{kpis?.occupancy || 72}%</div>
        <div className="kpi-trend" style={{ color: 'var(--text-muted)', background: 'var(--surface-bg)' }}>Steady</div>
      </div>
      <div className="card kpi-card card-hover" style={{ borderBottom: '4px solid var(--warning)' }}>
        <div className="kpi-title"><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', marginRight: '6px' }}></i> Active Maintenance</div>
        <div className="kpi-value">{kpis?.activeMaintenance || 2}</div>
        <div className="kpi-trend text-warning">{kpis?.maintenanceTasks || 'Tennis Court, Pool Filter'}</div>
      </div>
    </div>
  );
};

export default KpiWidget;
