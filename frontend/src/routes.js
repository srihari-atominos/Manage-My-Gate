import React from 'react';

// Lazy-loaded Components
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const SampleFeature = React.lazy(() => import('./features/sampleFeature/SampleFeatureView'));
const RoleBuilder = React.lazy(() => import('./features/roleBuilder/RoleBuilderList'));
const UserList = React.lazy(() => import('./features/userManagement/UserList'));
const NotificationView = React.lazy(() => import('./features/notification/views/NotificationView'));
const IntegrationHubView = React.lazy(() => import('./features/integrationHub/views/IntegrationHubView'));
const FeatureConfigWizard = React.lazy(() => import('./features/workspace/views/FeatureConfigWizard'));
const VillaManager = React.lazy(() => import('./features/villa/views/VillaManager'));
const OrganizationManager = React.lazy(() => import('./features/organization/views/OrganizationManager'));
const AuditLogViewer = React.lazy(() => import('./features/auditLog/views/AuditLogViewer'));
const NoticeBoardRedirector = React.lazy(() => import('./features/noticeBoard/views/NoticeBoardRedirector'));
const NoticeBoardDashboardView = React.lazy(() => import('./features/noticeBoard/views/NoticeBoardDashboardView'));
const NoticeBoardActiveView = React.lazy(() => import('./features/noticeBoard/views/NoticeBoardActiveView'));
const NoticeBoardManageView = React.lazy(() => import('./features/noticeBoard/views/NoticeBoardManageView'));

// Amenities Views (New)
const AmenitiesRedirector = React.lazy(() => import('./features/amenities/views/AmenitiesRedirector'));
const DashboardView = React.lazy(() => import('./features/amenities/views/DashboardView'));
const AmenitiesMasterView = React.lazy(() => import('./features/amenities/views/AmenitiesMasterView'));
const ResidentDiscoverView = React.lazy(() => import('./features/amenities/views/ResidentDiscoverView'));
const ResidentBookingView = React.lazy(() => import('./features/amenities/views/ResidentBookingView'));
const AdminCalendarView = React.lazy(() => import('./features/amenities/views/AdminCalendarView'));
const ResidentCalendarView = React.lazy(() => import('./features/amenities/views/ResidentCalendarView'));
const ResidentWalletView = React.lazy(() => import('./features/amenities/views/ResidentWalletView'));
const ResidentHistoryView = React.lazy(() => import('./features/amenities/views/ResidentHistoryView'));
const SecurityScannerView = React.lazy(() => import('./features/amenities/views/SecurityScannerView'));
const AdminSettingsView = React.lazy(() => import('./features/amenities/views/AdminSettingsView'));
const SecurityLogsView = React.lazy(() => import('./features/amenities/views/SecurityLogsView'));
const AdminLedgersView = React.lazy(() => import('./features/amenities/views/AdminLedgersView'));
const AdminMaintenanceView = React.lazy(() => import('./features/amenities/views/AdminMaintenanceView'));

// Visitor Management Views
const ResidentVisitorManagementView = React.lazy(() => import('./features/visitorManagement/views/ResidentVisitorManagementView'));
const AdminVisitorManagementViews = React.lazy(() => import('./features/visitorManagement/views/AdminVisitorManagementViews'));
const GuardVisitormanagementViews = React.lazy(() => import('./features/visitorManagement/views/GuardVisitormanagementViews'));
const VisitorContextManager = React.lazy(() => import('./features/visitorManagement/views/VisitorContextManager'));

/**
 * Application Routes configuration mapping paths to lazy-loaded components.
 */
