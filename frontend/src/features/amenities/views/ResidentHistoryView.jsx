import React from 'react';
import '../styles/_amenities.scss';

const ResidentHistoryView = () => {
  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div className="view active" id="view-resident-history">
          <h2 style={{ marginBottom: '32px', fontSize: '28px', marginTop: 0 }}>Booking History</h2>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
                <thead>
                  <tr><th>Booking ID</th><th>Amenity</th><th>Date & Slot</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  <tr id="res-booking-row-1">
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#BK-9988</td>
                    <td style={{ fontWeight: '700' }}>Grand Banquet Hall</td>
                    <td style={{ fontWeight: '600' }}>Oct 24 • 18:00 - 23:00</td>
                    <td style={{ fontWeight: '700' }}>₹5,000</td>
                    <td><span className="badge badge-success">Confirmed</span></td>
                    <td><button className="btn btn-danger-outline" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-pill)' }}>Cancel</button></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#BK-9412</td>
                    <td style={{ fontWeight: '700' }}>Olympic Pool</td>
                    <td style={{ fontWeight: '600' }}>Jun 12 • 07:00 - 08:00</td>
                    <td style={{ fontWeight: '700' }}>₹200</td>
                    <td><span className="badge badge-info">Completed</span></td>
                    <td><button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-pill)' }} disabled>Receipt</button></td>
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

export default ResidentHistoryView;
