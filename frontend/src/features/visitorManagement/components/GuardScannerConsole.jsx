import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { CButton, CFormInput, CFormSelect } from '@coreui/react';

export const GuardScannerConsole = ({ passes, liveEntries, onCheckInSuccess, onCheckOutSuccess }) => {
  const [scannerMode, setScannerMode] = useState('camera'); // 'camera' | 'search'
  
  // Scanned / Selected Pass State
  const [matchedPass, setMatchedPass] = useState(null);
  const [typedCode, setTypedCode] = useState('');

  // Check if pass dates and times are active
  const isPassDateActive = (pass) => {
    if (!pass || !pass.validity) return false;
    const now = new Date();
    const start = new Date(pass.validity.startDate);
    const end = new Date(pass.validity.endDate);
    
    // Check Date Range
    if (now < start || now > end) return false;
    
    // Check Time Window
    if (pass.validity.timeWindowStart && pass.validity.timeWindowEnd) {
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      if (currentTimeStr < pass.validity.timeWindowStart || currentTimeStr > pass.validity.timeWindowEnd) {
        return false;
      }
    }
    
    // Check Allowed Days
    if (pass.validity.allowedDays && pass.validity.allowedDays.length > 0) {
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday
      if (!pass.validity.allowedDays.includes(currentDay)) {
        return false;
      }
    }
    
    return true;
  };

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
        const isStatusActive = ['ACTIVE', 'Active', 'PENDING', 'Pending'].includes(found.status);
        const isDateActive = isPassDateActive(found);

        if (isStatusActive && isDateActive) {
          toast.success(`Pass verified! Access Approved for ${found.visitorName || found.visitorDetails?.name}.`);
        } else if (!isDateActive) {
          toast.error(`Access Blocked: Pass validity date range is not currently active.`);
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

  // Local loading state for double-click protection
  const [isLoading, setIsLoading] = useState(false);

  // Actions
  const handleCheckIn = async () => {
    if (!matchedPass || isLoading) return;
    setIsLoading(true);
    const success = await onCheckInSuccess({
      passId: matchedPass._id || matchedPass.id,
      visitorName: matchedPass.visitorName || matchedPass.visitorDetails?.name,
      type: matchedPass.passType || matchedPass.method || 'GUEST',
      villa: 'Villa 101',
      resident: 'Resident Host',
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'INSIDE',
      guard: 'Officer Ramesh'
    });
    setIsLoading(false);
    if (success) {
      setMatchedPass(null);
      setTypedCode('');
    }
  };

  const handleCheckOut = async () => {
    if (!matchedPass || isLoading) return;
    const logId = getActiveLogId(matchedPass);
    if (logId) {
      setIsLoading(true);
      const success = await onCheckOutSuccess(logId);
      setIsLoading(false);
      if (success) {
        setMatchedPass(null);
        setTypedCode('');
      }
    } else {
      toast.error('Failed to locate live entry log for checkout.');
    }
  };

  const activePasses = passes.filter(p => p.status === 'ACTIVE' || p.status === 'Active' || p.status === 'PENDING' || p.status === 'Pending');

  // Step 1: Evaluate if visitor is CURRENTLY INSIDE (Highest Priority)
  const isInside = matchedPass && (
    isVisitorCurrentlyInside(matchedPass) ||
    matchedPass.isInside ||
    matchedPass.activeEntryExists ||
    ['CHECKED_IN', 'Checked-in', 'IN_PREMISES', 'Inside', 'INSIDE'].includes(matchedPass.status)
  );

  // Step 2: Evaluate if pass is EXPIRED, REVOKED, or OUT OF USES (Second Priority, only if not inside)
  const isOutOfUses = matchedPass && matchedPass.usageLimit?.maxUses && matchedPass.usageLimit.currentUses >= matchedPass.usageLimit.maxUses;
  const isExpiredOrRevoked = matchedPass && !isInside && (
    ['EXPIRED', 'Expired', 'REVOKED', 'Revoked', 'COMPLETED', 'Completed'].includes(matchedPass.status) || 
    isOutOfUses ||
    !isPassDateActive(matchedPass)
  );

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
            /* Mode 2: Search/Type ID Details - Auto-submit on Enter keypress */
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(typedCode); }} style={{ padding: '20px 0' }}>
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
                    type="submit"
                    color="primary" 
                    style={{ whiteSpace: 'nowrap', fontWeight: '600' }}
                  >
                    Verify Pass
                  </CButton>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-light)', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>How to Verify:</div>
                Type the Guest's Name, QR Code string (e.g. `G-10029`), or vehicle number to manually lookup active gate tickets.
              </div>
            </form>
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

                <div className={`scanner-status-banner ${isExpiredOrRevoked ? 'blocked' : isInside ? 'inside' : 'outside'}`}>
                  {isExpiredOrRevoked ? (
                    <>
                      <i className="fa-solid fa-circle-xmark" style={{ fontSize: '32px', color: '#DC2626', marginBottom: '8px' }}></i>
                      <div style={{ fontWeight: '800', color: '#991B1B', fontSize: '15px' }}>ACCESS DENIED</div>
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>Pass Invalid or Expired. Access blocked at gate.</div>
                    </>
                  ) : isInside ? (
                    <>
                      <i className="fa-solid fa-person-walking-arrow-right" style={{ fontSize: '32px', color: '#2563EB', marginBottom: '8px' }}></i>
                      <div style={{ fontWeight: '800', color: '#1E40AF', fontSize: '15px' }}>CURRENTLY INSIDE</div>
                      <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '2px' }}>Awaiting exit check-out.</div>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check" style={{ fontSize: '32px', color: '#059669', marginBottom: '8px' }}></i>
                      <div style={{ fontWeight: '800', color: '#065F46', fontSize: '15px' }}>ACCESS APPROVED</div>
                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>Pass is active. Ready for Entry.</div>
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
                    <strong style={{ color: isExpiredOrRevoked ? 'var(--danger)' : isInside ? 'var(--info)' : 'var(--success)' }}>
                      {matchedPass.status}
                    </strong>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px' }}>
                {isExpiredOrRevoked ? (
                  <CButton 
                    color="secondary" 
                    disabled={true}
                    style={{ width: '100%', fontWeight: '700', padding: '12px 0', opacity: 0.6 }}
                  >
                    <i className="fa-solid fa-ban" style={{ marginRight: '8px' }}></i>
                    Gate Access Blocked
                  </CButton>
                ) : isInside ? (
                  <CButton 
                    color="warning" 
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    style={{ width: '100%', color: '#fff', fontWeight: '700', padding: '12px 0' }}
                  >
                    <i className="fa-solid fa-door-open" style={{ marginRight: '8px' }}></i>
                    {isLoading ? 'Processing checkout...' : 'Confirm Gate Check-Out'}
                  </CButton>
                ) : (
                  <CButton 
                    color="success" 
                    onClick={handleCheckIn}
                    disabled={isLoading || (matchedPass.status !== 'ACTIVE' && matchedPass.status !== 'Active' && matchedPass.status !== 'PENDING' && matchedPass.status !== 'Pending')}
                    style={{ width: '100%', color: '#fff', fontWeight: '700', padding: '12px 0' }}
                  >
                    <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '8px' }}></i>
                    {isLoading ? 'Processing check-in...' : 'Confirm Gate Check-In'}
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