export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/visitor-management', name: 'Visitor Management', element: VisitorContextManager },
  { path: '/visitor-management-resident', name: 'Visitor Passes', element: ResidentVisitorManagementView },
  { path: '/visitor-management-admin', name: 'Visitor Admin', element: AdminVisitorManagementViews },
  { path: '/visitor-management-guard', name: 'Gate Console', element: GuardVisitormanagementViews },
  { path: '/users', name: 'User Management', element: UserList, requiredPermission: 'users:read' },
  { path: '/villas', name: 'Villa Management', element: VillaManager, requiredPermission: 'villas:read' },
  { path: '/sample', name: 'Sample Feature', element: SampleFeature },
  { path: '/role-builder', name: 'Role Builder', element: RoleBuilder, requiredPermission: 'roles:read' },
  { path: '/notifications', name: 'Notifications', element: NotificationView },
  { path: '/integrations', name: 'Integration Hub', element: IntegrationHubView, requiredPermission: 'integrations:read' },
  { path: '/workspace-setup', name: 'Workspace Setup', element: FeatureConfigWizard },
  { path: '/super-admin/organizations', name: 'Organization Manager', element: OrganizationManager, requirePlatform: true },
  { path: '/super-admin/audit-logs', name: 'Audit Logs', element: AuditLogViewer, requirePlatform: true },
  { path: '/notices', name: 'Notice Board', element: NoticeBoardRedirector },
  { path: '/admin/notices/dashboard', name: 'Notice Dashboard', element: NoticeBoardDashboardView, requiredPermission: 'notices:create' },
  { path: '/notices/board', name: 'Active Board', element: NoticeBoardActiveView, requiredPermission: 'notices:read' },
  { path: '/admin/notices/manage', name: 'Manage Notices', element: NoticeBoardManageView, requiredPermission: 'notices:create' },

  // Amenities Dynamic Redirector
  { path: '/amenities', name: 'Amenities & Bookings', element: AmenitiesRedirector },
  
  // New Unified Amenities Routes
  // Dashboard – manage_bookings required (admin analytics)
  { path: '/admin/amenities/dashboard', name: 'Amenities Dashboard', element: DashboardView, requiredPermission: 'amenities:dashboard' },
  // Master – read required; create/update/delete enforced at component level
  { path: '/admin/amenities/master', name: 'Amenity Master', element: AmenitiesMasterView, requiredPermission: 'amenities:amenities' },
  // Calendar – manage_bookings (admin-only view of all bookings)
  { path: '/admin/amenities/calendar', name: 'Admin Calendar', element: AdminCalendarView, requiredPermission: 'amenities:admin_calander' },
  // Ledgers & Maintenance
  { path: '/admin/amenities/ledgers', name: 'Admin Ledgers', element: AdminLedgersView, requiredPermission: 'amenities:ledgers' },
  { path: '/admin/amenities/maintenance', name: 'Admin Maintenance', element: AdminMaintenanceView, requiredPermission: 'amenities:maintenance' },
  // Scanner / Settings / Logs – manage_bookings
  { path: '/admin/amenities/scanner', name: 'Security Scanner', element: SecurityScannerView, requiredPermission: 'amenities:scanner' },
  { path: '/admin/amenities/settings', name: 'Amenity Settings', element: AdminSettingsView, requiredPermission: 'amenities:settings' },
  { path: '/admin/amenities/security-logs', name: 'Security Logs', element: SecurityLogsView, requiredPermission: 'amenities:security_logs' },
  // Resident – read lets them discover; book/wallet require amenities:book
  { path: '/resident/amenities/discover', name: 'Discover Amenities', element: ResidentDiscoverView, requiredPermission: 'amenities:discover' },
  { path: '/resident/amenities/calendar', name: 'My Bookings', element: ResidentCalendarView, requiredPermission: 'amenities:my_booking' },
  { path: '/resident/amenities/wallet', name: 'Digital Wallet', element: ResidentWalletView, requiredPermission: 'amenities:wallet' },

  // Legacy Routes (Kept for backward compatibility during migration)
  { path: '/admin/amenities', name: 'Amenity Management', element: AmenitiesMasterView, requiredPermission: 'amenities:amenities' },
  { path: '/resident/amenities', name: 'Book Amenities', element: ResidentDiscoverView, requiredPermission: 'amenities:discover' },
  { path: '/resident/amenities/book/:id', name: 'Book Amenity Form', element: ResidentBookingView, requiredPermission: 'amenities:my_booking' },
];

export default routes;
