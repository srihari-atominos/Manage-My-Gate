import { useSelector } from 'react-redux'
import config from '../../../config/config.js'
import { CNavTitle } from '@coreui/react'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import navigation from '../../../_nav'

const nameToKeyMap = {
  'User Management': {
    titleKey: 'dashboard.cards.userManagement',
    id: 'user-management',
  },
  'Unit Management': {
    titleKey: 'dashboard.cards.unitManagement',
    id: 'unit-management',
  },
  'Role Builder': {
    titleKey: 'dashboard.cards.roleBuilder',
    id: 'role-builder',
  },
  'Integration Hub': {
    titleKey: 'dashboard.cards.integrationHub',
    id: 'integration-hub',
  },
}

const categoryToKeyMap = {
  'Platform Management': 'dashboard.categories.platformManagement',
  Features: 'dashboard.categories.features',
}

const getCardMetadata = (name) => {
  if (nameToKeyMap[name]) return nameToKeyMap[name]
  const camelCased = name.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
  const id = name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')
  return {
    titleKey: `dashboard.cards.${camelCased}`,
    id,
  }
}

const getCategoryKey = (name) => {
  if (categoryToKeyMap[name]) return categoryToKeyMap[name]
  const camelCased = name.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
  return `dashboard.categories.${camelCased}`
}

/**
 * Custom controller hook for the Dashboard view.
 * Dynamically filters navigation items based on the active workspace status
 * and groups them into categories.
 */
export const useDashboard = () => {
  const activeWorkspace = useSelector((state) => state.workspace)
  const { checkPermission } = useAuth()
  const allowedFeatures = activeWorkspace?.allowedFeatures || []
  const isPlatform = activeWorkspace?.isPlatform || false
  console.log('--- DEBUG useDashboard allowedFeatures:', allowedFeatures)

  const SUPER_ADMIN_PATHS = new Set(['/super-admin/organizations', '/super-admin/audit-logs'])

  // Match the logic in AppSidebar.jsx minus the dashboard itself
  const PORTAL_CATEGORIES = navigation.filter(
    (item) => !SUPER_ADMIN_PATHS.has(item.to) && item.to !== '/dashboard',
  )

  const SUPER_ADMIN_CATEGORIES = navigation.filter(
    (item) => item.to === '/super-admin/organizations' || item.to === '/super-admin/audit-logs',
  )

  let navigationItems = isPlatform
    ? [...SUPER_ADMIN_CATEGORIES, ...PORTAL_CATEGORIES]
    : [...PORTAL_CATEGORIES]

  if (isPlatform) {
    navigationItems = navigationItems.filter(
      (item) => item.to !== '/villas' && item.to !== '/admin/amenities/dashboard',
    )
  }

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

  // Filter based on allowedFeatures and required permissions, also cleaning up any empty titles
  const filteredNavigationItems = navigationItems.reduce((result, item) => {
    if (item.component === CNavTitle || !item.to) {
      if (item.items) {
        const permittedItems = item.items.filter((nextItem) => isPermitted(nextItem))

        if (permittedItems.length > 0) {
          result.push({ ...item, items: permittedItems })
        }
      } else {
        result.push(item)
      }
    } else {
      if (isPermitted(item)) {
        result.push(item)
      }
    }

    return result
  }, [])

  const groups = []
  let currentGroup = null

  for (const item of filteredNavigationItems) {
    if (item.component === CNavTitle || !item.to) {
      currentGroup = {
        id: item.name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-'),
        title: item.name,
        titleKey: getCategoryKey(item.name),
        cards: [],
      }
      groups.push(currentGroup)
    } else if (item.to) {
      if (!currentGroup) {
        // For super admin categories which don't have a header in _nav.jsx
        currentGroup = {
          id: 'platform-management',
          title: 'Platform Management',
          titleKey: getCategoryKey('Platform Management'),
          cards: [],
        }
        groups.push(currentGroup)
      }

      const meta = getCardMetadata(item.name)
      currentGroup.cards.push({
        id: meta.id,
        name: item.name,
        titleKey: meta.titleKey,
        to: item.to,
        icon: item.icon,
      })
    }
  }

  return {
    groups,
    appName: config.appName,
  }
}

export default useDashboard
