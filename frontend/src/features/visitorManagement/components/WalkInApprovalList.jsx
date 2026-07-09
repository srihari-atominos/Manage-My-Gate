import React from 'react';
import toast from 'react-hot-toast';

export const WalkInApprovalList = ({ walkins, setWalkins }) => {
  const handleApprove = (id) => {
    setWalkins(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item)
    );
    toast.success('Visitor entry approved successfully!');
  };

  const handleDeny = (id) => {
    setWalkins(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'DENIED' } : item)
    );
    toast.error('Visitor entry denied.');
  };

  const pendingItems = walkins.filter(item => (item.status || item.logStatus) === 'PENDING');
  const historyItems = walkins.filter(item => (item.status || item.logStatus) !== 'PENDING');

  return (
    <div className="dashboard-grid" style={{ gap: '24px' }}>
      
      {/* Left Column: Pending Approvals */}
      <div style={{ flex: 1.5 }}>
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Pending Gate Requests ({pendingItems.length})
          </h3>

          {pendingItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '42px', color: 'var(--success)', marginBottom: '12px' }}></i>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>All caught up!</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>No visitor is currently waiting at the gate.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingItems.map(item => {
                const itemId = item.id || item._id;
                const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
                const photoUrl = item.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60';
                const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
                const purpose = item.purpose || item.snapshot?.purpose || 'Visit';
                const vehicle = item.vehicle || item.snapshot?.vehicleNumber || '—';
                const guardName = item.guardName || item.guardId?.name || 'Gate Operator';

                return (
                  <div 
                    key={itemId} 
                    className="card-hover" 
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={photoUrl} 
                          alt={visitorName}
                          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '14px',
                          height: '14px',
                          backgroundColor: '#FF9F43',
                          border: '2px solid #fff',
                          borderRadius: '50%'
                        }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{visitorName}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-light)', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            {itemId}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                          <strong>Company:</strong> {company} | <strong>Purpose:</strong> {purpose}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                          <i className="fa-solid fa-car-side" style={{ marginRight: '4px' }}></i> Vehicle: {vehicle} &bull; <i className="fa-solid fa-user-shield" style={{ marginLeft: '8px', marginRight: '4px' }}></i> Guard: {guardName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ 
                          padding: '10px 16px', 
                          borderRadius: '8px', 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: 'var(--danger)', 
                          borderColor: 'var(--danger-bg)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleDeny(itemId)}
                      >
                        <i className="fa-solid fa-xmark"></i> Deny Entry
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ 
                          padding: '10px 20px', 
                          borderRadius: '8px', 
                          fontSize: '13px', 
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleApprove(itemId)}
                      >
                        <i className="fa-solid fa-check"></i> Approve Entry
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: History Log */}
      <div style={{ flex: 1 }}>
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-list-ul" style={{ color: 'var(--text-muted)', marginRight: '8px' }}></i>
            Recent Gate Log
          </h3>

          {historyItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-history" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
              <span style={{ fontSize: '13px' }}>No past walk-ins logged today.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {historyItems.map(item => {
                const itemId = item.id || item._id;
                const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
                const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
                const timestamp = item.timestamp || (item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : (item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : '—'));
                const status = item.status || item.logStatus;

                return (
                  <div 
                    key={itemId} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: '#fff',
                      border: '1px solid #F1F5F9',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{visitorName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {company} &bull; {timestamp}
                      </div>
                    </div>
                    <div>
                      {(status === 'APPROVED' || status === 'COMPLETED' || status === 'INSIDE') ? (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                          {status}
                        </span>
                      ) : (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                          {status}
                        </span>
                      )}
                    </div>
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

export default WalkInApprovalList;
