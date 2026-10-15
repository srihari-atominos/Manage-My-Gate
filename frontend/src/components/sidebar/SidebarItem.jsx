import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'

const SidebarItem = ({ name, icon, badge }) => (
  <>
    {icon && (
      <span className="app-sidebar-item__icon" aria-hidden="true">
        {icon}
      </span>
    )}
    <span className="app-sidebar-item__label">{name}</span>
    {badge && (
      <CBadge color={badge.color} className="ms-auto" size="sm">
        {badge.text}
      </CBadge>
    )}
  </>
)

SidebarItem.propTypes = {
  name: PropTypes.string.isRequired,
  icon: PropTypes.node,
  badge: PropTypes.shape({
    color: PropTypes.string,
    text: PropTypes.string,
  }),
}

export default SidebarItem
