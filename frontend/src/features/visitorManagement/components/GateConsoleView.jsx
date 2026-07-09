import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const GateConsoleView = ({ passes, setPasses, onCheckInSuccess }) => {
  // QR Scan Scanner Simulator states
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState(null); // 'success' or 'fail'
  const [matchedPass, setMatchedPass] = useState(null);

  // Fallback search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Ad-hoc Walk-in states
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinPlate, setWalkinPlate] = useState('');
  const [walkinVilla, setWalkinVilla] = useState('');
  const [walkinPurpose, setWalkinPurpose] = useState('');
  const [walkinStatus, setWalkinStatus] = useState('idle'); // 'idle' | 'sending' | 'approved' | 'denied'

  // Handle mock scan verification
  const handleVerifyScan = (e) => {
    e.preventDefault();
    if (!scanCode.trim()) {
      toast.error('Please enter a Pass Code or scan QR.');
      return;
    }

    const found = passes.find(p => p.id.toLowerCase() === scanCode.trim().toLowerCase());
    
    if (found) {
      if (found.status === 'ACTIVE') {
        setScanResult('success');
        setMatchedPass(found);
        toast.success(`Access Granted for ${found.visitorName}!`);
      } else {
        setScanResult('fail');
        setMatchedPass(found);
        toast.error(`Access Denied: Pass is ${found.status}.`);
      }
    } else {
      setScanResult('fail');
      setMatchedPass(null);
      toast.error('Access Denied: Invalid or unregistered Pass Code.');
    }
  };

  const handleCheckInScanned = () => {
    if (matchedPass) {
      onCheckInSuccess({
        id: `L-${Math.floor(100 + Math.random() * 900)}`,
        visitorName: matchedPass.visitorName,
        type: matchedPass.method,
        villa: 'Villa 102', // Default destination
        resident: 'David Lee',
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOut: '—',
        status: 'INSIDE',
        guard: 'Officer Ramesh'
      });
      // Update pass usage
      setPasses(prev => prev.map(p => p.id === matchedPass.id ? { ...p, uses: '1 / 2' } : p));
      toast.success('Check-in logged successfully.');
      setScanCode('');
      setScanResult(null);
      setMatchedPass(null);
    }
  };

  // Fallback Search Handler
  const handleSearch = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = passes.filter(p => 
      p.visitorName.toLowerCase().includes(val.toLowerCase()) ||
      p.id.toLowerCase().includes(val.toLowerCase()) ||
      (p.details && p.details.toLowerCase().includes(val.toLowerCase()))
    );
    setSearchResults(filtered);
  };

  const handleCheckInFallback = (pass) => {
    if (pass.status !== 'ACTIVE') {
      toast.error('Cannot check-in. Pass is expired.');
      return;
    }
    onCheckInSuccess({
      id: `L-${Math.floor(100 + Math.random() * 900)}`,
      visitorName: pass.visitorName,
      type: pass.method,
      villa: 'Villa 102',
      resident: 'David Lee',
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOut: '—',
      status: 'INSIDE',
      guard: 'Officer Ramesh'
    });
    toast.success(`Allowed Entry for ${pass.visitorName}.`);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Ad-hoc Walk-in Handler
  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinVilla.trim() || !walkinPurpose.trim()) {
      toast.error('Please enter name, destination villa, and purpose of visit.');
      return;
    }

    setWalkinStatus('sending');
    toast.loading('Sending approval request to resident...', { id: 'walkin-req' });

    // Simulate resident approval after 4 seconds
    setTimeout(() => {
      setWalkinStatus('approved');
      toast.success('Resident Approved Entry!', { id: 'walkin-req' });
      
      onCheckInSuccess({
        id: `L-${Math.floor(100 + Math.random() * 900)}`,
        visitorName: walkinName,
        type: 'guest',
        villa: walkinVilla.includes('Villa') ? walkinVilla : `Villa ${walkinVilla}`,
        resident: 'David Lee', // default resident name
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOut: '—',
        status: 'INSIDE',
        guard: 'Officer Ramesh'
      });

      // Clear Form after 2 seconds
      setTimeout(() => {
        setWalkinName('');
        setWalkinPhone('');
        setWalkinPlate('');
        setWalkinVilla('');
        setWalkinPurpose('');
        setWalkinStatus('idle');
      }, 2000);
    }, 4000);
  };

  return (
    <div className="dashboard-grid" style={{ gap: '24px' }}>
      
      {/* Left Column: QR Code + Fallback Search */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Card 1: QR scan simulator */}
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>
            <i className="fa-solid fa-qrcode" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> QR Scan Simulator
          </h3>

          <form onSubmit={handleVerifyScan} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Scan/Type Pass Code (e.g. G-10029)" 
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>
              Verify Code
            </button>
          </form>

          {/* Scan result display */}
          {scanResult && (
            <div 
              style={{
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: scanResult === 'success' ? '#ECFDF5' : '#FEF2F2',
                border: `1px dashed ${scanResult === 'success' ? '#059669' : '#DC2626'}`,
                textAlign: 'center'
              }}
            >
              {scanResult === 'success' && matchedPass ? (
                <div>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '42px', color: '#059669', marginBottom: '12px' }}></i>
                  <h4 style={{ margin: 0, color: '#065F46', fontSize: '18px', fontWeight: '800' }}>ACCESS GRANTED</h4>
                  <p style={{ margin: '8px 0 16px', fontSize: '14px', color: '#047857' }}>
                    Pass verified for <strong>{matchedPass.visitorName}</strong>. Valid until {matchedPass.validity}.
                  </p>
                  <button 
                    onClick={handleCheckInScanned}
                    className="btn btn-success" 
                    style={{ fontWeight: '700', padding: '10px 24px', borderRadius: '8px' }}
                  >
                    Confirm Gate Check-In
                  </button>
                </div>
              ) : (
                <div>
                  <i className="fa-solid fa-circle-xmark" style={{ fontSize: '42px', color: '#DC2626', marginBottom: '12px' }}></i>
                  <h4 style={{ margin: 0, color: '#991B1B', fontSize: '18px', fontWeight: '800' }}>ACCESS DENIED</h4>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#B91C1C' }}>
                    {matchedPass ? `Pass state is "${matchedPass.status}".` : 'Invalid credentials. Pass code not registered.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Fallback Search */}
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', marginRight: '8px' }}></i> Fallback Search
          </h3>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by Plate, Name, ID Proof, or Phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ marginBottom: '16px' }}
          />

          {searchQuery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {searchResults.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                  No pre-approved passes match "{searchQuery}".
                </div>
              ) : (
                searchResults.map(pass => (
                  <div 
                    key={pass.id} 
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{pass.visitorName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                        Pass ID: {pass.id} &bull; {pass.details}
                      </div>
                    </div>
                    <button 
                      className={`btn ${pass.status === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
                      disabled={pass.status !== 'ACTIVE'}
                      onClick={() => handleCheckInFallback(pass)}
                    >
                      {pass.status === 'ACTIVE' ? 'Check-In' : 'Expired'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Ad-hoc Walk-in */}
      <div style={{ flex: 1 }}>
        <div className="card" style={{ borderTop: '4px solid var(--success)', height: '100%' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>
            <i className="fa-solid fa-walkie-talkie" style={{ color: 'var(--success)', marginRight: '8px' }}></i> Ad-Hoc Walk-In
          </h3>

          <form onSubmit={handleWalkInSubmit}>
            <div className="form-group">
              <label className="form-label">Visitor Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. David Miller"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                disabled={walkinStatus !== 'idle'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. +971 52 990 1209"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                disabled={walkinStatus !== 'idle'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle License Plate (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. DL-3C-AS-8812"
                value={walkinPlate}
                onChange={(e) => setWalkinPlate(e.target.value)}
                disabled={walkinStatus !== 'idle'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Destination Villa</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Villa 102"
                value={walkinVilla}
                onChange={(e) => setWalkinVilla(e.target.value)}
                disabled={walkinStatus !== 'idle'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Purpose of Visit</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Gas cylinder replacement"
                value={walkinPurpose}
                onChange={(e) => setWalkinPurpose(e.target.value)}
                disabled={walkinStatus !== 'idle'}
              />
            </div>

            {walkinStatus === 'idle' && (
              <button type="submit" className="btn btn-success w-100" style={{ marginTop: '20px', fontWeight: '700' }}>
                Request Resident Approval
              </button>
            )}

            {walkinStatus === 'sending' && (
              <div 
                style={{
                  marginTop: '20px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <div className="spinner-border text-warning spinner-border-sm" role="status"></div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400E' }}>
                  Waiting for Resident Approval...
                </span>
              </div>
            )}

            {walkinStatus === 'approved' && (
              <div 
                style={{
                  marginTop: '20px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  textAlign: 'center',
                  color: '#065F46',
                  fontWeight: '700',
                  fontSize: '14px'
                }}
              >
                <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i> APPROVED BY RESIDENT
              </div>
            )}
          </form>
        </div>
      </div>

    </div>
  );
};

export default GateConsoleView;
