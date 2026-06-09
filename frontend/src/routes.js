import React from 'react';

// Lazy-loaded Components
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const SampleFeature = React.lazy(() => import('./features/sampleFeature/SampleFeatureView'));
const RoleBuilder = React.lazy(() => import('./features/roleBuilder/RoleBuilderList'));
const UserList = React.lazy(() => import('./features/userManagement/UserList'));

/**
 * Application Routes configuration mapping paths to lazy-loaded components.
 */
export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/users', name: 'User Management', element: UserList },
  { path: '/sample', name: 'Sample Feature', element: SampleFeature },
  { path: '/role-builder', name: 'Role Builder', element: RoleBuilder },
];

export default routes;
