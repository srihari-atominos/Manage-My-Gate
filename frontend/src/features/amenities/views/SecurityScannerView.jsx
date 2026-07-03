import React from 'react';

import useSecurityScanner from '../hooks/useSecurityScanner.js';
import ScannerCamera from '../components/scanner/ScannerCamera.jsx';
import ScannerFallback from '../components/scanner/ScannerFallback.jsx';
import ScanResultCard from '../components/scanner/ScanResultCard.jsx';
import { ScannerLoading } from '../components/scanner/ScannerStates.jsx';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import '../styles/_amenities.scss';

const SecurityScannerView = () => {
  const {
    scanResult,
    loading,
    error,
    handleScan,
    handleManualEntry,
    resetScanner
  } = useSecurityScanner();

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Security Scanner</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Verify resident bookings via QR pass</p>

        {error && <div className="alert alert-danger" style={{ marginBottom: '24px' }}>{error}</div>}

        {loading ? (
          <ScannerLoading />
        ) : scanResult ? (
          <ScanResultCard result={scanResult} onReset={resetScanner} />
        ) : (
          <div className="card">
            <div style={{ marginBottom: '24px' }}>
              <h5 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Scan QR Pass</h5>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Align the resident's QR code within the frame to verify their booking and check them in.</p>
            </div>
            
            <ScannerCamera onScan={handleScan} />
            <ScannerFallback onSubmit={handleManualEntry} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityScannerView;
