import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody } from '@coreui/react'

/**
 * PageHeader Component
 *
 * Reusable enterprise page header containing title, subtitle, and action buttons.
 * Supports full mobile responsiveness (stacking layout on small screens).
 */
const PageHeader = ({ title, subtitle, actionButtons }) => {
  return (
    <CCard className="mb-4 border-0 shadow-sm" style={{ background: 'var(--cui-card-bg, #fff)' }}>
      <CCardBody className="p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <div>
            <h1
              className="mb-1"
              style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cui-body-color)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actionButtons && (
            <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2 align-items-center">
              {actionButtons}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actionButtons: PropTypes.node,
}

export default PageHeader
