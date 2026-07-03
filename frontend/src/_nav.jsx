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
    component: CNavTitle,
    name: 'Amenities & Bookings',
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/admin/amenities/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_dashboard',
  },
  {
    component: CNavItem,
    name: 'Ledgers',
    to: '/admin/amenities/ledgers',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_ledgers',
  },
  {
    component: CNavItem,
    name: 'Amenity Master',
    to: '/admin/amenities/master',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_master',
  },
  {
    component: CNavItem,
    name: 'Maintenance',
    to: '/admin/amenities/maintenance',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_maintenance',
  },
  {
    component: CNavItem,
    name: 'Admin Calendar',
    to: '/admin/amenities/calendar',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_admin_calendar',
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/admin/amenities/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_settings',
  },
  {
    component: CNavItem,
    name: 'Security Logs',
    to: '/admin/amenities/security-logs',
    icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_security_logs',
  },
  {
    component: CNavItem,
    name: 'QR Scanner',
    to: '/admin/amenities/scanner',
    icon: <CIcon icon={cilQrCode} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_scanner',
  },
  {
    component: CNavItem,
    name: 'Discover',
    to: '/resident/amenities/discover',
    icon: <CIcon icon={cilSearch} customClassName="nav-icon" />,
    requiredPermission: 'amenities:discover_amenities',
  },
  {
    component: CNavItem,
    name: 'My Bookings',
    to: '/resident/amenities/calendar',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_my_bookings',
  },
  {
    component: CNavItem,
    name: 'Digital Wallet',
    to: '/resident/amenities/wallet',
    icon: <CIcon icon={cilWallet} customClassName="nav-icon" />,
    requiredPermission: 'amenities:manage_wallet',
  },
  {
    component: CNavItem,
    name: 'History',
    to: '/resident/amenities/history',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    requiredPermission: 'amenities:view_history',
  },
];

export default _nav;
