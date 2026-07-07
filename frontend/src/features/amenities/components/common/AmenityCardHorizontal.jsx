import React from 'react';

const AmenityCardHorizontal = ({
  image, title, category, description, location, capacity,
  operatingHours, rate, status, onEdit, onDeactivate, onClick,
  onToggleFavorite, isFavorite
}) => {
  const statusColor =
    status?.toLowerCase() === 'active' || status?.toLowerCase() === 'available'
      ? { bg: '#d1fae5', color: '#059669' }
      : status?.toLowerCase() === 'maintenance' || status?.toLowerCase() === 'under maintenance'
      ? { bg: '#fef3c7', color: '#d97706' }
      : { bg: '#f1f5f9', color: '#64748b' };

  return (
    <div
      className={`amenity-discover-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* ── Image Panel ── */}
      <div className="amenity-discover-card__image">
        <img
          src={image && image !== 'https://via.placeholder.com/400x200'
            ? image
            : `https://source.unsplash.com/400x300/?${encodeURIComponent(title || 'amenity')},facility`}
          alt={title}
          onError={(e) => {
            e.target.src = `https://source.unsplash.com/400x300/?facility,building`;
          }}
        />
        {/* Status badge on image */}
        <span
          className="amenity-discover-card__status-badge"
          style={{ background: statusColor.bg, color: statusColor.color }}
        >
          <span className="status-dot" style={{ background: statusColor.color }}></span>
          {status || 'Active'}
        </span>
        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            className="amenity-discover-card__fav-btn"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          >
            <i className={`fa-bookmark ${isFavorite ? 'fa-solid' : 'fa-regular'}`}
              style={{ color: isFavorite ? '#0084FF' : '#94a3b8' }} />
          </button>
        )}
      </div>

      {/* ── Content Panel ── */}
      <div className="amenity-discover-card__body">
        {/* Title row */}
        <div className="amenity-discover-card__title-row">
          <div>
            {category && (
              <span className="amenity-discover-card__category">
                <i className="fa-solid fa-layer-group"></i> {category}
              </span>
            )}
            <h3 className="amenity-discover-card__title">{title}</h3>
          </div>
          <div className="amenity-discover-card__rate">
            <span className="rate-amount">₹{rate}</span>
            <span className="rate-per">/hr</span>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="amenity-discover-card__desc">{description}</p>
        )}

        {/* Meta chips */}
        <div className="amenity-discover-card__meta">
          {location && (
            <span className="meta-chip">
              <i className="fa-solid fa-location-dot"></i> {location}
            </span>
          )}
          {capacity !== undefined && (
            <span className="meta-chip">
              <i className="fa-solid fa-users"></i> {capacity} people
            </span>
          )}
          {operatingHours && (
            <span className="meta-chip">
              <i className="fa-regular fa-clock"></i> {operatingHours}
            </span>
          )}
        </div>

        {/* Footer actions */}
        <div className="amenity-discover-card__footer">
          {onClick && status?.toLowerCase() !== 'maintenance' && status?.toLowerCase() !== 'under maintenance' ? (
            <button
              className="amenity-discover-card__book-btn"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <i className="fa-solid fa-calendar-plus"></i> Book Now
            </button>
          ) : onClick && (status?.toLowerCase() === 'maintenance' || status?.toLowerCase() === 'under maintenance') ? (
            <span className="amenity-discover-card__unavailable">
              <i className="fa-solid fa-wrench me-1"></i> Under Maintenance
            </span>
          ) : null}

          {(onEdit || onDeactivate) && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              {onEdit && (
                <button
                  className="amenity-discover-card__action-btn"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <i className="fa-solid fa-pen-to-square"></i> Edit
                </button>
              )}
              {onDeactivate && (
                <button
                  className="amenity-discover-card__action-btn danger"
                  onClick={(e) => { e.stopPropagation(); onDeactivate(); }}
                >
                  <i className="fa-solid fa-ban"></i> Deactivate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmenityCardHorizontal;
