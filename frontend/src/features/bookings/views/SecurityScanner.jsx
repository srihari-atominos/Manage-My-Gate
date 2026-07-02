import React, { useState } from 'react';
import '../../amenities/styles/_amenities.scss';
import { useBookings } from '../hooks/useBookings.js';

export const SecurityScanner = () => {
  const { updateStatus } = useBookings();
  const [scanResult, setScanResult] = useState(null);

  // Mocking the QR scanner behavior
  const simulateScan = () => {
    // In reality, this would extract the booking ID from the QR code via device camera
    // Here we'll just prompt for a Booking ID string to test the API wire-up
    const bookingId = window.prompt("Simulate Scan: Enter a Booking ID to check-in:");
    if (bookingId) {
      updateStatus(bookingId, 'Checked-In')
        .then((res) => setScanResult({ status: 'success', data: res }))
        .catch((err) => setScanResult({ status: 'error', error: err }));
    }
  };

  return (
    <div className="amenity-feature-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '28px' }}>Checkpoint Scanner</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '15px', fontWeight: 500 }}>
          Scan resident QR codes to grant physical access.
        </p>

        <div className="scanner-ui" onClick={simulateScan}>
          <div className="scanner-frame"></div>
          <p style={{ position: 'absolute', bottom: '32px', width: '100%', color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>
            (Click to simulate scan)
          </p>
        </div>

        {scanResult && scanResult.status === 'success' && (
          <div className="card" style={{ marginTop: '-40px', position: 'relative', zIndex: 10, border: '2px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '16px' }}>VALID PASS</span>
                <h3 style={{ fontSize: '22px', margin: 0 }}>Booking #{scanResult.data._id.substring(scanResult.data._id.length - 6).toUpperCase()}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontWeight: 600, marginTop: '8px' }}>
                  Checked In Successfully
                </p>
              </div>
              <i className="fa-solid fa-circle-check fa-3x" style={{ color: 'var(--success)' }}></i>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setScanResult(null)}>
              Reset Scanner
            </button>
          </div>
        )}

        {scanResult && scanResult.status === 'error' && (
          <div className="card" style={{ marginTop: '-40px', position: 'relative', zIndex: 10, border: '2px solid var(--danger)' }}>
            <h3 style={{ color: 'var(--danger)', margin: 0 }}>Scan Failed</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{scanResult.error}</p>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '24px' }} onClick={() => setScanResult(null)}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityScanner;
