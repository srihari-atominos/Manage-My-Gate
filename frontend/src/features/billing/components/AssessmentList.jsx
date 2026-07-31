import React, { memo } from 'react'
import PropTypes from 'prop-types'
import CIcon from '@coreui/icons-react'
import {
  cilPencil,
  cilTrash,
  cilCalendar,
  cilCalculator,
  cilDescription,
  cilFolderOpen,
} from '@coreui/icons'

/**
 * AssessmentList
 *
 * Left-panel component of the Assessment Manager tab.
 * Dynamically displays all billing assessment templates.
 */
export const AssessmentList = memo(
  ({
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
      if (!calc) return '—'
      if (calc.type === 'FLAT_RATE')
        return `₹${(calc.flatAmount || 0).toLocaleString('en-IN')} Flat`
      if (calc.type === 'PER_SQ_FT')
        return `₹${(calc.ratePerSqFt || 0).toLocaleString('en-IN')} / Sq.Ft`
      if (calc.type === 'TIERED_BHK') return 'Tiered BHK Rate'
      return '—'
    }

    const getTypeBadge = (type) => {
      if (type === 'RECURRING')
        return <span className="badge bg-primary-subtle text-primary">🔁 Recurring</span>
      if (type === 'ONE_TIME')
        return <span className="badge bg-warning-subtle text-warning-emphasis">⚡ One-Time</span>
      return <span className="badge bg-danger-subtle text-danger">🏗️ Capital Repair</span>
    }

    return (
      <div className="card card-hover card-accent-primary assessment-list-card">
        {/* ── Card Header ─────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
          <h3 className="fs-6 fw-bold d-flex align-items-center gap-2 m-0">
            <CIcon icon={cilDescription} size="lg" className="text-primary me-1" />
            Assessment Templates
          </h3>
          {assessments.length > 0 && (
            <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 extra-small">
              {assessments.length} Template{assessments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Body Area ────────────────────────────────────────────────── */}
        <div className="flex-fill d-flex flex-column">
          {loading ? (
            <div className="empty-state-container flex-fill d-flex align-items-center justify-content-center">
              <span className="empty-state-text-sub text-muted small">Loading templates…</span>
            </div>
          ) : assessments.length === 0 ? (
            /* Empty State */
            <div className="empty-state-container flex-fill p-4 d-flex flex-column align-items-center justify-content-center text-center">
              <CIcon icon={cilFolderOpen} className="mb-3 text-secondary opacity-50 icon-size-36" />
              <span className="empty-state-text-main fw-bold text-dark fs-6">
                No assessments yet
              </span>
              <span className="empty-state-text-sub text-muted small mt-1 max-w-240">
                Click <strong>Create New Assessment</strong> above to add your first billing
                template.
              </span>
            </div>
          ) : (
            /* List rendering */
            <div className="d-flex flex-column gap-2 overflow-hidden">
              {assessments.map((item) => {
                const isSelected = selectedAssessment?._id === item._id
                return (
                  <div
                    key={item._id}
                    onClick={() => onSelectAssessment && onSelectAssessment(item)}
                    className={`assessment-item-card ${isSelected ? 'assessment-item-card--selected' : ''}`}
                  >
                    <div className="flex-fill min-w-0 me-2">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span
                          title={item.name}
                          className="fw-bold text-dark text-truncate small d-inline-block max-w-150"
                        >
                          {item.name}
                        </span>
                        {getTypeBadge(item.type)}
                      </div>
                      <div className="d-flex gap-3 extra-small text-muted align-items-center">
                        <span className="d-inline-flex align-items-center">
                          <CIcon icon={cilCalendar} className="me-1 icon-size-12" />
                          Cycle: {item.billingCycle || 'AD_HOC'}
                        </span>
                        <span className="d-inline-flex align-items-center">
                          <CIcon icon={cilCalculator} className="me-1 icon-size-12" />
                          {getCalculationSummary(item.calculationMethod)}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        title="Edit Assessment Template"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onEdit) onEdit(item)
                        }}
                        className="assessment-icon-btn"
                      >
                        <CIcon icon={cilPencil} className="icon-size-14" />
                      </button>
                      <button
                        type="button"
                        title="Delete Assessment Template"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onDelete) onDelete(item)
                        }}
                        className="assessment-icon-btn assessment-icon-btn--danger"
                      >
                        <CIcon icon={cilTrash} className="icon-size-14" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Pagination Footer ─────────────────────────────────────────── */}
        <div className="table-pagination-footer mt-auto border-top border-light pt-2 d-flex justify-content-between align-items-center">
          <span className="text-muted small">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 extra-small"
              disabled={pagination.currentPage <= 1}
              onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 extra-small"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  },
)

AssessmentList.displayName = 'AssessmentList'

AssessmentList.propTypes = {
  assessments: PropTypes.array,
  selectedAssessment: PropTypes.object,
  onSelectAssessment: PropTypes.func,
  loading: PropTypes.bool,
  pagination: PropTypes.object,
  onPageChange: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
}

export default AssessmentList
