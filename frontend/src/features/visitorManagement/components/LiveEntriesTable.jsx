import React, { useState } from 'react';

export const LiveEntriesTable = ({ liveEntries, onCheckOutSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredEntries = liveEntries.filter(entry => 
    entry.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.villa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.resident.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="card invite-form-card" style={{ minHeight: '430px', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ flex: 1 }}>
        <div className="live-entries-card-header">
          <h3 style={{ fontSize: '18px', margin: 0 }}>
            <i className="fa-solid fa-right-to-bracket" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Active Visitors Inside ({liveEntries.length})
          </h3>
          
          <input 
            type="text" 
            className="form-control live-entries-search" 
            placeholder="Search active visitors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {currentEntries.length === 0 ? (
          <div className="live-entries-empty">
            <i className="fa-solid fa-users-slash"></i>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>No active visitors inside community.</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>All entry log check-ins have checked-out.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Villa Destination</th>
                  <th>Check-In Time</th>
                  <th>Processed By</th>
                  <th className="table-cell-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentEntries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div className="table-cell-bold">{entry.visitorName}</div>
                      <div className="table-cell-sub">
                        Type: {entry.type.replace('_', ' & ')}
                      </div>
                    </td>
                    <td>
                      <div className="table-cell-muted">{entry.villa}</div>
                      <div className="table-cell-sub">Host: {entry.resident}</div>
                    </td>
                    <td>
                      <span className="table-cell-muted" style={{ fontSize: '13px' }}>{entry.checkIn}</span>
                    </td>
                    <td>
                      <span className="table-cell-muted" style={{ fontSize: '13px' }}>{entry.guard}</span>
                    </td>
                    <td className="table-cell-right">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                        onClick={() => onCheckOutSuccess(entry.id)}
                      >
                        <i className="fa-solid fa-door-open" style={{ marginRight: '6px' }}></i> Check-Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="table-pagination-footer">
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages} ({filteredEntries.length} total active)
          </span>
          <div className="table-pagination-buttons">
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveEntriesTable;
