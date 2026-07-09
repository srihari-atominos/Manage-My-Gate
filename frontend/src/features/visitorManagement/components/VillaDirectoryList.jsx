import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const VillaDirectoryList = ({ villas }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCall, setActiveCall] = useState(null); // stores villa object when calling

  const filteredVillas = villas.filter(v => 
    v.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.resident.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIntercomCall = (villa) => {
    setActiveCall(villa);
    toast.success(`Dailing intercom to ${villa.number} (${villa.resident})...`);
    
    // Auto hangup after 6 seconds to simulate call ending
    setTimeout(() => {
      setActiveCall(null);
    }, 6000);
  };

  return (
    <div className="card invite-form-card">
      <div className="live-entries-card-header">
        <h3 style={{ fontSize: '18px', margin: 0 }}>
          <i className="fa-solid fa-hotel" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Villa & Host Intercom Directory
        </h3>
        
        <input 
          type="text" 
          className="form-control" 
          placeholder="Search by Villa or Resident Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '280px', padding: '8px 12px', fontSize: '13px' }}
        />
      </div>

      <div className="villa-directory-grid">
        {filteredVillas.map(villa => (
          <div key={villa.id} className="villa-directory-card">
            <div>
              <div className="villa-directory-badge-wrap">
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{villa.number}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: villa.status === 'Occupied' ? '#EBF8FF' : '#EDF2F7', color: villa.status === 'Occupied' ? '#2B6CB0' : '#4A5568' }}>
                  {villa.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>
                Resident: {villa.resident}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                <i className="fa-solid fa-phone" style={{ marginRight: '4px' }}></i> {villa.phone}
              </div>
            </div>

            <button 
              className="villa-directory-intercom-btn" 
              disabled={villa.status !== 'Occupied'}
              onClick={() => handleIntercomCall(villa)}
              title="Call resident via intercom"
            >
              <i className="fa-solid fa-phone-volume"></i>
            </button>
          </div>
        ))}
      </div>

      {/* Simulated Intercom Call Modal/Overlay */}
      {activeCall && (
        <div className="intercom-modal-backdrop">
          <div className="intercom-modal-card">
            <div style={{ fontSize: '14px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Gate Intercom Outgoing Call
            </div>
            <h4 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>{activeCall.number}</h4>
            <p style={{ margin: '8px 0 30px', color: '#94A3B8', fontSize: '14px' }}>{activeCall.resident}</p>
            
            {/* Pulsing Intercom Phone Icon */}
            <div className="intercom-avatar-pulse">
              <i className="fa-solid fa-phone-volume"></i>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-danger" 
                style={{ 
                  borderRadius: '50px', 
                  padding: '12px 30px', 
                  fontWeight: '700',
                  backgroundColor: '#EF4444',
                  border: 'none'
                }}
                onClick={() => setActiveCall(null)}
              >
                Hang Up
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VillaDirectoryList;
