import React from 'react';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import '../styles/_amenities.scss';

const AdminSettingsView = () => {
  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-settings">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Amenity Settings</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Configure global rules, payments, and workflows for your community.</p>
            </div>
            <button className="btn btn-primary"><i className="fa-solid fa-save" style={{ marginRight: '8px' }}></i> Save Changes</button>
          </div>
          
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            
            <div className="card card-hover" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>
                <i className="fa-solid fa-building" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Organization Details
              </h3>
              <div className="form-group">
                <label className="form-label">Community Name</label>
                <input type="text" className="form-control" defaultValue="Prestige Falcon City" />
              </div>
              <div className="form-group">
                <label className="form-label">Support Email</label>
                <input type="email" className="form-control" defaultValue="amenities@prestige.com" />
              </div>
            </div>

            <div className="card card-hover">
              <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-credit-card" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Payment Configuration
              </h3>
              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase' }}>Payment Gateway Provider</label>
                <select className="form-control" defaultValue="Stripe Payments">
                  <option value="Stripe Payments">Stripe Payments</option>
                  <option value="Razorpay">Razorpay</option>
                  <option value="PayU">PayU</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase' }}>API Public Key</label>
                <input type="text" className="form-control" defaultValue="pk_test_abcdef1234567890" />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase' }}>API Secret Key</label>
                <input type="password" className="form-control" defaultValue="12345678901234" />
              </div>
              <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-pill)', marginTop: '8px', padding: '10px 24px' }}>
                Update Gateway
              </button>
            </div>

            <div className="card card-hover" style={{ borderTop: '4px solid var(--info)' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>
                <i className="fa-solid fa-file-contract" style={{ color: 'var(--info)', marginRight: '8px' }}></i> Booking Policies & Refunds
              </h3>
              <div className="form-group">
                <label className="form-label">Max Advance Booking (Days)</label>
                <input type="number" className="form-control" defaultValue="30" />
              </div>
              <div className="form-group">
                <label className="form-label">Cancellation Window (Hours)</label>
                <input type="number" className="form-control" defaultValue="24" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <label style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>Enable automated refunds on cancellation</label>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsView;
