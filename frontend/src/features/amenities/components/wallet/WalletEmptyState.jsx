import React, { memo } from 'react';
import { CCard, CCardBody, CButton } from '@coreui/react';
import { useNavigate } from 'react-router-dom';

const WalletEmptyState = memo(() => {
  const navigate = useNavigate();

  return (
    <CCard className="border-0 shadow-sm text-center bg-body-secondary">
      <CCardBody className="p-5">
        <div className="mb-4">
          <div className="rounded-circle bg-body text-muted d-inline-flex align-items-center justify-content-center shadow-sm" style={{ width: '80px', height: '80px' }}>
            <i className="fa-solid fa-qrcode fs-1 opacity-50"></i>
          </div>
        </div>
        <h4 className="fw-bold mb-3">No Active Passes</h4>
        <p className="text-muted mb-4 max-w-md mx-auto">
          You don't have any upcoming confirmed bookings. Book an amenity to generate a digital access pass.
        </p>
      </CCardBody>
    </CCard>
  );
});

export default WalletEmptyState;
