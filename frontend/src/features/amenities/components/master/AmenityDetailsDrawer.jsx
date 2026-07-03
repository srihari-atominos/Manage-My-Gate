import React from 'react';

import AmenityStatusBadge from '../AmenityStatusBadge.jsx';
import { formatCurrency } from '../../utils/amenityUtils.js';

const AmenityDetailsDrawer = ({ visible, onClose, amenity }) => {
  if (!amenity) return null;

  return (
    <div className="modal-overlay amenity-os-theme" style={{ display: visible ? 'flex' : 'none' }}>
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', margin: 0 }}>Amenity Details</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={amenity.imageUrl || 'https://via.placeholder.com/400x200'} alt={amenity.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px' }} />
          </div>
          
          <h4 style={{ fontSize: '24px', marginBottom: '8px' }}>{amenity.name}</h4>
          <div style={{ marginBottom: '24px' }}>
            <AmenityStatusBadge status={amenity.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Category:</div>
            <div style={{ fontWeight: 600 }}>{amenity.type || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Location:</div>
            <div style={{ fontWeight: 600 }}>{amenity.location || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Capacity:</div>
            <div style={{ fontWeight: 600 }}>{amenity.capacity || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Rate:</div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(amenity.ratePerHour)}/hr</div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)', margin: '24px 0' }}></div>
          <h6 style={{ color: 'var(--primary)', marginBottom: '8px', fontSize: '14px' }}>Booking Rules</h6>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            More rules can be displayed here. The component is extensible for future business logic additions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AmenityDetailsDrawer;
