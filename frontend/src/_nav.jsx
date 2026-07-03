import React from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilLockLocked,
  cilPeople,
  cilApps,
  cilShieldAlt,
  cilList,
  cilBuilding,
  cilCalendar,
  cilQrCode,
  cilSpeedometer,
  cilSettings,
  cilWallet,
  cilSearch,
} from '@coreui/icons';
import { CNavItem, CNavTitle, CNavGroup } from '@coreui/react';

/**
 * Sidebar Navigation Configuration
 * Contains only active features for the enterprise RBAC system.
 */
const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
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
    name: 'Amenities & Bookings',
    to: '/admin/amenities/dashboard',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_dashboard',
  },
];

export default _nav;
