import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const WalkInApprovalList = ({ walkins, setWalkins, onApprove, onDeny, logs = [] }) => {
  const handleApprove = (id) => {
    if (onApprove) {
      onApprove(id);
    } else {
      setWalkins(prev =>
        prev.map(item => (item.id === id || item._id === id) ? { ...item, status: 'APPROVED' } : item)
      );
      toast.success('Visitor entry approved successfully!');
    }
  };

  const handleDeny = (id) => {
    if (onDeny) {
      onDeny(id);
    } else {
      setWalkins(prev =>
        prev.map(item => (item.id === id || item._id === id) ? { ...item, status: 'DENIED' } : item)
      );
      toast.error('Visitor entry denied.');
    }
  };

  const pendingItems = walkins.filter(item => (item.status || item.logStatus) === 'PENDING');
  
  // Filter history logs (all entries not pending)
  const historyItems = (logs || []).filter(item => (item.status || item.logStatus) !== 'PENDING');

  // Pagination for Recent Gate Log
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 5;
  const totalLogPages = Math.ceil(historyItems.length / logsPerPage) || 1;
  const indexOfLastLog = logPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentHistoryLogs = historyItems.slice(indexOfFirstLog, indexOfLastLog);

  const formatLogTime = (time) => {
    if (!time) return '—';
    if (typeof time === 'string' && (time.includes('now') || time.includes('ago') || time.includes('AM') || time.includes('PM'))) {
      return time;
    }
    const dateObj = new Date(time);
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard-grid">
      
      {/* Left Column: Pending Approvals */}
      <div>
        <div className="card pending-approvals-card">
          <h3 className="d-flex align-items-center mb-3" style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-clock-rotate-left card-title-icon"></i>
            Pending Gate Requests ({pendingItems.length})
          </h3>

          {pendingItems.length === 0 ? (
            <div className="empty-state-container">
              <i className="fa-solid fa-circle-check empty-state-icon"></i>
              <span className="empty-state-text-main">All caught up!</span>
              <span className="empty-state-text-sub">No visitor is currently waiting at the gate.</span>
            </div>
          ) : (
            <div className="pending-items-list">
              {pendingItems.map(item => {
                const itemId = item.id || item._id;
                const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
                const photoUrl = item.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60';
                const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
                const purpose = item.purpose || item.snapshot?.purpose || 'Visit';
                const vehicle = item.vehicle || item.snapshot?.vehicleNumber || '—';
                const guardName = item.guardName || item.guardId?.name || 'Gate Operator';

                return (
                  <div key={itemId} className="card-hover pending-item-card">
                    <div className="d-flex align-items-center gap-3">
                      <div className="pending-item-avatar-wrapper">
                        <img 
                          src={photoUrl} 
                          alt={visitorName}
                          className="pending-item-avatar"
                        />
                        <span className="pending-item-badge-online" />
                      </div>
                      <div>
                        <div className="item-header-row">
                          <h4 className="item-title">{visitorName}</h4>
                          <span className="item-id-badge">
                            {itemId}
                          </span>
                        </div>
                        <div className="item-detail">
                          <strong>Company:</strong> {company} | <strong>Purpose:</strong> {purpose}
                        </div>
                        <div className="item-meta">
                          <i className="fa-solid fa-car-side me-1"></i> Vehicle: {vehicle} &bull; <i className="fa-solid fa-user-shield ms-2 me-1"></i> Guard: {guardName}
                        </div>
                      </div>
                    </div>

                    <div className="action-btn-group">
                      <button 
                        className="btn btn-secondary btn-deny"
                        onClick={() => handleDeny(itemId)}
                      >
                        <i className="fa-solid fa-xmark"></i> Deny Entry
                      </button>
                      <button 
                        className="btn btn-primary btn-approve"
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
      <div>
        <div className="card">
          <h3 className="d-flex align-items-center mb-3" style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-list-ul card-title-icon-muted"></i>
            Recent Gate Log
          </h3>

          {historyItems.length === 0 ? (
            <div className="empty-state-container" style={{ minHeight: '180px' }}>
              <i className="fa-solid fa-history empty-state-icon-history"></i>
              <span className="empty-state-text-sub">No past walk-ins logged today.</span>
            </div>
          ) : (
            <>
              <div className="history-items-list">
                 {currentHistoryLogs.map(item => {
                  const itemId = item.id || item._id;
                  const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
                  const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
                  
                  const logTime = item.checkInTime || item.createdAt || item.timestamp;
                  const timestampText = formatLogTime(logTime);
  
                  const type = (item.type || item.passId?.passType || (item.entryType === 'WALK_IN' ? 'WALK_IN' : 'GUEST')).toUpperCase();
                  let categoryLabel = 'Guest';
                  let categoryIcon = 'fa-user-plus';
                  if (type.includes('CAB')) {
                    categoryLabel = 'Cab';
                    categoryIcon = 'fa-taxi';
                  } else if (type.includes('DELIVERY')) {
                    categoryLabel = 'Delivery';
                    categoryIcon = 'fa-truck-ramp-box';
                  } else if (type.includes('SERVICE')) {
                    categoryLabel = 'Service';
                    categoryIcon = 'fa-screwdriver-wrench';
                  } else if (type.includes('WALK')) {
                    categoryLabel = 'Walk-in';
                    categoryIcon = 'fa-walking';
                  }
  
                  const rawStatus = (item.status || item.logStatus || 'COMPLETED').toUpperCase();
                  let statusText = 'Exited';
                  let statusBg = '#F1F5F9';
                  let statusColor = '#64748B';
  
                  if (rawStatus === 'INSIDE') {
                    statusText = 'Checked-In';
                    statusBg = 'var(--success-bg)';
                    statusColor = 'var(--success)';
                  } else if (rawStatus === 'APPROVED') {
                    statusText = 'Approved';
                    statusBg = 'var(--success-bg)';
                    statusColor = 'var(--success)';
                  } else if (rawStatus === 'REJECTED' || rawStatus === 'DENIED') {
                    statusText = 'Denied';
                    statusBg = 'var(--danger-bg)';
                    statusColor = 'var(--danger)';
                  }
  
                  return (
                    <div key={itemId} className="history-item-row">
                      <div>
                        <div className="item-header-row">
                          <div className="history-item-name">{visitorName}</div>
                          <span className="history-item-type-badge" title={categoryLabel}>
                            <i className={`fa-solid ${categoryIcon}`} />
                            {categoryLabel}
                          </span>
                        </div>
                        <div className="history-item-subtitle">
                          {company} &bull; {timestampText}
                        </div>
                      </div>
                      <div>
                        <span 
                          style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            backgroundColor: statusBg, 
                            color: statusColor 
                          }}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalLogPages > 1 && (
                <div className="history-pagination-wrapper">
                  <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}>
                    Page {logPage} of {totalLogPages}
                  </span>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-secondary history-pagination-btn"
                      disabled={logPage === 1}
                      onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-secondary history-pagination-btn"
                      disabled={logPage === totalLogPages}
                      onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default WalkInApprovalList;
