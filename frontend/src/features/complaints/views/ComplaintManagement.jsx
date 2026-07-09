import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useComplaints } from '../hooks/useComplaints';
import ComplaintTopNav from '../components/ComplaintTopNav';
import ComplaintDetails from './ComplaintDetails';
import AssignComplaint from './AssignComplaint';
import '../styles/_complaints.scss';

const ComplaintManagement = () => {
  const navigate = useNavigate();
  const { complaints, isLoading } = useComplaints();
  const authUser = useSelector((state) => state.auth?.user || {});
  const userRole = authUser.role || 'Resident';
  
  const [filter, setFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [search, setSearch] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [assigningComplaintId, setAssigningComplaintId] = useState(null);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  
  const ratedComplaints = complaints?.filter(c => c.feedback?.rating || c.feedback?.overallRating) || [];

  const filteredComplaints = complaints?.filter(c => {
    if (c.status === 'Cancelled') return false;
    if (filter !== 'All Statuses' && c.status !== filter) return false;
    if (priorityFilter !== 'All Priorities' && c.priority !== priorityFilter) return false;
    if (search && !c.complaintNumber.toLowerCase().includes(search.toLowerCase()) && !c.residentName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div className="complaints-module-wrapper complaints-os-theme">
      <ComplaintTopNav />
      <div className="view-container">
        <div className="view active" id="management">
          
          <div className="content">
        <section className="screen active" id="management">
          <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="filter-group">
              <div className="search-bar">
                <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--ink-faint)' }}></i>
                <input 
                  type="text" 
                  placeholder="Search ID, subject, or resident..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
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
              <select className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option>All Priorities</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
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
                View All Ratings
              </button>
            </div>
          </div>
          
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Complaint Management</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: '14px', fontWeight: '500', margin: 0 }}>Global view of all society service requests</p>
              </div>
            </div>
            
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
                            disabled={['Cancelled', 'Resolved', 'Closed'].includes(c.status)}
                            style={['Cancelled', 'Resolved', 'Closed'].includes(c.status) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
          </div>
        </section>
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
                  <div key={c._id} style={{ borderBottom: '1px solid var(--surface-2)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{c.complaintNumber} - {c.title}</div>
                      <div style={{ display: 'flex', gap: '4px', color: '#f59e0b' }}>
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={i < (c.feedback?.overallRating || c.feedback?.rating || 0) ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '8px' }}>
                      By: {c.residentName} {c.location?.flat ? `(${c.location.flat})` : ''}
                    </div>
                    {c.feedback.remarks && (
                      <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                        "{c.feedback.remarks}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
      
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
  );
};

export default ComplaintManagement;
