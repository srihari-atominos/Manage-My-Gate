import React, { useState } from 'react';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import SecurityLogDetailsDrawer from '../components/admin/SecurityLogDetailsDrawer.jsx';
import useSecurityLogs from '../hooks/useSecurityLogs.js';
import '../styles/_amenities.scss';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SCAN_TYPE_META = {
  Entry:                 { color: 'success', icon: 'fa-door-open',        label: 'Entry Granted'       },
  Exit:                  { color: 'info',    icon: 'fa-door-closed',       label: 'Exit Recorded'       },
  Denied:                { color: 'danger',  icon: 'fa-hand',              label: 'Access Denied'       },
  'Manual Verification': { color: 'warning', icon: 'fa-user-check',        label: 'Manual Verification' },
  Refund:                { color: 'purple',  icon: 'fa-rotate-left',       label: 'Refund'              },
  'QR Expired':          { color: 'orange',  icon: 'fa-qrcode',            label: 'QR Expired'          },
  'Booking Cancelled':   { color: 'secondary', icon: 'fa-ban',             label: 'Cancelled'           },
};

const ScanTypeBadge = ({ scanType, status }) => {
  const meta = SCAN_TYPE_META[scanType] || { color: 'secondary', icon: 'fa-circle', label: scanType };
  const color = status === 'Denied' ? 'danger' : meta.color;
  return (
    <span
      className={`badge rounded-pill px-3 py-2 small fw-semibold`}
      style={{ background: `var(--${color === 'purple' ? 'bs-purple' : color === 'orange' ? 'bs-orange' : ''})`,
               backgroundColor: color === 'purple' ? '#7c3aed22' : color === 'orange' ? '#ea580c22' : undefined,
               color: color === 'purple' ? '#7c3aed' : color === 'orange' ? '#ea580c' : undefined
      }}
    >
      {!['purple', 'orange'].includes(color) && (
        <span className={`badge rounded-pill px-3 py-2 small fw-semibold bg-${color} bg-opacity-10 text-${color}`}>
          <i className={`fa-solid ${meta.icon} me-1`}></i>{meta.label}
        </span>
      )}
    </span>
  );
};

// Simplified badge that always works
const StatusBadge = ({ scanType, status }) => {
  const meta = SCAN_TYPE_META[scanType] || { icon: 'fa-circle', label: scanType };
  if (status === 'Denied') {
    return <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-2 small fw-semibold"><i className="fa-solid fa-hand me-1"></i>Access Denied</span>;
  }
  const colors = { Entry: 'success', Exit: 'info', 'Manual Verification': 'warning', Refund: 'primary', 'QR Expired': 'secondary', 'Booking Cancelled': 'secondary' };
  const c = colors[scanType] || 'secondary';
  return <span className={`badge bg-${c} bg-opacity-10 text-${c} rounded-pill px-3 py-2 small fw-semibold`}><i className={`fa-solid ${meta.icon} me-1`}></i>{meta.label}</span>;
};

// ── Dashboard Stat Card ──────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, gradient }) => (
  <div className="col-6 col-lg-3">
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <div className="card-body d-flex align-items-center gap-3 p-4">
        <div className="rounded-3 p-3 flex-shrink-0" style={{ background: gradient }}>
          <i className={`fa-solid ${icon} fa-xl text-white`}></i>
        </div>
        <div>
          <h3 className="fs-2 fw-bold mb-0" >{value}</h3>
          <p className="text-muted small mb-0 fw-semibold">{label}</p>
        </div>
      </div>
    </div>
  </div>
);

// ── Main View ────────────────────────────────────────────────────────────────

