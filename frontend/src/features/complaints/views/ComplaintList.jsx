import React, { useState } from 'react';
import '../styles/_complaints.scss';
import { useComplaints } from '../hooks/useComplaints';
import StatusBadge from '../components/StatusBadge';
import ComplaintsHeader from '../components/ComplaintsHeader';

const ComplaintList = ({ onRowClick }) => {
  const [filters, setFilters] = useState({ page: 1, limit: 10 });
  const { complaints, pagination, isLoading } = useComplaints(filters);

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleStatusFilter = (e) => {
    setFilters({ ...filters, status: e.target.value, page: 1 });
  };

  return (
    <div className="complaint-os-theme complaint-module">
      <ComplaintsHeader />
      <div className="view active" id="view-complaint-list">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Complaint Tickets</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Manage all resident maintenance and complaint tickets.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="search-bar-app" style={{ margin: 0, padding: '4px 16px', boxShadow: 'none' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '14px' }}></i>
              <input type="text" placeholder="Search..." style={{ width: '150px' }} onChange={handleSearch} />
            </div>
            <select className="form-control" style={{ width: '150px' }} onChange={handleStatusFilter}>
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="ent-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Resident</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No complaints found.</td></tr>
              ) : (
                complaints.map(ticket => (
                  <tr key={ticket._id}>
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>{ticket.complaintNumber}</td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{ticket.residentName}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{ticket.location?.flat}, {ticket.location?.building}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>{ticket.category}</td>
                    <td style={{ fontWeight: '600' }}>{ticket.priority}</td>
                    <td><StatusBadge status={ticket.status} /></td>
                    <td style={{ fontWeight: '600' }}>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: 'var(--radius-pill)', fontSize: '13px' }} onClick={() => onRowClick && onRowClick(ticket)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ComplaintList;
