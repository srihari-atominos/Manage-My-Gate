import React from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilSpeedometer,
  cilNotes,
  cilLockLocked,
} from '@coreui/icons';
import { CNavItem, CNavTitle } from '@coreui/react';

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
    name: 'Application Features',
  },
  {
    component: CNavItem,
    name: 'Sample Feature',
    to: '/sample',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Administration',
  },
  {
    component: CNavItem,
    name: 'Role Builder',
    to: '/role-builder',
    icon: <CIcon icon={cilLockLocked} customClassName="nav-icon" />,
  },
];

export default _nav;
