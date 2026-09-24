import React, { memo, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasTitle,
  COffcanvasBody,
  CCloseButton,
  CRow,
  CCol,
  CButton,
} from '@coreui/react'
import AmenityStatusBadge from '../AmenityStatusBadge.jsx'

const CalendarEventDrawer = memo(({ visible, onClose, event, onCancelClick }) => {
  const { user } = useSelector((state) => state.auth || {})
  const [selectedSubEvent, setSelectedSubEvent] = useState(null)

  useEffect(() => {
    setSelectedSubEvent(null)
  }, [visible, event])

  if (!event) return null

  const activeEvent =
    selectedSubEvent ||
    (event?.isGroup && event.subEvents?.length === 1 ? event.subEvents[0] : event)

  const currentUserId = user?.id || user?._id
  const bookingUserId =
    activeEvent?.userId?._id || activeEvent?.userId || activeEvent?.metadata?.userId
  const isOwner = Boolean(
    currentUserId && bookingUserId && String(currentUserId) === String(bookingUserId),
  )

  if (activeEvent?.isGroup && activeEvent.subEvents?.length > 1) {
    return (
      <COffcanvas placement="end" visible={visible} onHide={onClose}>
        <COffcanvasHeader className="bg-body-secondary border-bottom">
          <COffcanvasTitle>{activeEvent.title}</COffcanvasTitle>
          <CCloseButton className="text-reset" onClick={onClose} />
        </COffcanvasHeader>
        <COffcanvasBody>
          <h4 className="fw-bold mb-3">{activeEvent.amenityName}</h4>
          <p className="text-muted mb-4">
            <i className="fa-solid fa-clock me-2"></i>
            {activeEvent.start} - {activeEvent.end}
          </p>
          <div className="list-group">
            {activeEvent.subEvents.map((sub, idx) => (
              <button
                key={idx}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                onClick={() => setSelectedSubEvent(sub)}
              >
                <div>
                  <strong className="d-block mb-1">
                    <i className="fa-solid fa-user me-2 text-muted"></i>
                    {sub.residentName}
                  </strong>
                  <div className="small text-muted">
                    <i className="fa-solid fa-house me-2"></i>
                    {sub.flatNumber} • {sub.numberOfPersons} Person(s)
                  </div>
                </div>
                <AmenityStatusBadge status={sub.status} />
              </button>
            ))}
          </div>
        </COffcanvasBody>
      </COffcanvas>
    )
  }

  return (
    <COffcanvas placement="end" visible={visible} onHide={onClose}>
      <COffcanvasHeader className="bg-body-secondary border-bottom">
        {event?.isGroup && event.subEvents?.length > 1 && (
          <button
            className="btn btn-sm btn-link text-decoration-none me-2 p-0 text-dark"
            onClick={() => setSelectedSubEvent(null)}
          >
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>
        )}
        <COffcanvasTitle>
          {activeEvent.type === 'maintenance' ? 'Maintenance Block' : 'Reservation Details'}
        </COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>
      <COffcanvasBody>
        {activeEvent.type === 'maintenance' ? (
          <div>
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-warning text-dark px-2 py-1">
                  <i className="fa-solid fa-wrench me-1"></i>
                  {activeEvent.status || 'SCHEDULED'}
                </span>
                {activeEvent.isEmergency && (
                  <span className="badge bg-danger text-white px-2 py-1">
                    <i className="fa-solid fa-triangle-exclamation me-1"></i>Emergency
                  </span>
                )}
                {activeEvent.isCompleteClosure ? (
                  <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                    Complete Closure
                  </span>
                ) : (
                  <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2 py-1">
                    Partial Closure
                  </span>
                )}
              </div>

              <h4 className="fw-bold mb-1">{activeEvent.title}</h4>
              <p className="text-muted mb-3">
                <i className="fa-solid fa-location-dot me-2 text-primary"></i>
                Facility: <strong>{activeEvent.amenityName}</strong>
                {activeEvent.resourceName && (
                  <span>
                    {' '}
                    &bull; Resource: <strong>{activeEvent.resourceName}</strong>
                  </span>
                )}
              </p>
            </div>

            <div className="bg-body-secondary p-3 rounded mb-4 shadow-sm border border-opacity-50">
              <CRow className="g-3">
                <CCol xs={12}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Block ID</div>
                  <div className="fw-semibold text-break">{activeEvent.bookingId}</div>
                </CCol>
                <CCol xs={12}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Date</div>
                  <div className="fw-semibold">
                    {new Date(activeEvent.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Time Window</div>
                  <div className="fw-semibold">
                    {activeEvent.start} - {activeEvent.end}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Duration</div>
                  <div className="fw-semibold">
                    {activeEvent.duration ? `${activeEvent.duration} mins` : '-'}
                  </div>
                </CCol>
                {(activeEvent.bufferBeforeMinutes > 0 || activeEvent.bufferAfterMinutes > 0) && (
                  <CCol xs={12}>
                    <div className="small text-muted text-uppercase fw-bold mb-1">Buffers</div>
                    <div className="small text-muted">
                      {activeEvent.bufferBeforeMinutes > 0 &&
                        `Before: ${activeEvent.bufferBeforeMinutes}m `}
                      {activeEvent.bufferAfterMinutes > 0 &&
                        `After: ${activeEvent.bufferAfterMinutes}m`}
                    </div>
                  </CCol>
                )}
              </CRow>
            </div>

            {activeEvent.reason && (
              <div className="mb-3">
                <h6 className="fw-bold text-muted text-uppercase mb-2 small">Reason</h6>
                <div className="p-3 bg-light rounded border text-body small">
                  {activeEvent.reason}
                </div>
              </div>
            )}

            {activeEvent.notes && (
              <div className="mb-4">
                <h6 className="fw-bold text-muted text-uppercase mb-2 small">Internal Notes</h6>
                <div className="p-3 bg-light rounded border text-muted small">
                  {activeEvent.notes}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h4 className="fw-bold mb-1">{activeEvent.amenityName}</h4>
              {activeEvent.resourceName && (
                <div className="text-primary fw-semibold small mb-2">
                  <i className="fa-solid fa-cube me-1"></i>Resource: {activeEvent.resourceName}
                </div>
              )}
              <p className="text-muted mb-1">
                <i className="fa-solid fa-user me-2"></i>Resident:{' '}
                <strong>{activeEvent.residentName}</strong>
              </p>
              <p className="text-muted mb-2">
                <i className="fa-solid fa-house me-2"></i>Unit:{' '}
                <strong>
                  {activeEvent.flatNumber} {activeEvent.building ? `- ${activeEvent.building}` : ''}{' '}
                  {activeEvent.tower ? `(${activeEvent.tower})` : ''}
                </strong>
              </p>
              {activeEvent.phoneNumber && (
                <p className="text-muted mb-3 small">
                  <i className="fa-solid fa-phone me-2"></i>
                  {activeEvent.phoneNumber}
                </p>
              )}

              <div className="d-flex align-items-center gap-2 mt-2">
                <AmenityStatusBadge status={activeEvent.status} />
                {activeEvent.paymentStatus && (
                  <span
                    className={`badge px-2 py-1 ${
                      activeEvent.paymentStatus === 'PAID'
                        ? 'bg-success text-white'
                        : activeEvent.paymentStatus === 'PARTIALLY_PAID'
                          ? 'bg-warning text-dark'
                          : activeEvent.paymentStatus === 'PENDING'
                            ? 'bg-danger text-white'
                            : 'bg-secondary text-white'
                    }`}
                  >
                    Payment: {activeEvent.paymentStatus}
                  </span>
                )}
              </div>

              {String(activeEvent.status).toLowerCase() === 'cancelled' && (
                <div className="mt-3 p-3 bg-danger bg-opacity-10 rounded border border-danger border-opacity-25">
                  <div className="text-danger fw-bold small text-uppercase mb-1">
                    <i className="fa-solid fa-circle-info me-1"></i>Cancellation Info
                  </div>
                  <div className="text-danger small">
                    {activeEvent.cancellationReason || 'Cancelled by admin or user'}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-body-secondary p-3 rounded mb-3 shadow-sm border border-opacity-50">
              <CRow className="g-3">
                <CCol xs={12}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">
                    Reservation / Booking ID
                  </div>
                  <div className="fw-semibold text-break">{activeEvent.bookingId}</div>
                </CCol>
                <CCol xs={12}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Date</div>
                  <div className="fw-semibold">
                    {new Date(activeEvent.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Time</div>
                  <div className="fw-semibold">
                    {activeEvent.start} - {activeEvent.end}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Duration</div>
                  <div className="fw-semibold">
                    {activeEvent.duration ? `${activeEvent.duration} mins` : '-'}
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">Persons</div>
                  <div className="fw-semibold">{activeEvent.numberOfPersons} Person(s)</div>
                </CCol>
                <CCol xs={6}>
                  <div className="small text-muted text-uppercase fw-bold mb-1">QR Status</div>
                  <div className="fw-semibold text-capitalize">{activeEvent.qrStatus || 'N/A'}</div>
                </CCol>
              </CRow>
            </div>

            <div className="bg-light p-3 rounded mb-4 border">
              <h6 className="fw-bold text-muted text-uppercase mb-3 small">Financial Breakdown</h6>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Total Fee:</span>
                <span className="fw-bold">
                  ₹{activeEvent.pricingDetails?.totalAmount ?? activeEvent.bookingAmount ?? 0}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Paid Amount:</span>
                <span className="text-success fw-semibold">
                  ₹{activeEvent.pricingDetails?.paidAmount ?? activeEvent.paidAmount ?? 0}
                </span>
              </div>
              {(activeEvent.pricingDetails?.remainingAmount > 0 ||
                activeEvent.remainingAmount > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Remaining Balance:</span>
                  <span className="text-danger fw-bold">
                    ₹
                    {activeEvent.pricingDetails?.remainingAmount ??
                      activeEvent.remainingAmount ??
                      0}
                  </span>
                </div>
              )}
              {(activeEvent.pricingDetails?.depositAmount > 0 || activeEvent.depositAmount > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Security Deposit:</span>
                  <span className="fw-semibold">
                    ₹{activeEvent.pricingDetails?.depositAmount ?? activeEvent.depositAmount ?? 0}
                  </span>
                </div>
              )}
            </div>

            <hr />

            <h6 className="fw-bold text-muted text-uppercase mt-4 mb-3 small">Check-in Status</h6>
            <div className="mb-4">
              {activeEvent.checkInStatus === 'entered' ? (
                <div>
                  <div className="text-success fw-bold mb-1">
                    <i className="fa-solid fa-check-circle me-2"></i>Checked In
                  </div>
                  {activeEvent.checkInTime && (
                    <div className="small text-muted">
                      Time: {new Date(activeEvent.checkInTime).toLocaleString()}
                    </div>
                  )}
                  {activeEvent.guardName && (
                    <div className="small text-muted">By: {activeEvent.guardName}</div>
                  )}
                </div>
              ) : (
                <div className="text-muted">
                  <i className="fa-solid fa-clock me-2"></i>Pending Check-in
                </div>
              )}
            </div>

            <div className="d-grid gap-2 mt-auto pt-4">
              {String(activeEvent.status).toUpperCase() === 'CONFIRMED' && (
                <CButton
                  color="danger"
                  variant="outline"
                  onClick={() => onCancelClick(activeEvent)}
                >
                  Cancel Reservation
                </CButton>
              )}
            </div>
          </div>
        )}
      </COffcanvasBody>
    </COffcanvas>
  )
})

export default CalendarEventDrawer
