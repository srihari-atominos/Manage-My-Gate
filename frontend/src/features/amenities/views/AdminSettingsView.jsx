import React, { useState, useEffect } from 'react';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import { getAmenitySettings, updateAmenitySettings } from '../services/amenitySettingsApi.js';
import toast from 'react-hot-toast';
import '../styles/_amenities.scss';

const AdminSettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    paymentConfig: {
      provider: 'None',
      publicKey: '',
      secretKey: ''
    },
    bookingRules: {
      maxBookingsPerResident: 2,
      advanceBookingDays: 7,
      cancellationWindowHours: 24,
      autoConfirmation: false,
      approvalRequired: true
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getAmenitySettings();
        if (res && res.data) {
          setSettings(prev => ({
            ...prev,
            ...res.data,
            paymentConfig: res.data.paymentConfig || prev.paymentConfig,
            bookingRules: res.data.bookingRules || prev.bookingRules
          }));
        }
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAmenitySettings({
        paymentConfig: settings.paymentConfig,
        bookingRules: settings.bookingRules
      });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="amenities-module-wrapper amenity-os-theme d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-settings">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ margin: 0 }} className="fs-2">Amenity Settings</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }} className="fw-medium">Configure global rules, payments, and workflows for your community.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : <i className="fa-solid fa-save" style={{ marginRight: '8px' }}></i>}
              Save Changes
            </button>
          </div>
          
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            
            <div className="card card-hover">
              <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }} className="fs-5">
                <i className="fa-solid fa-credit-card" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Payment Configuration
              </h3>
              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase' }}>Payment Gateway Provider</label>
                <select 
                  className="form-control" 
                  value={settings.paymentConfig.provider}
                  onChange={(e) => handleChange('paymentConfig', 'provider', e.target.value)}
                >
                  <option value="None">None</option>
                  <option value="Stripe Payments">Stripe Payments</option>
                  <option value="Razorpay">Razorpay</option>
                  <option value="PayU">PayU</option>
                  <option value="Paytm">Paytm</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="Bank Account">Bank Account</option>
                </select>
              </div>
              {settings.paymentConfig.provider !== 'None' && (
                <>
                  <div className="form-group">
                    <label className="form-label" style={{ textTransform: 'uppercase' }}>API Public Key</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={settings.paymentConfig.publicKey}
                      onChange={(e) => handleChange('paymentConfig', 'publicKey', e.target.value)}
                      placeholder="e.g., pk_test_..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ textTransform: 'uppercase' }}>API Secret Key</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={settings.paymentConfig.secretKey}
                      onChange={(e) => handleChange('paymentConfig', 'secretKey', e.target.value)}
                      placeholder="e.g., sk_test_..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="card card-hover" style={{ borderTop: '4px solid var(--info)' }}>
              <h3 style={{ marginBottom: '24px' }} className="fs-5">
                <i className="fa-solid fa-file-contract" style={{ color: 'var(--info)', marginRight: '8px' }}></i> Booking Policies & Refunds
              </h3>
              <div className="form-group">
                <label className="form-label">Max Advance Booking (Days)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={settings.bookingRules.advanceBookingDays}
                  onChange={(e) => handleChange('bookingRules', 'advanceBookingDays', Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cancellation Window (Hours)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={settings.bookingRules.cancellationWindowHours}
                  onChange={(e) => handleChange('bookingRules', 'cancellationWindowHours', Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsView;
