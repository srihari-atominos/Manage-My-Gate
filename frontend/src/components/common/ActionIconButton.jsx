import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

/**
 * ActionIconButton Component
 *
 * Reusable generic borderless icon button for row actions in data grids.
 * Forwards any additional props (such as id) to the underlying CButton.
 */
const ActionIconButton = ({ icon, color, onClick, title, disabled = false, ...rest }) => {
  return (
    <CButton
      color={color}
      variant="ghost"
      size="sm"
      className="um-action-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </CButton>
  )
}

ActionIconButton.propTypes = {
  icon: PropTypes.node.isRequired,
  color: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
}

export default ActionIconButton
