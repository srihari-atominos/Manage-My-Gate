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
    recentScans,
    handleScan,
    handleManualEntry,
    resetScanner
  } = useSecurityScanner();

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 style={{ margin: 0 }} className="fs-1">Security Scanner</h1>
            <p className="text-muted mt-1 mb-0">Validate resident bookings for amenity access</p>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        {scanResult ? (
          <ScanResultCard result={scanResult} onReset={resetScanner} />
        ) : (
          <>
            <div className="row g-4 mb-4">
              {/* Left Panel: Scanner */}
              <div className="col-lg-6">
                <div className="card h-100 p-4 border-0 shadow-sm">
                  <h5 className="fw-semibold mb-3" >Scanner</h5>
                  <div className="bg-body-secondary p-3 rounded mb-4 text-center">
                    {loading ? (
                      <ScannerLoading />
                    ) : (
                      <ScannerCamera onScan={handleScan} />
                    )}
                  </div>
                  <h6 className="fw-semibold mb-2" >Manual Entry</h6>
                  <ScannerFallback onSubmit={handleManualEntry} />
                </div>
              </div>

              {/* Right Panel: Last Scan Details (using the top of recentScans or null if none) */}
              <div className="col-lg-6">
                <div className="card h-100 p-4 border-0 shadow-sm bg-body-secondary">
                  <h5 className="fw-semibold mb-3" >Last Scan Details</h5>
                  {recentScans && recentScans.length > 0 ? (
                    <div className="last-scan-details">
                      <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-body rounded border">
                        <img 
                          src={recentScans[0].residentPhoto || 'https://via.placeholder.com/60'} 
                          alt="Resident" 
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <h6 className="mb-0 fw-bold">{recentScans[0].residentName}</h6>
                          <small className="text-muted">Resident</small>
                        </div>
                      </div>
                      
                      <div className="bg-body p-3 rounded border mb-3">
                        <h6 className="fw-bold mb-3 border-bottom pb-2">Booking Info</h6>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted small">Booking ID</span>
                          <span className="fw-medium small">{recentScans[0].bookingId}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted small">Amenity</span>
                          <span className="fw-medium small">{recentScans[0].amenityName}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted small">Scan Type</span>
                          <span className={`badge ${recentScans[0].scanType === 'Exit' ? 'bg-info' : 'bg-success'}`}>{recentScans[0].scanType}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted small">Scan Time</span>
                          <span className="fw-medium small">{new Date(recentScans[0].scanTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                      <i className="fa-solid fa-qrcode fa-3x mb-3 opacity-25"></i>
                      <p>Scan a QR code to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Panel: Recent Scan History */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-semibold mb-4" >Recent Scan History</h5>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Time</th>
                        <th>Resident</th>
                        <th>Booking ID</th>
                        <th>Amenity</th>
                        <th>Scan Type</th>
                        <th>Result</th>
                        <th>Guard Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans && recentScans.length > 0 ? (
                        recentScans.map((scan) => (
                          <tr key={scan._id}>
                            <td className="text-muted small fw-medium">{new Date(scan.scanTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="fw-medium">{scan.residentName}</td>
                            <td className="text-primary fw-medium small">{scan.bookingId}</td>
                            <td>{scan.amenityName}</td>
                            <td>
                              <span className={`badge ${scan.scanType === 'Exit' ? 'badge-info' : 'badge-success'}`}>
                                {scan.scanType}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-success text-white"><i className="fa-solid fa-check me-1"></i> {scan.result}</span>
                            </td>
                            <td className="text-muted small">{scan.guardName}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">No recent scans today.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityScannerView;
