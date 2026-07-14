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
          <i className="fa-solid fa-hotel card-title-icon"></i> Villa & Host Intercom Directory
        </h3>
        
        <input 
          type="text" 
          className="form-control filter-input-search" 
          placeholder="Search by Villa or Resident..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '280px' }}
        />
      </div>

      <div className="villa-directory-grid">
        {filteredVillas.map(villa => (
          <div key={villa.id} className="villa-directory-card">
            <div>
              <div className="villa-directory-badge-wrap">
                <span className="table-cell-bold fs-5">{villa.number}</span>
                <span className={villa.status === 'Occupied' ? 'villa-status-occupied' : 'villa-status-vacant'}>
                  {villa.status}
                </span>
              </div>
              <div className="table-cell-muted mt-1">
                Resident: {villa.resident}
              </div>
              <div className="table-cell-sub">
                <i className="fa-solid fa-phone me-1"></i> {villa.phone}
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
            <div className="intercom-modal-title">
              Gate Intercom Outgoing Call
            </div>
            <h4 className="intercom-modal-number">{activeCall.number}</h4>
            <p className="intercom-modal-resident">{activeCall.resident}</p>
            
            {/* Pulsing Intercom Phone Icon */}
            <div className="intercom-avatar-pulse">
              <i className="fa-solid fa-phone-volume"></i>
            </div>

            <div className="d-flex justify-content-center">
              <button 
                className="btn btn-danger intercom-btn-hangup"
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
