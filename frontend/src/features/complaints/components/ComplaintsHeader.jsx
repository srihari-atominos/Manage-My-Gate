import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const ComplaintsHeader = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: 'fa-solid fa-gauge-high', path: '/admin/complaints/dashboard' },
    { name: 'Raise Ticket', icon: 'fa-solid fa-ticket', path: '/admin/complaints/create' },
    { name: 'Track Requests', icon: 'fa-solid fa-list-check', path: '/resident/complaints' },
    { name: 'Complaint Management', icon: 'fa-solid fa-table-list', path: '/admin/complaints/list' },

    { name: 'Staff & Vendors', icon: 'fa-solid fa-users-gear', path: '/admin/complaints/calendar' },
    { name: 'Settings', icon: 'fa-solid fa-gear', path: '/admin/complaints/settings' },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '40px',
      padding: '0 32px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-light)',
      marginBottom: '32px',
      boxShadow: 'var(--shadow-sm)',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      {navItems.map((item, idx) => {
        // Fallback for active state if the path doesn't strictly match but we want to show it active
        const isActive = location.pathname.includes(item.path);
        
        return (
          <NavLink
            key={idx}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 0',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              minWidth: '120px',
              transition: 'all 0.2s ease',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <i className={item.icon} style={{ fontSize: '18px' }}></i>
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default ComplaintsHeader;
