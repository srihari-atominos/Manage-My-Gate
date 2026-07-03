import React from 'react';
import { useDashboard } from '../../hooks/useDashboard.js';

const KpiWidget = () => {
  const { kpis, loading } = useDashboard();

  if (loading || !kpis) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading KPIs...</div>;
  }

  const renderSection = (title, items) => (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--body-color)' }}>{title}</h3>
      <div className="dashboard-grid">
        {items.map((item, index) => (
          <div key={index} className="card kpi-card card-hover" style={item.style || {}}>
            <div className="kpi-title">
              <i className={item.icon} style={{ color: item.iconColor || 'var(--primary)', marginRight: '6px' }}></i> 
              {item.label}
            </div>
            <div className="kpi-value">{item.value}</div>
            {item.trend && (
              <div className={`kpi-trend ${item.trendColor || 'text-success'}`}>
                {item.trendIcon && <i className={item.trendIcon} style={{ marginRight: '6px' }}></i>}
                {item.trend}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {renderSection('Management Overview', [
        { label: 'Confirmed Check-ins', value: kpis.checkIns || 0, icon: 'fa-solid fa-building-circle-check', trend: 'Today', trendIcon: 'fa-solid fa-arrow-trend-up' },
        { label: 'Daily Revenue', value: `₹${(kpis.revenue || 0).toLocaleString()}`, icon: 'fa-solid fa-indian-rupee-sign', trend: 'Today', trendIcon: 'fa-solid fa-arrow-trend-up' },
        { label: 'Avg Occupancy', value: `${kpis.occupancy || 0}%`, icon: 'fa-solid fa-users', trend: 'Steady', trendColor: 'text-muted' },
        { label: 'Active Maintenance', value: kpis.activeMaintenance || 0, icon: 'fa-solid fa-triangle-exclamation', iconColor: 'var(--warning)', trend: kpis.maintenanceTasks, trendColor: 'text-warning', style: { borderBottom: '4px solid var(--warning)' } }
      ])}

      {kpis.amenities && renderSection('Amenities', [
        { label: 'Total', value: kpis.amenities.total, icon: 'fa-solid fa-layer-group' },
        { label: 'Active', value: kpis.amenities.active, icon: 'fa-solid fa-check-circle', iconColor: 'var(--success)' },
        { label: 'Inactive', value: kpis.amenities.inactive, icon: 'fa-solid fa-ban', iconColor: 'var(--danger)' },
        { label: 'Maintenance', value: kpis.amenities.maintenance, icon: 'fa-solid fa-wrench', iconColor: 'var(--warning)' },
      ])}

      {kpis.bookings && renderSection('Bookings', [
        { label: 'Today', value: kpis.bookings.today, icon: 'fa-solid fa-calendar-day' },
        { label: 'Upcoming', value: kpis.bookings.upcoming, icon: 'fa-solid fa-calendar-week' },
        { label: 'Confirmed', value: kpis.bookings.confirmed, icon: 'fa-solid fa-check', iconColor: 'var(--success)' },
        { label: 'Pending', value: kpis.bookings.pending, icon: 'fa-solid fa-clock', iconColor: 'var(--warning)' },
        { label: 'Cancelled', value: kpis.bookings.cancelled, icon: 'fa-solid fa-xmark', iconColor: 'var(--danger)' },
        { label: 'Completed', value: kpis.bookings.completed, icon: 'fa-solid fa-flag-checkered', iconColor: 'var(--info)' },
      ])}

      {kpis.payments && renderSection('Payments', [
        { label: 'Today', value: `₹${(kpis.payments.todayRevenue || 0).toLocaleString()}`, icon: 'fa-solid fa-coins' },
        { label: 'Weekly', value: `₹${(kpis.payments.weeklyRevenue || 0).toLocaleString()}`, icon: 'fa-solid fa-wallet' },
        { label: 'Monthly', value: `₹${(kpis.payments.monthlyRevenue || 0).toLocaleString()}`, icon: 'fa-solid fa-sack-dollar' },
        { label: 'Pending', value: kpis.payments.pending, icon: 'fa-solid fa-hourglass-half', iconColor: 'var(--warning)' },
        { label: 'Success', value: kpis.payments.success, icon: 'fa-solid fa-check', iconColor: 'var(--success)' },
        { label: 'Failed', value: kpis.payments.failed, icon: 'fa-solid fa-triangle-exclamation', iconColor: 'var(--danger)' },
        { label: 'Refunded', value: kpis.payments.refunded, icon: 'fa-solid fa-rotate-left', iconColor: 'var(--info)' },
      ])}
    </div>
  );
};

export default KpiWidget;
