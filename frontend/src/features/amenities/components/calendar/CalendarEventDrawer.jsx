import React, { memo, useState, useEffect } from 'react';
import { COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody, CCloseButton, CRow, CCol, CButton } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const CalendarEventDrawer = memo(({ visible, onClose, event, onCancelClick }) => {
  const [selectedSubEvent, setSelectedSubEvent] = useState(null);

  useEffect(() => {
    setSelectedSubEvent(null);
  }, [visible, event]);

  if (!event) return null;

  const activeEvent = selectedSubEvent || (event?.isGroup && event.subEvents?.length === 1 ? event.subEvents[0] : event);

  if (activeEvent?.isGroup && activeEvent.subEvents?.length > 1) {
    return (
      <COffcanvas placement="end" visible={visible} onHide={onClose}>
        <COffcanvasHeader className="bg-body-secondary border-bottom">
          <COffcanvasTitle>{activeEvent.title}</COffcanvasTitle>
          <CCloseButton className="text-reset" onClick={onClose} />
        </COffcanvasHeader>
        <COffcanvasBody>
           <h4 className="fw-bold mb-3">{activeEvent.amenityName}</h4>
           <p className="text-muted mb-4"><i className="fa-solid fa-clock me-2"></i>{activeEvent.start} - {activeEvent.end}</p>
           <div className="list-group">
             {activeEvent.subEvents.map((sub, idx) => (
                <button key={idx} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3" onClick={() => setSelectedSubEvent(sub)}>
                  <div>
                    <strong className="d-block mb-1"><i className="fa-solid fa-user me-2 text-muted"></i>{sub.residentName}</strong>
                    <div className="small text-muted"><i className="fa-solid fa-house me-2"></i>{sub.flatNumber} • {sub.numberOfPersons} Person(s)</div>
                  </div>
                  <AmenityStatusBadge status={sub.status} />
                </button>
             ))}
           </div>
        </COffcanvasBody>
      </COffcanvas>
    );
  }

  return (
    <COffcanvas placement="end" visible={visible} onHide={onClose}>
      <COffcanvasHeader className="bg-body-secondary border-bottom">
        {event?.isGroup && event.subEvents?.length > 1 && (
          <button className="btn btn-sm btn-link text-decoration-none me-2 p-0 text-dark" onClick={() => setSelectedSubEvent(null)}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>
        )}
        <COffcanvasTitle>Booking Details</COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>
      <COffcanvasBody>
        <div className="mb-4">
          <h4 className="fw-bold mb-1">{activeEvent.amenityName}</h4>
          <p className="text-muted mb-1"><i className="fa-solid fa-user me-2"></i>Resident: <strong>{activeEvent.residentName}</strong></p>
          <p className="text-muted mb-3"><i className="fa-solid fa-house me-2"></i>Unit: <strong>{activeEvent.flatNumber} {activeEvent.building ? `- ${activeEvent.building}` : ''} {activeEvent.tower ? `(${activeEvent.tower})` : ''}</strong></p>
          <AmenityStatusBadge status={activeEvent.status} />
          {activeEvent.status === 'cancelled' && (
            <div className="mt-3 p-3 bg-danger bg-opacity-10 rounded border border-danger border-opacity-25">
              <div className="text-danger fw-bold small text-uppercase mb-1"><i className="fa-solid fa-circle-info me-1"></i>Cancellation Info</div>
              <div className="text-danger small">{activeEvent.cancellationReason || 'Cancelled by admin/user'}</div>
            </div>
          )}
        </div>

        <div className="bg-body-secondary p-3 rounded mb-4 shadow-sm border border-opacity-50">
          <CRow className="g-3">
            <CCol xs={12}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Booking ID</div>
              <div className="fw-semibold text-break">{activeEvent.bookingId}</div>
            </CCol>
            <CCol xs={12}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Date</div>
              <div className="fw-semibold">{new Date(activeEvent.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Time</div>
              <div className="fw-semibold">{activeEvent.start} - {activeEvent.end}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Duration</div>
              <div className="fw-semibold">{activeEvent.duration ? `${activeEvent.duration} mins` : '-'}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Payment Status</div>
              <div className="fw-semibold text-capitalize">{activeEvent.paymentStatus || 'N/A'}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Persons</div>
              <div className="fw-semibold">{activeEvent.numberOfPersons} Person(s)</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Amount</div>
              <div className="fw-semibold">₹{activeEvent.bookingAmount || 0}</div>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">QR Status</div>
              <div className="fw-semibold text-capitalize">{activeEvent.qrStatus || 'N/A'}</div>
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
          {event.status === 'confirmed' ? (
            <CButton color="danger" variant="outline" onClick={() => onCancelClick(event)}>
              Cancel Booking
            </CButton>
          ) : (
            <CButton color="primary" variant="outline" disabled>
              Manage Booking (Coming Soon)
            </CButton>
          )}
        </div>
      </COffcanvasBody>
    </COffcanvas>
  );
});

export default CalendarEventDrawer;
