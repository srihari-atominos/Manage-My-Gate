import { useSelector } from 'react-redux';
import { CNavTitle } from '@coreui/react';
import navigation from '../../../_nav';

const nameToKeyMap = {
  'User Management': {
    titleKey: 'dashboard.cards.userManagement',
    id: 'user-management'
  },
  'Role Builder': {
    titleKey: 'dashboard.cards.roleBuilder',
    id: 'role-builder'
  },
  'Integration Hub': {
    titleKey: 'dashboard.cards.integrationHub',
    id: 'integration-hub'
  },
  'Organization Manager': {
    titleKey: 'dashboard.cards.organizationManager',
    id: 'organization-manager'
  },
  'Audit Logs': {
    titleKey: 'dashboard.cards.auditLogs',
    id: 'audit-logs'
  }
};

const categoryToKeyMap = {
  'Platform Management': 'dashboard.categories.platformManagement',
  'Features': 'dashboard.categories.features'
};

const getCardMetadata = (name) => {
  if (nameToKeyMap[name]) return nameToKeyMap[name];
  const camelCased = name.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
  const id = name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
  return {
    titleKey: `dashboard.cards.${camelCased}`,
    id
  };
};

const getCategoryKey = (name) => {
  if (categoryToKeyMap[name]) return categoryToKeyMap[name];
  const camelCased = name.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
  return `dashboard.categories.${camelCased}`;
};

/**
 * Custom controller hook for the Dashboard view.
 * Dynamically filters navigation items based on the active workspace status
 * and groups them into categories.
 */
export const useDashboard = () => {
  const activeWorkspace = useSelector((state) => state.workspace);
  const allowedFeatures = activeWorkspace?.allowedFeatures || [];
  const isPlatform = activeWorkspace?.isPlatform || false;
  console.log('--- DEBUG useDashboard allowedFeatures:', allowedFeatures);

  // Exact same filtering logic as AppSidebar.jsx
  const PORTAL_CATEGORIES = navigation.filter((item) => 
    item.to === '/users' || 
    item.to === '/role-builder' || 
    item.to === '/integrations' || 
    !item.to
  );

  const SUPER_ADMIN_CATEGORIES = navigation.filter((item) => 
    item.to === '/super-admin/organizations' || 
    item.to === '/super-admin/audit-logs'
  );

  let navigationItems = [];
  if (activeWorkspace && activeWorkspace.isPlatform === true) {
    navigationItems = [...SUPER_ADMIN_CATEGORIES, ...PORTAL_CATEGORIES];
  } else {
    navigationItems = [...PORTAL_CATEGORIES];
  }

  // Filter based on required permissions, also cleaning up any empty titles
  const filteredNavigationItems = navigationItems.filter((item, index, arr) => {
    if (item.component === CNavTitle || !item.to) {
      // Check if there is any permitted CNavItem following this title
      const nextItems = arr.slice(index + 1);
      const hasFollowingItems = nextItems.some((nextItem) => {
        if (nextItem.component === CNavTitle || !nextItem.to) return false;
        if (nextItem.requiredPermission) {
          return allowedFeatures.includes(nextItem.requiredPermission);
        }
        return true;
      });
      return hasFollowingItems;
    }

    if (item.requiredPermission) {
      return allowedFeatures.includes(item.requiredPermission);
    }
    return true;
  });

  const groups = [];
  let currentGroup = null;

  for (const item of filteredNavigationItems) {
    if (item.component === CNavTitle || !item.to) {
      currentGroup = {
        id: item.name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-'),
        title: item.name,
        titleKey: getCategoryKey(item.name),
        cards: []
      };
      groups.push(currentGroup);
    } else if (item.to) {
      if (!currentGroup) {
        // For super admin categories which don't have a header in _nav.jsx
        currentGroup = {
          id: 'platform-management',
          title: 'Platform Management',
          titleKey: getCategoryKey('Platform Management'),
          cards: []
        };
        groups.push(currentGroup);
      }
      
      const meta = getCardMetadata(item.name);
      currentGroup.cards.push({
        id: meta.id,
        name: item.name,
        titleKey: meta.titleKey,
        to: item.to,
        icon: item.icon
      });
    }
  }

  return {
    groups,
    appName: import.meta.env.VITE_APP_NAME || 'Portal'
  };
};

export default useDashboard;
