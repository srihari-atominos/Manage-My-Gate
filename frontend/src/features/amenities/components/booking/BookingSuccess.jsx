import React, { memo } from 'react';
import { CCard, CCardBody, CButton } from '@coreui/react';
import { useNavigate } from 'react-router-dom';

const BookingSuccess = memo(({ amenity, draft, onComplete }) => {
  const navigate = useNavigate();

  return (
    <CCard className="border-0 shadow-sm mb-4 text-center">
      <CCardBody className="p-5">
        <div className="mb-4">
          <div className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
            <i className="fa-solid fa-check fs-1"></i>
          </div>
        </div>
        
        <h3 className="fw-bold mb-3">Booking Confirmed!</h3>
        <p className="text-muted mb-4">
          Your booking for <strong>{amenity?.name}</strong> on <strong>{draft.bookingDate}</strong> from <strong>{draft.startTime}</strong> to <strong>{draft.endTime}</strong> has been successfully placed.
        </p>

        <div className="d-flex justify-content-center gap-3">
          <CButton color="primary" onClick={onComplete} className="px-4 py-2 rounded-pill shadow-sm">
            Discover More
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  );
});

export default BookingSuccess;
