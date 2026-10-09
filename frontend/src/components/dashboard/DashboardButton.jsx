import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

const DashboardButton = ({
  variant = 'primary',
  iconOnly = false,
  className = '',
  children,
  ...rest
}) => (
  <CButton
    className={`nahom-button nahom-button--${variant} ${iconOnly ? 'nahom-button--icon' : ''} ${className}`}
    {...rest}
  >
    {children}
  </CButton>
)

DashboardButton.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  iconOnly: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
}

export default DashboardButton
