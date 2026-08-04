/**
 * Maps incoming Web actionUrl or notification types to mobile Expo Router routes
 */
export const mapActionUrlToMobileRoute = (actionUrl?: string, type?: string): string => {
  if (!actionUrl) {
    // Fallback routes based on type
    switch (type) {
      case 'VISITOR':
        return '/(resident)/visitor';
      case 'BILLING':
        return '/(resident)/billing/dashboard';
      case 'COMPLAINT':
        return '/(resident)/complaints/my-tickets';
      case 'NOTICE':
        return '/(resident)/notices/active-board';
      case 'AMENITY':
        return '/(resident)/amenities/discover';
      default:
        return '/(resident)/dashboard';
    }
  }

  let cleanUrl = actionUrl.trim();
  if (cleanUrl.startsWith('#/')) {
    cleanUrl = cleanUrl.replace('#', '');
  }

  // Exact Web Action URL to Mobile Expo Router Route Mappings
  if (cleanUrl.includes('visitor-management-resident') || cleanUrl === '/visitor/resident') {
    return '/(resident)/visitor';
  }
  if (cleanUrl.includes('visitor-management-admin') || cleanUrl === '/visitor/admin') {
    return '/(resident)/visitor/admin-logs';
  }
  if (cleanUrl.includes('visitor-management-guard') || cleanUrl === '/visitor/guard') {
    return '/(resident)/visitor/gate-console';
  }
  if (cleanUrl.includes('resident/amenities/discover') || cleanUrl === '/amenities/discover') {
    return '/(resident)/amenities/discover';
  }
  if (cleanUrl.includes('resident/amenities/calendar') || cleanUrl === '/amenities/my-bookings') {
    return '/(resident)/amenities/my-bookings';
  }
  if (cleanUrl.includes('admin/complaints/my-tickets') || cleanUrl.includes('/complaints')) {
    return '/(resident)/complaints/my-tickets';
  }
  if (cleanUrl.includes('notices/board') || cleanUrl.includes('notice-board')) {
    return '/(resident)/notices/active-board';
  }
  if (cleanUrl.includes('billing')) {
    return '/(resident)/billing/dashboard';
  }
  if (cleanUrl.includes('users')) {
    return '/(resident)/admin/users';
  }
  if (cleanUrl.includes('villas')) {
    return '/(resident)/admin/villas';
  }
  if (cleanUrl.includes('role-builder')) {
    return '/(resident)/admin/role-builder';
  }

  return '/(resident)/dashboard';
};
