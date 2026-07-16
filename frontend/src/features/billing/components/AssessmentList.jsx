import React from 'react';

/**
 * AssessmentList
 *
 * Left-panel component of the Assessment Manager tab.
 * Displays the list of assessment templates.
 * Selection logic and data will be wired in the configuration phase.
 */
export const AssessmentList = () => {
  return (
    <div
      className="card card-hover card-accent-primary"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '460px' }}
    >
      {/* ── Card Header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-file-invoice" style={{ color: 'var(--primary)' }} />
          Assessment Templates
        </h3>

        {/* Search box — wired in config phase */}
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or cycle..."
          disabled
          style={{ maxWidth: '200px', padding: '8px 12px', fontSize: '13px' }}
        />
      </div>

      {/* ── Empty State ─────────────────────────────────────────────── */}
      <div className="empty-state-container" style={{ flex: 1 }}>
        <i
          className="fa-solid fa-folder-open"
          style={{ fontSize: '36px', marginBottom: '12px', color: 'var(--border-focus)' }}
        />
        <span className="empty-state-text-main">No assessments yet</span>
        <span
          className="empty-state-text-sub"
          style={{ marginTop: '6px', textAlign: 'center', maxWidth: '220px' }}
        >
          Click <strong>Create New Assessment</strong> above to add your first billing template.
        </span>
      </div>

      {/* ── Pagination Footer placeholder ────────────────────────────── */}
      <div
        className="table-pagination-footer"
        style={{ opacity: 0.4, pointerEvents: 'none' }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing 0 of 0 records
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            disabled
          >
            ← Prev
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            disabled
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentList;
