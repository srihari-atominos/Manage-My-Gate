import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { CButton, CFormInput, CFormSelect } from '@coreui/react';

export const GuardScannerConsole = ({ passes, liveEntries, onCheckInSuccess, onCheckOutSuccess }) => {
  const [scannerMode, setScannerMode] = useState('camera'); // 'camera' | 'search'
  
  // Scanned / Selected Pass State
  const [matchedPass, setMatchedPass] = useState(null);
  const [typedCode, setTypedCode] = useState('');

  // Perform search / verify logic
  const handleVerifyCode = (code) => {
    if (!code || !code.trim()) {
      toast.error('Please enter or select a valid pass code.');
      return;
    }

    const cleaned = code.trim().toLowerCase();
    const found = passes.find(p => 
      p.id?.toLowerCase() === cleaned || 
      p._id?.toLowerCase() === cleaned ||
      p.visitorDetails?.name?.toLowerCase().includes(cleaned) ||
      p.visitorName?.toLowerCase().includes(cleaned)
    );

    if (found) {
      setMatchedPass(found);
      const isInside = isVisitorCurrentlyInside(found);
      if (isInside) {
        toast.success(`Pass verified! Resident host currently inside.`);
      } else {
        if (found.status === 'ACTIVE' || found.status === 'Active') {
          toast.success(`Pass verified! Access Approved for ${found.visitorName || found.visitorDetails?.name}.`);
        } else {
          toast.error(`Pass Status is ${found.status}. Access Blocked.`);
        }
      }
    } else {
      setMatchedPass(null);
      toast.error('Invalid pass: No matching pre-approved invitation found.');
    }
  };

  // Check if visitor is inside
  const isVisitorCurrentlyInside = (pass) => {
    if (!pass) return false;
    const passIdStr = (pass._id || pass.id)?.toString();
    return liveEntries.some(entry => {
      const entryPassId = (entry.passId?._id || entry.passId || entry.passIdId)?.toString();
      return entryPassId === passIdStr;
    });
  };

  // Find active log ID for checkout
  const getActiveLogId = (pass) => {
    if (!pass) return null;
    const passIdStr = (pass._id || pass.id)?.toString();
    const matched = liveEntries.find(entry => {
      const entryPassId = (entry.passId?._id || entry.passId || entry.passIdId)?.toString();
      return entryPassId === passIdStr;
    });
    return matched ? matched.id || matched._id : null;
  };

  // Actions
  const handleCheckIn = () => {
    if (!matchedPass) return;
    onCheckInSuccess({
      passId: matchedPass._id || matchedPass.id,
      visitorName: matchedPass.visitorName || matchedPass.visitorDetails?.name,
      type: matchedPass.passType || matchedPass.method || 'GUEST',
      villa: 'Villa 101',
      resident: 'Resident Host',
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'INSIDE',
      guard: 'Officer Ramesh'
    });
    setMatchedPass(null);
    setTypedCode('');
  };

  const handleCheckOut = () => {
    if (!matchedPass) return;
    const logId = getActiveLogId(matchedPass);
    if (logId) {
      onCheckOutSuccess(logId);
    } else {
      toast.error('Failed to locate live entry log for checkout.');
    }
    setMatchedPass(null);
    setTypedCode('');
  };

  const activePasses = passes.filter(p => p.status === 'ACTIVE' || p.status === 'Active');

  return (
    <div className="dashboard-grid">
      
      {/* Left Box: Scanner / Type Selector Console */}
      <div style={{ flex: 1.2 }}>
        <div className="card invite-form-card" style={{ minHeight: '380px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', margin: 0, fontWeight: '700' }}>
              <i className="fa-solid fa-camera" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
              Security Gate Scanner Console
            </h3>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <CButton 
                size="sm" 
                color={scannerMode === 'camera' ? 'primary' : 'light'} 
                onClick={() => { setScannerMode('camera'); setMatchedPass(null); }}
              >
                Scan QR Code
              </CButton>
              <CButton 
                size="sm" 
                color={scannerMode === 'search' ? 'primary' : 'light'} 
                onClick={() => { setScannerMode('search'); setMatchedPass(null); }}
              >
                Search / Type Code
              </CButton>
            </div>
          </div>

          {scannerMode === 'camera' ? (
            /* Mode 1: QR Camera Scanner Simulator */
            <div className="scanner-viewfinder-wrapper">
              <div className="scanner-viewfinder">
                {/* Flashing scanner line */}
                <div className="scanner-glow-line" />

                <div style={{ zIndex: 1, textAlign: 'center', color: '#94A3B8', padding: '16px' }}>
                  <i className="fa-solid fa-qrcode" style={{ fontSize: '64px', color: '#334155', marginBottom: '12px' }}></i>
                  <div style={{ fontSize: '11px', fontWeight: '600' }}>CAMERA PREVIEW</div>
                </div>
              </div>

              {/* Simulated camera select trigger */}
              <div style={{ width: '100%', maxWidth: '320px', marginTop: '20px' }}>
                <CFormSelect
                  onChange={(e) => handleVerifyCode(e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="">-- Choose QR to Mock Scan --</option>
                  {activePasses.map(p => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.visitorName || p.visitorDetails?.name} ({p.id || p._id?.substring(0,6)})
                    </option>
                  ))}
                </CFormSelect>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
                  Select an active pass from the list to mock camera scan detection.
                </div>
              </div>

            </div>
          ) : (
            /* Mode 2: Search/Type ID Details */
            <div style={{ padding: '20px 0' }}>
              <div className="mb-4">
                <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Enter Visitor Details / Pass Code / QR number
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <CFormInput 
                    type="text" 
                    placeholder="e.g. G-10029, Alice, Robert" 
                    value={typedCode}
                    onChange={(e) => setTypedCode(e.target.value)}
                  />
                  <CButton 
                    color="primary" 
                    style={{ whiteSpace: 'nowrap', fontWeight: '600' }}
                    onClick={() => handleVerifyCode(typedCode)}
                  >
                    Verify Pass
                  </CButton>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-light)', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>How to Verify:</div>
                Type the Guest's Name, QR Code string (e.g. `G-10029`), or vehicle number to manually lookup active gate tickets.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right Box: Scanned Code Details Summary */}
      <div style={{ flex: 0.8 }}>
        <div className="card" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)' }}>
          {matchedPass ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', gap: '10px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Pass Verification Results
                  </span>
                </div>

                <div className={`scanner-status-banner ${isVisitorCurrentlyInside(matchedPass) ? 'inside' : 'outside'}`}>
                  {isVisitorCurrentlyInside(matchedPass) ? (
                    <>
                      <i className="fa-solid fa-person-walking-arrow-right" style={{ fontSize: '32px', color: '#2563EB', marginBottom: '8px' }}></i>
                      <div style={{ fontWeight: '800', color: '#1E40AF', fontSize: '15px' }}>VISITOR CURRENTLY INSIDE</div>
                      <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '2px' }}>Check-in logged. Awaiting exit gate checkout.</div>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check" style={{ fontSize: '32px', color: '#059669', marginBottom: '8px' }}></i>
                      <div style={{ fontWeight: '800', color: '#065F46', fontSize: '15px' }}>ACCESS APPROVED</div>
                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>Pass is active. Allowed entry at gate.</div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Visitor:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{matchedPass.visitorName || matchedPass.visitorDetails?.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ticket Type:</span>
                    <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      {matchedPass.passType || matchedPass.method || 'GUEST'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Plate No:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {matchedPass.vehicleNumber || matchedPass.vehicleDetails?.number || '—'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <strong style={{ color: 'var(--success)' }}>{matchedPass.status}</strong>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px' }}>
                {isVisitorCurrentlyInside(matchedPass) ? (
                  <CButton 
                    color="danger" 
                    onClick={handleCheckOut}
                    style={{ width: '100%', fontWeight: '700', padding: '12px 0' }}
                  >
                    <i className="fa-solid fa-door-open" style={{ marginRight: '8px' }}></i>
                    Confirm Gate Check-Out
                  </CButton>
                ) : (
                  <CButton 
                    color="success" 
                    onClick={handleCheckIn}
                    disabled={matchedPass.status !== 'ACTIVE' && matchedPass.status !== 'Active'}
                    style={{ width: '100%', color: '#fff', fontWeight: '700', padding: '12px 0' }}
                  >
                    <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '8px' }}></i>
                    Confirm Gate Check-In
                  </CButton>
                )}
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-light)', textAlign: 'center', padding: '24px' }}>
              <i className="fa-solid fa-file-invoice" style={{ fontSize: '48px', color: '#E2E8F0', marginBottom: '16px' }}></i>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)', margin: '0 0 4px' }}>No Pass Loaded</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>Scan QR or type a verification code to inspect ticket credentials.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default GuardScannerConsole;
