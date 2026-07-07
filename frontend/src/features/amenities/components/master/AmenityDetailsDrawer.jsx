import React from 'react';

import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AmenityDetailsDrawer = ({ visible, onClose, amenity }) => {
  if (!amenity) return null;

  const imageUrl = (amenity.images && amenity.images.length > 0) 
    ? amenity.images[0] 
    : 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80';
  const rate = amenity.pricing?.baseRate ?? amenity.ratePerHour ?? 0;
  const pricingType = amenity.pricing?.pricingType || 'hourly';
  const deposit = amenity.pricing?.securityDeposit ?? 0;

  return (
    <div className="modal-overlay active amenity-os-theme" style={{ display: visible ? 'flex' : 'none' }} onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', margin: 0 }}>Amenity Details</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px 28px' }}>
          <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={imageUrl} alt={amenity.name} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
            <h4 style={{ fontSize: '22px', margin: 0 }}>{amenity.name}</h4>
            <AmenityStatusBadge status={amenity.status} />
          </div>

          {amenity.description && (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              {amenity.description}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px 16px', marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Category</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.type || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Location</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.location || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Capacity</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.capacity || 'N/A'}</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Pricing</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>₹{rate.toLocaleString()} ({pricingType})</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Security Deposit</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>₹{deposit.toLocaleString()}</div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)', margin: '0 0 20px' }}></div>
          
          <h6 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Rules</h6>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Operating Hours</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              {amenity.bookingRules?.openTime || '08:00'} – {amenity.bookingRules?.closeTime || '21:00'}
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Slot Duration</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.bookingRules?.slotDurationMinutes || 60} mins</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Buffer Time</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.bookingRules?.bufferTimeMinutes || 0} mins</div>

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Max Bookings/Day</div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{amenity.bookingRules?.maxBookingsPerUserPerDay || 1}</div>

            {amenity.openDays && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>Open Days</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {amenity.openDays.map(d => DAYS[d]?.substring(0, 3)).join(', ')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmenityDetailsDrawer;
