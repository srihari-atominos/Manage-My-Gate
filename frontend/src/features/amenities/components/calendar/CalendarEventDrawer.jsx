import React, { memo } from 'react';
import { COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody, CCloseButton, CRow, CCol, CButton } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const CalendarEventDrawer = memo(({ visible, onClose, event }) => {
  if (!event) return null;

  return (
    <COffcanvas placement="end" visible={visible} onHide={onClose}>
      <COffcanvasHeader className="bg-body-secondary border-bottom">
        <COffcanvasTitle>Booking Details</COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>
      <COffcanvasBody>
        <div className="mb-4">
          <h4 className="fw-bold mb-1">{event.amenityName}</h4>
          <p className="text-muted mb-1"><i className="fa-solid fa-user me-2"></i>Resident: <strong>{event.residentName}</strong></p>
          <p className="text-muted mb-3"><i className="fa-solid fa-house me-2"></i>Unit: <strong>{event.flatNumber} {event.building ? `- ${event.building}` : ''} {event.tower ? `(${event.tower})` : ''}</strong></p>
          <AmenityStatusBadge status={event.status} />
        </div>

        <div className="bg-body-secondary p-3 rounded mb-4 shadow-sm border border-opacity-50">
          <CRow className="g-3">
            <CCol xs={12}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Booking ID</div>
              <div className="fw-semibold text-break">{event.bookingId}</div>
            </CCol>
            <CCol xs={12}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Date</div>
              <div className="fw-semibold">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Time</div>
              <div className="fw-semibold">{event.start} - {event.end}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Duration</div>
              <div className="fw-semibold">{event.duration ? `${event.duration} mins` : '-'}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Payment Status</div>
              <div className="fw-semibold text-capitalize">{event.paymentStatus || 'N/A'}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Amount</div>
              <div className="fw-semibold">₹{event.bookingAmount || 0}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">QR Status</div>
              <div className="fw-semibold text-capitalize">{event.qrStatus || 'N/A'}</div>
            </CCol>
          </CRow>
        </div>

        <hr />
        
        <h6 className="fw-bold text-muted text-uppercase mt-4 mb-3" >Check-in Status</h6>
        <div className="mb-4">
          {event.checkInStatus === 'entered' ? (
            <div>
              <div className="text-success fw-bold mb-1"><i className="fa-solid fa-check-circle me-2"></i>Checked In</div>
              <div className="small text-muted">Time: {new Date(event.checkInTime).toLocaleString()}</div>
              {event.guardName && <div className="small text-muted">By: {event.guardName}</div>}
            </div>
          ) : (
            <div className="text-muted"><i className="fa-solid fa-clock me-2"></i>Pending Check-in</div>
          )}
        </div>

        <div className="d-grid gap-2 mt-auto pt-4">
          {/* Note: User rule "Do not allow editing from the drawer. Future editing should launch a dedicated workflow." */}
          <CButton color="primary" variant="outline" disabled>
            Manage Booking (Coming Soon)
          </CButton>
        </div>
      </COffcanvasBody>
    </COffcanvas>
  );
});

export default CalendarEventDrawer;
