import React from 'react';
import { useDashboard } from '../../hooks/useDashboard.js';

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return Math.floor(seconds) + "s ago";
};

const RecentActivityWidget = () => {
  const { recentActivity, loading } = useDashboard();

  if (loading) {
    return (
      <div className="card">
        <h3 style={{ margin: 0, marginBottom: '24px' }}>Live Activity Log</h3>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const getIconAndColor = (item) => {
    if (item.type === 'payment') {
      if (item.status === 'success') return { icon: 'fa-solid fa-indian-rupee-sign', bg: 'var(--success-bg)', color: 'var(--success)' };
      if (item.status === 'failed') return { icon: 'fa-solid fa-triangle-exclamation', bg: 'var(--danger-bg)', color: 'var(--danger)' };
      return { icon: 'fa-solid fa-clock-rotate-left', bg: 'var(--warning-bg)', color: 'var(--warning)' };
    }
    // Booking
    if (item.status === 'Checked-In') return { icon: 'fa-solid fa-qrcode', bg: 'var(--success-bg)', color: 'var(--success)' };
    if (item.status === 'Cancelled') return { icon: 'fa-solid fa-xmark', bg: 'var(--danger-bg)', color: 'var(--danger)' };
    return { icon: 'fa-solid fa-calendar-check', bg: 'var(--info-bg)', color: 'var(--info)' };
  };

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
        {recentActivity && recentActivity.length > 0 ? (
          recentActivity.map((item, index) => {
            const { icon, bg, color } = getIconAndColor(item);
            return (
              <div key={item.id || index} style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: index !== recentActivity.length - 1 ? '20px' : '8px', borderBottom: index !== recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  <i className={icon}></i>
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    {item.subtitle} • {timeAgo(item.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity</div>
        )}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
