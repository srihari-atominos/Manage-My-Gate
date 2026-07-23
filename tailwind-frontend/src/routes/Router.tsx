// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ***Guards & Auth Views**** */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AuthGuard from '../features/auth/components/AuthGuard';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PermissionGuard from '../features/auth/components/PermissionGuard';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import LoginForm from '../features/auth/components/LoginForm';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RegisterForm from '../features/auth/components/RegisterForm';

// Error pages
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Page403 = Loadable(lazy(() => import('../views/authentication/Page403')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth2/ForgotPassword')));

// Dashboards
const Modern = Loadable(lazy(() => import('../views/dashboards/Modern')));

/* ****Core Features (Lazy Loaded)***** */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const UserList = Loadable(lazy(() => import('../features/userManagement/UserList')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const RoleBuilder = Loadable(lazy(() => import('../features/roleBuilder/RoleBuilderList')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const VillaManagementView = Loadable(lazy(() => import('../features/villa/views/VillaManagementView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const VisitorContextManager = Loadable(lazy(() => import('../features/visitorManagement/views/VisitorContextManager')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentVisitorManagementView = Loadable(lazy(() => import('../features/visitorManagement/views/ResidentVisitorManagementView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminVisitorManagementViews = Loadable(lazy(() => import('../features/visitorManagement/views/AdminVisitorManagementViews')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const GuardVisitormanagementViews = Loadable(lazy(() => import('../features/visitorManagement/views/GuardVisitormanagementViews')));

// Super Admin / Platform
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const OrganizationManager = Loadable(lazy(() => import('../features/organization/views/OrganizationManager')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AuditLogViewer = Loadable(lazy(() => import('../features/auditLog/views/AuditLogViewer')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const FeatureConfigWizard = Loadable(lazy(() => import('../features/workspace/views/FeatureConfigWizard')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const WorkspaceModulesDashboard = Loadable(lazy(() => import('../features/workspace/views/WorkspaceModulesDashboard')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminWorkspaceDashboard = Loadable(lazy(() => import('../features/adminWorkspace/views/AdminWorkspaceDashboard')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminWorkspaceFormView = Loadable(lazy(() => import('../features/adminWorkspace/views/AdminWorkspaceFormView')));

// Notices
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const NoticeBoardRedirector = Loadable(lazy(() => import('../features/noticeBoard/views/NoticeBoardRedirector')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const NoticeBoardDashboardView = Loadable(lazy(() => import('../features/noticeBoard/views/NoticeBoardDashboardView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const NoticeBoardActiveView = Loadable(lazy(() => import('../features/noticeBoard/views/NoticeBoardActiveView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const NoticeBoardManageView = Loadable(lazy(() => import('../features/noticeBoard/views/NoticeBoardManageView')));

// Notifications
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const NotificationView = Loadable(lazy(() => import('../features/notification/views/NotificationView')));

// Amenities
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AmenitiesRedirector = Loadable(lazy(() => import('../features/amenities/views/AmenitiesRedirector')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const DashboardView = Loadable(lazy(() => import('../features/amenities/views/DashboardView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AmenitiesMasterView = Loadable(lazy(() => import('../features/amenities/views/AmenitiesMasterView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminCalendarView = Loadable(lazy(() => import('../features/amenities/views/AdminCalendarView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminLedgersView = Loadable(lazy(() => import('../features/amenities/views/AdminLedgersView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminMaintenanceView = Loadable(lazy(() => import('../features/amenities/views/AdminMaintenanceView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const SecurityScannerView = Loadable(lazy(() => import('../features/amenities/views/SecurityScannerView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AdminSettingsView = Loadable(lazy(() => import('../features/amenities/views/AdminSettingsView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const SecurityLogsView = Loadable(lazy(() => import('../features/amenities/views/SecurityLogsView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentDiscoverView = Loadable(lazy(() => import('../features/amenities/views/ResidentDiscoverView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentCalendarView = Loadable(lazy(() => import('../features/amenities/views/ResidentCalendarView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentWalletView = Loadable(lazy(() => import('../features/amenities/views/ResidentWalletView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentBookingView = Loadable(lazy(() => import('../features/amenities/views/ResidentBookingView')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ResidentHistoryView = Loadable(lazy(() => import('../features/amenities/views/ResidentHistoryView')));

// Complaints
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ComplaintsRedirector = Loadable(lazy(() => import('../features/complaints/views/ComplaintRedirector')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ComplaintDashboard = Loadable(lazy(() => import('../features/complaints/views/ComplaintDashboard')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const CreateComplaint = Loadable(lazy(() => import('../features/complaints/views/CreateComplaint')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const MyComplaints = Loadable(lazy(() => import('../features/complaints/views/MyComplaints')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const ComplaintManagement = Loadable(lazy(() => import('../features/complaints/views/ComplaintManagement')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const StaffAndVendor = Loadable(lazy(() => import('../features/complaints/views/StaffAndVendor')));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const AssigneeView = Loadable(lazy(() => import('../features/complaints/views/Assignee')));

// Integrations
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const IntegrationHubView = Loadable(lazy(() => import('../features/integrationHub/views/IntegrationHubView')));

const Router = [
  {
    path: '/',
    element: (
      <AuthGuard>
        <FullLayout />
      </AuthGuard>
    ),
    children: [
      { path: '/', exact: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <Modern /> },

      // Visitor Management
      {
        path: '/visitor-management',
        element: (
          <PermissionGuard requiredPermission={['visitor:read', 'visitor:admin', 'visitor:resident', 'visitor:guard']}>
            <VisitorContextManager />
          </PermissionGuard>
        ),
      },
      {
        path: '/visitor-management-resident',
        element: (
          <PermissionGuard requiredPermission={['visitor:resident', 'visitor:admin']}>
            <ResidentVisitorManagementView />
          </PermissionGuard>
        ),
      },
      {
        path: '/visitor-management-admin',
        element: (
          <PermissionGuard requiredPermission={['visitor:admin', 'visitor:read']}>
            <AdminVisitorManagementViews />
          </PermissionGuard>
        ),
      },
      {
        path: '/visitor-management-guard',
        element: (
          <PermissionGuard requiredPermission={['visitor:guard', 'visitor:admin']}>
            <GuardVisitormanagementViews />
          </PermissionGuard>
        ),
      },

      // Villa Management
      {
        path: '/villas',
        element: (
          <PermissionGuard requiredPermission="villas:read">
            <VillaManagementView />
          </PermissionGuard>
        ),
      },

      // User Management
      {
        path: '/users',
        element: (
          <PermissionGuard requiredPermission="users:read">
            <UserList />
          </PermissionGuard>
        ),
      },

      // Role Builder
      {
        path: '/role-builder',
        element: (
          <PermissionGuard requiredPermission="roles:read">
            <RoleBuilder />
          </PermissionGuard>
        ),
      },

      // Integration Hub
      {
        path: '/integrations',
        element: (
          <PermissionGuard requiredPermission="integrations:read">
            <IntegrationHubView />
          </PermissionGuard>
        ),
      },

      // Super Admin / Platform
      {
        path: '/super-admin/organizations',
        element: (
          <PermissionGuard requirePlatform>
            <OrganizationManager />
          </PermissionGuard>
        ),
      },
      {
        path: '/super-admin/audit-logs',
        element: (
          <PermissionGuard requirePlatform>
            <AuditLogViewer />
          </PermissionGuard>
        ),
      },
      {
        path: '/workspace-setup',
        element: <FeatureConfigWizard />,
      },
      {
        path: '/super-admin/workspace-modules',
        element: (
          <PermissionGuard requirePlatform>
            <WorkspaceModulesDashboard />
          </PermissionGuard>
        ),
      },
      {
        path: '/super-admin/admin-workspaces',
        element: (
          <PermissionGuard requirePlatform>
            <AdminWorkspaceDashboard />
          </PermissionGuard>
        ),
      },
      {
        path: '/super-admin/admin-workspaces/create',
        element: (
          <PermissionGuard requirePlatform>
            <AdminWorkspaceFormView />
          </PermissionGuard>
        ),
      },
      {
        path: '/super-admin/admin-workspaces/edit/:id',
        element: (
          <PermissionGuard requirePlatform>
            <AdminWorkspaceFormView />
          </PermissionGuard>
        ),
      },
      {
        path: '/notifications',
        element: <NotificationView />,
      },

      // Notices
      {
        path: '/notices',
        element: (
          <PermissionGuard requiredPermission="notices:read">
            <NoticeBoardRedirector />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/notices/dashboard',
        element: (
          <PermissionGuard requiredPermission="notices:create">
            <NoticeBoardDashboardView />
          </PermissionGuard>
        ),
      },
      {
        path: '/notices/board',
        element: (
          <PermissionGuard requiredPermission="notices:read">
            <NoticeBoardActiveView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/notices/manage',
        element: (
          <PermissionGuard requiredPermission="notices:create">
            <NoticeBoardManageView />
          </PermissionGuard>
        ),
      },

      // Amenities
      {
        path: '/amenities',
        element: <AmenitiesRedirector />,
      },
      {
        path: '/admin/amenities/dashboard',
        element: (
          <PermissionGuard requiredPermission="amenities:dashboard">
            <DashboardView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/master',
        element: (
          <PermissionGuard requiredPermission="amenities:amenities">
            <AmenitiesMasterView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/calendar',
        element: (
          <PermissionGuard requiredPermission="amenities:admin_calander">
            <AdminCalendarView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/ledgers',
        element: (
          <PermissionGuard requiredPermission="amenities:ledgers">
            <AdminLedgersView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/maintenance',
        element: (
          <PermissionGuard requiredPermission="amenities:maintenance">
            <AdminMaintenanceView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/scanner',
        element: (
          <PermissionGuard requiredPermission="amenities:scanner">
            <SecurityScannerView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/settings',
        element: (
          <PermissionGuard requiredPermission="amenities:settings">
            <AdminSettingsView />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/amenities/security-logs',
        element: (
          <PermissionGuard requiredPermission="amenities:security_logs">
            <SecurityLogsView />
          </PermissionGuard>
        ),
      },
      {
        path: '/resident/amenities/discover',
        element: (
          <PermissionGuard requiredPermission="amenities:discover">
            <ResidentDiscoverView />
          </PermissionGuard>
        ),
      },
      {
        path: '/resident/amenities/calendar',
        element: (
          <PermissionGuard requiredPermission="amenities:my_booking">
            <ResidentCalendarView />
          </PermissionGuard>
        ),
      },
      {
        path: '/resident/amenities/wallet',
        element: (
          <PermissionGuard requiredPermission="amenities:wallet">
            <ResidentWalletView />
          </PermissionGuard>
        ),
      },
      {
        path: '/resident/amenities/book/:id',
        element: (
          <PermissionGuard requiredPermission="amenities:my_booking">
            <ResidentBookingView />
          </PermissionGuard>
        ),
      },
      {
        path: '/resident/amenities/history',
        element: (
          <PermissionGuard requiredPermission="amenities:my_booking">
            <ResidentHistoryView />
          </PermissionGuard>
        ),
      },

      // Complaints
      {
        path: '/complaints',
        element: <ComplaintsRedirector />,
      },
      {
        path: '/admin/complaints/dashboard',
        element: (
          <PermissionGuard requiredPermission="complaints:dashboard">
            <ComplaintDashboard />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/complaints/create',
        element: (
          <PermissionGuard requiredPermission="complaints:raise_ticket">
            <CreateComplaint />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/complaints/my-tickets',
        element: (
          <PermissionGuard requiredPermission="complaints:track_requests">
            <MyComplaints />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/complaints/manage',
        element: (
          <PermissionGuard requiredPermission="complaints:complaint_management">
            <ComplaintManagement />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/complaints/staff',
        element: (
          <PermissionGuard requiredPermission="complaints:staff">
            <StaffAndVendor />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/complaints/assignee',
        element: (
          <PermissionGuard requiredPermission="complaints:assignee">
            <AssigneeView />
          </PermissionGuard>
        ),
      },

      // 403 Forbidden Page
      { path: '/403', element: <Page403 /> },
      { path: '*', element: <Navigate to="/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/login', element: <LoginForm /> },
      { path: '/register', element: <RegisterForm /> },
      { path: '/login-createOrg', element: <RegisterForm /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '404', element: <Error /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

const router = createBrowserRouter(Router);

export default router;
