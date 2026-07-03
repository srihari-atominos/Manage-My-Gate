import React, { memo } from 'react';
import { CCard, CCardBody, CButton, CRow, CCol } from '@coreui/react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';

const ScanResultCard = memo(({ result, onReset }) => {
  if (!result) return null;

  const isSuccess = result.success;
  const booking = result.booking || {};

  return (
    <CCard className={`border-0 shadow-sm text-center h-100 d-flex flex-column justify-content-center ${isSuccess ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`} style={{ minHeight: '300px' }}>
      <CCardBody className="p-4 p-md-5 d-flex flex-column align-items-center justify-content-center">
        
        <div className={`rounded-circle bg-white d-inline-flex align-items-center justify-content-center shadow-sm mb-4 ${isSuccess ? 'text-success' : 'text-danger'}`} style={{ width: '80px', height: '80px' }}>
          <i className={`fa-solid fs-1 ${isSuccess ? 'fa-check-double' : 'fa-triangle-exclamation'}`}></i>
        </div>
        
        <h4 className={`fw-bold mb-3 ${isSuccess ? 'text-success' : 'text-danger'}`}>
          {isSuccess ? 'Check-In Successful' : 'Verification Failed'}
        </h4>
        
        <p className="mb-4 opacity-75">{result.message}</p>

        {isSuccess && (
          <div className="bg-white p-4 rounded w-100 text-start shadow-sm mb-4">
            <h5 className="fw-bold mb-3">{booking.amenity?.name || 'Amenity'}</h5>
            <CRow className="g-3">
              <CCol xs={6}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Time</div>
                <div className="fw-semibold">{booking.startTime || 'N/A'} - {booking.endTime || 'N/A'}</div>
              </CCol>
              <CCol xs={6}>
                <div className="small text-muted text-uppercase fw-bold mb-1">Status</div>
                <AmenityStatusBadge status={booking.checkInStatus || 'checked_in'} />
              </CCol>
            </CRow>
          </div>
        )}

        <CButton color={isSuccess ? 'success' : 'danger'} size="lg" className="px-5 rounded-pill shadow-sm mt-auto" onClick={onReset}>
          Scan Next Pass
        </CButton>
      </CCardBody>
    </CCard>
  );
});

export default ScanResultCard;