const SecurityLogsView = () => {
  const {
    logs, dashboard, pagination, filters, loading,
    handleFilterChange, handlePageChange, clearFilters, refresh
  } = useSecurityLogs();

  const [selectedLog, setSelectedLog] = useState(null);

  const handleExport = (format) => {
    if (format === 'csv') {
      const headers = ['Log ID', 'Resident', 'Amenity', 'Guard', 'Scan Type', 'Status', 'Reason', 'Date', 'Time'];
      const rows = logs.map(log => [
        log._id,
        log.residentName || 'Unknown',
        log.amenityName || '-',
        log.guardName || 'System',
        log.scanType,
        log.status,
        `"${(log.reason || '').replace(/"/g, "'")}"`,
        new Date(log.scanTime).toLocaleDateString(),
        new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(`${format.toUpperCase()} export requires a server-side render. Use CSV for now.`);
    }
  };

  return (
    <div className="amenities-module-wrapper amenity-os-theme" style={{ minHeight: '100vh', background: 'var(--surface-bg)' }}>
      <AmenitiesTopNav />

      <div className="view-container px-4 pb-5">
        {/* ── Header ── */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="fs-2 fw-bold mb-1" style={{ color: 'var(--text-main)' }}>
              <i className="fa-solid fa-shield-halved me-3" style={{ color: 'var(--primary)' }}></i>
              Security Logs & Audit Trail
            </h1>
            <p className="text-muted mb-0">Real-time monitoring of all amenity access events, entries, and denied attempts.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-light fw-semibold" onClick={refresh} disabled={loading} style={{ borderRadius: '10px' }}>
              <i className={`fa-solid fa-rotate-right me-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
            </button>
            <button className="btn btn-outline-secondary fw-semibold" onClick={() => handleExport('csv')} style={{ borderRadius: '10px' }}>
              <i className="fa-solid fa-file-csv me-2"></i>Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="row g-3 mb-4">
          <StatCard label="Today's Entries"    value={dashboard.entries}             icon="fa-door-open"    gradient="linear-gradient(135deg,#0084FF,#00b4d8)" />
          <StatCard label="Today's Exits"      value={dashboard.exits}               icon="fa-door-closed"  gradient="linear-gradient(135deg,#10B981,#059669)" />
          <StatCard label="Denied Access"      value={dashboard.denied}              icon="fa-hand"         gradient="linear-gradient(135deg,#EF4444,#b91c1c)" />
          <StatCard label="Manual Verifications" value={dashboard.manualVerifications} icon="fa-user-check"   gradient="linear-gradient(135deg,#F59E0B,#d97706)" />
          <StatCard label="Cancelled Bookings" value={dashboard.cancelled}           icon="fa-ban"          gradient="linear-gradient(135deg,#6b7280,#4b5563)" />
          <StatCard label="Refunds"            value={dashboard.refunds}             icon="fa-rotate-left"  gradient="linear-gradient(135deg,#7c3aed,#5b21b6)" />
          <StatCard label="QR Expired"         value={dashboard.qrExpired}           icon="fa-qrcode"       gradient="linear-gradient(135deg,#ea580c,#c2410c)" />
          <StatCard label="Active Visitors"    value={dashboard.entries - dashboard.exits < 0 ? 0 : dashboard.entries - dashboard.exits} icon="fa-users" gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" />
        </div>

        {/* ── Filters & Table Card ── */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
          {/* Filter Bar */}
          <div className="card-header bg-white border-bottom px-4 py-3" style={{ borderRadius: '16px 16px 0 0' }}>
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-3">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="fa-solid fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0 ps-0"
                    placeholder="Search resident, amenity, guard..."
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    style={{ borderRadius: '0 8px 8px 0' }}
                  />
                </div>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="form-select"
                  value={filters.scanType || ''}
                  onChange={(e) => handleFilterChange('scanType', e.target.value)}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="">All Types</option>
                  <option value="Entry">Entry</option>
                  <option value="Exit">Exit</option>
                  <option value="Denied">Denied</option>
                  <option value="Manual Verification">Manual Verification</option>
                  <option value="Refund">Refund</option>
                  <option value="QR Expired">QR Expired</option>
                  <option value="Booking Cancelled">Booking Cancelled</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="form-select"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Denied">Denied</option>
                </select>
              </div>

              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={filters.dateRange || 'today'}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <button
                  className="btn btn-light fw-semibold w-100 text-muted"
                  onClick={clearFilters}
                  style={{ borderRadius: '8px' }}
                >
                  <i className="fa-solid fa-eraser me-2"></i>Clear
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr className="small text-muted small fw-semibold" style={{ textTransform: 'uppercase' }}>
                    <th className="ps-4 py-3">RESIDENT</th>
                    <th className="py-3">AMENITY</th>
                    <th className="py-3">GUARD</th>
                    <th className="py-3">SCAN TYPE / STATUS</th>
                    <th className="py-3">REASON</th>
                    <th className="py-3">DATE & TIME</th>
                    <th className="pe-4 py-3 text-end">DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-3 mb-0">Loading security logs...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <i className="fa-solid fa-shield-halved fa-3x mb-3" style={{ color: '#e2e8f0' }}></i>
                        <h5 className="text-muted">No security logs found</h5>
                        <p className="text-muted small">Try changing your filters or date range.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => setSelectedLog(log)}
                        className="border-bottom"
                      >
                        {/* Resident */}
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center gap-3">
                            {log.residentPhoto ? (
                              <img
                                src={log.residentPhoto}
                                alt={log.residentName}
                                className="rounded-circle flex-shrink-0"
                                style={{ width: '42px', height: '42px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                              />
                            ) : (
                              <div
                                className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center"
                                style={{ width: '42px', height: '42px', background: '#f1f5f9', border: '2px solid #e2e8f0' }}
                              >
                                <i className="fa-solid fa-user text-muted"></i>
                              </div>
                            )}
                            <div>
                              <div className="small fw-semibold" style={{ color: 'var(--text-main)' }}>
                                {log.residentName || 'Unknown Resident'}
                              </div>
                              <div className="small text-muted" >
                                {log.bookingReference || 'No Ref'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Amenity */}
                        <td className="py-3">
                          <span className="small fw-semibold" >
                            {log.amenityName || '—'}
                          </span>
                        </td>

                        {/* Guard */}
                        <td className="py-3">
                          <span className="text-muted small">
                            <i className="fa-solid fa-user-shield me-1"></i>
                            {log.guardName || 'System'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3">
                          <StatusBadge scanType={log.scanType} status={log.status} />
                        </td>

                        {/* Reason */}
                        <td className="py-3" style={{ maxWidth: '220px' }}>
                          <span
                            className="text-muted small d-block text-truncate"
                            title={log.reason || log.remarks || '—'}
                          >
                            {log.reason || log.remarks || '—'}
                          </span>
                        </td>

                        {/* DateTime */}
                        <td className="py-3">
                          <div className="fw-semibold small">{new Date(log.scanTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="small text-muted" >
                            {new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="pe-4 py-3 text-end">
                          <button className="btn btn-sm btn-light rounded-circle shadow-sm">
                            <i className="fa-solid fa-chevron-right text-muted"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="card-footer bg-white border-top d-flex flex-wrap justify-content-between align-items-center p-3 gap-2" style={{ borderRadius: '0 0 16px 16px' }}>
              <div className="text-muted small">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> &mdash; {pagination.total} total records
              </div>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link rounded-start-3" onClick={() => handlePageChange(pagination.page - 1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                </li>
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <li key={p} className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                    </li>
                  );
                })}
                <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                  <button className="page-link rounded-end-3" onClick={() => handlePageChange(pagination.page + 1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Details Drawer */}
      <SecurityLogDetailsDrawer
        show={!!selectedLog}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
      {selectedLog && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default SecurityLogsView;
