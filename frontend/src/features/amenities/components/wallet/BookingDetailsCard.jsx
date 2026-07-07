import React, { memo } from 'react';
import { CCard, CCardBody, CRow, CCol } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const BookingDetailsCard = memo(({ booking }) => {
  if (!booking) return null;

  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-4">
        <h6 className="fw-bold mb-4 text-uppercase text-muted" style={{ letterSpacing: '1px' }}>Pass Details</h6>
        
        <CRow className="g-4 mb-4">
          <CCol xs={6}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Booking ID</div>
            <div className="fw-semibold text-truncate">{booking.bookingId || booking.id}</div>
          </CCol>
          <CCol xs={6}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Resident</div>
            <div className="fw-semibold">{booking.residentName}</div>
          </CCol>
          <CCol xs={12}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Location</div>
            <div className="fw-semibold text-truncate">{booking.location}</div>
          </CCol>
          <CCol xs={12}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Valid On</div>
            <div className="fw-semibold">
              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </CCol>
          <CCol xs={6}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Entry Time</div>
            <div className="fw-semibold text-success">{booking.startTime}</div>
          </CCol>
          <CCol xs={6}>
            <div className="small text-muted text-uppercase fw-bold mb-1">Exit Time</div>
            <div className="fw-semibold text-danger">{booking.endTime}</div>
          </CCol>
        </CRow>

        <div className="d-flex justify-content-between align-items-center pt-3 border-top mb-2">
          <span className="small text-muted fw-bold text-uppercase">Payment Status</span>
          <span className="fw-bold text-success text-capitalize">{booking.paymentStatus || 'Success'}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center pt-2">
          <span className="small text-muted fw-bold text-uppercase">Pass Status</span>
          <AmenityStatusBadge status={booking.status} />
        </div>
      </CCardBody>
    </CCard>
  );
});

export default BookingDetailsCard;
