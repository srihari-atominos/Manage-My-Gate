import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import ComplaintTopNav from '../components/ComplaintTopNav';
import ComplaintDetails from './ComplaintDetails';
import AssignComplaint from './AssignComplaint';
import '../styles/_complaints.scss';

const ComplaintManagement = () => {
  const navigate = useNavigate();
  
  const [filterParams, setFilterParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    priority: ''
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterParams.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filterParams.search]);

  const activeFilters = {
    ...filterParams,
    search: debouncedSearch
  };

  const { complaints, pagination, isLoading } = useComplaints(activeFilters);
  const authUser = useSelector((state) => state.auth?.user || {});
  const userRole = authUser.role || 'Resident';
  
  const [filter, setFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [search, setSearch] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [assigningComplaintId, setAssigningComplaintId] = useState(null);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  
  const ratedComplaints = complaints?.filter(c => c.feedback?.rating || c.feedback?.overallRating || c.category === 'Feedback') || [];

  const filteredComplaints = complaints?.filter(c => {
    if (c.status === 'Cancelled') return false;
    return true;
  }) || [];

  const handleStatusFilter = (value) => {
    setFilter(value);
    setFilterParams(prev => ({ ...prev, page: 1, status: value === 'All Statuses' ? '' : value }));
  };

  const handlePriorityFilter = (value) => {
    setPriorityFilter(value);
    setFilterParams(prev => ({ ...prev, page: 1, priority: value === 'All Priorities' ? '' : value }));
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setFilterParams(prev => ({ ...prev, page: 1, search: value }));
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
        <div className="view active" id="management">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Complaint Management</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Global view of all society service requests and maintenance tickets.</p>
            </div>
            <div className="actions-group" style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => {
                const token = localStorage.getItem('token');
                window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/complaints/export?auth_token=${token}`, '_blank');
              }}>
                <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i>
                Export
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRatingsModal(true)}>
                <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
                View All Feedback
              </button>
            </div>
          </div>

          <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', height: '40px', width: '350px', maxWidth: '100%' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--ink-faint)', marginRight: '8px' }}></i>
              <input 
                type="text" 
                placeholder="Search ID, subject, or resident..." 
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--ink)' }}
              />
            </div>
            <div className="filter-group" style={{ display: 'flex', gap: '12px' }}>
              <select className="filter-select" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 12px', background: 'var(--surface)', color: 'var(--ink)' }} value={filter} onChange={e => handleStatusFilter(e.target.value)}>
                <option>All Statuses</option>
                <option>Submitted</option>
                <option>Assigned</option>
                <option>Waiting For Acceptance</option>
                <option>In Progress</option>
                <option>Waiting For Resident Confirmation</option>
                <option>Resolved</option>
                <option>Closed</option>
                <option>Escalated</option>
              </select>
              <select className="filter-select" style={{ height: '40px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 12px', background: 'var(--surface)', color: 'var(--ink)' }} value={priorityFilter} onChange={e => handlePriorityFilter(e.target.value)}>
                <option>All Priorities</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject & Location</th>
                    <th>Department</th>
                    <th>SLA Level</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center' }}>No tickets match criteria.</td>
                    </tr>
                  )}
                  {filteredComplaints.map(c => {
                    let statusBadgeClass = 'badge normal';
                    if (['Submitted', 'Open'].includes(c.status)) statusBadgeClass = 'badge open';
                    else if (['In Progress', 'Assigned'].includes(c.status)) statusBadgeClass = 'badge progress';
                    else if (['Resolved', 'Closed'].includes(c.status)) statusBadgeClass = 'badge resolved';
                    else if (['Cancelled', 'Rejected'].includes(c.status)) statusBadgeClass = 'badge danger';

                    let priorityBadgeClass = 'badge normal';
                    if (c.priority === 'Critical') priorityBadgeClass = 'badge urgent';
                    else if (c.priority === 'High') priorityBadgeClass = 'badge medium';

                    return (
                      <tr key={c._id}>
                        <td>
                          <b 
                            style={{ color: 'var(--primary)', cursor: 'pointer' }} 
                            onClick={() => setSelectedComplaintId(c._id)}
                          >
                            {c.complaintNumber}
                          </b>
                        </td>
                        <td>
                          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.title}</b><br/>
                          <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                            {c.location?.flat || ''} {c.location?.building ? `(${c.location?.building})` : ''}
                          </span>
                        </td>
                        <td>{c.category}</td>
                        <td><span className={priorityBadgeClass}>{c.priority}</span></td>
                        <td><span className={statusBadgeClass}>{c.status}</span></td>
                        <td>
                          {c.assignedTechnicianName ? (
                            <>
                              <span className="avatar-sm">{c.assignedTechnicianName.charAt(0)}</span>
                              {c.assignedTechnicianName}
                            </>
                          ) : (
                            <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => setAssigningComplaintId(c._id)}
                            disabled={!['Submitted', 'Open', 'Waiting For Assignment'].includes(c.status)}
                            style={!['Submitted', 'Open', 'Waiting For Assignment'].includes(c.status) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            Assign
                          </button>
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


      {showRatingsModal && (
        <div className="complaint-modal-overlay" onClick={() => setShowRatingsModal(false)}>
          <div className="complaint-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="complaint-modal-header">
              <h3 className="complaint-modal-title">All Resident Ratings</h3>
              <i className="fa-solid fa-xmark complaint-modal-close" onClick={() => setShowRatingsModal(false)}></i>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
              {ratedComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: '24px' }}>
                  No ratings have been submitted yet.
                </div>
              ) : (
                ratedComplaints.map(c => (
                  <div key={c._id} style={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ background: 'var(--primary-light, #e0f2fe)', color: 'var(--primary, #0284c7)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                            {c.complaintNumber}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.title}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                          <i className="fa-regular fa-user" style={{ marginRight: '6px' }}></i>
                          {c.residentName || (c.residentId && c.residentId.username) || 'Unknown Resident'} 
                          {c.location?.flat ? ` • Flat ${c.location.flat}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', fontSize: '14px' }}>
                        {c.category !== 'Feedback' ? (
                          [...Array(5)].map((_, i) => (
                            <i key={i} className={i < (c.feedback?.overallRating || c.feedback?.rating || 0) ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                          ))
                        ) : (
                          <span style={{fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '12px'}}>General Feedback</span>
                        )}
                      </div>
                    </div>
                    {(c.feedback?.remarks || c.category === 'Feedback') && (
                      <div style={{ 
                        background: 'var(--surface-2)', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        fontSize: '14px',
                        color: 'var(--ink)',
                        borderLeft: '3px solid var(--primary)'
                      }}>
                        "{c.feedback?.remarks || c.description}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {selectedComplaintId && (
        <ComplaintDetails 
          complaintId={selectedComplaintId} 
          onClose={() => setSelectedComplaintId(null)} 
        />
      )}

      {assigningComplaintId && (
        <AssignComplaint 
          complaint={complaints?.find(c => c._id === assigningComplaintId)} 
          onCancel={() => setAssigningComplaintId(null)}
          onAssigned={() => setAssigningComplaintId(null)}
        />
      )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintManagement;
