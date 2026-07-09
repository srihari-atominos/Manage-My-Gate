import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import '../styles/_complaints.scss';

const ComplaintLayout = () => {
  const { pathname } = useLocation();
  const user = useSelector(state => state.auth.user);

  return (
    <div className="complaints-module">
      {/* TOP HEADER */}
      <header className="top-header">
        <div className="brand">
          <div className="logo"><i className="fa-solid fa-building-user"></i></div>
          <span>Complaints / Maintenance Ticketing</span>
        </div>
        <div className="topbar-actions">
          <div className="icon-btn" style={{ position: 'relative' }}>
            <i className="fa-regular fa-bell"></i>
            <span style={{ position: 'absolute', top: '8px', right: '10px', width: '8px', height: '8px', background: 'var(--critical)', borderRadius: '50%' }}></span>
          </div>
          <div className="avatar">{user?.firstName?.charAt(0) || 'U'}</div>
        </div>
      </header>

      {/* HORIZONTAL NAVIGATION */}
      <nav className="horizontal-nav">
        <NavLink to="/admin/complaints/dashboard" className={({ isActive }) => `nav-item ${isActive || pathname === '/admin/complaints' ? 'active' : ''}`}>
          <i className="fa-solid fa-gauge-high"></i>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/complaints/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-ticket"></i>
          <span>Raise Ticket</span>
        </NavLink>
        <NavLink to="/admin/complaints/my-complaints" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-list-check"></i>
          <span>Track Requests</span>
        </NavLink>
        <NavLink to="/admin/complaints/management" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-table-list"></i>
          <span>Complaint Management</span>
        </NavLink>
        <NavLink to="/admin/complaints/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-users-gear"></i>
          <span>Staff & Vendors</span>
        </NavLink>
        <NavLink to="/admin/complaints/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-file-invoice"></i>
          <span>Reports</span>
        </NavLink>
        <NavLink to="/admin/complaints/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fa-solid fa-gear"></i>
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

export default ComplaintLayout;
