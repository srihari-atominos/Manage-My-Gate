/**
 * AppSidebar Component
 *
 * Collapsible navigation sidebar with branding, menu items, and toggle controls.
 *
 * Features:
 * - Redux-controlled visibility state
 * - Unfoldable/narrow mode for more screen space
 * - Brand logo with full and narrow variants
 * - Close button for mobile devices
 * - Footer with toggle button
 * - Dark color scheme
 * - Fixed positioning
 *
 * @component
 * @example
 * return (
 *   <AppSidebar />
 * )
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
  CNavTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// sidebar nav config
import navigation from '../_nav'

/**
 * AppSidebar functional component
 *
 * Manages sidebar state with Redux:
 * - sidebarShow: Controls sidebar visibility
 * - sidebarUnfoldable: Controls narrow/wide mode
 *
 * Renders navigation from _nav.js configuration file.
 * Memoized to prevent unnecessary re-renders.
 *
 * @returns {React.ReactElement} Sidebar with navigation
 */
const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.ui.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.ui.sidebarShow)
  const activeWorkspace = useSelector((state) => state.workspace)
  const allowedFeatures = useSelector((state) => state.workspace?.allowedFeatures || [])
  const isPlatform = useSelector((state) => state.workspace?.isPlatform || false)
  console.log('--- DEBUG AppSidebar allowedFeatures:', allowedFeatures)

  const PORTAL_CATEGORIES = navigation.filter((item) => 
    item.to === '/users' || 
    item.to === '/villas' || 
    item.to === '/role-builder' || 
    item.to === '/integrations' || 
    !item.to
  )

  const SUPER_ADMIN_CATEGORIES = navigation.filter((item) => 
    item.to === '/super-admin/organizations' || 
    item.to === '/super-admin/audit-logs'
  )

  let navigationItems = []
  if (activeWorkspace && activeWorkspace.isPlatform === true) {
    navigationItems = [...SUPER_ADMIN_CATEGORIES, ...PORTAL_CATEGORIES]
  } else {
    navigationItems = [...PORTAL_CATEGORIES]
  }

  // Filter based on required permissions, also cleaning up any empty titles
  const filteredNavigationItems = navigationItems.filter((item, index, arr) => {
    if (item.component === CNavTitle || !item.to) {
      // Check if there is any permitted CNavItem following this title
      const nextItems = arr.slice(index + 1)
      const hasFollowingItems = nextItems.some((nextItem) => {
        if (nextItem.component === CNavTitle || !nextItem.to) return false
        if (nextItem.requiredPermission) {
          return allowedFeatures.includes(nextItem.requiredPermission)
        }
        return true
      })
      return hasFollowingItems
    }

    if (item.requiredPermission) {
      return allowedFeatures.includes(item.requiredPermission)
    }
    return true
  })

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand as={Link} to="/dashboard">
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigationItems} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
