import React from 'react';

// ── Timeline Step ──────────────────────────────────────────────────────────

const TimelineStep = ({ icon, iconBg, title, subtitle, isLast = false, isDenied = false }) => (
  <div className="d-flex gap-3">
    <div className="d-flex flex-column align-items-center">
      <div
        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: '36px', height: '36px', background: isDenied ? '#fee2e2' : iconBg || '#e0f2fe', zIndex: 1 }}
      >
        <i className={`fa-solid ${icon} small`} style={{ color: isDenied ? '#ef4444' : '#0284c7' }}></i>
      </div>
      {!isLast && (
        <div style={{ width: '2px', flex: 1, background: '#e2e8f0', minHeight: '24px', marginTop: '4px' }}></div>
      )}
    </div>
    <div className="pb-4">
      <p className="small fw-semibold mb-0" style={{ color: isDenied ? '#ef4444' : '#0f172a' }}>{title}</p>
      {subtitle && <p className="small text-muted mb-0" >{subtitle}</p>}
    </div>
  </div>
);

// ── Detail Row ─────────────────────────────────────────────────────────────

const DetailRow = ({ label, value, mono = false }) => (
  <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-start border-0 border-bottom">
    <span className="text-muted small fw-semibold" style={{ minWidth: '120px' }}>{label}</span>
    <span className={`text-end fw-semibold small ${mono ? 'font-monospace' : ''}`} style={{ wordBreak: 'break-all', maxWidth: '60%' }}>
      {value || '—'}
    </span>
  </li>
);

// ── Section Header ─────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title }) => (
  <div className="d-flex align-items-center gap-2 mb-3 mt-4">
    <div className="rounded-2 p-2" style={{ background: '#f1f5f9' }}>
      <i className={`fa-solid ${icon} text-muted`}></i>
    </div>
    <h6 className="small fw-bold mb-0" style={{ color: '#0f172a' }}>{title}</h6>
  </div>
);

// ── Main Drawer ────────────────────────────────────────────────────────────

