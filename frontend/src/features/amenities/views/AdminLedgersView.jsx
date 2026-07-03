import React from 'react';
import '../styles/_amenities.scss';

const AdminLedgersView = () => {
  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div className="view active" id="view-admin-bookings">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Booking Master Ledger</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Bookings are auto-confirmed via payment gateway. No manual approval required.</p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="search-bar-app" style={{ margin: 0, padding: '4px 16px', boxShadow: 'none' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '14px' }}></i>
                  <input type="text" id="booking-search" placeholder="Search ID..." style={{ width: '150px' }} />
                </div>
                <button className="btn btn-outline" style={{ borderRadius: 'var(--radius-pill)' }}><i className="fa-solid fa-filter"></i> Filters</button>
                <button className="btn btn-primary"><i className="fa-solid fa-download"></i> Export</button>
              </div>
            </div>
            
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table" id="bookings-ledger">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Resident</th>
                    <th>Amenity & Slot</th>
                    <th>Financials</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-status="Confirmed">
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#BK-9988</td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>Justin Mason</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Flat 4B, Block A</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>Grand Banquet Hall</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Oct 24 • 18:00 - 23:00</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>₹5,000</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}><i className="fa-brands fa-cc-visa"></i> Paid</div>
                    </td>
                    <td><span className="badge badge-success"><i className="fa-solid fa-check-circle"></i> Confirmed</span></td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: 'var(--radius-pill)' }}><i className="fa-solid fa-ellipsis"></i></button>
                    </td>
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

export default AdminLedgersView;
