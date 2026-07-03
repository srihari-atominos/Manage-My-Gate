import React from 'react';

const AmenityCardHorizontal = ({ image, title, description, location, rate, status, onEdit, onDeactivate, onClick, onToggleFavorite, isFavorite }) => {
  return (
    <div className={`card card-hover amenity-item-card ${onClick ? 'app-card-h' : ''}`} style={{ padding: 0, overflow: 'hidden' }} onClick={onClick}>
      <div style={{ height: '180px', background: `url('${image}') center/cover` }}>
        {onToggleFavorite && (
          <div 
            className="app-card-h-bookmark" 
            style={isFavorite ? { color: 'var(--primary)' } : {}}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          >
            <i className={`fa-bookmark ${isFavorite ? 'fa-solid' : 'fa-regular'}`}></i>
          </div>
        )}
      </div>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '20px' }} className="amenity-title-text">{title}</h4>
          {status && <span className={`badge badge-${status === 'Active' ? 'success' : 'warning'}`}>{status}</span>}
        </div>
        
        {description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, fontWeight: 500 }}>
            {description}
          </p>
        )}

        <div className="app-card-h-footer" style={!description ? { marginTop: '16px' } : {}}>
          <span className="app-card-h-loc">
            <i className="fa-solid fa-location-dot"></i> {location}
          </span>
          <span className="app-card-h-price">
            ₹{rate}<span>/hr</span>
          </span>
        </div>

        {(onEdit || onDeactivate) && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {onEdit && (
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Edit
              </button>
            )}
            {onDeactivate && (
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onDeactivate(); }}>
                Deactivate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AmenityCardHorizontal;
