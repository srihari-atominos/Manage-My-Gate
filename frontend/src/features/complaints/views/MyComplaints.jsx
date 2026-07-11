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

  const { complaints, pagination, isLoading, cancelComplaint, addFeedback } = useComplaints(activeFilters);
  
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [feedbackModalId, setFeedbackModalId] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    remarks: ''
  });

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Track Requests</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Track and manage your submitted tickets</p>
            </div>
          </div>

          <div className="filter-row" style={{ marginBottom: '24px', justifyContent: 'flex-start' }}>
            <div className="search-bar" style={{ flex: '0 0 350px' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              onClick={() => setSelectedComplaintId(c._id)}
                            >
                              View
                            </button>
                            {['Submitted', 'Open'].includes(c.status) && (
                              <button 
                                className="btn btn-ghost btn-sm" 
                                style={{ color: '#DC2626', borderColor: '#fecaca', fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
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
                          </div>
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
        </div>
      </div>
      
      {selectedComplaintId && (
        <ComplaintDetails 
          complaintId={selectedComplaintId} 
          onClose={() => setSelectedComplaintId(null)} 
          onProvideFeedback={(id) => {
            setSelectedComplaintId(null);
            setFeedbackModalId(id);
          }}
        />
      )}

      {feedbackModalId && (
        <div className="modal-overlay active" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, padding: '20px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '500px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Provide Feedback</h4>
              <button onClick={() => setFeedbackModalId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#334155' }}>Overall Rating</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <i 
                        key={star} 
                        className="fa-solid fa-star" 
                        style={{ color: star <= feedbackForm.rating ? '#f59e0b' : '#cbd5e1', cursor: 'pointer', fontSize: '20px' }}
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      ></i>
                    ))}
                  </div>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Additional Remarks</label>
                  <textarea 
                    rows="3" 
                    className="form-control" 
                    value={feedbackForm.remarks}
                    onChange={e => setFeedbackForm({ ...feedbackForm, remarks: e.target.value })}
                    placeholder="Tell us about your experience..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setFeedbackModalId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                addFeedback(feedbackModalId, feedbackForm).then(() => {
                  toast.success('Feedback submitted successfully');
                  setFeedbackModalId(null);
                });
              }}>Submit Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