const SecurityLogDetailsDrawer = ({ log, onClose, show }) => {
  if (!log) return null;

  const isSuccess = log.status === 'Success';
  const scanTime = log.scanTime ? new Date(log.scanTime) : null;

  // Build timeline based on scan type and status
  const buildTimeline = () => {
    const steps = [];

    // Always show QR Generated (conceptually first)
    steps.push({
      icon: 'fa-qrcode',
      iconBg: '#ede9fe',
      title: 'QR Code Generated',
      subtitle: 'Resident generated their booking QR pass'
    });

    // Payment (if entry/exit — implies payment was done)
    if (['Entry', 'Exit', 'Manual Verification'].includes(log.scanType)) {
      steps.push({
        icon: 'fa-credit-card',
        iconBg: '#d1fae5',
        title: 'Payment Confirmed',
        subtitle: 'Booking payment was successfully completed'
      });
      steps.push({
        icon: 'fa-calendar-check',
        iconBg: '#e0f2fe',
        title: 'Booking Confirmed',
        subtitle: `Booking Ref: ${log.bookingReference || 'N/A'}`
      });
    }

    // The actual scan event
    if (log.scanType === 'Entry' && isSuccess) {
      steps.push({
        icon: 'fa-door-open',
        iconBg: '#dcfce7',
        title: '✅ Entry Granted',
        subtitle: scanTime ? `Scanned at ${scanTime.toLocaleTimeString()}` : 'Entry recorded'
      });
    } else if (log.scanType === 'Exit' && isSuccess) {
      steps.push({
        icon: 'fa-door-closed',
        iconBg: '#dcfce7',
        title: '✅ Exit Recorded',
        subtitle: scanTime ? `Scanned at ${scanTime.toLocaleTimeString()}` : 'Exit recorded'
      });
      steps.push({
        icon: 'fa-flag-checkered',
        iconBg: '#dcfce7',
        title: 'Visit Completed',
        subtitle: 'Booking session ended successfully'
      });
    } else if (log.scanType === 'Denied' || log.status === 'Denied') {
      steps.push({
        icon: 'fa-hand',
        iconBg: '#fee2e2',
        title: '❌ Access Denied',
        subtitle: log.reason || 'Scan rejected',
        isDenied: true
      });
    } else if (log.scanType === 'Manual Verification') {
      steps.push({
        icon: 'fa-user-check',
        iconBg: '#fef3c7',
        title: '🔍 Manual Verification',
        subtitle: `Guard: ${log.guardName || 'Security'}`
      });
    } else if (log.scanType === 'Booking Cancelled') {
      steps.push({
        icon: 'fa-ban',
        iconBg: '#f1f5f9',
        title: '⚠ Booking Cancelled',
        subtitle: log.reason || 'Booking was cancelled'
      });
    } else if (log.scanType === 'QR Expired') {
      steps.push({
        icon: 'fa-clock-rotate-left',
        iconBg: '#ffedd5',
        title: '⚠ QR Code Expired',
        subtitle: log.reason || 'QR pass reached expiration time'
      });
    } else if (log.scanType === 'Refund') {
      steps.push({
        icon: 'fa-rotate-left',
        iconBg: '#ede9fe',
        title: '✅ Refund Processed',
        subtitle: log.remarks || 'Refund was issued to wallet'
      });
    }

    return steps;
  };

  const timeline = buildTimeline();

  return (
    <div
      className={`offcanvas offcanvas-end shadow-lg ${show ? 'show' : ''}`}
      tabIndex="-1"
      style={{ visibility: show ? 'visible' : 'hidden',
        width: '480px',
        borderLeft: 'none',
        borderRadius: '0' }}
      aria-labelledby="secLogDrawerLabel"
    >
      {/* Header */}
      <div
        className="offcanvas-header px-4 py-3 border-bottom"
        style={{ background: isSuccess
            ? 'linear-gradient(135deg, #0084FF 0%, #0ea5e9 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-circle bg-body bg-opacity-25 p-2">
            <i className={`fa-solid ${isSuccess ? 'fa-shield-check' : 'fa-shield-exclamation'} text-white fa-lg`}></i>
          </div>
          <div>
            <h5 className="offcanvas-title fw-bold text-white mb-0" id="secLogDrawerLabel">
              Security Log Details
            </h5>
            <p className="text-white text-opacity-75 mb-0 small">
              {log.scanType} &mdash; {log.status}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-close btn-close-white"
          onClick={onClose}
          aria-label="Close"
        ></button>
      </div>

      <div className="offcanvas-body p-4" style={{ overflowY: 'auto' }}>

        {/* ── Resident Info ── */}
        <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          {log.residentPhoto ? (
            <img src={log.residentPhoto} alt={log.residentName} className="rounded-circle flex-shrink-0" style={{ width: '56px', height: '56px', objectFit: 'cover', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
          ) : (
            <div className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', background: '#e2e8f0' }}>
              <i className="fa-solid fa-user text-muted fa-xl"></i>
            </div>
          )}
          <div>
            <h5 className="fw-bold mb-0">{log.residentName || 'Unknown Resident'}</h5>
            <p className="text-muted small mb-0">
              <i className="fa-solid fa-hashtag me-1"></i>
              Log ID: <span className="font-monospace">{log._id?.slice(-8).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* ── Amenity & Booking ── */}
        <SectionHeader icon="fa-building" title="Booking & Amenity" />
        <ul className="list-group list-group-flush">
          <DetailRow label="Amenity"       value={log.amenityName} />
          <DetailRow label="Booking Ref"   value={log.bookingReference} mono />
          <DetailRow label="Building"      value={log.building} />
          <DetailRow label="Gate / Tower"  value={log.gateName || log.tower} />
        </ul>

        {/* ── Scan Event ── */}
        <SectionHeader icon="fa-radar" title="Scan Event" />
        <ul className="list-group list-group-flush">
          <DetailRow label="Scan Type"   value={log.scanType} />
          <DetailRow label="Status"      value={log.status} />
          <DetailRow label="Reason"      value={log.reason} />
          <DetailRow label="Remarks"     value={log.remarks} />
          <DetailRow label="Scan Time"   value={scanTime?.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
          {log.entryTime && <DetailRow label="Entry Time"  value={new Date(log.entryTime).toLocaleTimeString()} />}
          {log.exitTime  && <DetailRow label="Exit Time"   value={new Date(log.exitTime).toLocaleTimeString()} />}
        </ul>

        {/* ── Guard Info ── */}
        <SectionHeader icon="fa-user-shield" title="Security Guard" />
        <ul className="list-group list-group-flush">
          <DetailRow label="Guard Name"   value={log.guardName || 'System / Auto'} />
          <DetailRow label="Device"       value={log.scannerDevice} />
          <DetailRow label="IP Address"   value={log.ipAddress} mono />
          <DetailRow label="Browser"      value={log.browser} />
        </ul>

        {/* ── Timeline ── */}
        <SectionHeader icon="fa-clock-rotate-left" title="Event Timeline" />
        <div className="ps-1 pt-2">
          {timeline.map((step, i) => (
            <TimelineStep
              key={i}
              icon={step.icon}
              iconBg={step.iconBg}
              title={step.title}
              subtitle={step.subtitle}
              isLast={i === timeline.length - 1}
              isDenied={step.isDenied}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default SecurityLogDetailsDrawer;
