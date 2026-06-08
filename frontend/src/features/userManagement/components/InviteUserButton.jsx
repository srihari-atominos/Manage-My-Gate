import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

/**
 * InviteUserButton Component
 * 
 * Reusable action button for user grid invitation flow.
 * Uses utility classes for styling and sizing to eliminate inline styles.
 */
const InviteUserButton = ({ onClick }) => {
  return (
    <CButton
      id="um-invite-btn"
      color="primary"
      size="sm"
      onClick={onClick}
      className="fw-semibold small text-nowrap"
    >
      + Invite User
    </CButton>
  )
}

InviteUserButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}

export default InviteUserButton
