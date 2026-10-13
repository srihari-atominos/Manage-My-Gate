import React, { memo, useEffect } from 'react'

const ScanResultCard = memo(({ result, onReset, onConfirmCheckOut }) => {
  const canCheckOut = Boolean(result?.canCheckOut)

  useEffect(() => {
    // Automatically close after 5 seconds only if not awaiting check-out confirmation
    if (canCheckOut) return

    const timer = setTimeout(() => {
      onReset()
    }, 5002)
    return () => clearTimeout(timer)
  }, [onReset, canCheckOut])

  if (!result) return null

  const isSuccess = result.success
  const isExit = result.pass?.isExit || result.booking?.isExit || result.isExit
  const booking = result.booking || {}
  const resident = result.resident || booking.userId || {}
  const facility = result.facility || booking.amenityId || {}
  const pass = result.pass || {}
  const guard = result.guard || booking.checkedInBy || {}
  const organisation = result.organisation || {}
  const message = result.message || ''

  // Theme colors based on success, failure, or prompt to checkout
  let bgColor = isSuccess ? 'bg-success' : 'bg-danger'
  let icon = isSuccess ? 'fa-check-circle' : 'fa-times-circle'
  let title = isSuccess ? (isExit ? 'EXIT RECORDED' : 'ACCESS GRANTED') : 'ACCESS DENIED'

  if (canCheckOut) {
    bgColor = 'bg-primary'
    icon = 'fa-arrow-right-from-bracket'
    title = 'RESIDENT CURRENTLY INSIDE'
  }

  const photoUrl = resident.photoUrl || resident.profilePicture || resident.avatar || null
  const residentName = resident.name || resident.username || 'Resident'
  const unitNumber =
    resident.unitNumber || resident.villaNumber || resident.unit || resident.flatNumber || 'N/A'
  const facilityName = facility.name || 'Amenity'
  const passCode = pass.passCode || booking.bookingId || booking.reservationNumber || 'N/A'
  const checkInTimestamp = pass.checkInTimestamp || booking.checkInTime || booking.checkedInAt
  const checkOutTimestamp = booking.checkOutTime

  return (
    <div
      className={`position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white ${bgColor}`}
      style={{ zIndex: 9999, padding: '2rem' }}
    >
      <i className={`fs-1 fa-solid ${icon} mb-4`}></i>
      <h1 className="fs-1 fw-bold mb-4" style={{ textAlign: 'center' }}>
        {title}
      </h1>

      {canCheckOut ? (
        <div
          className="bg-body text-body rounded-4 p-4 shadow-lg text-center"
          style={{ width: '100%', maxWidth: '440px', borderTop: '8px solid #0d6efd' }}
        >
          <div className="mb-3">
            <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3 mb-2">
              <i className="fs-2 fa-solid fa-person-walking-arrow-right text-primary"></i>
            </div>
            <h4 className="fw-bold text-primary mb-1">Exit Check-Out Confirmation</h4>
            <p className="text-muted small mb-0">
              Resident scanned again while inside the facility.
            </p>
          </div>

          <div className="bg-body-secondary p-3 rounded-3 text-start mb-4">
            <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
              <span className="text-muted small fw-semibold">Resident</span>
              <span className="fw-bold small">{residentName} ({unitNumber})</span>
            </div>
            <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
              <span className="text-muted small fw-semibold">Amenity</span>
              <span className="fw-bold small">{facilityName}</span>
            </div>
            <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
              <span className="text-muted small fw-semibold">Booking ID</span>
              <span className="fw-bold small text-primary">{passCode}</span>
            </div>
            {checkInTimestamp && (
              <div className="d-flex justify-content-between">
                <span className="text-muted small fw-semibold">Checked-In At</span>
                <span className="fw-medium small">
                  {new Date(checkInTimestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              className="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm"
              onClick={() => onConfirmCheckOut(result.token || passCode)}
            >
              <i className="fa-solid fa-arrow-right-from-bracket me-2"></i>
              Confirm Exit Check-Out
            </button>
            <button
              className="btn btn-light rounded-pill fw-semibold text-muted"
              onClick={onReset}
            >
              Keep Inside / Cancel
            </button>
          </div>
        </div>
      ) : isSuccess ? (
        <div
          className="bg-body text-body rounded-4 p-4 shadow-lg text-center"
          style={{ width: '100%', maxWidth: '420px' }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={residentName}
              className="rounded-circle mb-3 shadow-sm"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'cover',
                marginTop: '-50px',
                border: '5px solid white',
              }}
            />
          ) : (
            <div
              className="rounded-circle mb-3 shadow-sm bg-primary text-white d-inline-flex align-items-center justify-content-center fs-2 fw-bold"
              style={{
                width: '100px',
                height: '100px',
                marginTop: '-50px',
                border: '5px solid white',
              }}
            >
              {residentName.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="fw-bold mb-1">{residentName}</h3>
          <p className="text-muted mb-2 small fw-semibold">
            Unit/Villa: <span className="text-dark fw-bold">{unitNumber}</span>
          </p>
          <p className="text-muted mb-3 small">Pass ID: {passCode}</p>

          <div className="d-flex flex-column gap-2 text-start bg-body-secondary p-3 rounded-3 mb-4">
            <div className="d-flex justify-content-between border-bottom pb-2">
              <span className="text-muted fw-semibold">Facility</span>
              <span className="fw-bold">{facilityName}</span>
            </div>
            {organisation.name && (
              <div className="d-flex justify-content-between border-bottom pb-2 pt-1">
                <span className="text-muted fw-semibold">Community</span>
                <span className="fw-bold">{organisation.name}</span>
              </div>
            )}
            <div className="d-flex justify-content-between border-bottom pb-2 pt-1">
              <span className="text-muted fw-semibold">Time</span>
              <span className="fw-bold">
                {isExit
                  ? checkOutTimestamp
                    ? new Date(checkOutTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Now'
                  : checkInTimestamp
                    ? new Date(checkInTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Now'}
              </span>
            </div>
            <div className="d-flex justify-content-between pt-1">
              <span className="text-muted fw-semibold">Security Guard</span>
              <span className="fw-bold">{guard.name || guard.username || 'Security Guard'}</span>
            </div>
          </div>

          <h5 className="text-success fw-bold mb-3">
            {isExit ? 'Visit Completed Successfully' : 'Entry Validated Successfully'}
          </h5>

          <button
            className="btn btn-outline-secondary rounded-pill px-4 fw-semibold small"
            onClick={onReset}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div
          className="bg-body text-body rounded-4 p-4 shadow-lg text-center"
          style={{ width: '100%', maxWidth: '450px', borderTop: '8px solid #dc3545' }}
        >
          <div className="mb-4 mt-2">
            <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex align-items-center justify-content-center p-4 mb-3">
              <i className="fs-1 fa-solid fa-triangle-exclamation text-danger"></i>
            </div>
            <h3 className="fw-bold text-danger mb-2">Scan Rejected</h3>
            <p className="text-muted mb-0">The booking could not be validated</p>
          </div>

          <div className="bg-body-secondary rounded-3 p-4 mb-4 border border-danger border-opacity-25">
            <h5 className="fw-bold mb-0 lh-base" style={{ color: '#0b0f19' }}>
              {message}
            </h5>
          </div>

          <button
            className="btn btn-danger btn-lg rounded-pill px-5 fw-bold w-100 shadow-sm"
            onClick={onReset}
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  )
})

export default ScanResultCard
