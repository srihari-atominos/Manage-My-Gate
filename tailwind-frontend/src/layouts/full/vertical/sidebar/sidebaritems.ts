import { uniqueId } from 'lodash';

export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  url?: string;
  requiredPermission?: string | string[];
  requirePlatform?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number | string;
  url?: string;
  requiredPermission?: string | string[];
  requirePlatform?: boolean;
  children?: ChildItem[];
}

const SidebarContent: MenuItem[] = [
  {
    heading: 'Home',
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-2-linear',
        id: uniqueId(),
        url: '/dashboard',
      },
    ],
  },
  {
    heading: 'Core Operations',
    children: [
      {
        name: 'Visitor Management',
        icon: 'solar:qr-code-linear',
        id: uniqueId(),
        url: '/visitor-management',
      },
      {
        name: 'Villa Management',
        icon: 'solar:home-linear',
        id: uniqueId(),
        url: '/villas',
        requiredPermission: 'villas:read',
      },
      {
        name: 'Amenities & Bookings',
        icon: 'solar:calendar-linear',
        id: uniqueId(),
        url: '/amenities',
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
          'amenities:wallet',
        ],
      },
      {
        name: 'Notice Board',
        icon: 'solar:document-text-linear',
        id: uniqueId(),
        url: '/notices',
        requiredPermission: 'notices:read',
      },
      {
        name: 'Complaints / Tickets',
        icon: 'solar:shield-warning-linear',
        id: uniqueId(),
        url: '/complaints',
        requiredPermission: [
          'complaints:dashboard',
          'complaints:raise_ticket',
          'complaints:track_requests',
          'complaints:complaint_management',
          'complaints:staff',
          'complaints:assignee',
        ],
      },
    ],
  },
  {
    heading: 'Administration',
    children: [
      {
        name: 'User Management',
        icon: 'solar:users-group-two-rounded-linear',
        id: uniqueId(),
        url: '/users',
        requiredPermission: 'users:read',
      },
      {
        name: 'Role Builder',
        icon: 'solar:shield-keyhole-linear',
        id: uniqueId(),
        url: '/role-builder',
        requiredPermission: 'roles:read',
      },
      {
        name: 'Integration Hub',
        icon: 'solar:bolt-circle-linear',
        id: uniqueId(),
        url: '/integrations',
        requiredPermission: 'integrations:read',
      },
    ],
  },
  {
    heading: 'Platform Admin',
    children: [
      {
        name: 'Organization Manager',
        icon: 'solar:city-linear',
        id: uniqueId(),
        url: '/super-admin/organizations',
        requirePlatform: true,
      },
      {
        name: 'Audit Logs',
        icon: 'solar:clipboard-list-linear',
        id: uniqueId(),
        url: '/super-admin/audit-logs',
        requirePlatform: true,
      },
      {
        name: 'Platform Billing',
        icon: 'solar:bill-list-linear',
        id: uniqueId(),
        url: '/super-admin/platform-billing',
        requirePlatform: true,
      },
      {
        name: 'CRM Workspace',
        icon: 'solar:users-group-rounded-linear',
        id: uniqueId(),
        url: '/super-admin/crm',
        requirePlatform: true,
      },
    ],
  },
];

export default SidebarContent;
