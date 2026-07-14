import React, { memo } from 'react';
import { CCard, CCardBody, CRow, CCol } from '@coreui/react';
import QRCode from 'react-qr-code';

const QrPassCard = memo(({ booking, onCancel }) => {
  if (!booking) return null;

  const formattedDate = booking.date 
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  // Calculate duration if not provided
  let duration = '60 Minutes';
  if (booking.startTime && booking.endTime) {
    const start = new Date(`2000-01-01T${booking.startTime}`);
    const end = new Date(`2000-01-01T${booking.endTime}`);
    const diffMins = Math.round((end - start) / 60000);
    if (diffMins > 0) duration = `${diffMins} Minutes`;
  }

  return (
    <CCard className="border-0 shadow-sm mb-4 overflow-hidden position-relative h-100">
      <div className="bg-primary position-absolute w-100" style={{ height: '140px', top: 0, left: 0, zIndex: 0 }}>
        {/* Decorative circles */}
        <div className="position-absolute rounded-circle bg-white opacity-10" style={{ width: '200px', height: '200px', top: '-50px', right: '-50px' }}></div>
      </div>
      
      <CCardBody className="p-0 position-relative d-flex flex-column" style={{ zIndex: 1 }}>
        <div className="p-4 text-center text-white">
          <h5 className="fw-bold mb-1 opacity-75 text-uppercase" >Digital Access Pass</h5>
          <div className="d-flex align-items-center justify-content-center gap-3 mt-2">
            {booking.amenityImage && (
              <img 
                src={booking.amenityImage} 
                alt={booking.amenityName} 
                className="rounded-circle shadow-sm border border-white"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
            )}
            <h4 className="fw-bold mb-0">{booking.amenityName}</h4>
          </div>
        </div>

        <div className="bg-white p-4 mx-4 rounded shadow-sm text-center" style={{ marginTop: '-20px' }}>
          <div className="d-inline-block p-2 border rounded bg-white">
            {booking.qrPayload?.startsWith('data:image') ? (
              <img src={booking.qrPayload} alt="QR Code" width={160} height={160} />
            ) : (
              <QRCode
                value={booking.qrPayload || 'invalid'}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
              />
            )}
          </div>
          <div className="mt-3">
            <span className="small text-muted text-uppercase fw-bold">Booking ID</span>
            <div className="fw-bold font-monospace fs-5">{booking.bookingId || 'N/A'}</div>
          </div>
        </div>

        <div className="p-4 flex-grow-1">
          <CRow className="g-3">
            <CCol xs={12}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Valid On</div>
              <div className="fw-semibold">{formattedDate}</div>
            </CCol>
            <CCol xs={4}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Entry</div>
              <div className="fw-semibold text-success">{booking.startTime}</div>
            </CCol>
            <CCol xs={4}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Exit</div>
              <div className="fw-semibold text-danger">{booking.endTime}</div>
            </CCol>
            <CCol xs={4}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Duration</div>
              <div className="fw-semibold">{duration}</div>
            </CCol>
            <CCol xs={12}>
              <hr className="my-1 text-muted opacity-25" />
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Payment</div>
              <span className={`badge ${booking.paymentStatus === 'success' ? 'bg-success' : 'bg-warning text-dark'}`}>
                {booking.paymentStatus || 'Pending'}
              </span>
            </CCol>
            <CCol xs={6}>
              <div className="small text-muted text-uppercase fw-bold mb-1">Status</div>
              {(() => {
                if (booking.qrStatus === 'expired') return <span className="badge bg-danger">Expired</span>;
                if (booking.status === 'cancelled') return <span className="badge bg-danger">Cancelled</span>;
                if (booking.status === 'completed') return <span className="badge bg-secondary">Completed</span>;
                if (booking.status === 'checked-in') return <span className="badge bg-success">In Use</span>;
                if (booking.status === 'confirmed') return <span className="badge bg-primary">Active</span>;
                return <span className="badge bg-secondary">{booking.status || 'Unknown'}</span>;
              })()}
            </CCol>
            {onCancel && (
              <CCol xs={12} className="mt-3">
                <button 
                  className="btn btn-outline-danger btn-sm w-100" 
                  onClick={() => onCancel(booking)}
                >
                  Cancel Booking
                </button>
              </CCol>
            )}
          </CRow>
        </div>
        
        {booking.qrStatus === 'expired' && (
          <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" style={{ top: 0, left: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            <div className="badge bg-danger fs-4 shadow px-4 py-2" style={{ transform: 'rotate(-15deg)' }}>EXPIRED</div>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
});

export default QrPassCard;
