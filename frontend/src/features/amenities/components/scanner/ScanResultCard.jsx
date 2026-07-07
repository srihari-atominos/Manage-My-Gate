import React, { memo, useEffect } from 'react';

const ScanResultCard = memo(({ result, onReset }) => {
  useEffect(() => {
    // Automatically close after 5 seconds
    const timer = setTimeout(() => {
      onReset();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onReset]);

  if (!result) return null;

  const isSuccess = result.success;
  const isExit = result.booking?.isExit;
  const booking = result.booking || {};
  const message = result.message || '';

  // Theme colors based on success or failure
  const bgColor = isSuccess ? 'bg-success' : 'bg-danger';
  const icon = isSuccess ? 'fa-check-circle' : 'fa-times-circle';
  const title = isSuccess 
    ? (isExit ? 'EXIT RECORDED' : 'ACCESS GRANTED') 
    : 'ACCESS DENIED';

  return (
    <div 
      className={`position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white ${bgColor}`} 
      style={{ zIndex: 9999, padding: '2rem' }}
    >
      <i className={`fa-solid ${icon} mb-4`} style={{ fontSize: '100px' }}></i>
      <h1 className="fw-bold mb-4" style={{ fontSize: '48px', letterSpacing: '2px', textAlign: 'center' }}>{title}</h1>
      
      {isSuccess ? (
        <div className="bg-white text-dark rounded-4 p-4 shadow-lg text-center" style={{ width: '100%', maxWidth: '400px' }}>
          {booking.userId?.profilePicture && (
            <img 
              src={booking.userId.profilePicture} 
              alt="Resident" 
              className="rounded-circle mb-3 shadow-sm"
              style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '-50px', border: '5px solid white' }}
            />
          )}
          <h3 className="fw-bold mb-1">{booking.userId?.name || 'Resident Name'}</h3>
          <p className="text-muted mb-4 small fw-semibold">ID: {booking.bookingId}</p>
          
          <div className="d-flex flex-column gap-2 text-start bg-light p-3 rounded-3 mb-4">
            <div className="d-flex justify-content-between border-bottom pb-2">
              <span className="text-muted fw-semibold">Amenity</span>
              <span className="fw-bold">{booking.amenityId?.name || 'Amenity'}</span>
            </div>
            <div className="d-flex justify-content-between border-bottom pb-2 pt-1">
              <span className="text-muted fw-semibold">Time</span>
              <span className="fw-bold">
                {isExit ? new Date(booking.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(booking.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="d-flex justify-content-between pt-1">
              <span className="text-muted fw-semibold">Security Guard</span>
              <span className="fw-bold">{booking.checkedInBy?.name || 'Security'}</span>
            </div>
          </div>

          <h5 className="text-success fw-bold mb-0">
            {isExit ? 'Visit Completed Successfully' : 'Entry Successful'}
          </h5>
        </div>
      ) : (
        <div className="bg-white text-dark rounded-4 p-4 shadow-lg text-center" style={{ width: '100%', maxWidth: '450px', borderTop: '8px solid #dc3545' }}>
          <div className="mb-4 mt-2">
            <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex align-items-center justify-content-center p-4 mb-3">
              <i className="fa-solid fa-triangle-exclamation text-danger" style={{ fontSize: '48px' }}></i>
            </div>
            <h3 className="fw-bold text-danger mb-2">Scan Rejected</h3>
            <p className="text-muted mb-0">The booking could not be validated</p>
          </div>
          
          <div className="bg-light rounded-3 p-4 mb-4 border border-danger border-opacity-25">
            <h5 className="fw-bold mb-0 lh-base" style={{ color: '#0b0f19' }}>{message}</h5>
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
  );
});

export default ScanResultCard;
