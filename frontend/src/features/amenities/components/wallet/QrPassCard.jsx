import React, { memo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import QRCode from 'react-qr-code';

const QrPassCard = memo(({ booking }) => {
  if (!booking) return null;

  return (
    <CCard className="border-0 shadow-sm mb-4 bg-primary text-white overflow-hidden position-relative">
      {/* Decorative circles */}
      <div className="position-absolute rounded-circle bg-white opacity-10" style={{ width: '200px', height: '200px', top: '-50px', right: '-50px' }}></div>
      <div className="position-absolute rounded-circle bg-white opacity-10" style={{ width: '100px', height: '100px', bottom: '-20px', left: '-20px' }}></div>
      
      <CCardBody className="p-4 p-md-5 text-center position-relative" style={{ zIndex: 1 }}>
        <h5 className="fw-bold mb-1 opacity-75 text-uppercase" style={{ letterSpacing: '2px' }}>Digital Access Pass</h5>
        <h3 className="fw-bold mb-4">{booking.amenityName}</h3>

        <div className="bg-white p-3 rounded d-inline-block shadow mb-4">
          <QRCode
            value={booking.qrPayload}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="Q"
          />
        </div>

        <p className="small opacity-75 mb-0">Present this QR code to the scanner or security personnel at the amenity entrance.</p>
      </CCardBody>
    </CCard>
  );
});

export default QrPassCard;
