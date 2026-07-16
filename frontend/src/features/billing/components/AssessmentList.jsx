import React, { memo } from 'react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash, cilCalendar, cilCalculator, cilDescription, cilFolderOpen } from '@coreui/icons';

/**
 * AssessmentList
 *
 * Left-panel component of the Assessment Manager tab.
 * Dynamically displays all billing assessment templates.
 *
 * Props:
 *   assessments        {Array}    — templates array from backend
 *   selectedAssessment {Object}   — currently highlighted template
 *   onSelectAssessment {Function} — select callback
 *   loading            {Boolean}  — loading indicator
 *   onEdit             {Function} — edit trigger callback
 *   onDelete           {Function} — delete trigger callback
 */
export const AssessmentList = memo(({
  assessments = [],
  selectedAssessment = null,
  onSelectAssessment,
  loading = false,
  pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 3 },
  onPageChange,
  onEdit,
  onDelete,
}) => {

  const getCalculationSummary = (calc) => {
    if (!calc) return '—';
    if (calc.type === 'FLAT_RATE') return `₹${(calc.flatAmount || 0).toLocaleString('en-IN')} Flat`;
    if (calc.type === 'PER_SQ_FT') return `₹${(calc.ratePerSqFt || 0).toLocaleString('en-IN')} / Sq.Ft`;
    if (calc.type === 'TIERED_BHK') return 'Tiered BHK Rate';
    return '—';
  };

  const getTypeBadge = (type) => {
    if (type === 'RECURRING') return <span className="badge bg-primary-subtle text-primary">🔁 Recurring</span>;
    if (type === 'ONE_TIME') return <span className="badge bg-warning-subtle text-warning-emphasis">⚡ One-Time</span>;
    return <span className="badge bg-danger-subtle text-danger">🏗️ Capital Repair</span>;
  };

  return (
    <div
      className="card card-hover card-accent-primary"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}
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
        <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <CIcon icon={cilDescription} size="lg" style={{ color: 'var(--primary, #0084FF)' }} />
          Assessment Templates
        </h3>
        {assessments.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 9px',
            background: 'var(--primary-light, #E5F3FF)', color: 'var(--primary, #0084FF)',
            borderRadius: '50px',
          }}>
            {assessments.length} Template{assessments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Body Area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="empty-state-container" style={{ flex: 1 }}>
            <span className="empty-state-text-sub">Loading templates…</span>
          </div>
        ) : assessments.length === 0 ? (
          /* Empty State */
          <div className="empty-state-container" style={{ flex: 1, padding: '40px 16px' }}>
            <CIcon
              icon={cilFolderOpen}
              style={{ fontSize: '36px', marginBottom: '12px', color: 'var(--border-focus, #CBD5E1)', width: '36px', height: '36px' }}
            />
            <span className="empty-state-text-main" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>No assessments yet</span>
            <span
              className="empty-state-text-sub"
              style={{ marginTop: '6px', textAlign: 'center', maxWidth: '240px', fontSize: '12px', color: 'var(--text-muted)' }}
            >
              Click <strong>Create New Assessment</strong> above to add your first billing template.
            </span>
          </div>
        ) : (
          /* List rendering */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'hidden' }}>
            {assessments.map((item) => {
              const isSelected = selectedAssessment?._id === item._id;
              return (
                <div
                  key={item._id}
                  onClick={() => onSelectAssessment && onSelectAssessment(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `1.5px solid ${isSelected ? 'var(--primary, #0084FF)' : 'var(--border-light, #E2E8F0)'}`,
                    background: isSelected ? 'var(--primary-light, #E5F3FF)' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        title={item.name}
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-main, #0F172A)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '150px',
                          display: 'inline-block'
                        }}
                      >
                        {item.name}
                      </span>
                      {getTypeBadge(item.type)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted, #64748B)', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <CIcon icon={cilCalendar} style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                        Cycle: {item.billingCycle || 'AD_HOC'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <CIcon icon={cilCalculator} style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                        {getCalculationSummary(item.calculationMethod)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      title="Edit Assessment Template"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(item);
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        background: '#fff',
                        color: 'var(--text-muted, #64748B)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary, #0084FF)';
                        e.currentTarget.style.color = 'var(--primary, #0084FF)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-light, #E2E8F0)';
                        e.currentTarget.style.color = 'var(--text-muted, #64748B)';
                      }}
                    >
                      <CIcon icon={cilPencil} style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      type="button"
                      title="Delete Assessment Template"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(item);
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light, #E2E8F0)',
                        background: '#fff',
                        color: 'var(--text-muted, #64748B)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--danger, #EF4444)';
                        e.currentTarget.style.color = 'var(--danger, #EF4444)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-light, #E2E8F0)';
                        e.currentTarget.style.color = 'var(--text-muted, #64748B)';
                      }}
                    >
                      <CIcon icon={cilTrash} style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination Footer ─────────────────────────────────────────── */}
      <div
        className="table-pagination-footer"
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-light, #E2E8F0)',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={pagination.currentPage <= 1}
            onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
});
AssessmentList.displayName = 'AssessmentList';

export default AssessmentList;
