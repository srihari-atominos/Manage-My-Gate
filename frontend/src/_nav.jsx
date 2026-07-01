import React from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilLockLocked,
  cilPeople,
  cilApps,
  cilShieldAlt,
  cilList,
} from '@coreui/icons';
import { CNavItem, CNavTitle } from '@coreui/react';

/**
 * Sidebar Navigation Configuration
 * Contains only active features for the enterprise RBAC system.
 */
const _nav = [
  {
    component: CNavTitle,
    name: 'Features',
  },
  {
    component: CNavItem,
    name: 'User Management',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    requiredPermission: 'users:read',
  },
  {
    component: CNavItem,
    name: 'Role Builder',
    to: '/role-builder',
    icon: <CIcon icon={cilLockLocked} customClassName="nav-icon" />,
    requiredPermission: 'roles:read',
  },
  {
    component: CNavItem,
    name: 'Integration Hub',
    to: '/integrations',
    icon: <CIcon icon={cilApps} customClassName="nav-icon" />,
    requiredPermission: 'integrations:read',
  },
  {
    component: CNavItem,
    name: 'Organization Manager',
    to: '/super-admin/organizations',
    icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/super-admin/audit-logs',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
];

export default _nav;
