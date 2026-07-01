import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      auth: {
        invite: {
          title: 'Set Password',
          subtitle: 'Set a password for your enterprise account',
          password: 'Password',
          confirmPassword: 'Confirm Password',
          submit: 'Set Password',
          backToLogin: 'Back to Log In',
          invalidToken: 'Invalid or missing invitation link. Please request a new invitation.',
          passwordMinLength: 'Password must be at least 8 characters long.',
          passwordRequired: 'Password is required.',
          confirmPasswordRequired: 'Please confirm your password.',
          passwordsMustMatch: 'Passwords must match.',
          success: 'Password set successfully. Please log in.',
          error: 'Failed to set password. The token may be invalid or expired.',
          loading: 'Setting password...',
        },
        register: {
          title: 'Register',
          subtitle: 'Create your enterprise account',
          allFieldsRequired: 'All fields are required.',
          passwordsMustMatch: 'Passwords do not match.',
          passwordMinLength: 'Password must be at least 6 characters long.',
          usernamePlaceholder: 'Username',
          emailPlaceholder: 'Email',
          passwordPlaceholder: 'Password',
          confirmPasswordPlaceholder: 'Repeat password',
          orgName: 'Organization Name',
          submit: 'Create Account',
          loginLink: 'Already have an account? Log In',
        },
        login: {
          promoTitle: 'Enterprise Workspace Platform',
          promoText: 'Access our industry-leading multi-tenant architecture. Instantly provision your organization, manage granular permissions, and scale your team securely.',
        },
      },
      header: {
        dropdown: {
          profile: 'Profile',
          switchRole: 'Switch Role',
          switchOrg: 'Switch Organization',
          noActiveWorkspace: 'No active workspace',
          globalPlatform: 'Global Platform',
          logout: 'Logout',
        },
      },
      notification: {
        title: 'Notifications',
        panelTitle: 'Notifications Dropdown',
        markAllRead: 'Mark all as read',
        markAsRead: 'Mark as read',
        empty: 'No notifications yet',
        loadMore: 'Load More',
        viewAll: 'View All Notifications',
        fullViewTitle: 'Notifications',
        fullViewSubtitle: 'Manage and view all your application alerts and updates.',
        totalCount: 'Total: {{count}}',
        unreadCount: '{{count}} Unread',
        paginationInfo: 'Showing {{start}} to {{end}} of {{total}} notifications',
        prevPage: 'Previous Page',
        nextPage: 'Next Page',
        bellTitle: 'View Notifications',
      },
      workspace: {
        wizard: {
          title: 'Configure Workspace Features',
          subtitle: 'Select the features you want to enable in your workspace. You can change these at any time.',
          users: {
            title: 'User Management',
            desc: 'Manage workspace users, roles, and permissions',
          },
          roles: {
            title: 'Role Management',
            desc: 'Create custom roles and map granular access permissions',
          },
          integrations: {
            title: 'Integration Hub',
            desc: 'Connect and manage external API integrations and third-party tools',
          },
          submit: 'Confirm & Initialize Workspace',
          loading: 'Initializing...',
          error: 'Failed to configure features. Please try again.',
        },
      },
      superAdmin: {
        orgManager: {
          title: 'Organization Manager',
          subtitle: 'Manage all system organizations, view status, and block/unblock access.',
          tableName: 'Name',
          tableStatus: 'Status',
          tableActions: 'Actions',
          block: 'Block',
          unblock: 'Unblock',
          loading: 'Loading organizations...',
          noData: 'No organizations found.',
          statusActive: 'Active',
          statusPending: 'Pending',
          statusRejected: 'Rejected',
        },
        auditLog: {
          title: 'Audit Logs',
          subtitle: 'Track system-wide administrative actions and security events.',
          tableDate: 'Date',
          tableActor: 'Actor',
          tableAction: 'Action',
          tableTarget: 'Target ID',
          tableMetadata: 'Metadata',
          loading: 'Loading audit logs...',
          noData: 'No audit logs registered.',
        },
      },
      dashboard: {
        welcome: 'Welcome to {{appName}}',
        categories: {
          platformManagement: 'Platform Management',
          features: 'Features',
        },
        cards: {
          userManagement: 'User Management',
          roleBuilder: 'Role Builder',
          integrationHub: 'Integration Hub',
          organizationManager: 'Organization Manager',
          auditLogs: 'Audit Logs',
        },
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
