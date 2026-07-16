import React from 'react';

/**
 * AssessmentDetail
 *
 * Right-panel component of the Assessment Manager tab.
 * Shows the configured people / units detail for the selected assessment template.
 * Data and selection logic will be wired in the configuration phase.
 */
export const AssessmentDetail = () => {
  return (
    <div
      className="card card-hover card-accent-primary"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '460px' }}
    >
      {/* ── Card Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-users" style={{ color: 'var(--primary)' }} />
          Configured Residents
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
          People and units linked to the selected assessment template.
        </p>
      </div>

      {/* ── Empty / No-selection State ───────────────────────────────── */}
      <div className="empty-state-container" style={{ flex: 1 }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <i
            className="fa-solid fa-hand-pointer"
            style={{ fontSize: '26px', color: 'var(--primary)' }}
          />
        </div>
        <span className="empty-state-text-main">No assessment selected</span>
        <span
          className="empty-state-text-sub"
          style={{ marginTop: '6px', textAlign: 'center', maxWidth: '240px' }}
        >
          Select an assessment template from the list to view its configured residents and units.
        </span>
      </div>
    </div>
  );
};

export default AssessmentDetail;
