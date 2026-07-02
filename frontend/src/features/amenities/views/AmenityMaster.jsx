import React, { useState } from 'react';
import '../styles/_amenities.scss';
import { useAmenities } from '../hooks/useAmenities.js';

export const AmenityMaster = () => {
  const { amenities, loading, createAmenity, updateAmenity, deleteAmenity } = useAmenities();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    category: 'Event Space',
    capacity: 10,
    ratePerHour: 0,
    operatingHours: { start: '08:00', end: '22:00' },
    openDays: [0,1,2,3,4,5,6]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAmenity(formData).then(() => setShowModal(false));
  };

  if (loading) return <div className="amenity-feature-container">Loading...</div>;

  return (
    <div className="amenity-feature-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Amenity Master</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500, margin: 0 }}>Manage every bookable facility in your community.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="fa-solid fa-plus"></i> Add New
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {amenities.map((amenity) => (
          <div key={amenity._id} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '180px', backgroundImage: `url(${amenity.imageUrl || 'https://via.placeholder.com/800'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '20px', margin: 0 }}>{amenity.name}</h4>
                <span className={`badge ${amenity.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{amenity.status}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, fontWeight: 500 }}>
                <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> {amenity.location}<br />
                Capacity: {amenity.capacity} • ₹{amenity.ratePerHour}/hr
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => updateAmenity(amenity._id, { status: amenity.status === 'Active' ? 'Inactive' : 'Active' })}>
                  {amenity.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => deleteAmenity(amenity._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h4 style={{ fontSize: '20px', margin: 0 }}>Add New Amenity</h4>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input type="text" className="form-control" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Capacity</label>
                  <input type="number" className="form-control" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Rate (₹/hr)</label>
                  <input type="number" className="form-control" value={formData.ratePerHour} onChange={(e) => setFormData({...formData, ratePerHour: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Create Amenity</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmenityMaster;
