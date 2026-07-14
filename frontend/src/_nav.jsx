import React from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilLockLocked,
  cilPeople,
  cilApps,
  cilShieldAlt,
  cilList,
  cilHome,
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
    name: 'Villa Management',
    to: '/villas',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
    requiredPermission: 'villas:read',
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
    to: '/amenities',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    requiredPermission: [
      'amenities:dashboard', 
      'amenities:amenities', 
      'amenities:admin_calander', 
      'amenities:ledgers', 
      'amenities:maintenance', 
      'amenities:settings',
      'amenities:scanner', 
      'amenities:security_logs',
      'amenities:discover',
      'amenities:my_booking',
      'amenities:wallet'
    ],
  },
  {
    component: CNavItem,
    name: 'Notice Board',
    to: '/notices',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    requiredPermission: 'notices:read',
  },
  {
    component: CNavItem,
    name: 'Organization Manager',
    to: '/super-admin/organizations',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/super-admin/audit-logs',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
];

export default _nav;
