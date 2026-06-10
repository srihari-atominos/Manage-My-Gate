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
