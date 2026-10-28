import type { AssistantFeature } from './aiAssistantApi';

/**
 * Strict, immutable client-side allowlist of screens that can be targeted by voice navigation.
 * Every screenId MUST map to a fixed, compile-time route literal.
 * Sensitive mutations, administrative destructive actions, and payment execution flows are NEVER included.
 */
export const ALLOWED_VOICE_SCREENS: Record<string, { name: string; route: string; description: string }> = {
  // Visitor & Gate Security (Read / Safe View)
  visitor_resident_passes: {
    name: 'Resident Passes',
    route: '/(resident)/visitor',
    description: 'View digital visitor passes and invitations',
  },
  visitor_admin_dashboard: {
    name: 'Admin Console',
    route: '/(resident)/visitor/admin',
    description: 'Visitor monitoring and console',
  },
  visitor_community_passes: {
    name: 'Community Passes',
    route: '/(resident)/visitor/admin/community-passes',
    description: 'Community visitor pass registry',
  },
  visitor_admin_logs: {
    name: 'Gate Logs',
    route: '/(resident)/visitor/admin-logs',
    description: 'Security activity and gate logs',
  },

  // Amenities & Booking (Discover & View)
  amenities_discover: {
    name: 'Discover Amenities',
    route: '/(resident)/amenities/discover',
    description: 'Explore community facilities and amenities',
  },
  amenities_my_booking: {
    name: 'My Bookings',
    route: '/(resident)/amenities/my-bookings',
    description: 'View active amenity reservations',
  },
  amenities_admin_bookings: {
    name: 'Booking Queue',
    route: '/(resident)/amenities/admin-bookings',
    description: 'Amenity booking requests and queue',
  },
  amenities_admin_calendar: {
    name: 'Amenity Calendar',
    route: '/(resident)/amenities/admin-calendar',
    description: 'Community amenity schedule calendar',
  },
  amenities_dashboard: {
    name: 'Amenity Dashboard',
    route: '/(resident)/amenities/dashboard',
    description: 'Amenity analytics and overview',
  },

  // Complaints & Helpdesk
  complaints_dashboard: {
    name: 'Complaints Stats',
    route: '/(resident)/complaints/dashboard',
    description: 'Maintenance requests and SLA stats',
  },
  complaints_raise_ticket: {
    name: 'Raise Ticket',
    route: '/(resident)/complaints/raise-ticket',
    description: 'Submit a new maintenance or complaint ticket',
  },
  complaints_track_requests: {
    name: 'Track Tickets',
    route: '/(resident)/complaints/my-tickets',
    description: 'Track status of existing service requests',
  },
  complaints_complaint_management: {
    name: 'Complaint Queue',
    route: '/(resident)/complaints/manage',
    description: 'Admin helpdesk management board',
  },

  // Notice Board & Engagement
  community_engagement: {
    name: 'Community Engagement',
    route: '/(resident)/community-engagement',
    description: 'Broadcasts, circulars, and polls hub',
  },
  notices_active_board: {
    name: 'Resident Feed',
    route: '/(resident)/notices/active-board',
    description: 'Community notices, announcements, and polls',
  },

  // Finance & Billing (View Only — No Direct Payment Triggering)
  billing_wallet: {
    name: 'Digital Wallet',
    route: '/(resident)/billing/wallet',
    description: 'View digital wallet balance and prepaid account',
  },
  financial_history: {
    name: 'Financial History',
    route: '/(resident)/billing/history',
    description: 'Receipts and past transactions history',
  },
  billing_dashboard: {
    name: 'Billing Dashboard',
    route: '/(resident)/billing',
    description: 'Invoices, dues, and payment statements overview',
  },
  billing_my_invoices: {
    name: 'My Invoices',
    route: '/(resident)/billing/my-dues',
    description: 'Pending invoices and dues overview',
  },
  personal_expense_manager: {
    name: 'Personal Expense Manager',
    route: '/(resident)/expense-manager',
    description: 'Personal budget and expense tracking',
  },
  community_finance: {
    name: 'Community Finance',
    route: '/(resident)/admin/billing/community-finance',
    description: 'Community collections and financial overview',
  },

  // Directory & Administration (View)
  admin_staff_directory: {
    name: 'Staff Directory',
    route: '/(resident)/admin/staff/directory',
    description: 'Community staff and vendor contacts',
  },
  admin_users: {
    name: 'User Management',
    route: '/(resident)/admin/users',
    description: 'Residents and staff directory management',
  },
  admin_villas: {
    name: 'Unit Management',
    route: '/(resident)/admin/villas',
    description: 'Blocks and units management',
  },
};

const SCREEN_ID_PATTERN = /^[a-zA-Z0-9_]{3,50}$/;

export interface NavigationDecision {
  allowed: boolean;
  screenId?: string;
  targetName?: string;
  targetRoute?: string;
  category?: string;
  error?: string;
}

/**
 * Validates a Gemini Live navigate_to_screen function call against both
 * the compile-time static allowlist and the user's backend-authorized feature set.
 *
 * @param functionName The name of the called tool function (must be 'navigate_to_screen')
 * @param args The arguments payload from Gemini Live
 * @param authorizedFeatures The user's backend-authorized features provisioned during token handshake
 */
export function validateVoiceNavigation(
  functionName: string,
  args: any,
  authorizedFeatures: AssistantFeature[] = []
): NavigationDecision {
  // 1. Function name must match exactly
  if (functionName !== 'navigate_to_screen') {
    return {
      allowed: false,
      error: `Unsupported function '${functionName}'. Only 'navigate_to_screen' is permitted.`,
    };
  }

  // 2. Validate arguments object
  if (!args || typeof args !== 'object') {
    return {
      allowed: false,
      error: 'Malformed function arguments: expected an object.',
    };
  }

  const rawScreenId = args.screenId;
  if (!rawScreenId || typeof rawScreenId !== 'string') {
    return {
      allowed: false,
      error: 'Missing or invalid screenId parameter.',
    };
  }

  const screenId = rawScreenId.trim().toLowerCase();

  // 3. Reject format anomalies and path traversal attempts
  if (!SCREEN_ID_PATTERN.test(screenId)) {
    return {
      allowed: false,
      error: `Invalid screenId format '${rawScreenId}'. Must be 3-50 alphanumeric or underscore characters.`,
    };
  }

  // 4. Must be a known, compile-time registered voice screen
  const staticEntry = ALLOWED_VOICE_SCREENS[screenId];
  if (!staticEntry) {
    return {
      allowed: false,
      error: `Unknown screenId '${rawScreenId}'. Destination is not a registered voice navigation target.`,
    };
  }

  // 5. Must be authorized by the backend for this specific user session
  const isAuthorized = authorizedFeatures.some(
    (feat) => feat.id && feat.id.toLowerCase() === screenId
  );

  if (!isAuthorized) {
    return {
      allowed: false,
      error: `Access denied. The current user does not have permission to access '${rawScreenId}'.`,
    };
  }

  // 6. Return verified, immutable route from static catalog (never trust model strings)
  return {
    allowed: true,
    screenId,
    targetName: staticEntry.name,
    targetRoute: staticEntry.route,
  };
}
