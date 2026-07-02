import React, { useState, useEffect } from 'react';
import '../styles/_amenities.scss';
import { useAmenities } from '../hooks/useAmenities.js';

export const ResidentDiscover = () => {
  const { amenities, loading } = useAmenities();
  const [selectedAmenity, setSelectedAmenity] = useState(null);

  if (loading) return <div className="amenity-feature-container">Loading...</div>;

  if (selectedAmenity) {
    return (
      <div className="amenity-feature-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <button className="btn btn-outline" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }} onClick={() => setSelectedAmenity(null)}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Detail & Reserve</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '40px' }}>
          <div>
            <div className="card" style={{ height: '350px', backgroundImage: `url(${selectedAmenity.imageUrl || 'https://via.placeholder.com/800'})`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '24px' }}></div>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedAmenity.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px', fontWeight: 500 }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)', marginRight: '4px' }}></i> {selectedAmenity.location}
            </p>
            
            <h4 style={{ marginBottom: '12px', fontSize: '18px' }}>Operating Hours</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>
              {selectedAmenity.operatingHours?.start} - {selectedAmenity.operatingHours?.end}
            </p>
          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: '32px' }}>
              <h3 style={{ marginBottom: '24px' }}>Price Details</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px dashed var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Base Rate</span>
                <span style={{ fontWeight: 700 }}>₹{selectedAmenity.ratePerHour}/hr</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: '16px' }} onClick={() => alert('Proceeding to Booking Calendar Flow...')}>
                Check Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="amenity-feature-container">
      <h2 style={{ marginBottom: '32px', fontSize: '32px' }}>
        Hello, Resident. <br />
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Find your space.</span>
      </h2>

      <div className="search-bar-app">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input type="text" placeholder="Search facilities, e.g., Pool..." />
        <button className="search-btn"><i className="fa-solid fa-arrow-right"></i> Search</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px' }}>Available Amenities</h3>
      </div>

      <div className="h-scroll-container">
        {amenities.map(amenity => (
          <div key={amenity._id} className="app-card-h" onClick={() => setSelectedAmenity(amenity)}>
            <img src={amenity.imageUrl || 'https://via.placeholder.com/800'} className="app-card-h-img" alt={amenity.name} />
            <h4 className="amenity-title-text">{amenity.name}</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>
                <i className="fa-solid fa-location-dot"></i> {amenity.location}
              </span>
              <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '18px' }}>
                ₹{amenity.ratePerHour}<span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/hr</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResidentDiscover;
