import React from 'react';

const RecentActivityWidget = () => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Live Activity Log</h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
          <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 8px var(--success)' }}></span> 
          LIVE
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fa-solid fa-qrcode"></i>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>Justin M. Checked In</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Grand Banquet Hall • Just now</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fa-brands fa-stripe"></i>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>Payment Success (₹1500)</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Pool A Booking • 5m ago</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fa-solid fa-xmark"></i>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>Booking Cancelled</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Tennis Court (#BK-8877) • 12m ago</div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default RecentActivityWidget;
