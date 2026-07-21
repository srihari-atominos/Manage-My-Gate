import React, { memo } from 'react';
import { CCard, CCardBody, CCardImage, CButton } from '@coreui/react';
import AvailabilityBadge from './AvailabilityBadge.jsx';
import PriceDisplay from './PriceDisplay.jsx';

const ResidentAmenityCard = memo(({ amenity, onBook }) => {
  return (
    <CCard className="h-100 card-hover border-0 shadow-sm overflow-hidden">
      <div className="position-relative">
        <CCardImage 
          orientation="top" 
          src={amenity.imageUrl || 'https://via.placeholder.com/600x300'} 
          style={{ height: '220px', objectFit: 'cover' }} 
          alt={amenity.name}
        />
        <div className="position-absolute top-0 end-0 p-3 d-flex flex-column gap-2 align-items-end">
          <AvailabilityBadge isAvailable={true} />
          {amenity.maxBookingsPerUserPerSlot && (
             <span className="badge bg-dark shadow-sm">
                Your Booked Slots: {amenity.userBookedSlotsCount || 0} / {amenity.maxBookingsPerUserPerSlot}
             </span>
          )}
        </div>
      </div>
      
      <CCardBody className="d-flex flex-column p-4">
        <div className="text-uppercase text-muted small fw-bold mb-1" >
          {amenity.type}
        </div>
        <h4 className="mb-2 text-truncate" title={amenity.name}>{amenity.name}</h4>
        
        <p className="text-muted small mb-4 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {amenity.description || 'Enjoy our premium facilities tailored for your comfort and recreation.'}
        </p>

        <div className="d-flex align-items-center text-muted small mb-4 gap-3">
          <div><i className="fa-solid fa-location-dot me-2 text-primary"></i>{amenity.location || 'N/A'}</div>
          <div><i className="fa-solid fa-users me-2 text-primary"></i>Up to {amenity.capacity || 'N/A'}</div>
        </div>
        
        <div className="d-flex justify-content-between align-items-center mt-auto border-top pt-3">
          <PriceDisplay rate={amenity.ratePerHour} />
          <CButton color="primary" onClick={() => onBook(amenity._id)} className="px-4 py-2 shadow-sm rounded-pill">
            Book Now
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  );
});

export default ResidentAmenityCard;
