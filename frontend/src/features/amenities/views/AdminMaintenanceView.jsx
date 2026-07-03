import React from 'react';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import '../styles/_amenities.scss';

const AdminMaintenanceView = () => {
  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-maintenance">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Maintenance</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Track upkeep tasks and block amenities while work is in progress.</p>
            </div>
            <button className="btn btn-primary"><i className="fa-solid fa-plus"></i> Schedule Task</button>
          </div>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
                <thead>
                  <tr><th>Amenity</th><th>Issue</th><th>Assigned To</th><th>Scheduled</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '700' }}>Tennis Court</td>
                    <td>Net & surface resurfacing</td>
                    <td>Ravi (Facilities)</td>
                    <td>Jul 3, 2026 • 09:00 - 13:00</td>
                    <td><span className="badge badge-warning">In Progress</span></td>
                    <td><button className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: 'var(--radius-pill)' }}>Resolve</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMaintenanceView;
