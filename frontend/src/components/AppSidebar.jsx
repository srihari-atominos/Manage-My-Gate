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

import { logo } from '../assets/brand/logo'
import { sygnet } from '../assets/brand/sygnet'

import { useAuth } from '../features/auth/hooks/useAuth'

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
  console.log('[AppSidebar DEBUG] allowedFeatures:', allowedFeatures)
  console.log('[AppSidebar DEBUG] isPlatform:', isPlatform)

  const { checkPermission } = useAuth()

  /**
   * Recursively filter a navigation item based on allowedFeatures and user permissions.
   * - CNavTitle: kept if at least one following sibling passes.
   * - CNavGroup: kept if its requiredPermission is satisfied; its children are
   *   filtered by the same rule (items without requiredPermission are always kept).
   * - CNavItem: kept if no requiredPermission OR requiredPermission is in allowedFeatures AND user has permission.
   * Super-admin platform items are handled via the isPlatform gate.
   */
  const isFeatureEnabled = (perm) => {
    const featurePart = perm.split(':')[0]
    if (featurePart === 'workspaces' || featurePart === 'dashboard') return true

    if (featurePart === 'amenities' || featurePart === 'booking') {
      return allowedFeatures.some((f) => ['amenities', 'booking', 'amenity', 'amenitiesBooking'].includes(f))
    }

    return allowedFeatures.includes(featurePart) || allowedFeatures.includes(perm)
  }

  const isPermitted = (item) => {
    if (item.requirePlatform && !isPlatform) {
      return false
    }

    if (!item.requiredPermission) {
      return true
    }

    if (Array.isArray(item.requiredPermission)) {
      return item.requiredPermission.some((perm) => isFeatureEnabled(perm) && (isPlatform || checkPermission(perm)))
    }

    return isFeatureEnabled(item.requiredPermission) && (isPlatform || checkPermission(item.requiredPermission))
  }

  const filterItems = (items) => {
    const result = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      const tenantOnlyRoutes = [
        '/visitor-management',
        '/villas',
        '/amenities',
        '/notices',
        '/billing',
        '/assessments',
        '/complaints',
      ]

      if (isPlatform && tenantOnlyRoutes.includes(item.to)) {
        continue
      }

      // Section titles: include only if something below them is visible
      if (!item.to && !item.items) {
        const remaining = items.slice(i + 1)
        const hasVisible = remaining.some((next) => {
          if (!next.to && !next.items) return false // another title
          return isPermitted(next)
        })
        console.log(`[AppSidebar DEBUG] Title ${item.name} hasVisible: ${hasVisible}`)
        if (hasVisible) result.push(item)
        continue
      }

      // Groups: check top-level permission; filter children recursively
      if (item.items) {
        if (!isPermitted(item)) {
          console.log(`[AppSidebar DEBUG] Group ${item.name} top-level not permitted`)
          continue
        }
        const filteredChildren = item.items.filter(isPermitted)
        console.log(
          `[AppSidebar DEBUG] Group ${item.name} filteredChildren count: ${filteredChildren.length}`,
        )
        if (filteredChildren.length === 0) continue
        result.push({ ...item, items: filteredChildren })
        continue
      }

      // Regular items
      if (isPermitted(item)) result.push(item)
    }
    return result
  }

  // Split nav into portal and super-admin sections
  const SUPER_ADMIN_PATHS = new Set(['/super-admin/organizations', '/super-admin/audit-logs'])
  const portalNav = navigation.filter((item) => !SUPER_ADMIN_PATHS.has(item.to))
  const superAdminNav = navigation.filter((item) => SUPER_ADMIN_PATHS.has(item.to))

  const baseItems = isPlatform ? [...superAdminNav, ...portalNav] : portalNav
  const filteredNavigationItems = filterItems(baseItems)

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
