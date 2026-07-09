import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const BlacklistSettings = ({ blacklist, setBlacklist }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [reason, setReason] = useState('');

  const handleAddBlacklist = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Target name is required to create a blacklist entry.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Detailed reason is required to ban a profile.');
      return;
    }

    const newRecord = {
      id: `B-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone: phone.trim() || '—',
      plate: plate.trim() || '—',
      reason,
      dateAdded: new Date().toLocaleDateString()
    };

    setBlacklist(prev => [newRecord, ...prev]);
    toast.success('Banned profile registered successfully!');

    // Reset Form
    setName('');
    setPhone('');
    setPlate('');
    setReason('');
  };

  const handleRemoveBlacklist = (id) => {
    setBlacklist(blacklist.filter(item => (item.id || item._id) !== id));
  };

  return (
    <div className="dashboard-grid" style={{ gap: '24px' }}>
      
      {/* Left panel: Block Profile Form */}
      <div style={{ flex: 1 }}>
        <div className="card" style={{ borderTop: '4px solid var(--danger, #E74C3C)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-user-slash" style={{ color: 'var(--danger)', marginRight: '8px' }}></i> Add Banned Profile
          </h3>

          <form onSubmit={handleAddBlacklist}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Robert Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. +971 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Plate (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. DXB-88190"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Reason for Ban</label>
              <textarea 
                className="form-control" 
                rows="3"
                placeholder="Describe why this visitor or vehicle is blacklisted..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <button type="submit" className="btn btn-danger w-100" style={{ marginTop: '16px', fontWeight: '600' }}>
              Confirm & Block Profile
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: Active database log */}
      <div style={{ flex: 1.5 }}>
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-database" style={{ color: 'var(--text-muted)', marginRight: '8px' }}></i> Active Blacklist Database ({blacklist.length})
          </h3>

          {blacklist.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '42px', color: 'var(--success)', marginBottom: '12px' }}></i>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Blacklist is empty</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>No profiles or vehicles are currently banned.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {blacklist.map(record => {
                const recordId = record.id || record._id;
                const recordDate = record.dateAdded || (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—');

                return (
                  <div 
                    key={recordId} 
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FED7D7',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#9B2C2C' }}>{record.name}</h4>
                        <span style={{ fontSize: '11px', color: '#9B2C2C', backgroundColor: '#FED7D7', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {recordId}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#C53030', marginTop: '6px', fontWeight: '500' }}>
                        <strong>Reason:</strong> {record.reason}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
                        <i className="fa-solid fa-car-side" style={{ marginRight: '4px' }}></i> Plate: {record.plate || '—'} &bull; <i className="fa-solid fa-phone" style={{ marginLeft: '8px', marginRight: '4px' }}></i> Phone: {record.phone || '—'} &bull; <i className="fa-solid fa-calendar-days" style={{ marginLeft: '8px', marginRight: '4px' }}></i> Banned on: {recordDate}
                      </div>
                    </div>

                    <button 
                      className="btn btn-secondary" 
                      style={{ 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        color: 'var(--danger)', 
                        borderColor: '#FED7D7',
                        backgroundColor: '#fff'
                      }}
                      onClick={() => handleRemoveBlacklist(recordId)}
                      title="Remove rule / Unban"
                    >
                      <i className="fa-solid fa-trash-can"></i> Unban
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BlacklistSettings;
