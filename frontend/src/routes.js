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

// Amenities Views (New)
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

/**
 * Application Routes configuration mapping paths to lazy-loaded components.
 */
export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/users', name: 'User Management', element: UserList, requiredPermission: 'users:read' },
  { path: '/villas', name: 'Villa Management', element: VillaManager, requiredPermission: 'villas:read' },
  { path: '/sample', name: 'Sample Feature', element: SampleFeature },
  { path: '/role-builder', name: 'Role Builder', element: RoleBuilder, requiredPermission: 'roles:read' },
  { path: '/notifications', name: 'Notifications', element: NotificationView },
  { path: '/integrations', name: 'Integration Hub', element: IntegrationHubView, requiredPermission: 'integrations:read' },
  { path: '/workspace-setup', name: 'Workspace Setup', element: FeatureConfigWizard },

  
  // New Unified Amenities Routes
  // Dashboard – manage_bookings required (admin analytics)
  { path: '/admin/amenities/dashboard', name: 'Amenities Dashboard', element: DashboardView, requiredPermission: 'amenities:view_dashboard' },
  // Master – read required; create/update/delete enforced at component level
  { path: '/admin/amenities/master', name: 'Amenity Master', element: AmenitiesMasterView, requiredPermission: 'amenities:manage_master' },
  // Calendar – manage_bookings (admin-only view of all bookings)
  { path: '/admin/amenities/calendar', name: 'Admin Calendar', element: AdminCalendarView, requiredPermission: 'amenities:view_admin_calendar' },
  // Ledgers & Maintenance
  { path: '/admin/amenities/ledgers', name: 'Admin Ledgers', element: AdminLedgersView, requiredPermission: 'amenities:manage_ledgers' },
  { path: '/admin/amenities/maintenance', name: 'Admin Maintenance', element: AdminMaintenanceView, requiredPermission: 'amenities:manage_maintenance' },
  // Scanner / Settings / Logs – manage_bookings
  { path: '/admin/amenities/scanner', name: 'Security Scanner', element: SecurityScannerView, requiredPermission: 'amenities:manage_scanner' },
  { path: '/admin/amenities/settings', name: 'Amenity Settings', element: AdminSettingsView, requiredPermission: 'amenities:manage_settings' },
  { path: '/admin/amenities/security-logs', name: 'Security Logs', element: SecurityLogsView, requiredPermission: 'amenities:view_security_logs' },
  // Resident – read lets them discover; book/wallet require amenities:book
  { path: '/resident/amenities/discover', name: 'Discover Amenities', element: ResidentDiscoverView, requiredPermission: 'amenities:discover_amenities' },
  { path: '/resident/amenities/calendar', name: 'My Bookings', element: ResidentCalendarView, requiredPermission: 'amenities:view_my_bookings' },
  { path: '/resident/amenities/wallet', name: 'Digital Wallet', element: ResidentWalletView, requiredPermission: 'amenities:manage_wallet' },
  { path: '/resident/amenities/history', name: 'Booking History', element: ResidentHistoryView, requiredPermission: 'amenities:view_history' },

  // Legacy Routes (Kept for backward compatibility during migration)
  { path: '/admin/amenities', name: 'Amenity Management', element: AmenitiesMasterView, requiredPermission: 'amenities:read' },
  { path: '/resident/amenities', name: 'Book Amenities', element: ResidentDiscoverView, requiredPermission: 'amenities:read' },
  { path: '/resident/amenities/book/:id', name: 'Book Amenity Form', element: ResidentBookingView, requiredPermission: 'amenities:book' },
];

export default routes;
