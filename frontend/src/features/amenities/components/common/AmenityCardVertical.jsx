import React from 'react'

const AmenityCardVertical = ({ image, title, location, rate, rating, onClick }) => {
  return (
    <div className="app-card-v" onClick={onClick}>
      <img src={image} className="app-card-v-img" alt={title} />
      <div className="app-card-v-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 className="amenity-title-text">{title}</h4>
          {rating && (
            <span className="app-card-v-rating">
              {rating} <i className="fa-solid fa-star"></i>
            </span>
          )}
        </div>
        <p>
          <i
            className="fa-solid fa-location-dot"
            style={{ color: 'var(--primary)', marginRight: '6px' }}
          ></i>
          {location}
        </p>
        <div className="app-card-v-bottom">
          <span className="app-card-v-price">
            ₹{rate}
            <span style={{ color: 'var(--text-muted)' }} className="fw-medium small">
              /hr
            </span>
          </span>
        </div>
      </div>
      <div className="app-card-v-action">
        <i className="fa-solid fa-chevron-right fa-xl"></i>
      </div>
    </div>
  )
}

export default AmenityCardVertical
