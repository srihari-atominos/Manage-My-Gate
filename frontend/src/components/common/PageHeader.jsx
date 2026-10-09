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
    <CCard className="app-page-header border-0">
      <CCardBody>
        <div className="app-page-header__content">
          <div className="app-page-header__copy">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actionButtons && <div className="app-page-header__actions">{actionButtons}</div>}
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
