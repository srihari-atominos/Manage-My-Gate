import React, { useMemo } from 'react';

import DataTable from '../../../components/common/DataTable.jsx';
import useSecurityLogs from '../hooks/useSecurityLogs.js';
import AmenityStatusBadge from '../components/AmenityStatusBadge.jsx';
import '../styles/_amenities.scss';

const SecurityLogsView = () => {
  const {
    logs,
    pagination,
    loading,
    filters,
    handlePageChange,
    handleFilterChange,
    clearFilters,
    refresh
  } = useSecurityLogs();

  const columns = useMemo(() => [
    { key: 'bookingDate', label: 'Date', render: (row) => new Date(row.bookingDate).toLocaleDateString() },
    { key: 'amenity', label: 'Amenity', render: (row) => <span className="fw-semibold">{row.amenityId?.name || 'N/A'}</span> },
    { key: 'resident', label: 'Resident', render: (row) => row.userId?.name || 'N/A' },
    { key: 'time', label: 'Time', render: (row) => `${row.startTime || '-'} to ${row.endTime || '-'}` },
    { key: 'status', label: 'Status', render: (row) => <AmenityStatusBadge status={row.status} /> },
    { key: 'checkedInBy', label: 'Scanned By', render: (row) => row.checkedInBy?.name ? <span className="small text-muted"><i className="fa-solid fa-user-shield me-1"></i>{row.checkedInBy.name}</span> : '-' }
  ], []);

  const toolbar = (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
      <input
        type="date"
        className="form-control"
        placeholder="Filter by Date"
        value={filters.date || ''}
        onChange={(e) => handleFilterChange('date', e.target.value)}
        style={{ maxWidth: '180px' }}
      />
      <select
        className="form-control"
        value={filters.status || ''}
        onChange={(e) => handleFilterChange('status', e.target.value)}
        style={{ maxWidth: '180px' }}
      >
        <option value="">All Statuses</option>
        <option value="checked-in">Checked-In</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <button className="btn btn-outline" onClick={clearFilters}>
          Clear Filters
        </button>
        <button className="btn btn-outline" onClick={refresh} disabled={loading}>
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
        </button>
        <button className="btn" style={{ background: '#333', color: 'white' }}>
          <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i> Export CSV
        </button>
      </div>
    </div>
  );

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Security Logs</h1>
          <p style={{ color: 'var(--text-muted)' }}>View all access and check-in history</p>
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            toolbar={toolbar}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SecurityLogsView;
