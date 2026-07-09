import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComplaints } from '../hooks/useComplaints';
import ComplaintTopNav from '../components/ComplaintTopNav';
import ComplaintDetails from './ComplaintDetails';
import '../styles/_complaints.scss';
import toast from 'react-hot-toast';

const MyComplaints = () => {
  const navigate = useNavigate();
  
  const [filterParams, setFilterParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: ''
  });
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterParams.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filterParams.search]);

  // Pass debounced values to useComplaints
  const activeFilters = {
    ...filterParams,
    search: debouncedSearch
  };

  const { complaints, pagination, isLoading, cancelComplaint } = useComplaints(activeFilters);
  
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setFilterParams(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="my-complaints">
          {/* Page header moved into card header */}
      <div className="content">
        <section className="screen active" id="my-complaints">
          <div className="filter-row">
            <div className="search-bar">
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--ink-faint)' }}></i>
              <input 
                type="text" 
                placeholder="Search by Ticket ID or Subject..." 
                value={filterParams.search}
                onChange={e => setFilterParams({ ...filterParams, search: e.target.value, page: 1 })}
              />
            </div>
            <select className="filter-select" value={filterParams.status} onChange={e => setFilterParams({ ...filterParams, status: e.target.value, page: 1 })}>
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Track Requests</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: '14px', fontWeight: '500', margin: 0 }}>Track and manage your submitted tickets</p>
              </div>
            </div>

            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Logged Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints?.filter(c => c.status !== 'Cancelled').length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center' }}>No complaints found.</td>
                    </tr>
                  )}
                  {complaints?.filter(c => c.status !== 'Cancelled').map(c => {
                    let badgeClass = 'badge normal';
                    if (['Submitted', 'Open'].includes(c.status)) badgeClass = 'badge open';
                    else if (['In Progress', 'Assigned'].includes(c.status)) badgeClass = 'badge progress';
                    else if (['Resolved', 'Closed'].includes(c.status)) badgeClass = 'badge resolved';
                    else if (['Cancelled', 'Rejected'].includes(c.status)) badgeClass = 'badge danger';

                    return (
                      <tr key={c._id}>
                        <td><b>{c.complaintNumber}</b></td>
                        <td><b>{c.title}</b></td>
                        <td>{c.category}</td>
                        <td><span className={badgeClass}>{c.status}</span></td>
                        <td>{formatDate(c.createdAt)}</td>
                        <td>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setSelectedComplaintId(c._id)}
                          >
                            View
                          </button>
                          {['Submitted', 'Open'].includes(c.status) && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: '#DC2626', marginLeft: '8px' }}
                              onClick={() => {
                                const reason = prompt('Reason for cancellation:');
                                if (reason) {
                                  cancelComplaint(c._id, reason).then(() => toast.success('Complaint Cancelled'));
                                }
                              }}
                            >
                              Cancel Request
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                  Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> &mdash; {pagination.totalRecords} total records
                </div>
                <ul className="pagination pagination-sm mb-0" style={{ display: 'flex', listStyle: 'none', gap: '4px', margin: 0, padding: 0 }}>
                  <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link rounded-start-3" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: '4px', cursor: 'pointer' }}>
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                    let p = i + 1;
                    if (pagination.totalPages > 7 && pagination.currentPage > 4) {
                      p = pagination.currentPage - 3 + i;
                      if (p > pagination.totalPages) return null;
                    }
                    return (
                      <li key={p} className={`page-item ${pagination.currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: pagination.currentPage === p ? 'var(--primary)' : 'var(--bg)', color: pagination.currentPage === p ? 'white' : 'var(--ink)', borderRadius: '4px', cursor: 'pointer' }}>
                          {p}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                    <button className="page-link rounded-end-3" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: '4px', cursor: 'pointer' }}>
                      Next
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
        </div>
      </div>
      
      {selectedComplaintId && (
        <ComplaintDetails 
          complaintId={selectedComplaintId} 
          onClose={() => setSelectedComplaintId(null)} 
        />
      )}
    </div>
  );
};

export default MyComplaints;
