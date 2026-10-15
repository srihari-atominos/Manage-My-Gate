import React from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CNavLink, CSidebarNav } from '@coreui/react'
import SidebarItem from './sidebar/SidebarItem'

const AppSidebarNavComponent = ({ items }) => {
  const navLink = (name, icon, badge) => <SidebarItem name={name} icon={icon} badge={badge} />

  const navItem = (item, index) => {
    const {
      component,
      name,
      badge,
      icon,
      sidebarTitle,
      requiredPermission,
      requirePlatform,
      ...rest
    } = item
    const Component = component
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            className="app-sidebar-item"
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
          >
            {navLink(sidebarTitle || name, icon, badge)}
          </CNavLink>
        ) : (
          navLink(sidebarTitle || name, icon, badge)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, requirePlatform, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNavComponent.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}

export const AppSidebarNav = React.memo(AppSidebarNavComponent)
