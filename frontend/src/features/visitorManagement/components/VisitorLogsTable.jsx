import React, { useState } from 'react';

export const VisitorLogsTable = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Filter logs based on search and drop-downs
  const filteredLogs = logs.filter(log => {
    const name = log.visitorName || log.snapshot?.visitorName || '';
    const destination = log.villa || (log.passId?.villaId?.villaNumber || '');
    const guardName = log.guard || log.guardId?.name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guardName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const type = log.type || (log.entryType === 'PRE_APPROVED' ? 'guest' : 'walk_in');
    const matchesType = typeFilter === 'all' || type === typeFilter;

    const status = log.status || log.logStatus;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="card" style={{ borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', minHeight: '430px' }}>
      
      {/* Top filter toolbar */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '18px', margin: 0 }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Visitor Logs Database
          </h3>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <input 
              type="text" 
              className="form-control" 
              style={{ maxWidth: '180px', padding: '8px 12px', fontSize: '13px' }}
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />

            {/* Type Selector */}
            <select 
              className="form-control"
              style={{ maxWidth: '140px', padding: '8px 12px', fontSize: '13px' }}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="guest">Guest</option>
              <option value="cab_delivery">Cab & Delivery</option>
              <option value="service">Service</option>
              <option value="walk_in">Walk-in</option>
            </select>

            {/* Status Selector */}
            <select 
              className="form-control"
              style={{ maxWidth: '140px', padding: '8px 12px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="INSIDE">Inside</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {currentLogs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: 'var(--text-light)' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '36px', marginBottom: '12px' }}></i>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>No entry logs found matching filters.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Destination</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Status</th>
                  <th>Guard Operator</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map(log => {
                  const logId = log.id || log._id;
                  const name = log.visitorName || log.snapshot?.visitorName || '—';
                  const type = log.type || (log.entryType === 'PRE_APPROVED' ? 'guest' : 'walk-in');
                  const villa = log.villa || (log.passId?.villaId?.villaNumber || 'Villa Gate');
                  const resident = log.resident || log.residentId?.name || '—';
                  
                  const checkIn = log.checkIn || (log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
                  const checkOut = log.checkOut || (log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
                  
                  const status = log.status || log.logStatus;
                  const guard = log.guard || log.guardId?.name || 'Gate Operator';

                  return (
                    <tr key={logId}>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px', textTransform: 'capitalize' }}>
                          Type: {type.replace('_', ' & ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)' }}>{villa}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>Host: {resident}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>{checkIn}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>{checkOut}</span>
                      </td>
                      <td>
                        {status === 'INSIDE' && (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            INSIDE
                          </span>
                        )}
                        {(status === 'COMPLETED' || status === 'RESOLVED') && (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            COMPLETED
                          </span>
                        )}
                        {(status === 'DENIED' || status === 'REJECTED') && (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                            {status}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>{guard}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination control stuck at the absolute bottom of the card */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages} ({filteredLogs.length} total entries)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <i className="fa-solid fa-chevron-left" style={{ marginRight: '4px' }}></i> Previous
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next <i className="fa-solid fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorLogsTable;
