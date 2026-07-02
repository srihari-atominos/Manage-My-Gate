import React from 'react';

// Lazy-loaded Components
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const SampleFeature = React.lazy(() => import('./features/sampleFeature/SampleFeatureView'));
const RoleBuilder = React.lazy(() => import('./features/roleBuilder/RoleBuilderList'));
const UserList = React.lazy(() => import('./features/userManagement/UserList'));
const NotificationView = React.lazy(() => import('./features/notification/views/NotificationView'));
const IntegrationHubView = React.lazy(() => import('./features/integrationHub/views/IntegrationHubView'));
const FeatureConfigWizard = React.lazy(() => import('./features/workspace/views/FeatureConfigWizard'));
const OrganizationManager = React.lazy(() => import('./features/organization/views/OrganizationManager'));
const AuditLogViewer = React.lazy(() => import('./features/auditLog/views/AuditLogViewer'));

/**
 * Application Routes configuration mapping paths to lazy-loaded components.
 */
export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/users', name: 'User Management', element: UserList, requiredPermission: 'users:read' },
  { path: '/sample', name: 'Sample Feature', element: SampleFeature },
  { path: '/role-builder', name: 'Role Builder', element: RoleBuilder, requiredPermission: 'roles:read' },
  { path: '/notifications', name: 'Notifications', element: NotificationView },
  { path: '/integrations', name: 'Integration Hub', element: IntegrationHubView, requiredPermission: 'integrations:read' },
  { path: '/workspace-setup', name: 'Workspace Setup', element: FeatureConfigWizard },
  { path: '/super-admin/organizations', name: 'Organization Manager', element: OrganizationManager, requirePlatform: true },
  { path: '/super-admin/audit-logs', name: 'Audit Logs', element: AuditLogViewer, requirePlatform: true },
];

export default routes;
