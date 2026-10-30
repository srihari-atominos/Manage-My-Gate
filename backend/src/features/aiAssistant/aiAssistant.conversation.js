/**
 * NAHOM AI Assistant — Natural Language Understanding & Conversation Manager
 *
 * Responsibilities:
 * 1. Intent Detection:
 *    Maps user queries (with colloquial terms, misspellings, informal phrasing) to canonical intents.
 * 2. Multi-turn State Tracking & Entity Resolution:
 *    Maintains context across consecutive messages, resolves relative temporal queries
 *    (e.g., "What about next week?", "Saturday at 6 PM"), and extracts missing slots.
 * 3. Workflow & Clarification vs. Confirmation:
 *    Determines whether the interaction requires clarification of missing fields,
 *    asking for confirmation before an action, answering with data, or navigation.
 * 4. Task Switching:
 *    Detects when a user switches away from an in-progress workflow (e.g., booking to dues)
 *    and cleanly resets discordant workflow state.
 * 5. Safe, Bounded Transient State:
 *    Guarantees state representations are bounded in size and never override RBAC or tenant isolation.
 */

import { cancelPendingAction } from './aiAssistant.actions.js';
import { expandUserPermissions, mapPermission } from '../../utils/permissionMapper.js';

// Canonical Supported Intents
export const INTENTS = Object.freeze({
  RESIDENT_DUES: 'resident_dues',
  COMMUNITY_FINANCE: 'community_finance',
  ASSESSMENT_CREATE: 'assessment_create',
  PERSONAL_EXPENSE: 'personal_expense',
  PERSONAL_EXPENSE_CREATE: 'personal_expense_create',
  AMENITY_INQUIRY: 'amenity_inquiry',
  AMENITY_AVAILABILITY: 'amenity_availability',
  AMENITY_BOOKING: 'amenity_booking',
  AMENITY_CANCELLATION: 'amenity_cancellation',
  AMENITY_CREATE: 'amenity_create',
  MY_BOOKINGS: 'my_bookings',
  COMPLAINTS_HELPDESK: 'complaints_helpdesk',
  COMPLAINT_CREATE: 'complaint_create',
  COMPLAINT_CANCEL: 'complaint_cancel',
  COMPLAINT_ESCALATE: 'complaint_escalate',
  COMPLAINT_REOPEN: 'complaint_reopen',
  COMPLAINT_COMMENT: 'complaint_comment',
  MAINTENANCE_CREATE: 'maintenance_create',
  VISITOR_MANAGEMENT: 'visitor_management',
  VISITOR_PASS_CREATE: 'visitor_pass_create',
  VISITOR_PASS_REVOKE: 'visitor_pass_revoke',
  COMMUNITY_NOTICES: 'community_notices',
  NOTICE_CREATE: 'notice_create',
  STAFF_DIRECTORY: 'staff_directory',
  HOUSEHOLD_VEHICLES: 'household_vehicles',
  COMMUNITY_POLLS: 'community_polls',
  POLL_CREATE: 'poll_create',
  USER_SETTINGS: 'user_settings',
  ADMIN_ANALYTICS: 'admin_analytics',
  WALLET_BALANCE: 'wallet_balance',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  NOTIFICATIONS: 'notifications',
  NOTIFICATIONS_MARK_READ: 'notifications_mark_read',
  ISSUE_REPORT_CREATE: 'issue_report_create',
  ISSUE_REPORTS_LIST: 'issue_reports_list',
  EMERGENCY_CONTACTS: 'emergency_contacts',
  AI_FEEDBACK: 'ai_feedback',
  GENERAL_INQUIRY: 'general_inquiry',
});

// Visitor Pass Archetypes & Invitation Options
export const VISITOR_INVITATION_TYPES = Object.freeze({
  GUEST: 'GUEST',
  GROUP: 'GROUP',
  CAB: 'CAB',
  DELIVERY: 'DELIVERY',
  SERVICE: 'SERVICE',
});

export const VISITOR_INVITATION_OPTIONS = Object.freeze([
  {
    type: 'GUEST',
    label: 'Guest Pass',
    description: 'Pre-approve individual friends, family, or personal visitors',
    badge: null,
  },
  {
    type: 'GROUP',
    label: 'Group Visit',
    description: 'Host events, parties, or bulk visitors with a single pass',
    badge: 'Multi-Guest',
  },
  {
    type: 'CAB',
    label: 'Cab / Auto',
    description: 'Pre-approve Uber, Ola, or taxi vehicles for auto gate barrier opening',
    badge: null,
  },
  {
    type: 'DELIVERY',
    label: 'Delivery',
    description: 'Quick entry pass for Swiggy, Zomato, Amazon, courier agents',
    badge: null,
  },
  {
    type: 'SERVICE',
    label: 'Service / Staff',
    description: 'Long-term entry pass for maid, driver, electrician, daily staff',
    badge: 'Recurring',
  },
]);

export const INTERACTIVE_OPTION_SETS = Object.freeze({
  VISITOR_INVITATION: Object.freeze(
    VISITOR_INVITATION_OPTIONS.map((opt) => ({
      id: opt.type,
      type: opt.type,
      value: opt.type,
      label: opt.label,
      description: opt.description,
      badge: opt.badge,
    }))
  ),

  ARRIVAL_TIME_PRESETS: Object.freeze([
    { id: 'immediate', value: 'right now', label: 'Immediate (Right Now)', badge: 'Now' },
    { id: '15_mins', value: 'in 15 mins', label: 'In 15 Mins' },
    { id: '30_mins', value: 'in 30 mins', label: 'In 30 Mins' },
    { id: '1_hour', value: 'in 1 hour', label: 'In 1 Hour' },
    { id: 'evening', value: '6:00 PM', label: 'Evening (6:00 PM)' },
  ]),

  CAB_PROVIDERS: Object.freeze([
    { id: 'uber', value: 'Uber', label: 'Uber', badge: 'Cab' },
    { id: 'ola', value: 'Ola', label: 'Ola', badge: 'Cab' },
    { id: 'rapido', value: 'Rapido', label: 'Rapido', badge: 'Bike/Cab' },
    { id: 'blusmart', value: 'BluSmart', label: 'BluSmart', badge: 'EV' },
    { id: 'auto', value: 'Auto', label: 'Auto / Local Taxi' },
  ]),

  DELIVERY_PARTNERS: Object.freeze([
    { id: 'swiggy', value: 'Swiggy', label: 'Swiggy', badge: 'Food' },
    { id: 'zomato', value: 'Zomato', label: 'Zomato', badge: 'Food' },
    { id: 'amazon', value: 'Amazon', label: 'Amazon', badge: 'Parcel' },
    { id: 'flipkart', value: 'Flipkart', label: 'Flipkart', badge: 'Parcel' },
    { id: 'blinkit', value: 'Blinkit', label: 'Blinkit / Zepto', badge: 'Grocery' },
    { id: 'courier', value: 'Courier', label: 'Other Courier' },
  ]),

  SERVICE_CATEGORIES: Object.freeze([
    { id: 'electrician', value: 'Electrician', label: 'Electrician' },
    { id: 'plumber', value: 'Plumber', label: 'Plumber' },
    { id: 'maid', value: 'Maid', label: 'Maid / Cleaning' },
    { id: 'cook', value: 'Cook', label: 'Cook' },
    { id: 'carpenter', value: 'Carpenter', label: 'Carpenter' },
    { id: 'pest_control', value: 'Pest Control', label: 'Pest Control' },
  ]),

  AMENITY_CATEGORIES: Object.freeze([
    { id: 'sports', value: 'SPORTS_FITNESS', label: 'Sports & Fitness', description: 'Badminton, tennis, gym, turf' },
    { id: 'hall', value: 'COMMUNITY_HALL', label: 'Clubhouse & Hall', description: 'Party hall, banquet room, lounge' },
    { id: 'pool', value: 'SWIMMING_POOL', label: 'Swimming Pool', description: 'Lap pool, kids pool, jacuzzi' },
    { id: 'outdoor', value: 'OUTDOOR_SPORTS', label: 'Outdoor Games', description: 'Basketball court, cricket pitch' },
    { id: 'coworking', value: 'COWORKING_SPACE', label: 'Co-working & Study', description: 'Quiet workstation, meeting room' },
  ]),

  AMENITY_PRICING: Object.freeze([
    { id: 'free', value: 'free', label: 'Free for Residents', description: 'No reservation charge' },
    { id: 'paid_hourly', value: 'paid_hourly', label: 'Paid Hourly', description: 'Slot-based court / facility fee' },
    { id: 'paid_headcount', value: 'paid_headcount', label: 'Paid per Person', description: 'Ticket fee per attendee' },
  ]),

  AMENITY_SLOT_DURATIONS: Object.freeze([
    { id: '30m', value: '30', label: '30 Minutes' },
    { id: '60m', value: '60', label: '60 Minutes (1h)' },
    { id: '90m', value: '90', label: '90 Minutes' },
    { id: '120m', value: '120', label: '120 Minutes (2h)' },
  ]),

  AMENITY_FACILITIES: Object.freeze([
    { id: 'ac', value: 'Air Conditioning', label: 'Air Conditioning' },
    { id: 'lockers', value: 'Lockers', label: 'Locker & Changing Rooms' },
    { id: 'floodlights', value: 'Floodlights', label: 'Night Floodlights' },
    { id: 'sound', value: 'Audio Visual', label: 'Sound & AV System' },
    { id: 'equipment', value: 'Equipment Provided', label: 'Equipment Provided' },
    { id: 'showers', value: 'Showers', label: 'Shower Rooms' },
  ]),

  AMENITY_CANCELLATION_POLICIES: Object.freeze([
    { id: 'full_24h', value: 'full_24h', label: 'Full Refund (24h before)' },
    { id: 'partial_50', value: 'partial_50', label: 'Partial Refund (50%)' },
    { id: 'non_refundable', value: 'non_refundable', label: 'Non-Refundable' },
  ]),

  DEFAULT_AMENITY_NAMES: Object.freeze([]),

  DATE_PRESETS: Object.freeze([
    { id: 'today', value: 'today', label: 'Today' },
    { id: 'tomorrow', value: 'tomorrow', label: 'Tomorrow' },
    { id: 'saturday', value: 'saturday', label: 'This Saturday' },
    { id: 'sunday', value: 'sunday', label: 'This Sunday' },
  ]),

  AMENITY_TIME_SLOTS: Object.freeze([
    { id: 'morning_early', value: '07:00 AM', label: 'Morning (07:00 AM - 08:00 AM)' },
    { id: 'morning_mid', value: '09:00 AM', label: 'Morning (09:00 AM - 10:00 AM)' },
    { id: 'afternoon', value: '04:00 PM', label: 'Afternoon (04:00 PM - 05:00 PM)' },
    { id: 'evening', value: '06:00 PM', label: 'Evening (06:00 PM - 07:00 PM)' },
    { id: 'night', value: '08:00 PM', label: 'Night (08:00 PM - 09:00 PM)' },
  ]),

  PARTICIPANTS_PRESETS: Object.freeze([
    { id: 'solo', value: '1', label: '1 Person (Solo)' },
    { id: 'pair', value: '2', label: '2 People' },
    { id: 'group_4', value: '4', label: '4 People' },
    { id: 'group_6', value: '6', label: '6+ People (Group)' },
  ]),

  PAYMENT_METHODS: Object.freeze([
    { id: 'wallet', value: 'wallet', label: 'Digital Wallet', badge: 'Fast', description: 'Pay instantly from resident wallet balance' },
    { id: 'online', value: 'online', label: 'Online Payment', badge: 'Instant', description: 'Pay via UPI, credit/debit card, or netbanking' },
  ]),

  COMPLAINT_CATEGORIES: Object.freeze([
    { id: 'plumbing', value: 'plumbing', label: 'Plumbing', description: 'Taps, leakage, drainage, pipe burst' },
    { id: 'electrical', value: 'electrical', label: 'Electrical', description: 'Power trip, switches, lights, fan' },
    { id: 'housekeeping', value: 'housekeeping', label: 'Housekeeping', description: 'Garbage, corridor cleaning, pest control' },
    { id: 'security', value: 'security', label: 'Security', description: 'Gate barrier, parking dispute, intercom' },
    { id: 'carpentry', value: 'carpentry', label: 'Carpentry & Civil', description: 'Door lock, tile damage, window hinge' },
    { id: 'noise', value: 'noise', label: 'Noise Disturbance', description: 'Loud music, pet issues, late night work' },
  ]),

  COMPLAINT_PRIORITIES: Object.freeze([
    { id: 'urgent', value: 'urgent', label: 'Urgent / Critical', badge: 'Priority', description: 'Active leak, sparking wire, gas smell' },
    { id: 'medium', value: 'medium', label: 'Medium / Standard', description: 'Standard service within 24-48 hours' },
    { id: 'low', value: 'low', label: 'Low / General', description: 'Minor cosmetic or preventive maintenance' },
  ]),

  LOCATION_PRESETS: Object.freeze([
    { id: 'bedroom', value: 'Master Bedroom', label: 'Master Bedroom' },
    { id: 'kitchen', value: 'Kitchen', label: 'Kitchen' },
    { id: 'bathroom', value: 'Bathroom', label: 'Bathroom' },
    { id: 'balcony', value: 'Balcony', label: 'Balcony' },
    { id: 'living', value: 'Living Room', label: 'Living Room' },
    { id: 'corridor', value: 'Corridor', label: 'Corridor / Lobby' },
  ]),

  MAINTENANCE_TRADES: Object.freeze([
    { id: 'ac_service', value: 'ac_service', label: 'AC & HVAC Service', description: 'Cooling issues, gas refill, filter cleaning' },
    { id: 'electrician', value: 'electrician', label: 'Electrician', description: 'Wiring, switches, lights, MCB' },
    { id: 'plumber', value: 'plumber', label: 'Plumber', description: 'Taps, geyser, leaks, drain clogging' },
    { id: 'carpenter', value: 'carpenter', label: 'Carpenter', description: 'Furniture, doors, locks, cabinet alignment' },
    { id: 'appliance', value: 'appliance', label: 'Home Appliance', description: 'Washing machine, refrigerator, chimney' },
  ]),

  FINANCE_PERIODS: Object.freeze([
    { id: 'this_month', value: 'this_month', label: 'Current Month' },
    { id: 'last_month', value: 'last_month', label: 'Last Month' },
    { id: 'quarter', value: 'quarter', label: 'Current Quarter' },
    { id: 'year', value: 'year', label: 'Current Financial Year' },
    { id: 'all', value: 'all', label: 'All Time' },
  ]),

  FINANCE_VIEWS: Object.freeze([
    { id: 'dues', value: 'dues', label: 'Maintenance Dues' },
    { id: 'expenses', value: 'expenses', label: 'Society Expenditure' },
    { id: 'top_categories', value: 'top_categories', label: 'Top Cost Categories' },
  ]),

  PERSONAL_EXPENSE_CATEGORIES: Object.freeze([
    { id: 'groceries', value: 'Groceries', label: 'Groceries & Food' },
    { id: 'maintenance', value: 'Maintenance', label: 'Home Maintenance' },
    { id: 'utilities', value: 'Utilities', label: 'Utilities (Electricity/Water)' },
    { id: 'services', value: 'Services', label: 'Domestic Services' },
    { id: 'shopping', value: 'Shopping', label: 'Shopping & Lifestyle' },
  ]),

  STAFF_DEPARTMENTS: Object.freeze([
    { id: 'security', value: 'security', label: 'Security Guards' },
    { id: 'housekeeping', value: 'housekeeping', label: 'Housekeeping Staff' },
    { id: 'maintenance', value: 'maintenance', label: 'Technicians & Maintenance' },
    { id: 'admin', value: 'admin', label: 'Society Management' },
  ]),

  NOTIFICATION_FILTERS: Object.freeze([
    { id: 'all', value: 'all', label: 'All Notifications' },
    { id: 'unread', value: 'unread', label: 'Unread Alerts', badge: 'New' },
    { id: 'urgent', value: 'urgent', label: 'Critical / Emergency', badge: 'Alert' },
    { id: 'billing', value: 'billing', label: 'Billing Reminders' },
  ]),

  ACTION_CONFIRMATIONS: Object.freeze([
    { id: 'confirm', value: 'yes', label: 'Confirm & Proceed', badge: 'Ready', description: 'Execute this action now' },
    { id: 'change', value: 'change', label: 'Change Details', description: 'Modify dates, timings, or parameters' },
    { id: 'cancel', value: 'cancel', label: 'Cancel Request', description: 'Discard this request' },
  ]),
});

export function extractPassType(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // 1. Cab / Auto
  if (/\b(cab|auto|taxi|uber|ola|rapido|blusmart)\b/i.test(str)) {
    return 'CAB';
  }

  // 2. Delivery
  if (/\b(delivery|courier|swiggy|zomato|amazon|flipkart|blinkit|zepto|instamart|bigbasket|dunzo|fedex|dhl|parcel|package)\b/i.test(str)) {
    return 'DELIVERY';
  }

  // 3. Service / Staff
  if (/\b(service\s*\/?\s*staff|service|staff|maid|cook|cleaner|electrician|plumber|carpenter|technician|repair|painter|gardener|laundry|maintenance staff|pest control)\b/i.test(str)) {
    return 'SERVICE';
  }

  // 4. Group
  if (/\b(group\s+visit|group\s+pass|multi[- ]guest|party|event|gathering|bulk visitors|multiple visitors|team)\b/i.test(str)) {
    return 'GROUP';
  }

  // 5. Guest
  if (/\b(guest\s+pass|guest|friend|family|relative|personal visitor)\b/i.test(str)) {
    return 'GUEST';
  }

  return null;
}

export function extractCabProvider(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(Uber|Ola|Rapido|BluSmart|Auto|Taxi)\b/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : null;
}

export function extractDeliveryPartner(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(Swiggy|Zomato|Amazon|Flipkart|Blinkit|Zepto|Instamart|BigBasket|Dunzo|FedEx|DHL|Courier)\b/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : null;
}

export function extractServiceCategory(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(Electrician|Plumber|Carpenter|Maid|Cook|Cleaner|Technician|Painter|Gardener|Pest Control|Maintenance)\b/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : null;
}

/**
 * Role & Permission Resolution Helpers for AIAssistant
 */
export function hasAdminRole(user) {
  if (!user) return false;
  return (
    user.isPlatform === true ||
    user.role === 'Super Admin' ||
    user.role === 'SuperAdmin' ||
    user.role === 'Platform Super Admin' ||
    user.role === 'Admin' ||
    user.role === 'Community Admin' ||
    user.role === 'CommunityManager' ||
    user.role === 'FacilityManager' ||
    user.role === 'Manager' ||
    user.role === 'Facility Manager'
  );
}

export function canUserCreateAmenity(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('amenities:master') ||
    perms.includes('amenities:amenities') ||
    perms.includes('amenities:create') ||
    perms.includes('amenities.create') ||
    perms.includes('amenities:manage') ||
    perms.includes('*')
  );
}

export function canUserBookAmenity(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  // Use exactly the same compatibility expansion as the API RBAC middleware.
  // The assistant must neither lose valid legacy access nor invent access that
  // the authenticated permission set does not provide.
  const perms = expandUserPermissions(
    (Array.isArray(user.permissions) ? user.permissions : []).map(mapPermission)
  );
  if (perms.length > 0) {
    return (
      perms.includes('amenities:my_booking') ||
      perms.includes('amenities:book') ||
      perms.includes('amenities.book') ||
      perms.includes('*')
    );
  }
  const role = String(user.role || '').toLowerCase();
  return role.includes('resident') || role.includes('tenant') || role.includes('owner') || role.includes('family');
}

export function canUserDiscoverAmenities(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length > 0) {
    return (
      perms.includes('amenities:discover') ||
      perms.includes('amenities:read') ||
      perms.includes('amenities.read') ||
      perms.includes('amenities:my_booking') ||
      perms.includes('*')
    );
  }
  return true;
}

export function canUserCreateVisitorPass(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length > 0) {
    return perms.includes('visitor:resident') || perms.includes('visitor:admin') || perms.includes('*');
  }
  const role = String(user.role || '').toLowerCase();
  return role.includes('resident') || role.includes('tenant') || role.includes('owner') || role.includes('family');
}

export function canUserRaiseComplaint(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length > 0) {
    return (
      perms.includes('complaints:raise_ticket') ||
      perms.includes('complaints:create') ||
      perms.includes('complaints.create') ||
      perms.includes('*')
    );
  }
  const role = String(user.role || '').toLowerCase();
  return role.includes('resident') || role.includes('tenant') || role.includes('owner') || role.includes('family');
}

export function canUserCreatePoll(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('polls:create') ||
    perms.includes('polls:manage') ||
    perms.includes('notices:manage_notices') ||
    perms.includes('*')
  );
}

export function canUserCreateNotice(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('notices:create') ||
    perms.includes('notices:manage') ||
    perms.includes('notices:manage_notices') ||
    perms.includes('*')
  );
}

export function canUserCreateAssessment(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('billing:assessments') ||
    perms.includes('billing:manage') ||
    perms.includes('billing:dashboard') ||
    perms.includes('*')
  );
}

export function canUserViewCommunityFinance(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('billing:view_expense') || perms.includes('billing:dashboard') || perms.includes('*');
}

export function canUserAccessWallet(user) {
  return Boolean(user);
}

export function canUserViewNotifications(user) {
  return Boolean(user);
}

export function canUserReportIssue(user) {
  return Boolean(user);
}

export function canUserViewEmergencyContacts(user) {
  return Boolean(user);
}

export function canUserSubmitFeedback(user) {
  return Boolean(user);
}

// Canonical Workflows
export const WORKFLOWS = Object.freeze({
  AMENITY_BOOKING_INTAKE: 'amenity_booking_intake',
  AMENITY_BOOKING_READY: 'amenity_booking_ready',
  AMENITY_CANCEL_INTAKE: 'amenity_cancel_intake',
  AMENITY_CANCEL_READY: 'amenity_cancel_ready',
  AMENITY_CREATE_INTAKE: 'amenity_create_intake',
  AMENITY_CREATE_READY: 'amenity_create_ready',
  ASSESSMENT_CREATE_READY: 'assessment_create_ready',
  POLL_CREATE_READY: 'poll_create_ready',
  NOTICE_CREATE_INTAKE: 'notice_create_intake',
  NOTICE_CREATE_READY: 'notice_create_ready',
  EXPENSE_INTAKE: 'expense_intake',
  EXPENSE_READY: 'expense_ready',
  COMPLAINT_INTAKE: 'complaint_intake',
  COMPLAINT_READY: 'complaint_ready',
  COMPLAINT_CANCEL_INTAKE: 'complaint_cancel_intake',
  COMPLAINT_CANCEL_READY: 'complaint_cancel_ready',
  COMPLAINT_ESCALATE_READY: 'complaint_escalate_ready',
  COMPLAINT_REOPEN_READY: 'complaint_reopen_ready',
  MAINTENANCE_INTAKE: 'maintenance_intake',
  MAINTENANCE_READY: 'maintenance_ready',
  VISITOR_PASS_INTAKE: 'visitor_pass_intake',
  VISITOR_PASS_READY: 'visitor_pass_ready',
  VISITOR_REVOKE_INTAKE: 'visitor_revoke_intake',
  VISITOR_REVOKE_READY: 'visitor_revoke_ready',
  VISITOR_GUIDANCE: 'visitor_guidance',
});

// Known community amenities recognized across the platform
export const KNOWN_AMENITIES = Object.freeze([
  { canonical: 'Badminton', aliases: ['badminton', 'shuttle', 'badminton court', 'badminton courts'] },
  { canonical: 'Clubhouse', aliases: ['clubhouse', 'club house', 'community hall', 'party hall', 'hall'] },
  { canonical: 'Swimming Pool', aliases: ['swimming pool', 'pool', 'swimming'] },
  { canonical: 'Gym', aliases: ['gym', 'gymnasium', 'fitness center', 'workout room'] },
  { canonical: 'Tennis', aliases: ['tennis', 'tennis court', 'lawn tennis'] },
  { canonical: 'Squash', aliases: ['squash', 'squash court'] },
  { canonical: 'Banquet Hall', aliases: ['banquet hall', 'banquet', 'event hall'] },
  { canonical: 'Table Tennis', aliases: ['table tennis', 'tt', 'ping pong'] },
  { canonical: 'Basketball', aliases: ['basketball', 'basketball court'] },
  { canonical: 'Billiards', aliases: ['billiards', 'pool table', 'snooker'] },
  { canonical: 'Meeting Room', aliases: ['meeting room', 'conference room', 'coworking'] },
  { canonical: 'Yoga Room', aliases: ['yoga room', 'meditation hall', 'aerobics studio'] },
]);

/**
 * Format Date to YYYY-MM-DD in ISO format
 */
export function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves current date in reference timezone (default 'Asia/Kolkata')
 */
export function getReferenceDate(customDate = null) {
  if (customDate instanceof Date && !isNaN(customDate.getTime())) {
    return new Date(customDate);
  }
  if (typeof customDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(customDate)) {
    return new Date(customDate);
  }
  return new Date();
}

/**
 * Resolves relative date expressions like "tomorrow", "next week", "Saturday", "this weekend"
 */
export function resolveDateExpression(expr, baseDateInput = null) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();
  const baseDate = getReferenceDate(baseDateInput);

  // 1. "yesterday"
  if (text.includes('yesterday')) {
    const yest = new Date(baseDate);
    yest.setDate(baseDate.getDate() - 1);
    return {
      type: 'single',
      date: formatDate(yest),
      label: 'Yesterday',
    };
  }

  // 2. "today" or "tonight" or "now" or "in X mins/hours"
  if (text.includes('today') || text.includes('tonight') || /\b(now|in\s+\d+\s*(?:mins?|minutes?|hours?))\b/i.test(text)) {
    return {
      type: 'single',
      date: formatDate(baseDate),
      label: text.includes('tonight') ? 'Tonight' : 'Today',
    };
  }

  // 2. "day after tomorrow" (must precede "tomorrow")
  if (text.includes('day after tomorrow')) {
    const dat = new Date(baseDate);
    dat.setDate(baseDate.getDate() + 2);
    return {
      type: 'single',
      date: formatDate(dat),
      label: 'Day after tomorrow',
    };
  }

  // 3. "tomorrow"
  if (text.includes('tomorrow')) {
    const tmr = new Date(baseDate);
    tmr.setDate(baseDate.getDate() + 1);
    return {
      type: 'single',
      date: formatDate(tmr),
      label: 'Tomorrow',
    };
  }

  // 4. "this weekend" or "weekend" (check before "this week")
  if (text.includes('weekend')) {
    const day = baseDate.getDay();
    let daysToSat = 6 - day;
    if (day === 0) daysToSat = -1;
    const saturday = new Date(baseDate);
    saturday.setDate(baseDate.getDate() + (daysToSat < 0 ? 6 : daysToSat));

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    return {
      type: 'range',
      startDate: formatDate(saturday),
      endDate: formatDate(sunday),
      label: 'This weekend',
    };
  }

  // 5. "next week"
  if (/\bnext week\b/i.test(text)) {
    const day = baseDate.getDay();
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(baseDate);
    nextMonday.setDate(baseDate.getDate() + daysUntilNextMonday);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    return {
      type: 'range',
      startDate: formatDate(nextMonday),
      endDate: formatDate(nextSunday),
      label: 'Next week',
    };
  }

  // 6. "this week"
  if (/\bthis week\b/i.test(text)) {
    const day = baseDate.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const thisMonday = new Date(baseDate);
    thisMonday.setDate(baseDate.getDate() - daysSinceMonday);

    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);

    return {
      type: 'range',
      startDate: formatDate(thisMonday),
      endDate: formatDate(thisSunday),
      label: 'This week',
    };
  }

  // 7. Day of week names: Monday..Sunday
  const weekdays = [
    { name: 'sunday', dayNum: 0 },
    { name: 'monday', dayNum: 1 },
    { name: 'tuesday', dayNum: 2 },
    { name: 'wednesday', dayNum: 3 },
    { name: 'thursday', dayNum: 4 },
    { name: 'friday', dayNum: 5 },
    { name: 'saturday', dayNum: 6 },
  ];

  for (const wd of weekdays) {
    if (new RegExp(`\\b${wd.name}\\b`, 'i').test(text)) {
      const currentDay = baseDate.getDay();
      let diff = (wd.dayNum - currentDay + 7) % 7;
      if (diff === 0 && text.includes('next')) {
        diff = 7;
      } else if (diff === 0 && !text.includes('today')) {
        diff = 0;
      }
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + diff);
      const capName = wd.name.charAt(0).toUpperCase() + wd.name.slice(1);

      return {
        type: 'single',
        date: formatDate(targetDate),
        label: capName,
      };
    }
  }

  // 8. Explicit YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return {
      type: 'single',
      date: isoMatch[0],
      label: isoMatch[0],
    };
  }

  return null;
}

/**
 * Resolves time ranges like "from 6 PM to 7 PM", "6 to 7 pm", "7 to 8 am"
 */
export function resolveTimeRange(expr) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();

  // 1. 24-hour range: "from 18:00 to 19:30", "18:00 to 19:30", "between 18:00 and 19:30"
  const m24Range = text.match(/\b(?:from\s+|between\s+)?([01]\d|2[0-3]):([0-5]\d)\s*(?:to|-|until|and)\s*([01]\d|2[0-3]):([0-5]\d)\b/i);
  if (m24Range) {
    return {
      startTime: `${m24Range[1]}:${m24Range[2]}`,
      endTime: `${m24Range[3]}:${m24Range[4]}`,
    };
  }

  // 2. Between ... and ... (e.g. "between 6 and 7:30 PM", "between 6:00 PM and 7:30 PM")
  const mBetween = text.match(/\b(?:between\s+)(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)?\s*(?:and|-|to)\s*(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (mBetween) {
    let startH = parseInt(mBetween[1], 10);
    const startM = mBetween[2] || '00';
    let endH = parseInt(mBetween[4], 10);
    const endM = mBetween[5] || '00';
    const endMeridian = mBetween[6].toLowerCase();
    const startMeridian = (mBetween[3] ? mBetween[3].toLowerCase() : endMeridian);

    if (startMeridian === 'pm') {
      if (startH < 12) startH += 12;
    } else if (startMeridian === 'am') {
      if (startH === 12) startH = 0;
    }

    if (endMeridian === 'pm') {
      if (endH < 12) endH += 12;
    } else if (endMeridian === 'am') {
      if (endH === 12) endH = 0;
    }

    return {
      startTime: `${String(startH).padStart(2, '0')}:${startM}`,
      endTime: `${String(endH).padStart(2, '0')}:${endM}`,
    };
  }

  // 3. Double meridian: "from 6 pm to 7 pm", "6 pm to 7 pm", "6:30 pm to 7:30 pm"
  const mDouble = text.match(/\b(?:from\s+)?(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\s*(?:to|-|until)\s*(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (mDouble) {
    let startH = parseInt(mDouble[1], 10);
    const startM = mDouble[2] || '00';
    const startMeridian = mDouble[3].toLowerCase();
    if (startMeridian === 'pm' && startH < 12) startH += 12;
    if (startMeridian === 'am' && startH === 12) startH = 0;

    let endH = parseInt(mDouble[4], 10);
    const endM = mDouble[5] || '00';
    const endMeridian = mDouble[6].toLowerCase();
    if (endMeridian === 'pm' && endH < 12) endH += 12;
    if (endMeridian === 'am' && endH === 12) endH = 0;

    return {
      startTime: `${String(startH).padStart(2, '0')}:${startM}`,
      endTime: `${String(endH).padStart(2, '0')}:${endM}`,
    };
  }

  // 4. Single meridian: "from 6 to 7 pm", "6 to 7 pm", "7 to 8 am"
  const mSingle = text.match(/\b(?:from\s+)?(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(?:to|-|until)\s*(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (mSingle) {
    let startH = parseInt(mSingle[1], 10);
    const startM = mSingle[2] || '00';
    const meridian = mSingle[5].toLowerCase();
    let endH = parseInt(mSingle[3], 10);
    const endM = mSingle[4] || '00';

    if (meridian === 'pm') {
      if (startH < 12 && startH <= endH) startH += 12;
      if (endH < 12) endH += 12;
    } else if (meridian === 'am') {
      if (startH === 12) startH = 0;
      if (endH === 12) endH = 0;
    }

    return {
      startTime: `${String(startH).padStart(2, '0')}:${startM}`,
      endTime: `${String(endH).padStart(2, '0')}:${endM}`,
    };
  }

  return null;
}

/**
 * Resolves time expressions like "6 PM", "18:00", "09:30 AM", "evening", "morning", "after lunch"
 */
export function resolveTimeExpression(expr, options = {}) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();

  // Check relative time offsets: "in 15 mins", "in 20 minutes", "in 1 hour"
  const relMin = text.match(/\bin\s+(\d+)\s*(?:mins?|minutes?)\b/i);
  if (relMin) {
    const mins = parseInt(relMin[1], 10);
    const base = options?.refDate instanceof Date ? new Date(options.refDate) : (options?.referenceDate instanceof Date ? new Date(options.referenceDate) : new Date());
    base.setMinutes(base.getMinutes() + mins);
    return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`;
  }
  const relHr = text.match(/\bin\s+(\d+)\s*hours?\b/i);
  if (relHr) {
    const hrs = parseInt(relHr[1], 10);
    const base = options?.refDate instanceof Date ? new Date(options.refDate) : (options?.referenceDate instanceof Date ? new Date(options.referenceDate) : new Date());
    base.setHours(base.getHours() + hrs);
    return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`;
  }

  // Check time range first
  const range = resolveTimeRange(text);
  if (range) {
    if (options && options.returnRange) return range;
    return range.startTime;
  }

  // 1. Explicit 12-hour: "6:30 pm", "6 pm", "6pm", "09:15 am", "6 pm", "6pm", "09:15 am"
  const m12 = text.match(/\b(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = m12[2] || '00';
    const meridian = m12[3].toLowerCase();
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  // 2. Explicit 24-hour: "18:00", "09:30"
  const m24 = text.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    return `${m24[1]}:${m24[2]}`;
  }

  // If caller requires an exact slot time, do not map broad daytime periods
  if (options && options.exactOnly) {
    return null;
  }

  // 3. Approximate times
  if (text.includes('after lunch') || text.includes('lunch')) return '14:00';
  if (text.includes('before lunch')) return '12:00';
  if (text.includes('noon') || text.includes('midday')) return '12:00';
  if (text.includes('morning')) return '09:00';
  if (text.includes('afternoon')) return '14:00';
  if (text.includes('evening')) return '18:00';
  if (text.includes('night')) return '20:00';

  return null;
}

/**
 * Extracts broad time-of-day preference ("morning", "afternoon", "evening", "night")
 */
export function resolveTimePeriod(expr) {
  if (!expr || typeof expr !== 'string') return null;
  const text = expr.toLowerCase().trim();
  if (text.includes('morning')) return 'morning';
  if (text.includes('afternoon')) return 'afternoon';
  if (text.includes('evening')) return 'evening';
  if (text.includes('night')) return 'night';
  return null;
}

/**
 * Matches known amenity from user utterance
 */

/**
 * Resolves ordinal references ("the first one", "the second one", "the last one")
 * to specific entities mentioned in previous assistant messages in history.
 */
export function extractOrdinalReference(text, history = [], presentedList = []) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  let targetIndex = -1;
  if (/\b(first(\s+one)?|1st)\b/i.test(lower)) targetIndex = 0;
  else if (/\b(second(\s+one)?|2nd)\b/i.test(lower)) targetIndex = 1;
  else if (/\b(third(\s+one)?|3rd)\b/i.test(lower)) targetIndex = 2;
  else if (/\b(fourth(\s+one)?|4th)\b/i.test(lower)) targetIndex = 3;
  else if (/\b(fifth(\s+one)?|5th)\b/i.test(lower)) targetIndex = 4;
  else if (/\b(last(\s+one)?)\b/i.test(lower)) targetIndex = 999;

  if (targetIndex === -1) return null;

  // 1. Direct presented list from state
  if (Array.isArray(presentedList) && presentedList.length > 0) {
    if (targetIndex === 999) return presentedList[presentedList.length - 1];
    if (targetIndex >= 0 && targetIndex < presentedList.length) {
      return presentedList[targetIndex];
    }
  }

  // 2. Scan assistant message history in order of visual occurrence in the text
  const reversedHistory = Array.isArray(history) ? [...history].reverse() : [];
  for (const h of reversedHistory) {
    if (h.role === 'model' || h.role === 'assistant') {
      const msgText = (h.text || h.content || (h.parts && h.parts[0]?.text) || '').toLowerCase();
      const occurrences = [];
      for (const ka of KNOWN_AMENITIES) {
        let minPos = -1;
        const cPos = msgText.indexOf(ka.canonical.toLowerCase());
        if (cPos !== -1) minPos = cPos;
        for (const al of ka.aliases) {
          const aPos = msgText.indexOf(al.toLowerCase());
          if (aPos !== -1 && (minPos === -1 || aPos < minPos)) minPos = aPos;
        }
        if (minPos !== -1) {
          occurrences.push({ canonical: ka.canonical, pos: minPos });
        }
      }
      occurrences.sort((a, b) => a.pos - b.pos);
      if (occurrences.length > 0) {
        if (targetIndex === 999) return occurrences[occurrences.length - 1].canonical;
        if (targetIndex >= 0 && targetIndex < occurrences.length) {
          return occurrences[targetIndex].canonical;
        }
      }
    }
  }

  return null;
}

export function extractAmenityName(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  for (const amenity of KNOWN_AMENITIES) {
    for (const alias of amenity.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(lower)) {
        return amenity.canonical;
      }
    }
  }
  return null;
}

export const WORD_TO_NUMBER_MAP = Object.freeze({
  zero: 0,
  one: 1, 'a': 1, 'an': 1, single: 1,
  two: 2, couple: 2, 'a couple': 2, 'both': 2, pair: 2,
  three: 3, 'a few': 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12, 'a dozen': 12,
  fifteen: 15,
  twenty: 20,
  'twenty-five': 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
});

export function parseNaturalNumber(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim();
  if (/^\d+$/.test(s)) return Number(s);
  return WORD_TO_NUMBER_MAP[s] ?? null;
}

/**
 * Extracts attendee/headcount count for bookings (e.g. "for 2 members", "for me and my friend" -> 2)
 */
export function extractAllAmenityNames(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const matched = [];
  for (const item of KNOWN_AMENITIES) {
    let hit = false;
    if (lower.includes(item.canonical.toLowerCase())) {
      hit = true;
    } else {
      for (const alias of item.aliases) {
        if (lower.includes(alias)) {
          hit = true;
          break;
        }
      }
    }
    if (hit) matched.push(item.canonical);
  }
  return matched;
}

export function extractMultipleVisitors(text) {
  if (!text || typeof text !== 'string') return [];
  let str = text.trim();

  // Strip common request prefixes like "Create passes for...", "Visitor pass for...", "Invite..."
  str = str.replace(/^(?:please\s+)?(?:create|issue|generate|register|book|get|make)?\s*(?:(?:visitor\s+)?passes?|entry)?\s*(?:for|to)?\s+/i, '');

  // Strip trailing temporal or explanatory phrases like "tomorrow at 5 PM", "today between 6 and 7:30 PM", "for dinner"
  str = str.replace(/\s+(?:tomorrow|today|yesterday|between|from|at\s+\d|on\b|next\b|this\b).*$/i, '');
  str = str.replace(/[.!?;]+$/, '').trim();

  const parts = str.split(/,|\band\b|&/i).map(p => p.trim()).filter(Boolean);
  const visitors = [];
  const invalidNames = new Set([
    'tomorrow', 'today', 'yesterday', 'pm', 'am', 'yes', 'no', 'please', 'and', 'me', 'two', 'three', 'four', 'five',
    'pass', 'passes', 'visitor', 'visitors', 'guest', 'guests', 'entry', 'someone', 'friend', 'friends', 'cab', 'auto', 'taxi', 'uber', 'ola', 'delivery', 'courier', 'swiggy', 'zomato', 'amazon', 'service', 'staff', 'maid', 'cook', 'electrician', 'plumber', 'driver', 'a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'at'
  ]);

  for (const part of parts) {
    const mWithPhone = part.match(/^([A-Za-z\s]+?)(?:[:\-\()]\s*|\s+)(\+?\d{10,13})\)?$/);
    if (mWithPhone) {
      const name = mWithPhone[1].trim();
      const phone = mWithPhone[2].trim();
      if (name.length > 1 && !invalidNames.has(name.toLowerCase())) {
        visitors.push({ name, phone });
      }
    } else {
      const mNameOnly = part.match(/^([A-Za-z\s]+)$/);
      if (mNameOnly) {
        const name = mNameOnly[1].trim();
        const words = name.toLowerCase().split(/\s+/).filter(Boolean);
        // A count phrase such as "two visitors" describes unnamed people; it
        // must not satisfy the required visitor-name field.  Require at least
        // one name-like word rather than only rejecting exact whole phrases.
        const hasNameLikeWord = words.some((word) => !invalidNames.has(word));
        if (name.length > 1 && hasNameLikeWord && !invalidNames.has(name.toLowerCase())) {
          visitors.push({ name, phone: '' });
        }
      }
    }
  }

  return visitors;
}

export function extractInvoiceQueryDetails(text) {
  if (!text || typeof text !== 'string') return {};
  const lower = text.toLowerCase().trim();
  const details = {};

  if (/\b(?:unpaid|pending|outstanding|due|owe)\b/i.test(lower)) {
    details.status = 'UNPAID';
  } else if (/\b(?:paid|settled|cleared|receipts?)\b/i.test(lower)) {
    details.status = 'PAID';
  }

  const mInv = lower.match(/\b(?:invoice|inv|bill)\s*(?:#|no\.?|num(?:ber)?|id)?\s*[:\-]?\s*([a-z0-9][a-z0-9\-_]*\d+[a-z0-9\-_]*|[0-9]+)\b/i);
  if (mInv && !/^(status|details|this|latest|pending|due|paid|unpaid|amount|for|my|the)$/i.test(mInv[1])) {
    details.invoiceNumber = mInv[1].toUpperCase();
  }

  if (/this month|current month/i.test(lower)) {
    details.period = 'current_month';
  } else if (/last month|previous month/i.test(lower)) {
    details.period = 'previous_month';
  }

  if (/latest|most recent|current bill/i.test(lower)) {
    details.limit = 1;
  }

  if (/download/i.test(lower)) {
    details.action = 'download';
  } else if (/explain|breakdown|why/i.test(lower)) {
    details.action = 'explain';
  }

  return details;
}

export function extractHeadcount(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // "X members and (include/with) Y guests" -> sum
  const mMembersGuests = str.match(/(\d+|[a-z\-]+)\s+(?:members?|adults?|people|persons?)\s+(?:and|\+)\s+(?:include\s+|with\s+)?(\d+|[a-z\-]+)\s+(?:guests?|friends?|visitors?|children|kids?)\b/);
  if (mMembersGuests) {
    const m = parseNaturalNumber(mMembersGuests[1]);
    const g = parseNaturalNumber(mMembersGuests[2]);
    if (m !== null && g !== null) return m + g;
  }

  // "X adults and Y children/kids" -> sum
  const mAdultsKids = str.match(/(\d+|[a-z\-]+)\s+(?:adults?|grownups?)\s+(?:and|\+)\s+(\d+|[a-z\-]+)\s+(?:children|kids?|child)\b/);
  if (mAdultsKids) {
    const a = parseNaturalNumber(mAdultsKids[1]);
    const c = parseNaturalNumber(mAdultsKids[2]);
    if (a !== null && c !== null) return a + c;
  }

  // "X guests besides me" -> 1 + X
  const mBesides = str.match(/(\d+|[a-z\-]+)\s+(?:guests?|people|persons|friends?)\s+besides\s+me\b/);
  if (mBesides) {
    const num = parseNaturalNumber(mBesides[1]);
    if (num) return 1 + num;
  }

  // "X people, including me" / "X including me"
  const mIncluding = str.match(/(\d+|[a-z\-]+)\s+(?:people|persons|members|players|guests)?\s*,?\s*including\s+me\b/);
  if (mIncluding) {
    const num = parseNaturalNumber(mIncluding[1]);
    if (num) return num;
  }

  // "add my wife and two children" / "my wife and X kids"
  const mWifeKids = str.match(/(?:add\s+)?(?:my\s+)?(?:wife|husband|spouse|partner)\s+(?:and|\+)\s+(\d+|[a-z\-]+)\s+(?:children|kids?|child)\b/);
  if (mWifeKids) {
    const kids = parseNaturalNumber(mWifeKids[1]);
    if (kids !== null) return 1 + kids;
  }

  // "me and my friend" / "me and a friend"
  if (/\bme and (?:my\s+|a\s+)?friend\b/.test(str)) return 2;

  // "me and X friends/guests/people"
  const meAndX = str.match(/\bme and (\d+|[a-z\-]+) (?:friends|guests|people|members|players)\b/);
  if (meAndX) {
    const num = parseNaturalNumber(meAndX[1]);
    if (num) return 1 + num;
  }

  // "we are 4 people"
  const weAre = str.match(/\bwe are (\d+|[a-z\-]+) (?:people|persons|members|players|guests)\b/);
  if (weAre) {
    const num = parseNaturalNumber(weAre[1]);
    if (num) return num;
  }

  // "make it 5 people", "change it to 5 people", "update to 5 people", "set to 5 people"
  const mChangeExplicit = str.match(/(?:make it|change (?:it )?to|update (?:it )?to|set (?:it )?to)\s+(\d+|[a-z\-]+)\s+(?:people|persons|members|players|guests|participants|attendees)\b/);
  if (mChangeExplicit) {
    const num = parseNaturalNumber(mChangeExplicit[1]);
    if (num) return num;
  }

  // "make it 6" (bare number at end or not followed by time units)
  const mChangeBare = str.match(/(?:make it|set (?:headcount|count|attendees)?\s*(?:it )?to)\s+(\d+|[a-z\-]+)(?!\s*[:\.]\d|\s*(?:am|pm|hours|hrs|mins|minutes))\b/);
  if (mChangeBare) {
    const num = parseNaturalNumber(mChangeBare[1]);
    if (num) return num;
  }

  // "for 2 members", "for two people", "for 3 persons", "for two players", "to 4 members", "for five additional guests"
  const mAttendees = str.match(/(?:for|to|can|reserve.*for|book.*for|available for|cost for|capacity of|booking to)\s+(\d+|[a-z\-]+)\s+(?:additional\s+)?(?:people|persons|members|players|guests|participants|of us|attendees)\b/);
  if (mAttendees) {
    const num = parseNaturalNumber(mAttendees[1]);
    if (num) return num;
  }

  // "three of us", "two of us"
  const mOfUs = str.match(/\b(\d+|[a-z\-]+)\s+of us\b/);
  if (mOfUs) {
    const num = parseNaturalNumber(mOfUs[1]);
    if (num) return num;
  }

  // "two players", "four members", "five people"
  const mPlayers = str.match(/\b(\d+|[a-z\-]+)\s+(?:players|members|persons|people|guests)\b/);
  if (mPlayers) {
    const num = parseNaturalNumber(mPlayers[1]);
    if (num) return num;
  }

  // "family of four"
  const mFamily = str.match(/\bfamily of (\d+|[a-z\-]+)\b/);
  if (mFamily) {
    const num = parseNaturalNumber(mFamily[1]);
    if (num) return num;
  }

  // "a couple of friends"
  if (/\ba couple of (?:friends|people|members|guests)\b/.test(str)) return 2;

  // "for me and my family" / "for my family"
  if (/\b(?:for\s+)?(?:me and my family|my family)\b/.test(str)) {
    return 4;
  }

  return null;
}

/**
 * Extracts participant names and headcount for amenity bookings (e.g. "for Rahul and Priya", "for me and Priya", "with Amit and Sneha").
 */
export function extractBookingParticipants(text) {
  if (!text || typeof text !== 'string') return { names: null, headcount: null };
  const str = text.trim();

  // Named participants e.g. "for Rahul and Priya", "with Amit and Sneha"
  const mNamed = str.match(/(?:for|with)\s+([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+|\s*,\s*[A-Z][a-z]+)+)/);
  if (mNamed) {
    const raw = mNamed[1].trim();
    const parts = raw.split(/,|\band\b/).map((p) => p.trim()).filter(Boolean);
    return { names: raw, headcount: parts.length };
  }
  const mMeAnd = str.match(/(?:for|with)\s+(me\s+and\s+[A-Z][a-z]+)/i);
  if (mMeAnd) {
    return { names: mMeAnd[1].trim(), headcount: 2 };
  }
  const mSingleNamed = str.match(/(?:for|booking for)\s+([A-Z][a-z]+)\b(?!\s+(?:tomorrow|today|yesterday|pm|am|hours|mins))/);
  if (mSingleNamed && !/^(tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(mSingleNamed[1])) {
    return { names: mSingleNamed[1].trim(), headcount: 1 };
  }
  return { names: null, headcount: null };
}

/**
 * Extracts visitor pass parameters: visitorCount, isGroupPass, isSeparate, isAddAnother, isProcessInquiry
 */
export function extractVisitorPassIntentAndCount(text) {
  if (!text || typeof text !== 'string') {
    return { count: 1, isGroup: false, isSeparate: false, isInfo: false, isAddAnother: false };
  }
  const str = text.toLowerCase().trim();
  let count = 1;
  let isGroup = false;
  let isSeparate = false;
  let isAddAnother = false;
  let isInfo = false;

  if (/(?:how do i register|what is the process|how to register|how can i register)/.test(str)) {
    isInfo = true;
  }

  if (/\badd another (?:visitor|guest|person|friend)\b/.test(str)) {
    isAddAnother = true;
    return { count: 1, isAddAnother, isGroup: true, isSeparate: false, isInfo: false };
  }

  const changeMatch = str.match(/(?:change|update).*?(?:from\s+(\d+|[a-z\-]+)\s+)?to\s+(\d+|[a-z\-]+)/);
  if (changeMatch) {
    const val = parseNaturalNumber(changeMatch[2]);
    if (val) return { count: val, isGroup: val > 1, isSeparate: false, isInfo: false, isAddAnother: false };
  }

  if (/\b(?:separate passes|individual passes|distinct passes)\b/.test(str)) {
    isSeparate = true;
  }

  const meAndGuests = str.match(/\bme and (\d+|[a-z\-]+) guests?\b/);
  if (meAndGuests) {
    count = parseNaturalNumber(meAndGuests[1]) || 2;
    isGroup = true;
    return { count, isGroup, isSeparate, isInfo, isAddAnother: false };
  }

  const mCount = str.match(/(?:for|passes for|create a pass for|group of|generate passes for)\s+(\d+|[a-z\-]+)\s+(?:people|persons|guests|visitors|friends)\b/);
  if (mCount) {
    count = parseNaturalNumber(mCount[1]) || 1;
    if (count > 1 && !isSeparate) isGroup = true;
    return { count, isGroup, isSeparate, isInfo, isAddAnother: false };
  }

  const mPrefix = str.match(/\b(\d+|[a-z\-]+)\s+(?:friends|guests|visitors)\s+(?:are visiting|coming)\b/);
  if (mPrefix) {
    count = parseNaturalNumber(mPrefix[1]) || 1;
    if (count > 1 && !isSeparate) isGroup = true;
    return { count, isGroup, isSeparate, isInfo, isAddAnother: false };
  }

  const mFamily = str.match(/\bfamily of (\d+|[a-z\-]+)\b/);
  if (mFamily) {
    count = parseNaturalNumber(mFamily[1]) || 4;
    isGroup = true;
    return { count, isGroup, isSeparate, isInfo, isAddAnother: false };
  }

  return { count: 1, isGroup: false, isSeparate: false, isInfo, isAddAnother: false };
}

/**
 * Extracts record limit from queries like "last three payments", "latest 3 notices", "last 2 complaints"
 */
export function extractRecordLimit(text, defaultLimit = 5) {
  if (!text || typeof text !== 'string') return defaultLimit;
  const m = text.toLowerCase().match(/(?:last|latest|recent|past|top)\s+(\d+|[a-z\-]+)\b/);
  if (m) {
    const parsed = parseNaturalNumber(m[1]);
    if (parsed && parsed > 0) return Math.min(parsed, 20);
  }
  return defaultLimit;
}

/**
 * Extracts invoice or receipt number from text
 */
export function extractInvoiceNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/(?:invoice|bill|inv|receipt)(?:\s+(?:number|no\.?|#))?\s*([A-Za-z0-9\-_]+)/i);
  return m ? m[1] : null;
}

/**
 * Extracts target block / wing / tower
 */
export function extractTargetBlock(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(?:block|tower|wing)\s+([A-Za-z0-9]+)\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Extracts staff department or role
 */
export function extractStaffDepartment(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase();
  if (/security|guard/.test(str)) return 'Security';
  if (/maintenance|plumber|electrician|carpenter/.test(str)) return 'Maintenance';
  if (/housekeeping|cleaning|maid|sweeper/.test(str)) return 'Housekeeping';
  return null;
}

/**
 * Checks if a user utterance represents an affirmative confirmation (e.g. "Yes", "Confirm", "Proceed", "Book it")
 */
export function isAffirmativeConfirmation(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  // If text contains attribute change clauses, it is an in-flight correction/update, NOT a pure confirmation!
  if (/\b(?:for\s+(?:\d+|[a-z]+)\s+(?:members?|people|persons?|guests?|visitors?)|at\s+\d+|on\s+[a-z]+|tomorrow|today|next\s+week|instead|change|make\s+it|set\s+to)\b/i.test(lower)) {
    return false;
  }

  // Affirmative variations e.g. "Yes", "Yeah", "Definitely", "Please go ahead", "Sure", "Okay", "Confirm", "Proceed", "Go ahead"
  return /^(yes|yeah|yep|yup|definitely|absolutely|sure|okay|ok|confirm|proceed|go ahead|please go ahead|go for it|yes please|confirm it|do it|approve|submit|yes proceed|yes confirm|please confirm|yes book|yes create|yes, confirm|yes confirm the booking|confirm the booking|confirm booking|proceed with booking|book it|create it)\b/i.test(lower);
}

/**
 * Checks if a user utterance represents a negative confirmation or cancellation (e.g. "No", "Cancel", "Not now", "Never mind")
 */
export function isNegativeConfirmation(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return /^(no|cancel|not now|don't|dont|stop|never mind|discard|abort|no thanks|reject|no cancel|please cancel|do not confirm|no don't book)\b/i.test(lower);
}

/**
 * Extracts visitor or guest name from user text
 */
export function extractVisitorName(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.trim();
  const exclude = [
    'yes', 'no', 'cancel', 'tomorrow', 'today', 'yesterday', 'next', 'morning', 'evening', 'night',
    'badminton', 'gym', 'tennis', 'pool', 'court', 'clubhouse', 'ok', 'okay', 'at', 'on', 'my',
    'the', 'a', 'an', 'this', 'dinner', 'lunch', 'am', 'pm', 'create', 'pass', 'passes', 'visitor', 'visitors',
    'guest', 'guests', 'friend', 'friends', 'someone', 'person', 'persons', 'anybody', 'somebody',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'couple', 'few', 'several', 'multiple', 'both',
    'register', 'registration', 'coming', 'tonight', 'people', 'members', 'cab', 'auto', 'taxi', 'uber', 'ola', 'rapido', 'blusmart', 'delivery', 'courier', 'swiggy', 'zomato', 'amazon', 'flipkart', 'service', 'staff', 'maid', 'cook', 'electrician', 'plumber', 'driver', 'group', 'visit', 'passes'
  ];

  // Helper to sanitize candidate words
  const cleanCandidate = (raw) => {
    if (!raw) return null;
    const words = raw
      .trim()
      .split(/\s+/)
      .filter((w) => !exclude.includes(w.toLowerCase()));
    if (words.length === 0) return null;
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Pattern 1: "pass for <Name>" / "visitor pass for <Name>" / "register <Name>" / "invite <Name>" / "for <Name>"
  const m1 = lower.match(/(?:(?:visitor\s+)?passes?\s+for|guest\s+named|visitor\s+named|register\s+(?:pass\s+for|visitor\s+for|visitor|guest)?|invite|for)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (m1) {
    const cleaned = cleanCandidate(m1[1]);
    if (cleaned && cleaned.length > 1) return cleaned;
  }

  // Pattern 2: Answer to clarification starts with name followed by date/time (e.g. "Suresh tomorrow at 5 PM")
  const m2 = lower.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:tomorrow|today|yesterday|on\b|at\b|next\b)/i);
  if (m2) {
    const cleaned = cleanCandidate(m2[1]);
    if (cleaned && cleaned.length > 1) return cleaned;
  }

  // Pattern 3: Answer to clarification is just single name / full name (e.g. "Suresh" or "Suresh Kumar")
  const m3 = lower.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)$/);
  if (m3) {
    const cleaned = cleanCandidate(m3[1]);
    if (cleaned && cleaned.length > 1) return cleaned;
  }

  return null;
}

/**
 * Extracts a 10-digit Indian mobile phone number if present
 */
export function extractPhoneNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}\b/);
  return match ? match[0].replace(/[-\s]/g, '') : null;
}

/**
 * Extracts vehicle license plate number if present
 */
export function extractVehicleNumber(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4})\b/i);
  return match ? match[1].toUpperCase().replace(/[-\s]/g, '') : null;
}

/**
 * Extracts expense amount from text e.g. "₹450", "Rs. 1,200", "1200", "350.50"
 */
export function extractExpenseAmount(text) {
  if (!text || typeof text !== 'string') return null;
  // Match with currency symbol or keyword e.g. "₹450", "Rs 1,200", "₹ 1200", "450 rupees", "expense of 450", "spent 1200"
  const m1 = text.match(/(?:(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?))|(?:(?:spent|spend|paid|add|expense of|record)\s+(?:₹|rs\.?)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?))/i);
  if (m1) {
    const valStr = (m1[1] || m1[2]).replace(/,/g, '');
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) return num;
  }
  // Standalone numeric amount when prompted for amount e.g. "450" or "450 rupees"
  const m2 = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees|rs|bucks)?\b/i);
  if (m2) {
    const num = parseFloat(m2[1]);
    if (!isNaN(num) && num > 0 && num < 10000000) return num;
  }
  return null;
}

/**
 * Maps category keyword to valid default expense categories
 */
export function extractExpenseCategory(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  if (/(grocer|vegetable|fruit|milk|supermarket|bigbasket|blinkit|zepto|kirana|provisions)/i.test(lower)) {
    return { id: 'groceries', name: 'Groceries' };
  }
  if (/(food|dining|restaurant|swiggy|zomato|dinner|lunch|breakfast|snack|cafe|coffee|tea|pizza|burger)/i.test(lower)) {
    return { id: 'food_dining', name: 'Food and Dining' };
  }
  if (/(electric|power|bescom|tneb|water bill|wifi|broadband|internet|cylinder|gas bill|utility|utilities)/i.test(lower)) {
    return { id: 'utilities', name: 'Utilities' };
  }
  if (/(cab|uber|ola|rapido|petrol|diesel|fuel|transport|metro|bus|train|auto|toll|parking)/i.test(lower)) {
    return { id: 'transport', name: 'Transport' };
  }
  if (/(shopping|clothes|amazon|flipkart|myntra|shoes|apparel|dress)/i.test(lower)) {
    return { id: 'shopping', name: 'Shopping' };
  }
  if (/(rent|house rent|flat rent)/i.test(lower)) {
    return { id: 'rent', name: 'Rent' };
  }
  if (/(medic|doctor|pharmacy|hospital|tablet|clinic|health|apollo|pharmeasy)/i.test(lower)) {
    return { id: 'medical', name: 'Medical' };
  }
  if (/(movie|cinema|netflix|prime|hotstar|entertainment|game|playstation|theatre)/i.test(lower)) {
    return { id: 'entertainment', name: 'Entertainment' };
  }
  if (/(maintenance|electrical materials|repair|plumber|hardware|carpentry|household maintenance)/i.test(lower)) {
    return { id: 'other_expense', name: 'Other Expense' };
  }
  return null;
}

/**
 * Extracts payment method (UPI, Cash, Card, etc.)
 */
export function extractPaymentMethod(text) {
  if (!text || typeof text !== 'string') return 'UPI';
  const lower = text.toLowerCase();
  if (/(cash)/i.test(lower)) return 'CASH';
  if (/(card|credit|debit)/i.test(lower)) return 'CARD';
  if (/(netbanking|bank|transfer|neft|imps|rtgs)/i.test(lower)) return 'BANK_TRANSFER';
  if (/(wallet|paytm wallet)/i.test(lower)) return 'WALLET';
  if (/(upi|gpay|google pay|phonepe|paytm|bhim)/i.test(lower)) return 'UPI';
  return 'UPI';
}

/**
 * Extracts title/merchant from user expense query
 */
export function extractExpenseTitle(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/[.!?]+$/, '').trim();
  const m = cleaned.match(/(?:for|on|at|towards)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:today|yesterday|tomorrow|paid|through|via|by|in|\d+|₹)|$)/i);
  if (m) {
    const candidate = m[1].trim();
    if (candidate.length > 2 && !/^(₹|\d+|an\s+expense|expense)/i.test(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }
  const cat = extractExpenseCategory(text);
  if (cat?.name) return cat.name;
  return null;
}

/**
 * Resolves location strings (e.g. "bathroom", "master bedroom", "flat 402", "block A", "corridor")
 */
export function extractIssueLocation(text = '') {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const rooms = [];

  // Units & Flats (avoid matching 'housekeeping' as 'Flat keeping')
  const flatMatch = text.match(/\b(flat|unit|apartment|villa|house)\b\s*(?:no\.?|#)?\s*([a-zA-Z0-9-]+)\b/i);
  if (flatMatch && flatMatch[2].toLowerCase() !== 'keeping') {
    rooms.push(`Flat ${flatMatch[2]}`);
  }

  // Blocks & Towers
  const blockMatch = text.match(/\b(block|tower|wing|building)\s*([a-zA-Z0-9-]+)\b/i);
  if (blockMatch) {
    const prefix = blockMatch[1].charAt(0).toUpperCase() + blockMatch[1].slice(1).toLowerCase();
    rooms.push(`${prefix} ${blockMatch[2].toUpperCase()}`);
  }

  // Floors & Corridors
  const floorCorridorMatch = text.match(/\b(\d+(?:st|nd|rd|th)?\s+floor\s+(?:corridor|lobby|hallway))\b/i);
  if (floorCorridorMatch) {
    rooms.push(floorCorridorMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
  } else {
    const floorMatch = text.match(/\b(\d+(?:st|nd|rd|th)?\s+floor)\b/i);
    if (floorMatch) rooms.push(floorMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
  }

  // Specific Areas & Rooms
  if (/\b(?:master\s+bathroom|attached\s+bathroom|guest\s+bathroom)\b/i.test(lower)) {
    const m = lower.match(/\b(master\s+bathroom|attached\s+bathroom|guest\s+bathroom)\b/i);
    rooms.push(m[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  } else if (/\bbathroom|washroom|toilet|restroom\b/i.test(lower)) {
    rooms.push('Bathroom');
  }

  if (/\bkitchen\b/i.test(lower)) rooms.push('Kitchen');
  if (/\b(?:master\s+bedroom|guest\s+bedroom)\b/i.test(lower)) {
    const m = lower.match(/\b(master\s+bedroom|guest\s+bedroom)\b/i);
    rooms.push(m[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  } else if (/\bbedroom\b/i.test(lower)) {
    rooms.push('Bedroom');
  }
  if (/\bliving\s*room\b/i.test(lower)) rooms.push('Living Room');
  if (/\bbalcony|terrace|veranda\b/i.test(lower)) rooms.push('Balcony');
  if (/\b(?:corridor|hallway)\b/i.test(lower) && !/\d+(?:st|nd|rd|th)?\s+floor\s+(?:corridor|hallway)/i.test(lower)) {
    rooms.push('Corridor');
  }
  if (/\bstaircase|stairs\b/i.test(lower)) rooms.push('Staircase');
  if (/\bbasement|parking\b/i.test(lower)) rooms.push('Basement Parking');
  if (/\bgate\s*([0-9a-zA-Z]+)?\b/i.test(lower)) {
    const gm = text.match(/\bgate\s*([0-9a-zA-Z]+)?\b/i);
    rooms.push(gm && gm[1] ? `Gate ${gm[1]}` : 'Main Gate');
  }
  if (/\blift\s*lobby\b/i.test(lower)) rooms.push('Lift Lobby');
  if (/\bclubhouse\b/i.test(lower)) rooms.push('Clubhouse');

  if (rooms.length > 0) {
    return Array.from(new Set(rooms)).join(', ');
  }
  return null;
}

/**
 * Extracts complaint title, category, priority, and location from natural phrasing
 */
export function extractComplaintDetails(text, existing = {}) {
  if (!text || typeof text !== 'string') {
    return {
      title: existing.title || null,
      category: existing.category || 'General',
      priority: existing.priority || 'Medium',
      location: existing.location || null,
      description: existing.description || null,
    };
  }
  const lower = text.toLowerCase();

  // Category identification
  let category = existing.category || 'General';
  if (/(housekeeping|cleaners?|cleaning|sweeping|sweep|dirty|dustbin|garbage|waste|trash|smell|stench)/i.test(lower)) {
    category = 'Housekeeping';
  } else if (/(security|guards?|cctv|stranger|gate\s*barrier|boom\s*barrier|tailgating|unauthorized entry|trespassing|sleeping|unresponsive)/i.test(lower)) {
    category = 'Security';
  } else if (/(noise|loud\s*music|shouting|barking|disturbance|sound)/i.test(lower)) {
    category = 'Noise';
  } else if (/(water|leak|leakage|pipe|tap|flush|drain|seepage|sink|bathroom)/i.test(lower)) {
    category = 'Plumbing';
  } else if (/(light|bulb|electricity|power|wire|switch|fan|socket|corridor light|short circuit)/i.test(lower)) {
    category = 'Electrical';
  } else if (/(lift|elevator)/i.test(lower)) {
    category = 'Elevators';
  } else if (/(door|window|lock|handle|wood|hinge|carpenter)/i.test(lower)) {
    category = 'Carpentry';
  }

  // Priority
  let priority = existing.priority || 'Medium';
  if (/(urgent|emergency|critical|immediately|danger|hazard|sparks|flooding|safety|hazard)/i.test(lower)) {
    priority = 'Critical';
  } else if (/(high priority|severe|major|since yesterday|days|not working at all|unusable)/i.test(lower)) {
    priority = 'High';
  } else if (/(minor|low priority|whenever possible|small)/i.test(lower)) {
    priority = 'Low';
  }

  // Location
  const location = extractIssueLocation(text) || existing.location || null;

  // Title Extraction
  let title = existing.title || null;
  const mTitle = text.match(/(?:complaint\s+(?:about|regarding|for|on)|report\s+(?:that|a|an)?|issue\s+with)\s+([^.!?]+)/i);
  if (mTitle) {
    title = mTitle[1].trim();
  } else if (/housekeeping.*(?:not cleaning|cleaning properly)/i.test(lower)) {
    title = 'Housekeeping Not Cleaning Properly';
  } else if (/garbage.*(?:not.*collected|not been collected)/i.test(lower)) {
    title = 'Garbage Not Collected';
  } else if (/security.*(?:not responding|sleeping)/i.test(lower)) {
    title = 'Security Personnel Not Responding';
  } else if (/too much noise/i.test(lower) || /noise.*apartment/i.test(lower)) {
    title = 'Excessive Noise Disturbance';
  } else if (/(?:water leakage|leakage in|water leaking)/i.test(lower)) {
    title = 'Water Leakage';
  } else if (/(?:tap.*leaking|leaking tap)/i.test(lower)) {
    title = 'Bathroom Tap Leaking';
  } else if (/(lift.*not working|broken light|garbage collection)/i.test(lower)) {
    const mDirect = text.match(/(?:report\s+)?([A-Za-z0-9\s]+(?:not working|broken|leakage|issue|problem))/i);
    if (mDirect) title = mDirect[1].trim();
  } else if (!title && text.trim().length > 3 && !text.includes('?')) {
    title = text.trim();
  }

  if (title) {
    title = title.replace(/^(the|a|an|my|please|raise a complaint for|raise a complaint regarding|i want to raise a complaint for)\s+/i, '');
    title = title.replace(/\s+(since yesterday|urgent|critcal|immediately)$/i, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  const description = text.trim().length > 5 ? text.trim() : (existing.description || title);

  return { title, category, priority, location, description };
}

/**
 * Extracts maintenance request details (service type, problem, preferred visit schedule)
 */
export function extractMaintenanceDetails(text, existing = {}, referenceDate = null) {
  if (!text || typeof text !== 'string') {
    return {
      title: existing.title || null,
      category: existing.category || 'General Maintenance',
      serviceType: existing.serviceType || 'Technician',
      priority: existing.priority || 'Medium',
      location: existing.location || null,
      description: existing.description || null,
      preferredVisitDate: existing.preferredVisitDate || null,
      preferredVisitTime: existing.preferredVisitTime || null,
    };
  }
  const lower = text.toLowerCase();

  // Category & Service Type
  let category = existing.category || 'General Maintenance';
  let serviceType = existing.serviceType || 'Technician';

  if (/(ac|air conditioner|air conditioning|hvac|cooling|compressor)/i.test(lower)) {
    category = 'AC & HVAC';
    serviceType = 'AC Technician';
  } else if (/(plumb|water|pipe|tap|faucet|flush|drain|drainage|seepage|sink|motor|pump|geyser)/i.test(lower)) {
    category = 'Plumbing';
    serviceType = 'Plumber';
  } else if (/(electr|light|bulb|power|wire|wiring|switch|switchboard|spark|socket|fan|mcb|short circuit)/i.test(lower)) {
    category = 'Electrical';
    serviceType = 'Electrician';
  } else if (/(door|window|lock|handle|wood|hinge|carpenter|latch)/i.test(lower)) {
    category = 'Carpentry';
    serviceType = 'Carpenter';
  } else if (/(lift|elevator)/i.test(lower)) {
    category = 'Elevators';
    serviceType = 'Lift Technician';
  } else if (/(wall crack|plaster|tile|tiles|civil|flooring)/i.test(lower)) {
    category = 'Civil';
    serviceType = 'Civil Technician';
  }

  // Priority
  let priority = existing.priority || 'Medium';
  if (/(urgent|emergency|critical|immediately|danger|hazard|sparks|flooding|water gushing|fire|hazard)/i.test(lower)) {
    priority = 'Critical';
  } else if (/(high priority|severe|major|not working at all|completely broken|stuck)/i.test(lower)) {
    priority = 'High';
  } else if (/(minor|low priority|whenever possible|small)/i.test(lower)) {
    priority = 'Low';
  }

  // Location
  let location = extractIssueLocation(text) || existing.location || null;

  // Title Extraction
  let title = existing.title || null;
  const isBareTechnicianRequest = /^(?:i\s+)?(?:need|call|send|arrange|book)\s+(?:an?|the)?\s*(?:electrician|plumber|carpenter|technician|worker)$/i.test(lower.trim());
  if (isBareTechnicianRequest) {
    // Leave title null so assistant prompts for the specific problem
    title = existing.title || null;
  } else if (/(?:my\s+)?ac\b.*?(?:not working|not cooling|broken|leaking|making noise|noise|repair|service)/i.test(lower)) {
    title = 'AC Repair & Servicing';
  } else if (/(?:bathroom\s+)?tap\s+(?:is\s+)?(?:leaking|leak|broken)/i.test(lower) || /tap\s+(?:is\s+)?leaking/i.test(lower)) {
    title = 'Bathroom Tap Leaking';
  } else if (/(?:kitchen\s+)?light\b.*?(?:damaged|broken|flickering|sparking|not working)/i.test(lower)) {
    title = 'Kitchen Light Repair';
  } else if (/door\s+(?:lock|handle|repair|damaged)/i.test(lower) || /repair\s+(?:my|the)\s+door/i.test(lower)) {
    title = 'Door & Lock Repair';
  } else if (/water\s+motor\b.*?(?:not working|broken|damaged)/i.test(lower)) {
    title = 'Water Motor Repair';
  } else if (/lift\b.*?(?:unusual noise|noises|not working|stuck|repair)/i.test(lower)) {
    title = 'Elevator Maintenance: Unusual Noises';
  } else if (text.match(/(?:repair|fix|service|maintenance for)\s+([^.!?]+)/i)) {
    const m = text.match(/(?:repair|fix|service|maintenance for)\s+([^.!?]+)/i);
    title = m[1].trim().charAt(0).toUpperCase() + m[1].trim().slice(1);
  } else if (!title && text.trim().length > 3 && !text.includes('?')) {
    title = text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
  }

  // Preferred Visit Date
  let preferredVisitDate = existing.preferredVisitDate || null;
  const dateRes = resolveDateExpression(text, referenceDate);
  if (dateRes?.date) {
    preferredVisitDate = dateRes.date;
  }

  // Preferred Visit Time
  let preferredVisitTime = existing.preferredVisitTime || null;
  if (/morning/i.test(lower)) preferredVisitTime = 'Morning (09:00 AM - 12:00 PM)';
  else if (/afternoon/i.test(lower)) preferredVisitTime = 'Afternoon (01:00 PM - 04:00 PM)';
  else if (/evening/i.test(lower)) preferredVisitTime = 'Evening (04:00 PM - 07:00 PM)';
  else if (/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i.test(lower)) {
    const tm = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (tm) preferredVisitTime = tm[1].toUpperCase();
  }

  // Description
  const description = text.trim().length > 5 ? text.trim() : (existing.description || title);

  return {
    title,
    category,
    serviceType,
    priority,
    location,
    description,
    preferredVisitDate,
    preferredVisitTime,
  };
}

/**
 * Formats complaint registration summary
 */
export function formatComplaintSummary(collected = {}) {
  const title = collected.title || 'Community Complaint';
  const category = collected.category || 'General';
  const priority = collected.priority || 'Medium';
  const location = collected.location || 'Resident Unit';
  const description = collected.description || title;

  return [
    '### Complaint Registration Summary:',
    `* Title: ${title}`,
    `* Category: ${category}`,
    `* Priority: ${priority}`,
    `* Location: ${location}`,
    `* Description: ${description}`,
  ].join('\n');
}

/**
 * Formats maintenance request proposal summary
 */
export function formatMaintenanceSummary(collected = {}) {
  const service = collected.title || `${collected.category || 'General'} Maintenance`;
  const category = collected.category || 'General Maintenance';
  const problem = collected.description || collected.title || 'Maintenance inspection & repair';
  const priority = collected.priority || 'Medium';
  const location = collected.location || 'Resident Unit';
  const visitDate = collected.preferredVisitDate || 'As soon as possible';
  const visitTime = collected.preferredVisitTime || 'General Hours (09:00 AM - 06:00 PM)';

  return [
    '### Maintenance Request Summary:',
    `* Service: ${service}`,
    `* Category: ${category}`,
    `* Problem: ${problem}`,
    `* Priority: ${priority}`,
    `* Preferred Visit Date: ${visitDate}`,
    `* Preferred Time: ${visitTime}`,
    `* Location: ${location}`,
  ].join('\n');
}

/**
 * Formats focused follow-up question for missing complaint fields
 */
export function formatComplaintIntakeQuestion(collected = {}, seed = '') {
  if (!collected.title && !collected.location) {
    const variations = [
      `🛠️ Something broken? Tell me what went wrong, and let's get it sorted before it turns into community drama! 😅\n\nTell me in one message:\n• 📍 Location: Where is the issue? (e.g. Flat 402, Block B, Master Bathroom)\n• 🔧 Problem description: What happened? (e.g. Water pipe leaking heavily under the sink)\n• ⚠️ Priority / Urgency: Low, Medium, High, or Urgent/Critical?\n\nExample: Water pipe leaking in Flat 402, urgent.\nI'll get a technician dispatched right away! ⚡`,
      `🔧 Maintenance Ninja on standby! Let's tackle that problem before it spreads! 🚀\n\nTell me in one message:\n• 📍 Location: Where is the issue? (e.g. 3rd Floor Corridor, Block A)\n• 🔧 Problem description: What's broken or malfunctioning?\n• ⚠️ Priority: Low, Medium, High, or Urgent?\n\nExample: Corridor lights flickering on 3rd floor, Medium priority.\nI'll raise the ticket and alert our team! 🛠️`
    ];
    return pickVariation(variations, seed);
  }
  if (!collected.title) {
    return 'What is the complaint regarding? Please describe the issue or problem.';
  }
  if (!collected.location) {
    return 'Where is this issue located? (e.g. Master Bathroom, 3rd Floor Corridor, or Flat number)';
  }
  return 'Could you please provide any additional details for this complaint?';
}

/**
 * Formats focused follow-up question for missing maintenance fields
 */
export function formatMaintenanceIntakeQuestion(collected = {}) {
  if (!collected.title) {
    if (collected.serviceType === 'Electrician' || collected.category === 'Electrical') {
      return "Could you briefly tell me what electrical problem you're experiencing (e.g. flickering light, tripped breaker, faulty switchboard)?";
    }
    if (collected.serviceType === 'Plumber' || collected.category === 'Plumbing') {
      return "Could you briefly describe the plumbing issue (e.g. leaking tap, clogged drain, low water pressure)?";
    }
    if (collected.serviceType === 'AC Technician' || collected.category === 'AC & HVAC') {
      return "Could you briefly tell me what issue the AC has (e.g. not cooling, water leakage, strange noise)?";
    }
    if (collected.serviceType === 'Carpenter' || collected.category === 'Carpentry') {
      return "Could you briefly describe what woodwork or furniture needs repair (e.g. door hinge, drawer, wardrobe lock)?";
    }
    return 'What needs repair or maintenance? Please describe what is broken or malfunctioning.';
  }
  if (!collected.location) {
    return 'Where is the maintenance needed? (e.g. Master Bedroom, Kitchen, or Flat number)';
  }
  if (!collected.preferredVisitTime && !collected.preferredVisitDate) {
    return 'What date and time would be convenient for the technician to visit? (e.g. Tomorrow afternoon, or Saturday morning)';
  }
  return 'Do you have any specific instructions or preferred time for the technician visit?';
}

/**
 * Extracts complaint identifier (e.g. "CMP-2026-000001" or hex ID)
 */
export function extractComplaintId(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\b(CMP-[0-9]{4}-[0-9]+|[a-f0-9]{24})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Extracts community poll details: question and options
 */
export function extractPollDetails(text = '') {
  const str = String(text || '').trim();
  let question = '';
  let options = [];

  const qMatch = str.match(/(?:poll\s+(?:on|about|for|titled|named|regarding)\s+|create\s+(?:a\s+)?poll\s+(?:on\s+|about\s+|for\s+)?)([^,?;]+[\w\s?]+)/i);
  if (qMatch && qMatch[1]) {
    question = qMatch[1].replace(/\s+with\s+options.*$/i, '').trim();
  } else {
    const stripped = str.replace(/^(?:please\s+)?(?:create|add|start|post)\s+(?:a\s+)?(?:new\s+)?(?:poll|survey)\s*(?:on|about|for)?\s*/i, '');
    question = stripped.replace(/\s+with\s+options.*$/i, '').replace(/\s+options\s*:.*$/i, '').trim();
  }

  const optMatch = str.match(/(?:with\s+options?|options?(?:\s+are|\s*:))\s+([^.]+)/i);
  if (optMatch && optMatch[1]) {
    options = optMatch[1]
      .split(/,|\/|\band\b/i)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0 && !/^(and|or)$/i.test(s));
  }
  if (options.length < 2) {
    options = ['Yes', 'No'];
  }

  return {
    question: question || 'Community Poll',
    options,
  };
}

/**
 * Extracts notice details: title, description, priority, category
 */
export function extractNoticeDetails(text = '') {
  const str = String(text || '').trim();
  let title = '';
  let priority = 'Medium';
  let category = 'General';

  if (/critical/i.test(str)) priority = 'Critical';
  else if (/high/i.test(str)) priority = 'High';
  else if (/low/i.test(str)) priority = 'Low';

  if (/maintenance|repair|shutdown|water|electricity|power|generator/i.test(str)) category = 'Maintenance';
  else if (/security|gate|guard|safety|patrol/i.test(str)) category = 'Security';
  else if (/event|celebration|festival|party|gathering/i.test(str)) category = 'Events';
  else if (/billing|maintenance fee|due|invoice/i.test(str)) category = 'Billing';

  const titleMatch = str.match(/(?:notice\s+(?:on|about|for|titled|named|regarding)\s+|post\s+(?:a\s+)?notice\s+(?:on\s+|about\s+|for\s+)?)([^,.;]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    const stripped = str.replace(/^(?:please\s+)?(?:create|post|publish|issue)\s+(?:a\s+)?(?:new\s+)?(?:notice|announcement)\s*(?:on|about|for)?\s*/i, '');
    title = stripped.split(/,|\.|\n/)[0].trim();
  }

  return {
    title: title || 'Community Notice',
    description: str || title || 'Official notice for community members.',
    priority,
    category,
  };
}

/**
 * Detects whether the query has a clear standalone intent regardless of conversation history
 */
export function detectDirectIntent(text) {
  if (!text || typeof text !== 'string') return INTENTS.GENERAL_INQUIRY;
  const lower = text.toLowerCase().trim();

  // Wallet is a distinct financial resource, not a personal-expense query.
  if (!/(personal\s+budget|my\s+expenses?|expense\s+manager)/i.test(lower) && /\b(wall?et|wallat)\s*(balance|balence|transactions?|ledger|history)?\b|\b(wallet|wallat)\s+(balance|balence|transactions?|ledger|history)\b/i.test(lower)) {
    return /(transactions?|ledger|history)/i.test(lower) ? INTENTS.WALLET_TRANSACTIONS : INTENTS.WALLET_BALANCE;
  }

  // Resolve safety contacts before the staff-directory rule, since a request
  // mentioning a security guard is asking for an emergency escalation path.
  if (/(emergency\s*contacts?|security\s*number|guard\s*(number|contact|phone)|security\s*guard\s*phone|gate\s*intercom|emergency\s*helpline|ambulance\s*(number|emergency)|fire\s*number|estate\s*office\s*number|intercom\s*numbers?)/i.test(lower)) {
    return INTENTS.EMERGENCY_CONTACTS;
  }

  // 1a. Community Maintenance Assessment Creation (Admin)
  if (
    /(create|add|new|setup|schedule)\s+.*(assestement|assessment|maintenance\s+charge|maintenance\s+fee|bulk\s+invoice|billing\s+run)/i.test(lower) ||
    /(assestement|assessment).*for.*billing/i.test(lower) ||
    /(assestement|assessment).*for.*all\s+users/i.test(lower) ||
    /create.*(assestement|assessment)/i.test(lower)
  ) {
    return INTENTS.ASSESSMENT_CREATE;
  }

  // 1. Resident Dues & Maintenance Charges
  if (
    /(maintenance.*(pay|charge|due|amount|bill|owe|outstanding|pending)|pending.*(due|bill)|unpaid.*(bill|invoice|due)|outstanding.*(due|bill|balance|maintenance)|how much.*(owe|pay|maintenance|dues?|outstanding|pending)|my dues|pay.*(dues|maintenance)|unpaid invoices|bill payment|maintenance dues|latest invoices|show.*invoices)/i.test(
      lower
    )
  ) {
    return INTENTS.RESIDENT_DUES;
  }

  // 2. Community Finance & Society Expenses
  if (
    /(community.*(spend|spent|expens|expesn|expen|budget|balance|finance|fund|collection)|society.*(expens|expesn|expen|spend|spent|budget)|(spend|spent|spending|expens|expesn|expen|cost).*(by|in|for)?\s+(society|community)|(expens|expesn|expen).*(for|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|\d{4})|total.*(community|society).*(expens|expesn|spend)|society spending|community spending|(biggest|highest|top)\s+.*(community|society)?\s*expens|where\s+is\s+.*(maintenance|society|community)\s*(money|fund|budget|fee)\s*going|compare\s+.*(this\s+month|expenses).*last\s+month)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_FINANCE;
  }

  // 3a. Personal Expense Creation (Mutations)
  if (
    /(add|record|log|i spent|spent)\s+(a\s+|an\s+)?(personal\s+)?(expense\s+(of\s+)?|₹|rs\.?|\d+)/i.test(lower) ||
    /^(add|record|log)\s+₹?[0-9]+/i.test(lower) ||
    /i spent\s+₹?[0-9]+/i.test(lower)
  ) {
    return INTENTS.PERSONAL_EXPENSE_CREATE;
  }

  // 3b. Personal Expense Manager (Queries)
  if (
    /(how much did i spend|what did i spend|what have i spent|what (are|were|did) my expenses|show my expenses|my expenses for|how much did i spend on|remaining.*budget|budget.*remaining|recent expenses|recent transactions|expense breakdown|personal expense|my expense|my spending|personal budget|wallet balance|my expense manager|expense tracking)/i.test(
      lower
    )
  ) {
    return INTENTS.PERSONAL_EXPENSE;
  }

  // 4a. Complaint Cancellation
  if (
    /(cancel|withdraw|drop|close)\s+.*(complaint|ticket|maintenance request|my ticket)/i.test(lower) ||
    /cancel\s+(?:ticket|complaint)\s+([A-Za-z0-9-]+)/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_CANCEL;
  }

  // 4b. Ticket Escalation
  if (
    /(?:i want to escalate|please escalate|escalate\s+(?:my\s+)?(?:complaint|ticket|request)?|nobody is (?:fixing|resolving)|unresolved complaint|not resolved)/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_ESCALATE;
  }

  // 4c. Ticket Reopening
  if (
    /(?:reopen\s+.*(?:complaint|ticket)|ticket.*not fixed|tap is still leaking.*reopen|issue still persists.*reopen)/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_REOPEN;
  }

  // 4d. Complaint Creation (Grievances, Noise, Cleanliness, Security & Lapses)
  if (
    /(raise|create|lodge|file|report|register)\s+.*(complaint|grievance|ticket)/i.test(lower) ||
    /(raise|lodge|file)\s+a\s+complaint/i.test(lower) ||
    /the\s+(?:water supply|lift)\s+is\s+not\s+working/i.test(lower) ||
    /pipe\s+is\s+leaking\s+in\s+block\s+b/i.test(lower) ||
    /(?:housekeeping(?:\s+team)?|cleaning\s+team|cleaners?)\s+(?:is|are)?\s*(?:not cleaning|shoddy|poor|dirty|neglected)/i.test(lower) ||
    /(?:garbage|trash|waste)\s+(?:has\s+)?(?:not been|not)\s+(?:collected|cleared|picked up)/i.test(lower) ||
    /(?:security|guard|guards?)\s+(?:is|are)?\s*(?:not responding|sleeping|unresponsive|rude|absent)/i.test(lower) ||
    /(?:too much noise|loud music|noise disturbance|barking dog)/i.test(lower) ||
    /(?:report\s+a\s+water leakage complaint)/i.test(lower) ||
    /i want to (?:complain|raise a complaint)/i.test(lower)
  ) {
    return INTENTS.COMPLAINT_CREATE;
  }

  // 4e. Complaints & Helpdesk Tickets (Queries & Status Tracking)
  if (
    /(show|check|status of|list|view|track)\s+.*(complaint|complaints|ticket|tickets|maintenance requests?)|my open complaints|my complaints|complaint status|show my previous complaints|show my pending maintenance|what happened to my (?:complaint|ticket)|is my (?:complaint|ticket) resolved|reported.*(?:tap|leak|complaint).*nobody fixed/i.test(
      lower
    ) ||
    /(complaint|ticket|maintenance request|helpdesk|water supply issue|power outage|electricity issue)/i.test(
      lower
    )
  ) {
    return INTENTS.COMPLAINTS_HELPDESK;
  }

  // 4f. Maintenance Requests (Breakdowns, Servicing & Physical Asset Repairs)
  if (
    /(?:arrange|need|call|send|book|request|schedule)\s+(?:a|an)?\s*(?:plumber|electrician|technician|carpenter|repairman|ac service|ac technician|mechanic)/i.test(lower) ||
    /\b(?:the\s+)?(?:ac|air conditioner|tap|faucet|pipe|flush|drain|light|switchboard|fan|geyser|door|lock|window|lift|elevator|motor|pump)\b(?:\s+(?:in|of|at)\s+[^,.]+?)?\s+(?:is\s+)?(?:not working|broken|damaged|leaking|faulty|down|not cooling|sparking|making noise|making unusual noise|jammed)\b/i.test(lower) ||
    /\b(?:bathroom|kitchen|bedroom|washroom)\s+tap\s+(?:is\s+)?(?:leaking|broken)\b/i.test(lower) ||
    /\b(?:pipe|tap|faucet|ceiling|roof)\s+(?:is\s+)?(?:leaking|leak)\b/i.test(lower) ||
    /(?:need someone to repair|please repair|fix my|repair my|service my)\s+.*(?:ac|tap|pipe|light|door|lock|motor|fan|lift)/i.test(lower) ||
    /(?:book|request|need|schedule)\s+maintenance(?:\s+(?:for|on|service))?/i.test(lower)
  ) {
    return INTENTS.MAINTENANCE_CREATE;
  }

  // 5. Visitor Management (includes creation, revocation, and inquiries)
  if (
    /(visitor|guest|visited|visitor pass|invite\b|invited|delivery pass|cab entry|gate entry|guard console|visitor log|gate approval|at the gate|\bpasses?\s+for\b|\b(?:create|issue|generate|make|get)\s+(?:a\s+)?pass\b|\bregister\s+[a-z]+|\b(?:cab|auto|taxi|uber|ola|delivery|courier|swiggy|zomato|amazon|service|staff|group)\s+pass(?:es)?\b|\bgroup\s+visit\b)/i.test(
      lower
    )
  ) {
    return INTENTS.VISITOR_MANAGEMENT;
  }

  // 5b. Poll Creation (Admin)
  if (
    /(create|add|new|start|post|launch|conduct)\s+.*(poll|survey|ballot|community voting|voting poll)/i.test(
      lower
    )
  ) {
    return INTENTS.POLL_CREATE;
  }

  // 5c. Notice Board Publication (Admin)
  if (
    /(create|post|publish|issue|add|new|broadcast)\s+.*(notice|announcement|circular|bulletin|notice\s*board)/i.test(
      lower
    )
  ) {
    return INTENTS.NOTICE_CREATE;
  }

  // 6a. Amenity Facility Creation (Admin / Facility Manager)
  if (
    !/(poll|survey|notice|announcement)/i.test(lower) &&
    (/(?:create|cretae|add|new|setup|set\s+up|register|build|configure)\s+.*(amenit|amentit|amenty|facility|court|pool|gym|hall|clubhouse|pitch|ground)/i.test(lower) ||
    /(?:register|setup|set\s+up|create|add)\s+(?:a\s+)?(?:new\s+)?(?:paid\s+|free\s+)?(amenit|amentit|amenty|facility|court|pool|gym|hall|clubhouse|badminton|tennis|squash|swimming)/i.test(lower) ||
    /^(?:i\s+want\s+to\s+)?(?:create|add|setup|set\s+up|register|build)\s+(?:a\s+)?(?:new\s+)?(?:paid\s+|free\s+)?(?:amenit|facility|court|pool|gym|hall|clubhouse|badminton)/i.test(lower) ||
    /create.*(amenit|amentit|amenty).*in.*amenity\s+master/i.test(lower))
  ) {
    return INTENTS.AMENITY_CREATE;
  }

  // 6b. Amenity Booking Requests
  if (
    /(want to book|(?:book|reserve|need|schedule)\s+(?:a|the|my|an)?\s*.*(amenity|court|clubhouse|badminton|tennis|pool|gym|hall|slot|facility)|reserve a slot|book a slot|slot booking|can\s+.*(?:use|book|reserve)\s+.*(amenity|court|clubhouse|badminton|tennis|pool|gym|hall|facility)|book\s+the\s+same|book\s+it\s+for|i\s+need\s+the\s+(?:gym|court|clubhouse|pool))/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_BOOKING;
  }

  // 8. Amenity Catalog Discovery & Navigation
  if (
    /(open|view|show|navigate to|go to|list|check|see|get|browse|display)\s+.*amenit(y|ies)|(what|which)\s+amenities|list\s+all\s+.*amenit(y|ies)|list\s+of\s+amenities|all\s+amenit(y|ies)|amenity\s+list|community facilities|amenity catalog|sports facilities|what(\'s|\s+is)?\s+available\s+in\s+(our|my|the)\s+community|facilities\s+in\s+(our|my|the)\s+community|what\s+facilities|facilities\s+we\s+have/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_INQUIRY;
  }

  // 7. Amenity Availability Inquiries
  if (
    /(is.*(available|free)|availability|free.*slot|available.*slot|check.*timing|timings of|when is.*open|can i use.*(court|gym|pool|clubhouse)|what can (i|we) book|what is bookable|what\'s bookable|available to book|open for booking)/i.test(
      lower
    )
  ) {
    return INTENTS.AMENITY_AVAILABILITY;
  }

  // 9. Amenity Cancellation & Cancellation Policy Inquiries
  if (
    /(cancel|delete|drop|withdraw)\s+.*(booking|reservation|slot|badminton|court|pool|tennis|gym|hall|clubhouse)/i.test(lower) ||
    /cancel\s+(?:my\s+)?(?:booking|reservation)/i.test(lower) ||
    /(?:cancel|drop)\s+(?:and\s+)?refund\s+to\s+(?:my\s+)?wallet/i.test(lower) ||
    /(?:cancellation|refund)\s*(?:policy|rules|charges|terms)/i.test(lower) ||
    /(?:can I get|is there|do I get|how much)\s*(?:a\s+)?refund/i.test(lower) ||
    /will\s+i\s+get\s+my\s+money\s+back/i.test(lower) ||
    /what\s+happens\s+if\s+i\s+cancel/i.test(lower) ||
    /how\s+much\s+will\s+i\s+receive\s+if\s+i\s+cancel/i.test(lower) ||
    /i\s+cannot\s+attend\s+(?:tomorrow|today|this|the)/i.test(lower)
  ) {
    return INTENTS.AMENITY_CANCELLATION;
  }

  // 10. My Bookings
  if (
    /(my booking|my reservation|my active pass|show.*bookings|do i have any booking|what bookings do i have|my passes)/i.test(
      lower
    )
  ) {
    return INTENTS.MY_BOOKINGS;
  }

  // 11. Community Notices & Announcements
  if (
    /(community notice|latest notice|notices|announcement|announcements|circular|circulars|community broadcast|latest updates|bulletin|what.*notices)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_NOTICES;
  }

  // 12. Staff & Domestic Help Directory
  if (
    /(staff directory|domestic help|maid|maids|cook|cooks|cleaner|cleaners|driver|drivers|technician|technicians|electrician|plumber|security guard|gate guard|facility maintenance|who can i contact|assigned to my (unit|flat|villa)|who is assigned|staff assigned|assigned staff|who is on duty|on duty|maintenance duty|staff duty|duty today)/i.test(
      lower
    )
  ) {
    return INTENTS.STAFF_DIRECTORY;
  }

  // 13. Household Members & Registered Vehicles
  if (
    /(household|family member|co-resident|my flat members|my unit members|who lives in my|registered vehicles?|my vehicle|my car|my bike|parking slot|my parking|parking space)/i.test(
      lower
    )
  ) {
    return INTENTS.HOUSEHOLD_VEHICLES;
  }

  // 14. Community Polls & Surveys
  if (
    /(active poll|polls?|survey|surveys?|voting|vote (for|on|in)|vote option|cast.*(vote|ballot)|community election)/i.test(
      lower
    )
  ) {
    return INTENTS.COMMUNITY_POLLS;
  }

  // 15. User Settings & Preferences
  if (
    /(settings|notification preference|notification settings|quick actions|theme mode|app settings|my preferences)/i.test(
      lower
    )
  ) {
    return INTENTS.USER_SETTINGS;
  }

  // 16. Admin Analytics
  if (
    /(admin analytics|platform kpi|enquiries count|active subscriptions|admin stats|platform stats)/i.test(
      lower
    )
  ) {
    return INTENTS.ADMIN_ANALYTICS;
  }

  // 17a. Wallet Balance
  if (
    !/(personal\s+budget|my\s+expenses?)/i.test(lower) &&
    /(wallet\s*balance|my\s*wallet|balance\s*in\s*wallet|how\s*much.*in\s*my\s*wallet|how\s*much.*wallet\s*money|check\s*wallet|wallat\s*balence|recharge\s*wallet|top\s*up\s*wallet)/i.test(
      lower
    )
  ) {
    return INTENTS.WALLET_BALANCE;
  }

  // 17b. Wallet Transactions & Ledger History
  if (
    /(wallet\s*transactions?|wallet\s*history|wallet\s*ledger|wallet\s*statement|recharge\s*history)/i.test(
      lower
    )
  ) {
    return INTENTS.WALLET_TRANSACTIONS;
  }

  // 18a. Notifications Mark Read
  if (
    /(mark\s*(all)?\s*notifications?\s*(as)?\s*read|clear\s*notifications?|mark\s*as\s*read)/i.test(
      lower
    )
  ) {
    return INTENTS.NOTIFICATIONS_MARK_READ;
  }

  // 18b. In-App Notifications & Alerts
  if (
    /(notifications?|unread\s*(?:notifications?|alerts?)|my\s*alerts|show\s*alerts|gate\s*alerts|pass\s*alerts|notification\s*list)/i.test(
      lower
    )
  ) {
    return INTENTS.NOTIFICATIONS;
  }

  // 19. Emergency & Directory Contacts
  if (
    /(emergency\s*contacts?|security\s*number|guard\s*(number|contact|phone)|security\s*guard\s*phone|gate\s*intercom|emergency\s*helpline|ambulance\s*number|fire\s*number|estate\s*office\s*number|intercom\s*numbers?)/i.test(
      lower
    )
  ) {
    return INTENTS.EMERGENCY_CONTACTS;
  }

  // 20a. Issue Reporting (Mutations)
  if (
    /(report\s*(an?\s*)?(app\s*)?bug|report\s*(an?\s*)?issue|submit\s*(an?\s*)?issue|app\s*issue|system\s*issue|technical\s*issue|feedback\s*about\s*(app|system)|feature\s*request)/i.test(
      lower
    )
  ) {
    return INTENTS.ISSUE_REPORT_CREATE;
  }

  // 20b. Issue Reports (Queries)
  if (
    /(show|view|list|my)\s*(issue\s*reports?|reported\s*issues?|support\s*tickets?)/i.test(
      lower
    )
  ) {
    return INTENTS.ISSUE_REPORTS_LIST;
  }

  // 21. AI Assistant Feedback
  if (
    /(assistant\s*feedback|ai\s*feedback|rate\s*(the\s*)?(ai|assistant)|good\s*job\s*nahom|bad\s*response\s*nahom|feedback\s*for\s*assistant)/i.test(
      lower
    )
  ) {
    return INTENTS.AI_FEEDBACK;
  }

  return null;
}

/**
 * Splits a compound multi-intent user utterance into distinct sub-queries if multiple independent intents exist.
 * Protects coordinated entities (e.g. "Rahul and Amit", "food and dining", "cab and auto", "invoices and dues").
 */
export function splitCompoundQuery(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // Split on strong compound conjunctions: " and also ", " also ", " plus ", " as well as ", "; ", or ", " followed by request verbs
  const rawParts = trimmed
    .split(/\s+(?:and\s+also|also|plus|as\s+well\s+as|;\s*|\band\b)\s*|,\s*(?=(?:check|show|list|get|book|create|what|how|where|is|can)\b)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 3);

  if (rawParts.length < 2) return null;

  const detected = [];
  const intentSet = new Set();

  for (const part of rawParts) {
    const directIntent = detectDirectIntent(part);
    if (directIntent && directIntent !== INTENTS.GENERAL_INQUIRY) {
      if (!intentSet.has(directIntent)) {
        intentSet.add(directIntent);
        detected.push({ query: part, intent: directIntent });
      }
    }
  }

  if (detected.length >= 2) {
    return detected;
  }

  return null;
}

/**
 * Checks if a message is a relative temporal follow-up query to an active topic
 */
export function isTemporalFollowUp(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  const relativePatterns = [
    /^(what about|and for|how about|any for|show for|check)\s+(next week|tomorrow|this weekend|today|saturday|sunday|monday|upcoming)/i,
    /^(what about\s+)?(next week|tomorrow|this weekend|today|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\??$/i,
    /^next week\??$/i,
    /^tomorrow\??$/i,
    /^this weekend\??$/i,
    /^and tomorrow\??$/i,
  ];

  return relativePatterns.some((pattern) => pattern.test(lower));
}

/**
 * Helper to pick a natural comedic variation
 */
function pickVariation(list = [], seed = '') {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (!seed) return list[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % list.length;
  return list[hash] || list[0];
}

/**
 * Formats an all-in-one, engaging question asking for missing amenity booking parameters in one shot.
 */
function formatAmenityBookingQuestion(collected = {}, missing = [], seed = '') {
  if (collected.headcount && !collected.amenityName && !collected.date && !collected.slotTime) {
    const countStr = collected.headcount === 2 ? 'Two people' : `${collected.headcount} members`;
    return `😎 ${countStr}, one awesome plan! Which amenity would you like to book, and for what date and time?`;
  }

  if (!collected.amenityName && !collected.date && !collected.slotTime) {
    return 'Which amenity would you like to book, and for what date and time?';
  }

  if (!collected.amenityName) {
    const extra = [];
    if (!collected.date) extra.push('date (e.g. tomorrow, Saturday)');
    if (!collected.slotTime) extra.push('time slot (e.g. 6:00 PM)');
    const extraHint = extra.length > 0 ? ` (and feel free to include ${extra.join(' and ')} too!)` : '';
    return `Which amenity would you like to book?${extraHint}`;
  }

  if (!collected.date && !collected.slotTime) {
    return `What date would you like to book the ${collected.amenityName} for, and what time slot? (e.g. Tomorrow at 6 PM)`;
  }

  if (!collected.date) {
    return `What date would you like to book the ${collected.amenityName} for? (e.g. Saturday, tomorrow, or a specific date)`;
  }

  if (!collected.slotTime) {
    const datePhrase = collected.dateLabel || collected.date || 'tomorrow';
    if (collected.timePreference) {
      const formattedDate = datePhrase.toLowerCase() === 'tomorrow' ? 'tomorrow' : `on ${datePhrase}`;
      return `Which time would you prefer ${formattedDate} ${collected.timePreference}? (e.g. 6:00 PM or 7:00 PM)`;
    }
    return `What time slot would you prefer for ${collected.amenityName} on ${datePhrase}? (e.g. 6:00 PM or 10:00 AM)`;
  }

  return 'Could you provide the booking details?';
}

/**
 * Formats an all-in-one, engaging question asking for missing visitor pass parameters in one shot.
 */
export function formatVisitorPassQuestion(collected = {}, missing = [], seed = '') {
  if (missing.includes('passType') || (!collected.passType && !collected.visitorName && !collected.date && !collected.slotTime)) {
    return (
      `Which type of visitor pass would you like to create?\n\n` +
      `• 👤 **Guest Pass** — Pre-approve individual friends, family, or personal visitors\n` +
      `• 👥 **Group Visit** (*Multi-Guest*) — Host events, parties, or bulk visitors with a single pass\n` +
      `• 🚗 **Cab / Auto** — Pre-approve Uber, Ola, or taxi vehicles for auto gate barrier opening\n` +
      `• 📦 **Delivery** — Quick entry pass for Swiggy, Zomato, Amazon, courier agents\n` +
      `• 🔧 **Service / Staff** (*Recurring*) — Long-term entry pass for maid, driver, electrician, daily staff`
    );
  }

  const passType = collected.passType;

  if (passType === 'CAB') {
    if (!collected.slotTime && !collected.vehicleNumber && !collected.vendor) {
      return 'What is the cab service/vehicle registration number (e.g. Uber, Ola KA01AB1234) and when is it arriving? (e.g. in 15 mins or 5:30 PM)';
    }
    if (!collected.slotTime) {
      return `When is the ${collected.vendor || 'cab'} arriving? (e.g. in 15 mins, or at a specific time like 5:30 PM)`;
    }
    if (!collected.vehicleNumber && !collected.vendor) {
      return 'What is the vehicle number or cab provider? (e.g. Uber KA01AB1234, or you can skip if unknown)';
    }
  }

  if (passType === 'DELIVERY') {
    if (!collected.slotTime && !collected.vendor && !collected.deliveryPartner) {
      return 'Which delivery partner (e.g. Swiggy, Zomato, Amazon) and when are they arriving? (e.g. in 20 mins or 1:00 PM)';
    }
    if (!collected.slotTime) {
      return `When is the ${collected.deliveryPartner || collected.vendor || 'delivery'} expected to arrive? (e.g. in 20 mins or at 1:30 PM)`;
    }
    if (!collected.deliveryPartner && !collected.vendor) {
      return 'Which delivery company or partner is this for? (e.g. Swiggy, Zomato, Amazon)';
    }
  }

  if (passType === 'SERVICE') {
    if (!collected.visitorName && !collected.date && !collected.slotTime) {
      return 'What service is visiting (e.g. Maid, Electrician Ramesh, Plumber) and what date and time will they arrive? (e.g. Tomorrow at 10 AM)';
    }
    if (!collected.visitorName) {
      return 'What is the service provider or staff member name? (e.g. Ramesh - Electrician, or Maid)';
    }
    if (!collected.date && !collected.slotTime) {
      return `What date and time is ${collected.visitorName} scheduled to visit? (e.g. Tomorrow at 10 AM)`;
    }
    if (!collected.date) {
      return `What date will ${collected.visitorName} be visiting? (e.g. Tomorrow, or a specific date)`;
    }
    if (!collected.slotTime) {
      return `What time is ${collected.visitorName} expected to arrive? (e.g. 10 AM or 2 PM)`;
    }
  }

  if (passType === 'GROUP' || collected.isGroupPass) {
    if (!collected.visitorCount && !collected.visitorName && !collected.date && !collected.slotTime) {
      return 'How many guests are in the group, and what date and time will they arrive? (e.g. 5 guests tonight at 8 PM)';
    }
    if (!collected.visitorName && (!collected.visitors || collected.visitors.length === 0) && !collected.visitorCount) {
      return 'How many guests are visiting or what are their names? (e.g. 4 guests or Rahul, Priya, Arun)';
    }
    if (!collected.date && !collected.slotTime) {
      return 'What date and time will the group arrive? (e.g. Tonight at 8 PM, or Tomorrow at 6 PM)';
    }
    if (!collected.date) {
      return 'What date will the group be visiting? (e.g. Today, Tomorrow, or Saturday)';
    }
    if (!collected.slotTime) {
      return 'What time is the group arriving? (e.g. 8 PM or 6:30 PM)';
    }
  }

  // Default: Single GUEST pass questions
  if (!collected.visitorName && !collected.date && !collected.slotTime) {
    return 'Who is visiting, and what date and time will they arrive? (e.g. Rahul tomorrow at 5 PM)';
  }

  if (!collected.visitorName) {
    if (collected.visitorCount === 2) {
      return 'What are the names of both visitors? Please provide both names (e.g. Rahul and Priya)';
    }
    if (collected.visitorCount > 2) {
      return `What are the names of the ${collected.visitorCount} visitors? (e.g. Rahul, Priya, and Arun)`;
    }
    const extra = [];
    if (!collected.date) extra.push('date');
    if (!collected.slotTime) extra.push('arrival time');
    const extraHint = extra.length > 0 ? ` (along with their ${extra.join(' and ')} if known)` : '';
    return `What is the visitor's name?${extraHint}`;
  }

  if (!collected.date && !collected.slotTime) {
    return `👋 Rolling out the red carpet for **${collected.visitorName}**! What date will ${collected.visitorName} be visiting and what time are they arriving? (e.g. Tomorrow at 5 PM). Tell me in one quick reply and I'll prepare the pass! 🎫`;
  }

  if (!collected.date) {
    return `What date will ${collected.visitorName} be visiting? (e.g. Tomorrow, Saturday, or a specific date)`;
  }

  if (!collected.slotTime) {
    return `What time is ${collected.visitorName} expected to arrive on ${collected.dateLabel || collected.date}? (e.g. 5 PM or 10:00 AM)`;
  }

  return 'Could you share the visitor details?';
}

/**
 * Formats an all-in-one question asking for missing personal expense details.
 */
function formatExpenseIntakeQuestion(collected = {}, seed = '') {
  const variations = [
    `💸 Cha-ching! Let's get those numbers recorded before the receipt vanishes into thin air! 😂\n\nTell me in one message:\n• 💰 Amount: How much was it? (e.g. ₹450)\n• 📂 Category: Groceries, Dining, Fuel, Utilities, or Shopping?\n• 🏪 Merchant: Where was it spent? (optional)\n\nExample: ₹450 groceries at Supermarket.\nI'll log it and balance the books immediately! 🧾`,
    `💰 Money tracking mode activated! Let's make those numbers behave! 📊\n\nTell me in one message:\n• 💰 Amount: How much was spent? (e.g. ₹1,200)\n• 📂 Category: Groceries, Dining, Maintenance, or Travel?\n• 🏪 Merchant: Store or service name? (optional)\n\nExample: ₹1,200 dinner at Pizza Bistro.\nI'll file the transaction right away! 🧾`
  ];
  return pickVariation(variations, seed);
}

/**
 * Extracts comprehensive amenity creation configuration fields from natural language text.
 */
export function extractAmenityCreationDetails(text, existing = {}) {
  const collected = { ...existing };
  if (!text || typeof text !== 'string') return collected;
  const str = text.trim();

  // Name
  if (!collected.name) {
    const createLeadMatch = str.match(/(?:create|cretae|add|register|setup|set\s+up|build|configure|name(?:d)?|called)\s+(?:a\s+)?(?:new\s+)?(?:paid\s+|free\s+)?([A-Za-z0-9\s]+?)(?:,|$|\s+(?:type|category|at|in|with|for|capacity|operating|hours|slot|buffer|rules))/i);
    if (
      createLeadMatch &&
      createLeadMatch[1] &&
      !/^(a|an|new|the|amenity|amenities|amentity|amentities|facility|one|one\s+amenities|paid|free)$/i.test(createLeadMatch[1].trim())
    ) {
      const candidate = createLeadMatch[1].trim();
      collected.name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    } else {
      const amenity = extractAmenityName(str);
      if (amenity) {
        collected.name = amenity;
      } else {
        const nameMatch = str.match(/(?:amenity master|amenities in amenity master|create.*amenit(?:y|ies)|add.*facility)\s+([A-Za-z0-9\s]+?)(?:\s+(?:slot|per|with|for|capacity|rate|rupees|rs)|$)/i);
        if (nameMatch && nameMatch[1]) {
          const candidate = nameMatch[1].trim();
          if (!/^(a|an|new|the|amenity|amenities|amentity|facility)$/i.test(candidate)) {
            collected.name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          }
        }
      }
    }
  }

  const afterName = collected.name ? str.replace(new RegExp(collected.name, 'i'), '') : str;

  // Type / Category
  const typeMatch = afterName.match(/(?:type|category):?\s*([^,.\n]+)/i) ||
                    afterName.match(/\b(Sports\s*&\s*Fitness|Pool\s*&\s*Spa|Event\s*Space|Sports|Fitness|Clubhouse|General|Workspace|Wellness|court|pool|gym|hall|lounge)\b/i);
  if (typeMatch) {
    collected.type = typeMatch[1].trim();
  } else if (collected.name && !collected.type) {
    const lowerName = collected.name.toLowerCase();
    if (lowerName.includes('gym') || lowerName.includes('fitness')) collected.type = 'gym';
    else if (lowerName.includes('pool') || lowerName.includes('swim')) collected.type = 'pool';
    else if (lowerName.includes('clubhouse') || lowerName.includes('club house')) collected.type = 'clubhouse';
    else if (lowerName.includes('badminton') || lowerName.includes('tennis') || lowerName.includes('squash') || lowerName.includes('court')) collected.type = 'court';
    else if (lowerName.includes('hall') || lowerName.includes('party')) collected.type = 'hall';
    else collected.type = 'General';
  }

  // Location
  const locMatch = str.match(/(?:location:?|located (?:at|in)|venue:?)\s*([^,.\n]+(?:,\s*[^,.\n]+)?)/i) ||
                   str.match(/\b(Clubhouse[,\s]+First Floor|Clubhouse|Block\s+[A-Z][^,\n]*|Rooftop[^,\n]*|Ground Floor[^,\n]*)\b/i);
  if (locMatch) {
    collected.location = locMatch[1].trim();
  }

  // Physical Capacity
  const capMatch = str.match(/(?:(?:maximum\s+)?physical\s+capacity|capacity|max\s+capacity|maximum\s+members?|max\s+members?|headcount)(?:\s+of)?\s*(?::\s*)?(\d+|[a-z\-]+)/i) ||
                   str.match(/(\d+|[a-z\-]+)\s*[- ]?(?:member|members|people|person|persons)\s+capacity/i) ||
                   str.match(/capacity\s*[:=]?\s*(\d+|[a-z\-]+)\s*(?:people|persons|members)?/i);
  if (capMatch) {
    const capNum = parseNaturalNumber(capMatch[1]);
    if (capNum && capNum > 0) collected.capacity = capNum;
  }

  // Operating Hours
  const hoursMatch = str.match(/(?:operating(?:\s+hours)?|hours|open(?:\s+from)?)\s*(?::\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (hoursMatch) {
    const open = hoursMatch[1].trim();
    const close = hoursMatch[2].trim();
    collected.operatingHours = { open, close };
    collected.openTime = open;
    collected.closeTime = close;
  }

  // Slot Duration
  const slotMatch = str.match(/(?:with\s+)?(\d+|[a-z\-]+)\s*[- ]?(?:hour|hr)\s*slots?/i) ||
                    str.match(/(?:slot(?:\s+duration)?|duration)\s*(?::\s*)?(\d+|[a-z\-]+)\s*(?:min|minute|hour|hr)/i) ||
                    str.match(/(\d+|[a-z\-]+)\s*[- ]?(?:min|minute)\s*slots?/i);
  if (slotMatch) {
    const rawVal = slotMatch[1];
    let num = parseNaturalNumber(rawVal);
    if (num) {
      if (/hour|hr/i.test(slotMatch[0])) num *= 60;
      collected.slotDurationMinutes = num;
    }
  }

  // Buffer Time
  const bufMatch = str.match(/buffer(?:\s+time)?\s*(?::\s*)?(\d+)\s*(?:min|minute)/i);
  if (bufMatch) {
    collected.bufferTimeMinutes = Number(bufMatch[1]);
  }

  // Advance Booking Days
  const advMatch = str.match(/advance(?:\s+booking)?\s*(?::\s*)?(?:up\s+to\s*)?(\d+)\s*days?/i);
  if (advMatch) {
    collected.advanceBookingDays = Number(advMatch[1]);
  }

  // Max Participants per Booking
  const partMatch = str.match(/(?:set\s+(?:a\s+)?maximum\s+of|max(?:imum)?\s*(?:participants?|people|persons?|members?)?(?:\s*(?:per|for\s+each|in\s+one)\s*booking)?)\s*[:=]?\s*(\d+|[a-z\-]+)\s*(?:people|persons?|members?|participants?)?(?:\s*(?:per|for\s+each|in\s+one)\s*booking)?/i) ||
                    str.match(/(\d+|[a-z\-]+)\s*(?:people|persons?|members?|participants?)\s*(?:per|for\s+each|in\s+one)\s*booking/i);
  if (partMatch) {
    const pNum = parseNaturalNumber(partMatch[1]);
    if (pNum && pNum > 0) collected.maxParticipantsPerBooking = pNum;
  }

  // Max Bookings per User
  const userBookMatch = str.match(/(?:allow\s+each\s+user\s+(?:to\s+book\s+)?(?:a\s+)?maximum\s+of|max(?:imum)?\s*(?:bookings?|slots?)\s*per\s*(?:user|member|person)(?:\s*per\s*day)?|max(?:imum)?\s*(?:bookings?|slots?)\s*per\s*day\s*(?:per\s*user)?)\s*[:=]?\s*(\d+|[a-z\-]+)/i) ||
                        str.match(/(\d+|[a-z\-]+)\s*(?:bookings?|slots?)\s*(?:per\s+user\s+per\s+day|per\s+day\s+per\s+user|per\s+user|per\s+day)/i);
  if (userBookMatch) {
    const uNum = parseNaturalNumber(userBookMatch[1]);
    if (uNum && uNum > 0) collected.maxBookingsPerUser = uNum;
  }

  // Max Concurrent Bookings
  const concMatch = str.match(/max(?:imum)?\s*(?:concurrent(?:\s+bookings?)?(?:\s+per\s+slot)?\s*[:=]?\s*(\d+|[a-z\-]+)|(\d+|[a-z\-]+)\s+concurrent(?:\s+bookings?)?)/i);
  if (concMatch) {
    const cNum = parseNaturalNumber(concMatch[1] || concMatch[2]);
    if (cNum && cNum > 0) collected.maxConcurrentBookings = cNum;
  }

  // Pricing & Fee
  if (/\bfree\b/i.test(str)) {
    collected.isPaid = false;
    collected.ratePerHour = 0;
    collected.baseRate = 0;
  } else if (/\bpaid\b/i.test(str) || /(?:₹|rs\.?)\s*\d+/i.test(str)) {
    collected.isPaid = true;
  }
  const feeMatch = str.match(/(?:booking\s+should\s+cost|cost|fee|charge|rate|price|rupees(?:\s+of)?|rs\.?|₹)\s*(?:is|of|should\s+be)?\s*(?::\s*)?(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
                   str.match(/(\d+)\s*(?:rupees|rs)\s*(?:per\s+(?:slot|hour)|\/slot|\/hour)/i) ||
                   str.match(/(?:₹|rs\.?)\s*(\d+)(?:\s*\/(?:slot|hour)|\s*per\s+slot)/i);
  if (feeMatch) {
    const fVal = Number(feeMatch[1]);
    collected.ratePerHour = fVal;
    collected.baseRate = fVal;
    collected.isPaid = true;
  }

  // Security Deposit
  const depMatch = str.match(/(?:security\s+deposit|deposit)\s*(?::\s*)?(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
                   str.match(/(?:₹|rs\.?)\s*(\d+)\s*(?:refundable\s+)?deposit/i);
  if (depMatch) {
    collected.securityDeposit = Number(depMatch[1]);
  }

  // Tax
  const taxMatch = str.match(/tax\s*(?::\s*)?(\d+)%/i) || str.match(/(\d+)%\s*tax/i);
  if (taxMatch) {
    collected.taxPercentage = Number(taxMatch[1]);
  }

  // Cancellation & Refund
  const cancelMatch = str.match(/cancellation\s*(?::\s*)?(?:allowed|permitted|enabled)?\s*(?:up\s+to\s*)?(\d+)\s*(?:hours?|hrs?|days?)\s*before/i) ||
                      str.match(/cancellation\s*(?::\s*)?(?:allowed|permitted|enabled)/i) ||
                      str.match(/refundable\s+cancellation/i);
  if (cancelMatch) {
    collected.isCancellationEnabled = true;
    if (cancelMatch[1]) {
      let hrs = Number(cancelMatch[1]);
      if (/days?/i.test(cancelMatch[0])) hrs *= 24;
      collected.minAdvanceBookingHours = hrs;
    }
  }

  const refundMatch = str.match(/\brefund:?\s*([0-9%h\s,a-zA-Z\-_–]+?)(?=\s*,\s*(?:rules|instructions)|$)/i) ||
                      str.match(/(\d+)%\s*refund\s*(?:before|prior\s+to)?\s*([^,.\n]+)/i);
  if (refundMatch) {
    collected.refundSummary = (refundMatch[1] || refundMatch[0]).trim();
  }

  // Rules text
  const rulesMatch = str.match(/rules:?\s*([^]*?)(?:$)/i);
  if (rulesMatch) {
    collected.rules = rulesMatch[1].trim();
  }

  return collected;
}

/**
 * Formats pre-confirmation summary for Amenity Creation in the exact user-specified format.
 */
export function formatAmenityCreationSummary(collected = {}) {
  const name = collected.name || 'Amenity Facility';
  const type = collected.type || 'court';
  const location = collected.location || 'Community Campus';
  const capacity = collected.capacity || 8;
  const slotDuration = collected.slotDurationMinutes || 60;
  const bufferTime = collected.bufferTimeMinutes || 15;
  const advanceBooking = collected.advanceBookingDays || 7;
  const openTime = collected.operatingHours?.open || collected.openTime || '06:00';
  const closeTime = collected.operatingHours?.close || collected.closeTime || '21:00';
  const isPaid = collected.isPaid !== false && (Number(collected.pricing?.rate ?? collected.ratePerHour ?? collected.baseRate ?? 0) > 0 || String(collected.pricing?.type).toLowerCase() === 'paid');
  const fee = collected.pricing?.rate ?? collected.ratePerHour ?? collected.baseRate ?? (isPaid ? 200 : 0);
  const securityDeposit = collected.securityDeposit ?? 0;
  const tax = collected.taxPercentage ?? 0;
  const maxParticipants = collected.maxParticipantsPerBooking || 4;
  const maxBookingsUser = collected.maxBookingsPerUser || 2;
  const maxConcurrent = collected.maxConcurrentBookings || 5;
  const cancelHours = collected.minAdvanceBookingHours || 24;
  const isCancelAllowed = collected.isCancellationEnabled !== false;
  let refundText = collected.refundSummary || '100% before the cancellation deadline';

  const lines = [
    'Amenity Creation Summary:',
    'Here is the new amenity configuration:',
    '',
    `* Name: ${name}`,
    `* Type: ${type}`,
    `* Location: ${location}`,
    `* Physical Capacity: ${capacity}`,
    `* Operating Hours: ${openTime} to ${closeTime}`,
    `* Slot Duration: ${slotDuration} minutes`,
    `* Buffer Time: ${bufferTime} minutes`,
    `* Advance Booking: Up to ${advanceBooking} days in advance`,
    `* Max Participants per Booking: ${maxParticipants}`,
    `* Max Bookings per User per Day: ${maxBookingsUser}`,
    `* Max Concurrent Bookings per Slot: ${maxConcurrent}`,
    `* Pricing: ${isPaid ? 'Paid' : 'Free'}`,
    `* Booking Fee: ${isPaid ? `₹${fee} per slot` : 'Free'}`,
  ];

  if (securityDeposit > 0) {
    lines.push(`* Security Deposit: ₹${securityDeposit} (Refundable)`);
  }
  if (tax > 0) {
    lines.push(`* Tax: ${tax}%`);
  }
  lines.push(`* Cancellation: ${isCancelAllowed ? `Allowed up to ${cancelHours} hours before slot` : 'Not allowed'}`);
  if (isCancelAllowed) {
    lines.push(`* Refund: ${refundText}`);
  }
  if (collected.rules) {
    lines.push(`* Rules: ${collected.rules}`);
  }
  lines.push('');
  lines.push('Would you like to confirm this configuration?');

  return lines.join('\n');
}

/**
 * Calculates end time string (HH:MM) from a start time string and duration in minutes.
 */
export function calculateSlotEnd(timeStr, durationMinutes = 60) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const totalMins = h * 60 + m + (durationMinutes || 60);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Formats pre-confirmation summary for Amenity Booking in the exact user-specified format.
 */
export function formatAmenityBookingSummary(collected = {}, pricing = {}) {
  const name = collected.amenityName || 'Amenity';
  const dateStr = collected.dateLabel || collected.date || 'Tomorrow';
  const slotTime = collected.slotTime || '07:00';
  const endTime = collected.endTime || calculateSlotEnd(slotTime, 60);
  const timeSlot = `${slotTime} - ${endTime}`;

  let participantsText = '1 person';
  if (collected.participantNames) {
    participantsText = `${collected.participantNames} (${collected.headcount || 2} persons)`;
  } else if (collected.headcount > 1) {
    participantsText = `${collected.headcount} persons`;
  }

  const fee = pricing.baseRate ?? collected.rateAmount ?? 200;
  const isPaid = fee > 0;
  const taxPct = pricing.taxPercentage ?? 0;
  const taxAmount = taxPct > 0 ? Math.round((fee * taxPct) / 100) : 0;
  const totalAmount = fee + taxAmount;
  const walletBalance = pricing.walletBalance ?? collected.walletBalance ?? 850;
  const isWalletShort = isPaid && walletBalance < totalAmount;

  let paymentMethod = 'Free';
  if (isPaid) {
    if (collected.preferredPaymentMethod === 'ONLINE' || isWalletShort) {
      paymentMethod = isWalletShort
        ? `Online Payment (Wallet balance: ₹${walletBalance} is insufficient)`
        : 'Online Payment';
    } else {
      paymentMethod = `Digital Wallet (Current Balance: ₹${walletBalance})`;
    }
  }

  const lines = [
    'Booking Summary:',
    'Please review your booking:',
    '',
    `* Amenity: ${name}`,
    `* Date: ${dateStr}`,
    `* Time: ${timeSlot}`,
    `* Participants: ${participantsText}`,
    `* Booking Fee: ${isPaid ? `₹${fee}` : 'Free'}`,
  ];
  if (taxPct > 0) {
    lines.push(`* Tax (${taxPct}%): ₹${taxAmount}`);
    lines.push(`* Total Amount: ₹${totalAmount}`);
  }
  lines.push(`* Payment Method: ${paymentMethod}`);
  if (pricing.cancellationPolicy) {
    lines.push(`* Cancellation Policy: ${pricing.cancellationPolicy}`);
  }
  lines.push('');
  lines.push('Would you like to confirm?');

  return lines.join('\n');
}

/**
 * Formats pre-confirmation summary for Amenity Booking Cancellation in the exact user-specified format.
 */
export function formatAmenityCancellationSummary(details = {}) {
  const name = details.amenityName || 'Amenity Facility';
  const bookingId = details.bookingId || 'BKG-12345';
  const dateStr = details.date || 'Upcoming';
  const timeSlot = details.timeSlot || '';
  const bookingFee = details.bookingFee ?? details.rateAmount ?? 200;
  const securityDeposit = details.securityDeposit ?? 0;
  const totalPaid = details.totalPaid ?? (bookingFee + securityDeposit);
  const cancellationFee = details.cancellationFee ?? 0;
  const refundAmount = details.eligibleRefund ?? details.refundAmount ?? (totalPaid - cancellationFee);
  const refundPercentage = details.refundPercentage ?? 100;
  const refundDestination = details.refundDestination || 'Digital Wallet';
  const timingNote = details.timingNote || '';

  const lines = [
    'Cancellation Summary:',
    'Please review your cancellation request:',
    '',
    `* Amenity: ${name}`,
    `* Booking ID: ${bookingId}`,
    ...(dateStr ? [`* Date: ${dateStr}`] : []),
    ...(timeSlot ? [`* Time Slot: ${timeSlot}`] : []),
    `* Booking Fee: ₹${bookingFee}`,
    `* Security Deposit: ₹${securityDeposit}`,
    `* Total Paid: ₹${totalPaid}`,
    ...(cancellationFee > 0 ? [`* Cancellation Fee: ₹${cancellationFee}`] : []),
    `* Eligible Refund: ₹${refundAmount} (${refundPercentage}% refund${timingNote ? ` - ${timingNote}` : ''})`,
    `* Refund Destination: ${refundDestination}`,
    '',
    'Would you like to confirm this cancellation?',
  ];

  return lines.join('\n');
}

/**
 * Formats an engaging question asking for missing amenity creation details in logical groups.
 */
function formatAmenityCreationQuestion(collected = {}, missing = [], seed = '') {
  if (!collected.name && !collected.capacity) {
    return 'What amenity facility would you like to create? Please let me know:\n• 🏷️ Amenity name: (e.g. Badminton Court, Swimming Pool, Clubhouse)\n• 📂 Amenity type: (e.g. Sports, Court, Pool, Hall, Gym)\n• 👥 Maximum capacity: Physical headcount limit (e.g. 20 people)\n• 💰 Booking rate: Free or ₹ per slot (e.g. ₹200/slot)';
  }

  if (!collected.name) {
    return 'What should we name this new amenity facility? (e.g. Badminton Court, Swimming Pool, Clubhouse, Gym)';
  }

  return `Please let me know the booking configuration for ${collected.name}:\n• Operating hours (e.g. 6 AM to 10 PM) & slot duration (e.g. 60 mins)\n• Booking fee (Free or ₹ per slot)\n• Max participants per booking & max bookings per user\n• Cancellation policy (e.g. up to 24 hours before booking)`;
}


/**
 * Formats an all-in-one question asking for notice creation details.
 */
function formatNoticeIntakeQuestion(collected = {}, seed = '') {
  const variations = [
    `📢 Got news? Let's make sure the whole community hears it! 🚀\n\nSend me the details in one go:\n• 🏷️ Notice title: What is the headline? (e.g. Water Supply Maintenance Shutdown)\n• 📝 Announcement message: What should residents know? (e.g. Water supply will be halted tomorrow from 10 AM to 2 PM for pump maintenance)\n• ⚠️ Priority: Low, Medium, High, or Critical?\n• 📂 Category: General, Maintenance, Events, Security, or Billing?\n\nExample: Water shutdown tomorrow 10 AM to 2 PM, Maintenance, High priority.\nDrop everything in one message and I'll prepare the official notice card! 📜`,
    `📣 Megaphone ready! Let's broadcast your announcement loud and clear! 🎈\n\nSend me the details in one go:\n• 🏷️ Notice title: What is the headline? (e.g. Community Yoga Camp this Sunday)\n• 📝 Announcement message: Details of the event or update?\n• ⚠️ Priority: Low, Medium, High, or Critical?\n• 📂 Category: General, Maintenance, Events, Security, or Billing?\n\nExample: Yoga Camp this Sunday at 7 AM in Central Park, Events, Medium priority.\nI'll prepare the community broadcast card! 📢`
  ];
  return pickVariation(variations, seed);
}

/**
 * Formats an all-in-one question asking for staff creation or inquiry details.
 */
function formatStaffIntakeQuestion(collected = {}, seed = '') {
  const variations = [
    `🦸 Let's organize our community superheroes! Tell me in one message:\n• 👤 Staff Name: Full name of the staff member\n• 🏢 Department & Role: Housekeeping, Maintenance, Security, or Management\n• ⏰ Shift timings: Morning, evening, or specific hours (e.g. 9 AM to 5 PM)\n• 📱 Contact: Phone or extension (optional)\n\nExample: Ramesh, Maintenance, Electrician, 9 AM to 5 PM.\nI'll get them rostered into the community team right away! 💪`,
    `🛡️ Reinforcements incoming! Let's keep our community operating like clockwork! ⚡\n\nTell me in one message:\n• 👤 Staff Name: Who is joining the roster?\n• 🏢 Department & Role: Security, Housekeeping, Maintenance, or Administration\n• ⏰ Shift timings: Shift hours or schedule\n• 📱 Contact: Mobile number (optional)\n\nExample: Priya, Security, Gate Officer, Night Shift.\nI'll update the staff schedule in seconds! 🦸`
  ];
  return pickVariation(variations, seed);
}

/**
 * Analyzes conversation state, user message, and history to produce an updated state
 * and action classification.
 *
 * @param {string} message - Current user message
 * @param {object} previousState - Previous state passed from client or prior turn
 * @param {Array} history - Recent conversation history
 * @param {Date} [referenceDate] - Current reference date for relative resolution
 * @returns {object} Updated conversation state
 */
function _analyzeConversationTurnInternal(message, previousState = null, history = [], referenceDate = null, userContext = null) {
  const refDate = getReferenceDate(referenceDate);
  const text = (message || '').trim();
  const directIntent = detectDirectIntent(text);
  const user = userContext?.user || (userContext && typeof userContext === 'object' && ('role' in userContext || 'permissions' in userContext) ? userContext : null);

  // RBAC Pre-Execution Intent Check
  if (directIntent === INTENTS.AMENITY_CREATE && user && !canUserCreateAmenity(user)) {
    return {
      activeIntent: INTENTS.AMENITY_CREATE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to create amenities. I can help you discover available amenities and book one if your role allows it.",
      permittedAlternatives: canUserDiscoverAmenities(user) ? ['discover_amenities', ...(canUserBookAmenity(user) ? ['book_amenity'] : [])] : [],
    };
  }

  if (directIntent === INTENTS.AMENITY_BOOKING && user && !canUserBookAmenity(user)) {
    return {
      activeIntent: INTENTS.AMENITY_BOOKING,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to book amenities in this community. I can help you view existing amenities and their details if you wish.",
      permittedAlternatives: canUserDiscoverAmenities(user) ? ['discover_amenities'] : [],
    };
  }

  if (directIntent === INTENTS.POLL_CREATE && user && !canUserCreatePoll(user)) {
    return {
      activeIntent: INTENTS.POLL_CREATE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to create community polls.",
    };
  }

  if (directIntent === INTENTS.NOTICE_CREATE && user && !canUserCreateNotice(user)) {
    return {
      activeIntent: INTENTS.NOTICE_CREATE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to publish community notices.",
    };
  }

  if (directIntent === INTENTS.ASSESSMENT_CREATE && user && !canUserCreateAssessment(user)) {
    return {
      activeIntent: INTENTS.ASSESSMENT_CREATE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to create maintenance assessments.",
    };
  }

  if (directIntent === INTENTS.COMMUNITY_FINANCE && user && !canUserViewCommunityFinance(user)) {
    return {
      activeIntent: INTENTS.COMMUNITY_FINANCE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "Community financial records are restricted to community administrators. I can help you view your personal maintenance dues and personal expenses.",
    };
  }

  if (directIntent === INTENTS.VISITOR_PASS_CREATE && user && !canUserCreateVisitorPass(user)) {
    return {
      activeIntent: INTENTS.VISITOR_PASS_CREATE,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to create visitor passes.",
    };
  }

  if ((directIntent === INTENTS.COMPLAINT_CREATE || directIntent === INTENTS.MAINTENANCE_CREATE) && user && !canUserRaiseComplaint(user)) {
    return {
      activeIntent: directIntent,
      workflow: 'unauthorized',
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'permission_denied',
      awaitingConfirmation: false,
      denialReason: "You don't have permission to raise complaints or book maintenance requests.",
    };
  }

  // Normalize previous state
  const prev = sanitizeConversationState(previousState);

  // 0. Explicit Confirmation or Rejection of Pending Action
  if (prev?.awaitingConfirmation) {
    if (isNegativeConfirmation(text)) {
      return {
        activeIntent: prev.activeIntent,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
        actionCancelled: true,
        actionConfirmed: false,
        pendingAction: prev.pendingAction ? { ...prev.pendingAction, cancelled: true } : null,
      };
    }

    if (isAffirmativeConfirmation(text)) {
      return {
        activeIntent: prev.activeIntent,
        workflow: 'executing_action',
        collectedDetails: prev.collectedDetails,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'executing',
        awaitingConfirmation: false,
        actionConfirmed: true,
        actionCancelled: false,
        pendingAction: prev.pendingAction,
      };
    }
  }

  // 0a. Universal Deselection & Clear Handler
  const isDeselectCommand = /^(?:deselect|unselect|remove|clear)\b/i.test(text);
  if (isDeselectCommand && prev?.workflow && prev.workflow !== 'none') {
    const collected = { ...(prev.collectedDetails || {}) };
    const missing = Array.isArray(prev.missingFields) ? [...prev.missingFields] : [];
    let deselectedField = null;

    if (/\b(?:all|everything|selection|selections)\b/i.test(text)) {
      if (prev.interactiveConfig?.targetField && collected[prev.interactiveConfig.targetField]) {
        deselectedField = prev.interactiveConfig.targetField;
        delete collected[deselectedField];
        if (!missing.includes(deselectedField)) missing.push(deselectedField);
      } else {
        const keys = Object.keys(collected);
        if (keys.length > 0) {
          deselectedField = keys[keys.length - 1];
          delete collected[deselectedField];
          if (!missing.includes(deselectedField)) missing.push(deselectedField);
        }
      }
    } else if (/\b(?:cab|delivery|guest|group|service|staff|pass\s*type|invitation)\b/i.test(text)) {
      deselectedField = 'passType';
      delete collected.passType;
      delete collected.vendor;
      delete collected.deliveryPartner;
      if (!missing.includes('passType')) missing.push('passType');
    } else if (/\b(?:wallet|online|payment|payment\s*method)\b/i.test(text)) {
      deselectedField = 'paymentMethod';
      delete collected.preferredPaymentMethod;
      delete collected.paymentMethod;
      if (!missing.includes('paymentMethod')) missing.push('paymentMethod');
    } else if (/\b(?:plumbing|electrical|housekeeping|security|carpentry|noise|category)\b/i.test(text)) {
      deselectedField = 'category';
      delete collected.category;
      delete collected.categoryName;
      if (!missing.includes('category')) missing.push('category');
    } else if (/\b(?:ac|electrician|plumber|carpenter|appliance|trade)\b/i.test(text)) {
      deselectedField = 'trade';
      delete collected.trade;
      if (!missing.includes('trade')) missing.push('trade');
    } else if (/\b(?:urgent|critical|medium|low|priority)\b/i.test(text)) {
      deselectedField = 'priority';
      delete collected.priority;
      if (!missing.includes('priority')) missing.push('priority');
    } else if (/\b(?:date|today|tomorrow|saturday|sunday)\b/i.test(text)) {
      deselectedField = 'date';
      delete collected.date;
      delete collected.dateLabel;
      if (!missing.includes('date')) missing.push('date');
    } else if (/\b(?:time|slot|morning|afternoon|evening)\b/i.test(text)) {
      deselectedField = 'slotTime';
      delete collected.slotTime;
      delete collected.endTime;
      if (!missing.includes('slotTime')) missing.push('slotTime');
    } else if (/\b(?:amenity|badminton|tennis|pool|clubhouse|gym)\b/i.test(text)) {
      deselectedField = 'amenityName';
      delete collected.amenityName;
      if (!missing.includes('amenityName')) missing.push('amenityName');
    } else if (prev.interactiveConfig?.targetField && collected[prev.interactiveConfig.targetField]) {
      deselectedField = prev.interactiveConfig.targetField;
      delete collected[deselectedField];
      if (!missing.includes(deselectedField)) missing.push(deselectedField);
    }

    if (deselectedField) {
      let nextQ = `I've removed the ${deselectedField}. Which option would you like to select instead?`;
      if (deselectedField === 'passType') nextQ = formatVisitorPassQuestion(collected, missing);
      else if (['amenityName', 'date', 'slotTime', 'paymentMethod'].includes(deselectedField)) nextQ = formatAmenityBookingQuestion(collected, missing);
      else if (deselectedField === 'category') nextQ = formatComplaintIntakeQuestion(collected);
      else if (deselectedField === 'trade') nextQ = formatMaintenanceIntakeQuestion(collected);

      return {
        activeIntent: prev.activeIntent,
        workflow: prev.workflow.replace('_ready', '_intake'),
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: nextQ,
        interactionType: 'clarification',
        awaitingConfirmation: false,
        presentedAmenities: prev.presentedAmenities || [],
      };
    }
  }

  // 1. Task Switching Detection
  // If the user has an active workflow but sends an explicit discordant request, clear workflow and switch.
  const isWorkflowActive = Boolean(prev?.workflow && prev.workflow !== 'none');
  const isIntraDomain =
    (prev?.activeIntent === INTENTS.COMPLAINT_CANCEL && directIntent === INTENTS.COMPLAINTS_HELPDESK) ||
    (prev?.activeIntent === INTENTS.COMPLAINT_CREATE && directIntent === INTENTS.COMPLAINTS_HELPDESK) ||
    (prev?.activeIntent === INTENTS.PERSONAL_EXPENSE_CREATE && directIntent === INTENTS.PERSONAL_EXPENSE) ||
    (prev?.activeIntent === INTENTS.AMENITY_BOOKING && directIntent === INTENTS.AMENITY_AVAILABILITY) ||
    (prev?.activeIntent === INTENTS.VISITOR_PASS_CREATE && directIntent === INTENTS.VISITOR_MANAGEMENT);

  const isDiscordantIntent =
    directIntent &&
    prev?.activeIntent &&
    directIntent !== prev.activeIntent &&
    directIntent !== INTENTS.GENERAL_INQUIRY &&
    !isIntraDomain;

  if (isWorkflowActive && isDiscordantIntent) {
    if (prev?.pendingAction?.id) {
      cancelPendingAction(prev.pendingAction.id, 'Task switching');
    }
    return handleFreshIntent(directIntent, text, refDate, user);
  }

  // 1b. Ordinal or pronoun follow-up referencing previous turn (e.g. "The second one" in amenity booking)
  const detectedOrdinal = extractOrdinalReference(text, history, prev?.presentedAmenities);
  if (detectedOrdinal && (!prev || !prev.activeIntent || prev.activeIntent === INTENTS.AMENITY_INQUIRY || prev.activeIntent === INTENTS.AMENITY_AVAILABILITY || prev.activeIntent === INTENTS.AMENITY_BOOKING)) {
    const isBooking = /book|reserve/i.test(text) || prev?.activeIntent === INTENTS.AMENITY_BOOKING || prev?.workflow === WORKFLOWS.AMENITY_BOOKING_INTAKE || prev?.workflow === WORKFLOWS.AMENITY_BOOKING_READY;
    const resolvedDate = resolveDateExpression(text, refDate) || (prev?.collectedDetails?.date ? { date: prev.collectedDetails.date, label: prev.collectedDetails.dateLabel || 'Selected date', type: 'single' } : { date: formatDate(refDate), label: 'Today', type: 'single' });
    const timeRange = resolveTimeRange(text);
    const timeRes = timeRange ? timeRange.startTime : resolveTimeExpression(text, { exactOnly: true });

    if (isBooking) {
      const collected = { ...(prev?.collectedDetails || {}) };
      collected.amenityName = detectedOrdinal;
      if (!collected.date || resolveDateExpression(text, refDate)) {
        collected.date = resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date;
        collected.dateLabel = resolvedDate.label;
      }
      if (timeRange) {
        collected.slotTime = timeRange.startTime;
        collected.endTime = timeRange.endTime;
      } else if (timeRes) {
        collected.slotTime = timeRes;
      }

      const missing = [];
      if (!collected.amenityName) missing.push('amenityName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: WORKFLOWS.AMENITY_BOOKING_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
          presentedAmenities: prev?.presentedAmenities || [],
        };
      }

      const nextQuestion = formatAmenityBookingQuestion(collected, missing);
      return {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
        presentedAmenities: prev?.presentedAmenities || [],
      };
    }

    return {
      activeIntent: INTENTS.AMENITY_AVAILABILITY,
      workflow: null,
      collectedDetails: {
        amenityName: detectedOrdinal,
        date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
        dateLabel: resolvedDate.label,
      },
      missingFields: [],
      nextQuestion: null,
      interactionType: 'answering',
      awaitingConfirmation: false,
      presentedAmenities: prev?.presentedAmenities || [],
    };
  }

  // 2. Temporal Follow-up to Previous Intent
  if (prev?.activeIntent && isTemporalFollowUp(text)) {
    const resolvedDate = resolveDateExpression(text, refDate);
    if (resolvedDate) {
      if (prev.activeIntent === INTENTS.MY_BOOKINGS) {
        return {
          activeIntent: INTENTS.MY_BOOKINGS,
          workflow: null,
          collectedDetails: {
            dateRangeLabel: resolvedDate.label,
            startDate: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
            endDate: resolvedDate.type === 'range' ? resolvedDate.endDate : resolvedDate.date,
          },
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }
      if (prev.activeIntent === INTENTS.AMENITY_AVAILABILITY || prev.activeIntent === INTENTS.AMENITY_INQUIRY) {
        const ordinalAmenity = extractOrdinalReference(text, history);
        const resolvedAmenity = ordinalAmenity || prev.collectedDetails?.amenityName || extractAmenityName(text) || null;
        if (resolvedAmenity) {
          return {
            activeIntent: INTENTS.AMENITY_AVAILABILITY,
            workflow: null,
            collectedDetails: {
              amenityName: resolvedAmenity,
              date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
              dateLabel: resolvedDate.label,
            },
            missingFields: [],
            nextQuestion: null,
            interactionType: 'answering',
            awaitingConfirmation: false,
          };
        } else {
          return {
            activeIntent: INTENTS.AMENITY_AVAILABILITY,
            workflow: null,
            collectedDetails: {
              date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
              dateLabel: resolvedDate.label,
            },
            missingFields: ['amenityName'],
            nextQuestion: `Which amenity would you like to check availability for ${resolvedDate.label.toLowerCase()}? (e.g. Badminton, Swimming Pool, Gym)`,
            interactionType: 'clarification',
            awaitingConfirmation: false,
          };
        }
      }
      if (prev.activeIntent === INTENTS.VISITOR_MANAGEMENT) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: null,
          collectedDetails: {
            dateLabel: resolvedDate.label,
            date: resolvedDate.type === 'range' ? resolvedDate.startDate : resolvedDate.date,
          },
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }
    }
  }

  // 3a. Multi-Turn Clarification within Amenity Facility Creation Workflow
  if (prev?.workflow === WORKFLOWS.AMENITY_CREATE_INTAKE || prev?.workflow === WORKFLOWS.AMENITY_CREATE_READY) {
    const collected = extractAmenityCreationDetails(text, prev.collectedDetails || {});
    let extractedAny = false;

    // 0. Extract type
    const typeMatch = text.match(/(?:a|an|type:?)\s*(clubhouse|gym|swimming\s+pool|pool|party\s+hall|sports\s+court|tennis\s+court|badminton\s+court|theater|auditorium|lounge)/i) ||
                      text.match(/\b(clubhouse|gym|swimming\s+pool|pool|party\s+hall|sports\s+court|tennis\s+court|badminton\s+court|theater|auditorium)\b/i);
    if (typeMatch && !collected.type) {
      collected.type = typeMatch[1].toLowerCase().replace(/\s+/g, '_');
      extractedAny = true;
    }

    // 1. Check for amenity name if missing
    if (!collected.name) {
      const explicitNameMatch = text.match(/(?:create|add|setup|build|name(?:d)?|called)\s+([A-Z][A-Za-z0-9\s]+?)(?:,|\s+a\s+|\s+an\s+|\s+for\s+|\s+with\s+|$)/i);
      if (explicitNameMatch && explicitNameMatch[1] && !/^(a|an|new|the|amenity|facility)$/i.test(explicitNameMatch[1].trim())) {
        collected.name = explicitNameMatch[1].trim();
        extractedAny = true;
      } else {
        const amenity = extractAmenityName(text);
        if (amenity) {
          collected.name = amenity;
          extractedAny = true;
        } else {
          // Natural language name response like "Rooftop party hall" or "Sky Lounge"
          const cleaned = text.trim().replace(/[.!?]+$/, '');
          if (cleaned.length > 1 && !/^(create|amenity|facility|add)$/i.test(cleaned)) {
            collected.name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            extractedAny = true;
          }
        }
      }
    }

    // 2. Check for capacity
    const capMatch = text.match(/(?:maximum\s+member(?:\s+of)?|capacity(?:\s+of)?|headcount(?:\s+of)?)\s*(\d+)/i) ||
                     text.match(/(\d+)\s*(?:member|members|people|person|persons|capacity|headcount|warriors|chairs)/i) ||
                     (collected.name && text.match(/^(\d+)$/));
    if (capMatch) {
      collected.capacity = Number(capMatch[1]);
      extractedAny = true;
    } else if (!collected.capacity) {
      const wordNumMatch = text.match(/\b(ten|fifteen|twenty|twenty-five|thirty|forty|fifty|hundred)\b/i);
      if (wordNumMatch) {
        const numMap = { ten: 10, fifteen: 15, twenty: 20, 'twenty-five': 25, thirty: 30, forty: 40, fifty: 50, hundred: 100 };
        collected.capacity = numMap[wordNumMatch[1].toLowerCase()] || 10;
        extractedAny = true;
      }
    }

    // 3. Check for rate and pricing
    const rateMatch = text.match(/(?:rupees(?:\s+of)?|rs\.?|₹)\s*([\d,]+)/i) ||
                      text.match(/([\d,]+)\s*(?:rupees|rs|per slot|\/slot|fee)/i);
    if (rateMatch) {
      const rateVal = Number(rateMatch[1].replace(/,/g, ''));
      collected.ratePerHour = rateVal;
      collected.pricing = {
        rate: rateVal,
        type: /daily/i.test(text) ? 'daily' : 'hourly',
      };
      extractedAny = true;
    }

    // 4. Check for operating hours
    const hoursMatch = text.match(/open(?:\s+from)?\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
    if (hoursMatch) {
      const openTime = resolveTimeExpression(hoursMatch[1]) || hoursMatch[1];
      const closeTime = resolveTimeExpression(hoursMatch[2]) || hoursMatch[2];
      collected.operatingHours = {
        open: openTime,
        close: closeTime,
      };
      collected.openTime = openTime;
      collected.closeTime = closeTime;
      extractedAny = true;
    }

    // 5. Check for pricing type
    if (/daily/i.test(text)) {
      collected.pricingType = 'daily';
      if (collected.pricing) collected.pricing.type = 'daily';
      extractedAny = true;
    }

    const missing = [];
    if (!collected.name) missing.push('name');

    if (missing.length === 0) {
      if (!collected.capacity) collected.capacity = 10;
      const summaryText = formatAmenityCreationSummary(collected);
      return {
        activeIntent: INTENTS.AMENITY_CREATE,
        workflow: WORKFLOWS.AMENITY_CREATE_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: summaryText,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.AMENITY_CREATE,
      workflow: WORKFLOWS.AMENITY_CREATE_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: formatAmenityCreationQuestion(collected),
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 3b. Multi-Turn Clarification within Amenity Booking Workflow
  if (prev?.workflow === WORKFLOWS.AMENITY_BOOKING_INTAKE || prev?.workflow === WORKFLOWS.AMENITY_BOOKING_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    // Check for attendee / headcount updates
    const hc = extractHeadcount(text);
    if (hc) {
      collected.headcount = hc;
      extractedAny = true;
    }

    // Check for participant names
    const partInfo = extractBookingParticipants(text);
    if (partInfo.names) {
      collected.participantNames = partInfo.names;
      if (!collected.headcount && partInfo.headcount) collected.headcount = partInfo.headcount;
      extractedAny = true;
    }

    // Check for payment method preference
    if (/(?:pay\s+via\s+wallet|from\s+wallet|use\s+(?:my\s+)?wallet)/i.test(text)) {
      collected.preferredPaymentMethod = 'WALLET';
      extractedAny = true;
    } else if (/(?:pay\s+online|online\s+payment|via\s+online|upi|gpay|phonepe|card)/i.test(text)) {
      collected.preferredPaymentMethod = 'ONLINE';
      extractedAny = true;
    }

    // Check for amenity updates or ordinal selection
    const ordinal = extractOrdinalReference(text, history, prev?.presentedAmenities);
    if (ordinal) {
      collected.amenityName = ordinal;
      extractedAny = true;
    } else if (!collected.amenityName || /(?:change|switch|book).*?(?:amenity|court|pool|hall|gym)/i.test(text)) {
      const amenity = extractAmenityName(text);
      if (amenity) {
        collected.amenityName = amenity;
        extractedAny = true;
      }
    }

    // Check for date updates or changes
    const dateRes = resolveDateExpression(text, refDate);
    if (dateRes && (!collected.date || /(?:change|move|reschedule|instead|for|on|to)\s+(?:tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|weekend|next|day after)/i.test(text) || !prev.collectedDetails?.date)) {
      collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
      collected.dateLabel = dateRes.label;
      extractedAny = true;
    }

    // Check for time range or slotTime updates or changes
    const timeRange = resolveTimeRange(text);
    const timeRes = resolveTimeExpression(text, { exactOnly: true });
    if (timeRange) {
      collected.slotTime = timeRange.startTime;
      collected.endTime = timeRange.endTime;
      extractedAny = true;
    } else if (timeRes && (!collected.slotTime || /(?:change|move|reschedule|at|to)\s+\d+/i.test(text) || !prev.collectedDetails?.slotTime)) {
      collected.slotTime = timeRes;
      extractedAny = true;
    }

    if (/(?:include|with)\s+(?:my\s+)?family\b/i.test(text)) {
      collected.includeFamily = true;
      extractedAny = true;
    }

    if (extractedAny || (!directIntent || directIntent === INTENTS.AMENITY_BOOKING)) {
      const missing = [];
      if (!collected.amenityName) missing.push('amenityName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: WORKFLOWS.AMENITY_BOOKING_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
          presentedAmenities: prev?.presentedAmenities || [],
        };
      }

      const nextQuestion = formatAmenityBookingQuestion(collected, missing);

      return {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
        presentedAmenities: prev?.presentedAmenities || [],
      };
    }
  }

  // 3c. Multi-Turn Clarification within Amenity Booking Cancellation Workflow
  if (prev?.workflow === WORKFLOWS.AMENITY_CANCEL_INTAKE || prev?.workflow === WORKFLOWS.AMENITY_CANCEL_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    const amenity = extractAmenityName(text);
    if (amenity) {
      collected.amenityName = amenity;
      extractedAny = true;
    }
    const bookingIdMatch = text.match(/\b(BKG-?[A-Za-z0-9\-]+|[0-9a-f]{24})\b/i);
    if (bookingIdMatch) {
      collected.bookingId = bookingIdMatch[1];
      extractedAny = true;
    }
    const ordinal = extractOrdinalReference(text, history, prev?.presentedAmenities);
    if (ordinal) {
      collected.amenityName = ordinal;
      extractedAny = true;
    }

    const hasTarget = Boolean(collected.amenityName || collected.bookingId);
    if (hasTarget) {
      return {
        activeIntent: INTENTS.AMENITY_CANCELLATION,
        workflow: WORKFLOWS.AMENITY_CANCEL_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: `Are you sure you want to cancel your ${collected.amenityName || 'amenity'} booking${collected.bookingId ? ` (ID: ${collected.bookingId})` : ''}? Please confirm to proceed.`,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.AMENITY_CANCELLATION,
      workflow: WORKFLOWS.AMENITY_CANCEL_INTAKE,
      collectedDetails: collected,
      missingFields: ['amenityName'],
      nextQuestion: 'Which amenity booking would you like to cancel? (e.g. Badminton, Swimming Pool, or enter your Booking ID)',
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 4. Multi-Turn Clarification within Visitor Pass Intake Workflow
  if (prev?.workflow === WORKFLOWS.VISITOR_PASS_INTAKE || prev?.workflow === WORKFLOWS.VISITOR_PASS_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;
    const isCorrection = /(?:actually|no,?|change|make that|instead|set|move to)/i.test(text);

    const vInfo = extractVisitorPassIntentAndCount(text);
    if (vInfo.isAddAnother) {
      collected.visitorCount = (collected.visitorCount || 1) + 1;
      collected.isGroupPass = true;
      extractedAny = true;
    } else if (vInfo.count > 1) {
      collected.visitorCount = vInfo.count;
      collected.isGroupPass = !vInfo.isSeparate;
      collected.isSeparate = vInfo.isSeparate;
      extractedAny = true;
    }

    // Check multiple visitors (e.g. "Rahul and Priya")
    const multVisitors = extractMultipleVisitors(text);
    if (multVisitors.length > 1) {
      collected.visitors = multVisitors;
      collected.visitorCount = multVisitors.length;
      collected.visitorName = multVisitors.map(v => v.name).join(', ');
      collected.isGroupPass = true;
      extractedAny = true;
    } else {
      const vName = extractVisitorName(text);
      if (vName && (!collected.visitorName || isCorrection || /(?:change|switch).*?(?:visitor|name|guest)/i.test(text))) {
        collected.visitorName = vName;
        extractedAny = true;
      }
    }

    const dateRes = resolveDateExpression(text, refDate);
    if (dateRes && (!collected.date || isCorrection || /(?:date|day|tomorrow|today|next)/i.test(text))) {
      collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
      collected.dateLabel = dateRes.label;
      extractedAny = true;
    }

    const timeRange = resolveTimeRange(text);
    if (timeRange) {
      collected.slotTime = timeRange.startTime;
      collected.endTime = timeRange.endTime;
      extractedAny = true;
    } else {
      const timeRes = resolveTimeExpression(text);
      if (timeRes && (!collected.slotTime || isCorrection || /(?:time|pm|am|at\s+\d)/i.test(text))) {
        collected.slotTime = timeRes;
        extractedAny = true;
      }
    }

    if (!collected.phone) {
      const phoneRes = extractPhoneNumber(text);
      if (phoneRes) {
        collected.phone = phoneRes;
        extractedAny = true;
      }
    }

    if (!collected.vehicleNumber) {
      const vehicleRes = extractVehicleNumber(text);
      if (vehicleRes) {
        collected.vehicleNumber = vehicleRes;
        extractedAny = true;
      }
    }

    // Archetype selection or update in follow-up turn (e.g. user selects "Cab / Auto", "Delivery", "Guest Pass", etc.)
    const pType = extractPassType(text);
    if (pType && (!collected.passType || isCorrection || pType !== collected.passType || /(?:change|switch|make that|instead)/i.test(text))) {
      collected.passType = pType;
      extractedAny = true;
    }

    if (collected.passType === 'CAB') {
      const cabProv = extractCabProvider(text);
      if (cabProv) {
        collected.vendor = cabProv;
        extractedAny = true;
      }
      if (!collected.visitorName) {
        collected.visitorName = collected.vendor ? `${collected.vendor} Driver` : 'Cab Driver';
      }
      if (!collected.date) {
        collected.date = formatDate(refDate);
        collected.dateLabel = 'Today';
      }
    } else if (collected.passType === 'DELIVERY') {
      const delPartner = extractDeliveryPartner(text);
      if (delPartner) {
        collected.deliveryPartner = delPartner;
        extractedAny = true;
      }
      if (!collected.visitorName) {
        collected.visitorName = collected.deliveryPartner ? `${collected.deliveryPartner} Delivery` : 'Delivery Partner';
      }
      if (!collected.date) {
        collected.date = formatDate(refDate);
        collected.dateLabel = 'Today';
      }
    } else if (collected.passType === 'SERVICE') {
      const srvCat = extractServiceCategory(text);
      if (srvCat) {
        collected.serviceCategory = srvCat;
        extractedAny = true;
      }
      const srvName = extractVisitorName(text);
      if (srvName) {
        collected.visitorName = collected.serviceCategory ? `${srvName} (${collected.serviceCategory})` : srvName;
        extractedAny = true;
      } else if (!collected.visitorName && collected.serviceCategory) {
        collected.visitorName = collected.serviceCategory;
      }
    } else if (collected.passType === 'GROUP' || collected.isGroupPass) {
      collected.isGroupPass = true;
      collected.passType = 'GROUP';
      const vInfo = extractVisitorPassIntentAndCount(text);
      if (vInfo.count > 1) {
        collected.visitorCount = vInfo.count;
        extractedAny = true;
      }
      const grpName = extractVisitorName(text);
      if (grpName) {
        collected.visitorName = grpName;
        extractedAny = true;
      }
    }

    if (extractedAny || (!directIntent || directIntent === INTENTS.VISITOR_MANAGEMENT || directIntent === INTENTS.VISITOR_PASS_CREATE)) {
      const missing = [];
      if (!collected.passType) {
        missing.push('passType');
      } else if (collected.passType === 'CAB' || collected.passType === 'DELIVERY') {
        if (!collected.date) missing.push('date');
        if (!collected.slotTime) missing.push('slotTime');
      } else {
        if (!collected.visitorName && (!collected.visitors || collected.visitors.length === 0)) missing.push('visitorName');
        if (!collected.date) missing.push('date');
        if (!collected.slotTime) missing.push('slotTime');
      }

      if (missing.length === 0) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      const nextQuestion = formatVisitorPassQuestion(collected, missing);

      return {
        activeIntent: INTENTS.VISITOR_MANAGEMENT,
        workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }
  }

  // 5. Multi-Turn Clarification within Personal Expense Workflow
  if (prev?.workflow === WORKFLOWS.EXPENSE_INTAKE || prev?.workflow === WORKFLOWS.EXPENSE_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    let extractedAny = false;

    if (!collected.amount) {
      const amount = extractExpenseAmount(text);
      if (amount) {
        collected.amount = amount;
        extractedAny = true;
      }
    }

    if (!collected.categoryId) {
      const cat = extractExpenseCategory(text);
      if (cat) {
        collected.categoryId = cat.id;
        collected.categoryName = cat.name;
        extractedAny = true;
      }
    }

    if (!collected.merchantOrSource) {
      const title = extractExpenseTitle(text);
      if (title) {
        collected.merchantOrSource = title;
        extractedAny = true;
      }
    }

    const missing = [];
    if (!collected.amount) missing.push('amount');

    if (missing.length === 0) {
      if (!collected.merchantOrSource) {
        collected.merchantOrSource = collected.categoryName || 'Personal Expense';
      }
      if (!collected.date) {
        collected.date = formatDate(refDate);
      }
      if (!collected.paymentMethod) {
        collected.paymentMethod = 'UPI';
      }
      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
        workflow: WORKFLOWS.EXPENSE_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
      workflow: WORKFLOWS.EXPENSE_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: formatExpenseIntakeQuestion(collected),
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 6. Multi-Turn Clarification within Complaint Intake Workflow
  if (prev?.workflow === WORKFLOWS.COMPLAINT_INTAKE || prev?.workflow === WORKFLOWS.COMPLAINT_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    const details = extractComplaintDetails(text, collected);

    if (details.title && !collected.title) collected.title = details.title;
    if (details.category && (!collected.category || collected.category === 'General')) collected.category = details.category;
    if (details.priority) collected.priority = details.priority;
    if (details.location) collected.location = details.location;
    if (details.description && !collected.description) collected.description = details.description;

    // Check if free text gave title or location
    if (!collected.title && text.trim().length > 3) {
      collected.title = text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
    }
    if (!collected.location) {
      const loc = extractIssueLocation(text);
      if (loc) collected.location = loc;
    }

    const missing = [];
    if (!collected.title) missing.push('title');

    if (missing.length === 0) {
      const summary = formatComplaintSummary(collected);
      return {
        activeIntent: INTENTS.COMPLAINT_CREATE,
        workflow: WORKFLOWS.COMPLAINT_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: `${summary}\n\nDo you want me to proceed with submitting this complaint? Please confirm!`,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.COMPLAINT_CREATE,
      workflow: WORKFLOWS.COMPLAINT_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: formatComplaintIntakeQuestion(collected),
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 6b. Multi-Turn Clarification within Maintenance Intake Workflow
  if (prev?.workflow === WORKFLOWS.MAINTENANCE_INTAKE || prev?.workflow === WORKFLOWS.MAINTENANCE_READY) {
    const collected = { ...(prev.collectedDetails || {}) };
    const details = extractMaintenanceDetails(text, collected, refDate);

    if (details.title && !collected.title) collected.title = details.title;
    if (details.category && (!collected.category || collected.category === 'General Maintenance')) collected.category = details.category;
    if (details.serviceType) {
      collected.serviceType = details.serviceType;
      if (details.serviceType.toLowerCase().includes('ac')) collected.trade = 'ac_service';
      else if (details.serviceType.toLowerCase().includes('electr')) collected.trade = 'electrician';
      else if (details.serviceType.toLowerCase().includes('plumb')) collected.trade = 'plumber';
      else if (details.serviceType.toLowerCase().includes('carpent')) collected.trade = 'carpenter';
      else collected.trade = details.serviceType;
    }
    if (details.priority) collected.priority = details.priority;
    if (details.location) collected.location = details.location;
    if (details.description) collected.description = details.description;
    if (details.preferredVisitDate) collected.preferredVisitDate = details.preferredVisitDate;
    if (details.preferredVisitTime) collected.preferredVisitTime = details.preferredVisitTime;

    // Check location from text
    const loc = extractIssueLocation(text);
    if (loc) collected.location = loc;

    // Handle corrections (e.g. "Actually, it is the bedroom AC, not the living-room AC")
    if (/actually|instead|correction/i.test(text)) {
      if (loc) collected.location = loc;
      if (text.length > 5) collected.description = text.trim();
    }

    const missing = [];
    if (!collected.title) missing.push('title');

    if (missing.length === 0) {
      const summary = formatMaintenanceSummary(collected);
      return {
        activeIntent: INTENTS.MAINTENANCE_CREATE,
        workflow: WORKFLOWS.MAINTENANCE_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: `${summary}\n\nDo you want me to proceed with booking this maintenance request? Please confirm!`,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.MAINTENANCE_CREATE,
      workflow: WORKFLOWS.MAINTENANCE_INTAKE,
      collectedDetails: collected,
      missingFields: missing,
      nextQuestion: formatMaintenanceIntakeQuestion(collected),
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 7. Multi-Turn Clarification within Complaint Cancellation Workflow
  if (prev?.workflow === WORKFLOWS.COMPLAINT_CANCEL_INTAKE) {
    const collected = { ...(prev.collectedDetails || {}) };
    const complaintId = extractComplaintId(text);
    if (complaintId) {
      collected.complaintId = complaintId;
    } else {
      const details = extractComplaintDetails(text);
      if (details.title) collected.title = details.title;
      else if (text.trim().length > 2) collected.title = text.trim();
    }

    if (collected.complaintId || collected.title) {
      return {
        activeIntent: INTENTS.COMPLAINT_CANCEL,
        workflow: WORKFLOWS.COMPLAINT_CANCEL_READY,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    return {
      activeIntent: INTENTS.COMPLAINT_CANCEL,
      workflow: WORKFLOWS.COMPLAINT_CANCEL_INTAKE,
      collectedDetails: collected,
      missingFields: ['complaintId'],
      nextQuestion: 'Please provide the ticket number (e.g. CMP-2026-000001) or issue description to cancel.',
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 8. Multi-Turn Clarification within Notice Creation Workflow
  if (prev?.workflow === WORKFLOWS.NOTICE_CREATE_INTAKE || prev?.workflow === WORKFLOWS.NOTICE_CREATE_READY) {
    const details = extractNoticeDetails(text);
    if (details.title && details.title !== 'Community Notice') {
      return {
        activeIntent: INTENTS.NOTICE_CREATE,
        workflow: WORKFLOWS.NOTICE_CREATE_READY,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }
    return {
      activeIntent: INTENTS.NOTICE_CREATE,
      workflow: WORKFLOWS.NOTICE_CREATE_INTAKE,
      collectedDetails: {},
      missingFields: ['title', 'description'],
      nextQuestion: formatNoticeIntakeQuestion(),
      interactionType: 'clarification',
      awaitingConfirmation: false,
    };
  }

  // 9. Fresh Intent Routing
  const targetIntent = directIntent || prev?.activeIntent || INTENTS.GENERAL_INQUIRY;
  return handleFreshIntent(targetIntent, text, refDate, user);
}

export function analyzeConversationTurn(message, previousState = null, history = [], referenceDate = null, userContext = null) {
  const result = _analyzeConversationTurnInternal(message, previousState, history, referenceDate, userContext);
  if (!result) return result;
  const withOptions = attachUniversalInteractiveOptions(result, userContext, history);
  return {
    actionConfirmed: false,
    actionCancelled: false,
    ...withOptions,
  };
}

/**
 * Handles initialization of a new intent
 */
function handleFreshIntent(intent, text, refDate, user = null) {
  switch (intent) {
    case INTENTS.RESIDENT_DUES: {
      const explicitLimit = extractRecordLimit(text, null);
      const invoiceNum = extractInvoiceNumber(text);
      const queryDetails = extractInvoiceQueryDetails(text);
      const collected = { ...queryDetails };
      if (explicitLimit) collected.limit = explicitLimit;
      if (invoiceNum) collected.invoiceNumber = invoiceNum;
      return {
        activeIntent: INTENTS.RESIDENT_DUES,
        workflow: null,
        collectedDetails: collected,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMMUNITY_FINANCE: {
      const monthMatch = text.match(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
      );
      const isAllTime = /\b(all|all time|overall|total|entire|complete|history)\b/i.test(text) && !monthMatch && !/\b(current|this)\s+month\b/i.test(text);
      const period = isAllTime ? 'all' : (monthMatch ? monthMatch[0] : 'current_month');
      return {
        activeIntent: INTENTS.COMMUNITY_FINANCE,
        workflow: null,
        collectedDetails: { period },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.PERSONAL_EXPENSE_CREATE: {
      const amount = extractExpenseAmount(text);
      const cat = extractExpenseCategory(text);
      const title = extractExpenseTitle(text);
      const dateRes = resolveDateExpression(text, refDate);
      const paymentMethod = extractPaymentMethod(text);

      const collected = {};
      if (amount) collected.amount = amount;
      if (cat) {
        collected.categoryId = cat.id;
        collected.categoryName = cat.name;
      }
      if (title) collected.merchantOrSource = title;
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
      } else {
        collected.date = formatDate(refDate);
        collected.dateLabel = 'Today';
      }
      if (paymentMethod) collected.paymentMethod = paymentMethod;
      else collected.paymentMethod = 'UPI';

      if (!collected.merchantOrSource && collected.categoryName) {
        collected.merchantOrSource = collected.categoryName;
      }

      const missing = [];
      if (!collected.amount) missing.push('amount');

      if (missing.length === 0) {
        if (!collected.merchantOrSource) collected.merchantOrSource = 'Personal Expense';
        return {
          activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
          workflow: WORKFLOWS.EXPENSE_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE_CREATE,
        workflow: WORKFLOWS.EXPENSE_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: 'How much was the expense? (e.g. ₹450)',
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.PERSONAL_EXPENSE: {
      const cat = extractExpenseCategory(text);
      const dateRes = resolveDateExpression(text, refDate);
      const details = {};
      if (cat) {
        details.categoryId = cat.id;
        details.categoryName = cat.name;
      }
      if (dateRes) {
        details.period = dateRes.label;
        details.startDate = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        details.endDate = dateRes.type === 'range' ? dateRes.endDate : dateRes.date;
      }
      if (/previous|last month/i.test(text)) {
        details.period = 'previous_month';
      } else if (/current|this month/i.test(text)) {
        details.period = 'current_month';
      }
      return {
        activeIntent: INTENTS.PERSONAL_EXPENSE,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.ASSESSMENT_CREATE: {
      const amtMatch = text.match(/(?:amount(?:\s+of)?|fee(?:\s+of)?|rs\.?|rupees|₹)\s*:?\s*(\d+)/i) ||
                       text.match(/(\d+)\s*(?:rupees|rs|amount)/i);
      const flatAmount = amtMatch ? Number(amtMatch[1]) : 0;

      let name = '';
      const nameMatch = text.match(/(?:name(?:d)?|title(?:d)?)\s+([A-Za-z0-9\s]+?)(?:\s+(?:amount|for|with|fee)|$)/i);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
      } else {
        const fallMatch = text.match(/(?:assestement|assessment)\s+(?:for\s+)?(?:the\s+)?(?:billing\s+and\s+invoice\s+page\s+)?(?:for\s+all\s+users\s+)?([A-Za-z0-9\s]+?)(?:\s+amount|$)/i);
        if (fallMatch && fallMatch[1]) {
          name = fallMatch[1].replace(/^(for\s+all\s+users|name)\s+/i, '').trim();
        }
      }

      if (!name) {
        name = 'Community Maintenance Assessment';
      } else {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      const collected = {
        name,
        flatAmount,
        billingCycle: 'MONTHLY',
        type: 'RECURRING',
        targetScopeType: 'ALL_COMMUNITY',
      };

      const missing = [];
      if (!flatAmount) missing.push('flatAmount');

      return {
        activeIntent: INTENTS.ASSESSMENT_CREATE,
        workflow: WORKFLOWS.ASSESSMENT_CREATE_READY,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: missing.length > 0 ? 'What is the maintenance assessment amount per unit/resident in INR?' : null,
        interactionType: missing.length > 0 ? 'clarification' : 'confirmation',
        awaitingConfirmation: missing.length === 0,
      };
    }

    case INTENTS.AMENITY_INQUIRY:
      return {
        activeIntent: INTENTS.AMENITY_INQUIRY,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };

    case INTENTS.AMENITY_AVAILABILITY: {
      const amenity = extractAmenityName(text);
      const dateRes = resolveDateExpression(text, refDate);
      return {
        activeIntent: INTENTS.AMENITY_AVAILABILITY,
        workflow: null,
        collectedDetails: {
          amenityName: amenity || null,
          date: dateRes ? (dateRes.type === 'range' ? dateRes.startDate : dateRes.date) : formatDate(refDate),
          dateLabel: dateRes ? dateRes.label : 'Today',
        },
        missingFields: amenity ? [] : ['amenityName'],
        nextQuestion: amenity ? null : `Which amenity would you like to check availability for${dateRes ? ` ${dateRes.label.toLowerCase()}` : ''}?`,
        interactionType: amenity ? 'answering' : 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.AMENITY_BOOKING: {
      if (user && !canUserBookAmenity(user)) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: 'unauthorized',
          collectedDetails: {},
          missingFields: [],
          nextQuestion: null,
          interactionType: 'permission_denied',
          awaitingConfirmation: false,
          denialReason: "You don't have permission to book amenities in this community. I can help you view existing amenities and their details if you wish.",
          permittedAlternatives: canUserDiscoverAmenities(user) ? ['discover_amenities'] : [],
        };
      }
      const allAmenities = extractAllAmenityNames(text);
      const isMultiple = allAmenities.length > 1;
      const amenity = extractAmenityName(text);
      const dateRes = resolveDateExpression(text, refDate);
      const timeRange = resolveTimeRange(text);
      const exactTime = timeRange ? timeRange.startTime : resolveTimeExpression(text, { exactOnly: true });
      const timePeriod = resolveTimePeriod(text);
      const headcount = extractHeadcount(text);
      const partInfo = extractBookingParticipants(text);

      const collected = {};
      if (amenity) collected.amenityName = amenity;
      if (headcount) collected.headcount = headcount;
      if (partInfo.names) {
        collected.participantNames = partInfo.names;
        if (!collected.headcount && partInfo.headcount) collected.headcount = partInfo.headcount;
      }
      if (isMultiple) collected.multipleAmenities = allAmenities;
      if (dateRes) {
        collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        collected.dateLabel = dateRes.label;
      }
      if (timeRange) {
        collected.slotTime = timeRange.startTime;
        collected.endTime = timeRange.endTime;
      } else if (exactTime) {
        collected.slotTime = exactTime;
      } else if (timePeriod) {
        collected.timePreference = timePeriod;
      }

      if (/(?:include|with)\s+(?:my\s+)?family\b/i.test(text)) {
        collected.includeFamily = true;
      }

      if (/(?:pay\s+via\s+wallet|from\s+wallet|use\s+(?:my\s+)?wallet)/i.test(text)) {
        collected.preferredPaymentMethod = 'WALLET';
      } else if (/(?:pay\s+online|online\s+payment|via\s+online|upi|gpay|phonepe|card)/i.test(text)) {
        collected.preferredPaymentMethod = 'ONLINE';
      }

      const missing = [];
      if (!collected.amenityName) missing.push('amenityName');
      if (!collected.date) missing.push('date');
      if (!collected.slotTime) missing.push('slotTime');

      if (missing.length === 0 && !isMultiple) {
        return {
          activeIntent: INTENTS.AMENITY_BOOKING,
          workflow: WORKFLOWS.AMENITY_BOOKING_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      let nextQuestion = formatAmenityBookingQuestion(collected, missing);
      if (isMultiple) {
        nextQuestion = `In NAHOM, amenity bookings are confirmed individually to verify court and facility availability. I'll help you book ${allAmenities[0]} first! For ${allAmenities[0]}, what time would you prefer${collected.dateLabel ? ` on ${collected.dateLabel.toLowerCase()}` : ''}${collected.headcount ? ` for ${collected.headcount} people` : ''}?`;
      }

      return {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion,
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.AMENITY_CREATE: {
      if (user && !canUserCreateAmenity(user)) {
        return {
          activeIntent: INTENTS.AMENITY_CREATE,
          workflow: 'unauthorized',
          collectedDetails: {},
          missingFields: [],
          nextQuestion: null,
          interactionType: 'permission_denied',
          awaitingConfirmation: false,
          denialReason: "You don't have permission to create amenities. I can help you discover available amenities and book one if your role allows it.",
          permittedAlternatives: canUserDiscoverAmenities(user) ? ['discover_amenities', ...(canUserBookAmenity(user) ? ['book_amenity'] : [])] : [],
        };
      }

      // Check if user just said "Create a new amenity" without specific name or details
      const isBarePrompt = /^(?:please\s+)?(?:create|add|new|setup)\s+(?:a\s+)?(?:new\s+)?(?:amenit(?:y|ies)?|amentit(?:y|ies)?|amenty|facility)[.!?]*$/i.test(text.trim());
      if (isBarePrompt) {
        return {
          activeIntent: INTENTS.AMENITY_CREATE,
          workflow: WORKFLOWS.AMENITY_CREATE_INTAKE,
          collectedDetails: {},
          missingFields: ['name', 'capacity'],
          nextQuestion: formatAmenityCreationQuestion({}),
          interactionType: 'clarification',
          awaitingConfirmation: false,
        };
      }

      const collected = extractAmenityCreationDetails(text);

      const missing = [];
      if (!collected.name) missing.push('name');

      if (missing.length === 0) {
        if (!collected.capacity) collected.capacity = 10;
        const summary = formatAmenityCreationSummary(collected);
        return {
          activeIntent: INTENTS.AMENITY_CREATE,
          workflow: WORKFLOWS.AMENITY_CREATE_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: summary,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.AMENITY_CREATE,
        workflow: WORKFLOWS.AMENITY_CREATE_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: formatAmenityCreationQuestion(collected),
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.POLL_CREATE: {
      const details = extractPollDetails(text);
      return {
        activeIntent: INTENTS.POLL_CREATE,
        workflow: WORKFLOWS.POLL_CREATE_READY,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.NOTICE_CREATE: {
      const details = extractNoticeDetails(text);
      const isBareNoticePrompt = /^(?:please\\s+)?(?:create|post|publish|issue|add|new)\\s+(?:a\\s+)?(?:new\\s+)?(?:notice|announcement|circular)[.!?]*$/i.test(text.trim());

      if (isBareNoticePrompt || !details.title || details.title === 'Community Notice') {
        return {
          activeIntent: INTENTS.NOTICE_CREATE,
          workflow: WORKFLOWS.NOTICE_CREATE_INTAKE,
          collectedDetails: {},
          missingFields: ['title', 'description'],
          nextQuestion: formatNoticeIntakeQuestion(),
          interactionType: 'clarification',
          awaitingConfirmation: false,
        };
      }

      return {
        activeIntent: INTENTS.NOTICE_CREATE,
        workflow: WORKFLOWS.NOTICE_CREATE_READY,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.AMENITY_CANCELLATION: {
      const amenity = extractAmenityName(text);
      const bookingIdMatch = text.match(/\b(BKG-?[A-Za-z0-9\-]+|[0-9a-f]{24})\b/i);
      const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;

      // Check if this is a cancellation policy / refund inquiry rather than cancellation request
      const isPolicyInquiry = /(?:what is the|tell me|show me|check)?\s*(?:cancellation|refund)\s*(?:policy|rules|charges|terms)/i.test(text) ||
                              /(?:can I get|is there|do I get|how much)\s*(?:a\s+)?refund/i.test(text) ||
                              /will\s+i\s+get\s+my\s+money\s+back/i.test(text) ||
                              /what\s+happens\s+if\s+i\s+cancel/i.test(text) ||
                              /how\s+much\s+will\s+i\s+receive\s+if\s+i\s+cancel/i.test(text);
      if (isPolicyInquiry) {
        return {
          activeIntent: INTENTS.AMENITY_INQUIRY,
          workflow: 'amenity_policy_inquiry',
          collectedDetails: { amenityName: amenity, inquiryType: 'cancellation_policy' },
          missingFields: amenity ? [] : ['amenityName'],
          nextQuestion: amenity ? null : 'Which amenity\'s cancellation policy would you like to check?',
          interactionType: amenity ? 'answering' : 'clarification',
          awaitingConfirmation: false,
        };
      }

      const dateRes = resolveDateExpression(text, refDate);
      const hasTarget = Boolean(amenity || bookingId);
      return {
        activeIntent: INTENTS.AMENITY_CANCELLATION,
        workflow: WORKFLOWS.AMENITY_CANCEL_READY,
        collectedDetails: {
          ...(amenity ? { amenityName: amenity } : {}),
          ...(bookingId ? { bookingId } : {}),
          ...(dateRes ? { date: dateRes.type === 'range' ? dateRes.startDate : dateRes.date, dateLabel: dateRes.label } : {}),
        },
        missingFields: hasTarget ? [] : ['amenityName'],
        nextQuestion: hasTarget ? `Are you sure you want to cancel your ${amenity || 'amenity'} booking${bookingId ? ` (ID: ${bookingId})` : ''}? Please confirm to proceed.` : 'Are you sure you want to cancel your booking? Please confirm to proceed.',
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.MY_BOOKINGS: {
      const dateRes = resolveDateExpression(text, refDate);
      const details = {};
      if (dateRes) {
        details.dateRangeLabel = dateRes.label;
        details.startDate = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
        details.endDate = dateRes.type === 'range' ? dateRes.endDate : dateRes.date;
      }
      return {
        activeIntent: INTENTS.MY_BOOKINGS,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINT_CREATE: {
      const isBare = /^(?:(?:please\s+)?(?:raise|file|lodge|create|new|submit|register)\s+(?:an?\s+)?(?:complaint|ticket|issue))[.!?]*$/i.test(text.trim());
      const details = extractComplaintDetails(text);
      const collected = {};
      if (!isBare && details.title) collected.title = details.title;
      if (details.category && details.category !== 'General') collected.category = details.category;
      if (details.priority) collected.priority = details.priority;
      if (details.location) collected.location = details.location;
      if (!isBare && details.description) collected.description = details.description;

      const missing = [];
      if (!collected.category) missing.push('category');
      if (!collected.title) missing.push('title');

      if (missing.length === 0) {
        const summary = formatComplaintSummary(collected);
        return {
          activeIntent: INTENTS.COMPLAINT_CREATE,
          workflow: WORKFLOWS.COMPLAINT_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: `${summary}\n\nDo you want me to proceed with submitting this complaint? Please confirm!`,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.COMPLAINT_CREATE,
        workflow: WORKFLOWS.COMPLAINT_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: formatComplaintIntakeQuestion(collected),
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.MAINTENANCE_CREATE: {
      const isBare = /^(?:(?:please\s+)?(?:book|request|need|schedule)\s+maintenance(?:\s+service)?|(?:i\s+)?need\s+a\s+technician(?:(?:\s+for)?\s+maintenance)?|call\s+a\s+technician)[.!?]*$/i.test(text.trim());
      const details = extractMaintenanceDetails(text, {}, refDate);
      const collected = {};
      if (!isBare && details.title) collected.title = details.title;
      if (details.category && details.category !== 'General Maintenance') collected.category = details.category;
      if (details.serviceType) collected.serviceType = details.serviceType;
      if (details.priority) collected.priority = details.priority;
      if (details.location) collected.location = details.location;
      if (!isBare && details.description) collected.description = details.description;
      if (details.preferredVisitDate) collected.preferredVisitDate = details.preferredVisitDate;
      if (details.preferredVisitTime) collected.preferredVisitTime = details.preferredVisitTime;

      const missing = [];
      if (!collected.serviceType && !collected.trade && (!collected.category || collected.category === 'General Maintenance')) missing.push('trade');
      if (!collected.title) missing.push('title');

      if (missing.length === 0) {
        const summary = formatMaintenanceSummary(collected);
        return {
          activeIntent: INTENTS.MAINTENANCE_CREATE,
          workflow: WORKFLOWS.MAINTENANCE_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: `${summary}\n\nDo you want me to proceed with booking this maintenance request? Please confirm!`,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.MAINTENANCE_CREATE,
        workflow: WORKFLOWS.MAINTENANCE_INTAKE,
        collectedDetails: collected,
        missingFields: missing,
        nextQuestion: formatMaintenanceIntakeQuestion(collected),
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINT_ESCALATE: {
      const complaintId = extractComplaintId(text);
      const collected = {};
      if (complaintId) collected.complaintId = complaintId;

      return {
        activeIntent: INTENTS.COMPLAINT_ESCALATE,
        workflow: complaintId ? WORKFLOWS.COMPLAINT_ESCALATE_READY : WORKFLOWS.COMPLAINTS_HELPDESK,
        collectedDetails: collected,
        missingFields: complaintId ? [] : ['complaintId'],
        nextQuestion: complaintId
          ? `Would you like me to escalate ticket #${complaintId} to Community Administration? Please confirm!`
          : 'Which complaint or ticket number would you like to escalate? (e.g. CMP-2026-000001)',
        interactionType: complaintId ? 'confirmation' : 'clarification',
        awaitingConfirmation: Boolean(complaintId),
      };
    }

    case INTENTS.COMPLAINT_REOPEN: {
      const complaintId = extractComplaintId(text);
      const collected = {};
      if (complaintId) collected.complaintId = complaintId;
      collected.reason = text.trim();

      return {
        activeIntent: INTENTS.COMPLAINT_REOPEN,
        workflow: complaintId ? WORKFLOWS.COMPLAINT_REOPEN_READY : WORKFLOWS.COMPLAINTS_HELPDESK,
        collectedDetails: collected,
        missingFields: complaintId ? [] : ['complaintId'],
        nextQuestion: complaintId
          ? `Would you like me to reopen ticket #${complaintId} so the technician can address what was not fixed? Please confirm!`
          : 'Which ticket number would you like to reopen? (e.g. CMP-2026-000001)',
        interactionType: complaintId ? 'confirmation' : 'clarification',
        awaitingConfirmation: Boolean(complaintId),
      };
    }

    case INTENTS.COMPLAINT_CANCEL: {
      const complaintId = extractComplaintId(text);
      const details = extractComplaintDetails(text);
      const collected = {};
      if (complaintId) collected.complaintId = complaintId;
      if (details.title) collected.title = details.title;

      if (collected.complaintId || collected.title) {
        return {
          activeIntent: INTENTS.COMPLAINT_CANCEL,
          workflow: WORKFLOWS.COMPLAINT_CANCEL_READY,
          collectedDetails: collected,
          missingFields: [],
          nextQuestion: null,
          interactionType: 'confirmation',
          awaitingConfirmation: true,
        };
      }

      return {
        activeIntent: INTENTS.COMPLAINT_CANCEL,
        workflow: WORKFLOWS.COMPLAINT_CANCEL_INTAKE,
        collectedDetails: collected,
        missingFields: ['complaintId'],
        nextQuestion: 'Please provide the ticket number (e.g. CMP-2026-000001) or issue description to cancel.',
        interactionType: 'clarification',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.COMPLAINTS_HELPDESK: {
      const complaintId = extractComplaintId(text);
      const details = {};
      if (complaintId) details.complaintId = complaintId;
      if (/(resolved|closed)/i.test(text)) details.status = 'Resolved';
      else if (/(in progress|assigned)/i.test(text)) details.status = 'In Progress';
      else if (/(open|pending)/i.test(text)) details.status = 'Open';

      return {
        activeIntent: INTENTS.COMPLAINTS_HELPDESK,
        workflow: null,
        collectedDetails: details,
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.VISITOR_MANAGEMENT: {
      const isInformational = /^(how\s+(do|can|to)|where\s+(can|do|to)|can\s+i|what\s+is\s+the\s+process)/i.test(text.trim());
      if (isInformational) {
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: null,
          collectedDetails: {},
          missingFields: [],
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        };
      }

      const isRevokeRequest = /(cancel|revoke|delete|remove)\s+.*(visitor|guest|visitor pass|pass)/i.test(text);
      if (isRevokeRequest) {
        const vName = extractVisitorName(text);
        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: vName ? WORKFLOWS.VISITOR_REVOKE_READY : WORKFLOWS.VISITOR_REVOKE_INTAKE,
          collectedDetails: vName ? { visitorName: vName } : {},
          missingFields: vName ? [] : ['visitorName'],
          nextQuestion: vName ? null : "Which visitor pass would you like to revoke? (Please provide the visitor's name)",
          interactionType: vName ? 'confirmation' : 'clarification',
          awaitingConfirmation: Boolean(vName),
        };
      }

      const isCreateRequest =
        /^(?:please\s+)?(?:invite|pass\s+for|passes\s+for)\b/i.test(text.trim()) ||
        /(create|new|generate|issue|make|book|invite|register)\s+.*(pass|entry|visitor|guest)/i.test(text) ||
        /\b(?:cab|auto|taxi|uber|ola|delivery|courier|swiggy|zomato|amazon|service|staff|group|guest)\s+pass(?:es)?\b/i.test(text) ||
        /\bgroup\s+visit\b/i.test(text) ||
        /create.*pass/i.test(text) ||
        /invite.*guest/i.test(text) ||
        /register\s+[a-z]+/i.test(text) ||
        /invite/i.test(text);

      if (isCreateRequest) {
        if (user && !canUserCreateVisitorPass(user)) {
          return {
            activeIntent: INTENTS.VISITOR_MANAGEMENT,
            workflow: 'unauthorized',
            collectedDetails: {},
            missingFields: [],
            nextQuestion: null,
            interactionType: 'permission_denied',
            awaitingConfirmation: false,
            denialReason: "You don't have permission to create visitor passes.",
          };
        }

        const vInfo = extractVisitorPassIntentAndCount(text);
        if (vInfo.isInfo) {
          return {
            activeIntent: INTENTS.VISITOR_MANAGEMENT,
            workflow: null,
            collectedDetails: { isInfo: true, visitorCount: vInfo.count },
            missingFields: [],
            nextQuestion: null,
            interactionType: 'answering',
            awaitingConfirmation: false,
          };
        }

        const passType = extractPassType(text);
        const multVisitors = extractMultipleVisitors(text);
        const vName = extractVisitorName(text);
        const dateRes = resolveDateExpression(text, refDate);
        const timeRange = resolveTimeRange(text);
        const timeRes = resolveTimeExpression(text, { refDate });
        const phone = extractPhoneNumber(text);
        const vehicle = extractVehicleNumber(text);

        // Generic Creation Query: When the user asks generically (e.g. "Create a visitor pass", "New invite")
        // without specifying a pass archetype, visitor name, or timing, prompt with the 5 invitation options.
        if (!passType && !vName && multVisitors.length === 0 && !dateRes && !timeRange && !timeRes && !phone && !vehicle) {
          return {
            activeIntent: INTENTS.VISITOR_MANAGEMENT,
            workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
            collectedDetails: {},
            missingFields: ['passType'],
            options: VISITOR_INVITATION_OPTIONS,
            nextQuestion: formatVisitorPassQuestion({}, ['passType']),
            interactionType: 'clarification',
            awaitingConfirmation: false,
          };
        }

        const collected = {};
        collected.passType = passType || (multVisitors.length > 1 ? 'GROUP' : 'GUEST');

        if (collected.passType === 'CAB') {
          const provider = extractCabProvider(text) || 'Cab';
          collected.vendor = provider;
          collected.visitorName = vName || `${provider} Driver`;
          if (vehicle) collected.vehicleNumber = vehicle;
          if (dateRes) {
            collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
            collected.dateLabel = dateRes.label;
          } else {
            collected.date = formatDate(refDate);
            collected.dateLabel = 'Today';
          }
          if (timeRange) {
            collected.slotTime = timeRange.startTime;
            collected.endTime = timeRange.endTime;
          } else if (timeRes) {
            collected.slotTime = timeRes;
          }
        } else if (collected.passType === 'DELIVERY') {
          const partner = extractDeliveryPartner(text) || 'Delivery Partner';
          collected.deliveryPartner = partner;
          collected.visitorName = vName || `${partner} Delivery`;
          if (dateRes) {
            collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
            collected.dateLabel = dateRes.label;
          } else {
            collected.date = formatDate(refDate);
            collected.dateLabel = 'Today';
          }
          if (timeRange) {
            collected.slotTime = timeRange.startTime;
            collected.endTime = timeRange.endTime;
          } else if (timeRes) {
            collected.slotTime = timeRes;
          }
        } else if (collected.passType === 'SERVICE') {
          const srvCat = extractServiceCategory(text) || 'Staff';
          collected.serviceCategory = srvCat;
          collected.visitorName = vName ? `${vName} (${srvCat})` : srvCat;
          if (dateRes) {
            collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
            collected.dateLabel = dateRes.label;
          }
          if (timeRange) {
            collected.slotTime = timeRange.startTime;
            collected.endTime = timeRange.endTime;
          } else if (timeRes) {
            collected.slotTime = timeRes;
          }
        } else if (collected.passType === 'GROUP' || multVisitors.length > 1 || vInfo.count > 1) {
          collected.isGroupPass = true;
          collected.passType = 'GROUP';
          if (multVisitors.length > 1) {
            collected.visitors = multVisitors;
            collected.visitorCount = multVisitors.length;
            collected.visitorName = multVisitors.map(v => v.name).join(', ');
          } else if (vName) {
            collected.visitorName = vName;
            collected.visitorCount = vInfo.count > 1 ? vInfo.count : 2;
          } else if (vInfo.count > 1) {
            collected.visitorCount = vInfo.count;
            if (/\b(group\s+pass|group\s+visit)\b/i.test(text)) {
              collected.visitorName = `${collected.visitorCount} Guests`;
            }
          }
          if (dateRes) {
            collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
            collected.dateLabel = dateRes.label;
          }
          if (timeRange) {
            collected.slotTime = timeRange.startTime;
            collected.endTime = timeRange.endTime;
          } else if (timeRes) {
            collected.slotTime = timeRes;
          }
        } else {
          // Standard single GUEST pass
          if (vName) collected.visitorName = vName;
          if (dateRes) {
            collected.date = dateRes.type === 'range' ? dateRes.startDate : dateRes.date;
            collected.dateLabel = dateRes.label;
          }
          if (timeRange) {
            collected.slotTime = timeRange.startTime;
            collected.endTime = timeRange.endTime;
          } else if (timeRes) {
            collected.slotTime = timeRes;
          }
        }

        if (phone) collected.phone = phone;
        if (vehicle && !collected.vehicleNumber) collected.vehicleNumber = vehicle;

        const missing = [];
        if (collected.passType === 'CAB' || collected.passType === 'DELIVERY') {
          if (!collected.date) missing.push('date');
          if (!collected.slotTime) missing.push('slotTime');
        } else {
          if (!collected.visitorName && (!collected.visitors || collected.visitors.length === 0)) missing.push('visitorName');
          if (!collected.date) missing.push('date');
          if (!collected.slotTime) missing.push('slotTime');
        }

        if (missing.length === 0) {
          return {
            activeIntent: INTENTS.VISITOR_MANAGEMENT,
            workflow: WORKFLOWS.VISITOR_PASS_READY,
            collectedDetails: collected,
            missingFields: [],
            nextQuestion: null,
            interactionType: 'confirmation',
            awaitingConfirmation: true,
          };
        }

        const nextQuestion = formatVisitorPassQuestion(collected, missing);

        return {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
          collectedDetails: collected,
          missingFields: missing,
          nextQuestion,
          interactionType: 'clarification',
          awaitingConfirmation: false,
        };
      }

      // Read query (e.g. "Who visited today?", "Show my visitor passes")
      return {
        activeIntent: INTENTS.VISITOR_MANAGEMENT,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.WALLET_BALANCE: {
      return {
        activeIntent: INTENTS.WALLET_BALANCE,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.WALLET_TRANSACTIONS: {
      const explicitLimit = extractRecordLimit(text, 5);
      return {
        activeIntent: INTENTS.WALLET_TRANSACTIONS,
        workflow: null,
        collectedDetails: { limit: explicitLimit },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.NOTIFICATIONS: {
      const explicitLimit = extractRecordLimit(text, 5);
      const unreadOnly = /unread/i.test(text);
      return {
        activeIntent: INTENTS.NOTIFICATIONS,
        workflow: null,
        collectedDetails: { limit: explicitLimit, unreadOnly },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.NOTIFICATIONS_MARK_READ: {
      return {
        activeIntent: INTENTS.NOTIFICATIONS_MARK_READ,
        workflow: null,
        collectedDetails: { markAll: true },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.EMERGENCY_CONTACTS: {
      let category = '';
      if (/security|guard/i.test(text)) category = 'security';
      else if (/management|office/i.test(text)) category = 'management';
      else if (/medical|ambulance|doctor/i.test(text)) category = 'medical';
      else if (/fire/i.test(text)) category = 'fire';
      return {
        activeIntent: INTENTS.EMERGENCY_CONTACTS,
        workflow: null,
        collectedDetails: { category },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.ISSUE_REPORTS_LIST: {
      const explicitLimit = extractRecordLimit(text, 5);
      return {
        activeIntent: INTENTS.ISSUE_REPORTS_LIST,
        workflow: null,
        collectedDetails: { limit: explicitLimit },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    case INTENTS.ISSUE_REPORT_CREATE: {
      const isBare = /^(?:please\s+)?(?:report|submit)\s+(?:an?\s+)?(?:issue|bug|problem)[.!?]*$/i.test(text.trim());
      const titleMatch = text.replace(/^(?:please\s+)?(?:report|submit|file|lodge)\s+(?:an?\s+)?(?:bug|issue|problem)[:\s-]*/i, '').trim();
      const title = !isBare && titleMatch.length > 3 ? titleMatch : null;
      if (!title) {
        return {
          activeIntent: INTENTS.ISSUE_REPORT_CREATE,
          workflow: 'issue_report_intake',
          collectedDetails: {},
          missingFields: ['title'],
          nextQuestion: 'What issue or bug would you like to report to engineering support? Please provide a brief title or description.',
          interactionType: 'clarification',
          awaitingConfirmation: false,
        };
      }
      return {
        activeIntent: INTENTS.ISSUE_REPORT_CREATE,
        workflow: 'issue_report_ready',
        collectedDetails: { title, description: title, feature: 'GENERAL', reportType: /feature/i.test(text) ? 'FEATURE_REQUEST' : 'BUG' },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'confirmation',
        awaitingConfirmation: true,
      };
    }

    case INTENTS.AI_FEEDBACK: {
      let rating = 5;
      const numMatch = text.match(/\b([1-5])\s*(?:stars?|\/5)?\b/i);
      if (numMatch) rating = parseInt(numMatch[1], 10);
      else if (/bad|poor|terrible|wrong|useless/i.test(text)) rating = 1;
      else if (/good|great|awesome|helpful|nice/i.test(text)) rating = 5;

      return {
        activeIntent: INTENTS.AI_FEEDBACK,
        workflow: null,
        collectedDetails: { rating, feedback: text },
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
    }

    default:
      return {
        activeIntent: INTENTS.GENERAL_INQUIRY,
        workflow: null,
        collectedDetails: {},
        missingFields: [],
        nextQuestion: null,
        interactionType: 'answering',
        awaitingConfirmation: false,
      };
  }
}

/**
 * Universal Interactive Options Engine
 * Attaches structured selectable options, multi-select configuration, and selection states
 * across all 11 NAHOM feature modules.
 */
export function attachUniversalInteractiveOptions(state, userContext = null, history = []) {
  if (!state || typeof state !== 'object') return state;

  let options = Array.isArray(state.options) && state.options.length > 0 ? [...state.options] : null;
  let interactiveConfig = state.interactiveConfig ? { ...state.interactiveConfig } : null;

  const user = userContext?.user || (userContext && typeof userContext === 'object' && ('role' in userContext || 'permissions' in userContext) ? userContext : null);
  const collected = state.collectedDetails || {};
  const missing = Array.isArray(state.missingFields) ? state.missingFields : [];

  // 1. Awaiting Confirmation Options
  if (state.awaitingConfirmation) {
    options = INTERACTIVE_OPTION_SETS.ACTION_CONFIRMATIONS.map((opt) => ({ ...opt }));
    interactiveConfig = {
      mode: 'single',
      targetField: 'confirmation',
      allowDeselect: false,
      allowCustomText: true,
      title: 'Ready to submit:',
    };
  }

  // 2. Visitor Management
  else if (state.activeIntent === INTENTS.VISITOR_PASS_CREATE || state.activeIntent === INTENTS.VISITOR_MANAGEMENT) {
    if (missing.includes('passType') || !collected.passType) {
      options = INTERACTIVE_OPTION_SETS.VISITOR_INVITATION.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'passType',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Invitation Type:',
        customPlaceholder: 'Or describe your visitor...',
      };
    } else if (missing.includes('slotTime') || !collected.slotTime) {
      options = INTERACTIVE_OPTION_SETS.ARRIVAL_TIME_PRESETS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'slotTime',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Choose Arrival Time:',
      };
    } else if (collected.passType === 'CAB' && (missing.includes('vendor') || !collected.vendor)) {
      options = INTERACTIVE_OPTION_SETS.CAB_PROVIDERS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'vendor',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Cab Provider:',
      };
    } else if (collected.passType === 'DELIVERY' && (missing.includes('vendor') || !collected.deliveryPartner)) {
      options = INTERACTIVE_OPTION_SETS.DELIVERY_PARTNERS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'vendor',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Delivery Partner:',
      };
    } else if (collected.passType === 'SERVICE' && (missing.includes('serviceCategory') || !collected.serviceCategory)) {
      options = INTERACTIVE_OPTION_SETS.SERVICE_CATEGORIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'serviceCategory',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Service Type:',
      };
    }
  }

  // 3. Amenity Creation
  else if (state.activeIntent === INTENTS.AMENITY_CREATE) {
    if (missing.includes('facilities')) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_FACILITIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'multiple',
        targetField: 'facilities',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Facilities (Multiple allowed):',
      };
    } else if (missing.includes('cancellationPolicy') || (missing.length === 0 && !collected.cancellationPolicy && collected.pricingType)) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_CANCELLATION_POLICIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'cancellationPolicy',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Cancellation Policy:',
      };
    } else if (missing.includes('slotDuration') || (missing.length === 0 && !collected.slotDuration && collected.pricingType)) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_SLOT_DURATIONS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'slotDuration',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Slot Duration:',
      };
    } else if (missing.includes('pricing') || missing.includes('pricingType') || (missing.length === 0 && !collected.pricingType && collected.category)) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_PRICING.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'pricingType',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Choose Pricing Model:',
      };
    } else {
      options = INTERACTIVE_OPTION_SETS.AMENITY_CATEGORIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'category',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Amenity Category:',
      };
    }
  }

  // 4. Amenity Booking
  else if (state.activeIntent === INTENTS.AMENITY_BOOKING) {
    if (missing.includes('amenityName') || !collected.amenityName) {
      const dynamicAmenities = Array.isArray(state.presentedAmenities) && state.presentedAmenities.length > 0
        ? state.presentedAmenities.map((name, i) => ({
            id: `amenity_${i}`,
            value: name,
            label: name,
            badge: 'Facility',
          }))
        : [];
      options = dynamicAmenities;
      if (options.length > 0) {
        interactiveConfig = {
          mode: 'single',
          targetField: 'amenityName',
          allowDeselect: true,
          allowCustomText: true,
          title: 'Select Amenity to Book:',
        };
      }
    } else if (missing.includes('date') || !collected.date) {
      options = INTERACTIVE_OPTION_SETS.DATE_PRESETS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'date',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Date:',
      };
    } else if (missing.includes('slotTime') || !collected.slotTime) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_TIME_SLOTS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'slotTime',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Time Slot:',
      };
    } else if (missing.includes('headcount') || missing.includes('participants')) {
      options = INTERACTIVE_OPTION_SETS.PARTICIPANTS_PRESETS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'headcount',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Headcount:',
      };
    } else if (missing.includes('paymentMethod') || (!collected.preferredPaymentMethod && missing.includes('payment'))) {
      options = INTERACTIVE_OPTION_SETS.PAYMENT_METHODS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'paymentMethod',
        allowDeselect: true,
        allowCustomText: false,
        title: 'Choose Payment Method:',
      };
    }
  }

  // 5. Complaints
  else if (state.activeIntent === INTENTS.COMPLAINT_CREATE) {
    if (missing.includes('category') || !collected.category) {
      options = INTERACTIVE_OPTION_SETS.COMPLAINT_CATEGORIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'category',
        allowDeselect: true,
        allowCustomText: true,
        title: 'What type of complaint would you like to raise?',
        customPlaceholder: 'Or describe your issue...',
      };
    } else if (missing.includes('priority') || !collected.priority) {
      options = INTERACTIVE_OPTION_SETS.COMPLAINT_PRIORITIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'priority',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Urgency / Priority:',
      };
    } else if (missing.includes('location') || !collected.location) {
      options = INTERACTIVE_OPTION_SETS.LOCATION_PRESETS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'location',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Location in Unit:',
      };
    }
  }

  // 6. Maintenance
  else if (state.activeIntent === INTENTS.MAINTENANCE_CREATE) {
    if (missing.includes('trade') || !collected.trade) {
      options = INTERACTIVE_OPTION_SETS.MAINTENANCE_TRADES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'trade',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Maintenance Service:',
        customPlaceholder: 'Or type custom service needed...',
      };
    } else if (missing.includes('date') || !collected.date) {
      options = INTERACTIVE_OPTION_SETS.DATE_PRESETS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'date',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Preferred Service Date:',
      };
    } else if (missing.includes('slotTime') || !collected.slotTime) {
      options = INTERACTIVE_OPTION_SETS.AMENITY_TIME_SLOTS.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'slotTime',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Preferred Time Slot:',
      };
    }
  }

  // 7. Community Finance
  else if (state.activeIntent === INTENTS.COMMUNITY_FINANCE && (!user || canUserViewCommunityFinance(user))) {
    options = INTERACTIVE_OPTION_SETS.FINANCE_PERIODS.map((opt) => ({ ...opt }));
    interactiveConfig = {
      mode: 'single',
      targetField: 'period',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Select Accounting Period:',
    };
  }

  // 8. Resident Dues
  else if (state.activeIntent === INTENTS.RESIDENT_DUES) {
    options = INTERACTIVE_OPTION_SETS.FINANCE_VIEWS.map((opt) => ({ ...opt }));
    interactiveConfig = {
      mode: 'single',
      targetField: 'view',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Select Breakdown View:',
    };
  }

  // 9. Personal Expenses
  else if (state.activeIntent === INTENTS.PERSONAL_EXPENSE_CREATE) {
    if (missing.includes('category') || !collected.categoryName) {
      options = INTERACTIVE_OPTION_SETS.PERSONAL_EXPENSE_CATEGORIES.map((opt) => ({ ...opt }));
      interactiveConfig = {
        mode: 'single',
        targetField: 'category',
        allowDeselect: true,
        allowCustomText: true,
        title: 'Select Expense Category:',
      };
    }
  }

  // 10. Staff Directory
  else if (state.activeIntent === INTENTS.STAFF_DIRECTORY) {
    options = INTERACTIVE_OPTION_SETS.STAFF_DEPARTMENTS.map((opt) => ({ ...opt }));
    interactiveConfig = {
      mode: 'single',
      targetField: 'department',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Filter Staff Department:',
    };
  }

  // 11. Notifications
  else if (state.activeIntent === INTENTS.NOTIFICATIONS) {
    options = INTERACTIVE_OPTION_SETS.NOTIFICATION_FILTERS.map((opt) => ({ ...opt }));
    interactiveConfig = {
      mode: 'single',
      targetField: 'filter',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Filter Notifications:',
    };
  }

  // Mark selected status
  if (options && interactiveConfig) {
    const targetField = interactiveConfig.targetField;
    const isMulti = interactiveConfig.mode === 'multiple';
    const currentVal = collected[targetField] !== undefined
      ? collected[targetField]
      : (targetField === 'paymentMethod' ? collected.preferredPaymentMethod : undefined);

    const selectedValues = [];
    options = options.map((opt) => {
      let isSelected = false;
      if (isMulti) {
        const arr = Array.isArray(currentVal) ? currentVal : [];
        isSelected = arr.some((v) => String(v).toLowerCase() === String(opt.value).toLowerCase() || String(v).toLowerCase() === String(opt.label).toLowerCase());
      } else if (currentVal !== undefined && currentVal !== null) {
        const valStr = String(currentVal).toLowerCase();
        isSelected =
          valStr === String(opt.value).toLowerCase() ||
          valStr === String(opt.label).toLowerCase() ||
          valStr === String(opt.id).toLowerCase();
      }
      if (isSelected) selectedValues.push(opt.value || opt.id);
      return {
        ...opt,
        id: opt.id || opt.value || opt.type,
        value: opt.value || opt.type || opt.id,
        label: opt.label || opt.title,
        description: opt.description || opt.subtitle || null,
        badge: opt.badge || opt.badgeText || null,
        selected: isSelected,
      };
    });

    interactiveConfig.selectedValues = selectedValues;
  }

  return {
    ...state,
    ...(options ? { options } : {}),
    ...(interactiveConfig ? { interactiveConfig } : {}),
    selectedOptions: interactiveConfig?.targetField ? { [interactiveConfig.targetField]: interactiveConfig.selectedValues } : {},
  };
}

/**
 * Sanitizes and bounds conversation state object received from client or memory.
 * Defends against prototype pollution, oversized strings, and invalid types.
 */
export function sanitizeConversationState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {
      activeIntent: null,
      workflow: null,
      collectedDetails: {},
      missingFields: [],
      nextQuestion: null,
      interactionType: 'answering',
      awaitingConfirmation: false,
      actionConfirmed: false,
      actionCancelled: false,
      pendingAction: null,
    };
  }

  const cleanString = (val, maxLen = 200) => {
    if (typeof val !== 'string') return null;
    return val.trim().slice(0, maxLen);
  };

  const activeIntent = cleanString(state.activeIntent, 50);
  const workflow = cleanString(state.workflow, 50);
  const nextQuestion = cleanString(state.nextQuestion, 300);

  let interactionType = 'answering';
  if (['answering', 'clarification', 'confirmation', 'navigating', 'executing'].includes(state.interactionType)) {
    interactionType = state.interactionType;
  }

  const awaitingConfirmation = Boolean(state.awaitingConfirmation);
  const actionConfirmed = Boolean(state.actionConfirmed);
  const actionCancelled = Boolean(state.actionCancelled);

  const presentedAmenities = Array.isArray(state.presentedAmenities)
    ? state.presentedAmenities.map((a) => cleanString(a, 60)).filter(Boolean).slice(0, 10)
    : [];

  const missingFields = Array.isArray(state.missingFields)
    ? state.missingFields.map((f) => cleanString(f, 50)).filter(Boolean).slice(0, 10)
    : [];

  const rawDetails = state.collectedDetails && typeof state.collectedDetails === 'object' ? state.collectedDetails : {};
  const collectedDetails = {};
  for (const [k, v] of Object.entries(rawDetails)) {
    if (k.length > 50) continue;
    if (typeof v === 'string') {
      collectedDetails[k] = cleanString(v, 200);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      collectedDetails[k] = v;
    } else if (Array.isArray(v)) {
      collectedDetails[k] = v.map((item) => (typeof item === 'string' ? cleanString(item, 100) : item));
    }
  }

  let pendingAction = null;
  if (state.pendingAction && typeof state.pendingAction === 'object') {
    pendingAction = {
      id: cleanString(state.pendingAction.id || state.pendingAction.actionId, 80),
      actionType: cleanString(state.pendingAction.actionType, 60),
      summary: cleanString(state.pendingAction.summary, 200),
      confirmationToken: cleanString(state.pendingAction.confirmationToken, 200),
      expiresAt: typeof state.pendingAction.expiresAt === 'number' ? state.pendingAction.expiresAt : null,
      cancelled: Boolean(state.pendingAction.cancelled),
    };
  }

  const options = Array.isArray(state.options)
    ? state.options.map((opt) => ({
        id: cleanString(opt.id || opt.value || opt.type, 40),
        type: cleanString(opt.type || opt.id, 30),
        value: cleanString(opt.value || opt.type || opt.id, 40),
        label: cleanString(opt.label || opt.title, 80),
        description: cleanString(opt.description || opt.subtitle, 160),
        badge: cleanString(opt.badge || opt.badgeText, 40),
        selected: Boolean(opt.selected),
      })).slice(0, 15)
    : undefined;

  const interactiveConfig = state.interactiveConfig && typeof state.interactiveConfig === 'object'
    ? {
        mode: state.interactiveConfig.mode === 'multiple' ? 'multiple' : 'single',
        targetField: cleanString(state.interactiveConfig.targetField, 40),
        allowDeselect: state.interactiveConfig.allowDeselect !== false,
        allowCustomText: state.interactiveConfig.allowCustomText !== false,
        customPlaceholder: cleanString(state.interactiveConfig.customPlaceholder, 80),
        title: cleanString(state.interactiveConfig.title, 100),
        selectedValues: Array.isArray(state.interactiveConfig.selectedValues)
          ? state.interactiveConfig.selectedValues.map((v) => cleanString(v, 40))
          : [],
      }
    : undefined;

  const selectedOptions = state.selectedOptions && typeof state.selectedOptions === 'object'
    ? state.selectedOptions
    : undefined;

  return {
    activeIntent,
    workflow,
    collectedDetails,
    missingFields,
    nextQuestion,
    interactionType,
    awaitingConfirmation,
    actionConfirmed,
    actionCancelled,
    pendingAction,
    presentedAmenities,
    ...(options ? { options } : {}),
    ...(interactiveConfig ? { interactiveConfig } : {}),
    ...(selectedOptions ? { selectedOptions } : {}),
  };
}

/**
 * Builds a prompt guidance block summarizing the active multi-turn context
 * for injection into the model's systemInstruction.
 */
export function buildPromptContextInstruction(state, referenceDate = null) {
  const refDate = getReferenceDate(referenceDate);
  const todayStr = formatDate(refDate);
  const dayName = refDate.toLocaleDateString('en-US', { weekday: 'long' });

  let text = `Current Date Context: Today is ${dayName}, ${todayStr} (Timezone: Asia/Kolkata).\n`;

  if (state?.activeIntent) {
    text += `Active Conversation Intent: "${state.activeIntent}"\n`;
  }
  if (state?.workflow) {
    text += `Active Workflow: "${state.workflow}"\n`;
  }
  if (state?.collectedDetails && Object.keys(state.collectedDetails).length > 0) {
    text += `Collected Workflow Details: ${JSON.stringify(state.collectedDetails)}\n`;
  }
  if (state?.pendingAction?.summary) {
    text += `Pending Action Summary: "${state.pendingAction.summary}" (ID: ${state.pendingAction.id})\n`;
  }
  if (state?.missingFields && state.missingFields.length > 0) {
    text += `Missing Required Details: ${state.missingFields.join(', ')}\n`;
    text += `Interaction Mode: CLARIFICATION. Ask the user politely for the missing detail (${state.missingFields[0]}).\n`;
  } else if (state?.awaitingConfirmation) {
    text += `Interaction Mode: CONFIRMATION. The resident has provided all details. Present the proposal clearly and ask for explicit confirmation before executing.\n`;
  } else if (state?.actionConfirmed) {
    text += `Interaction Mode: EXECUTING. The resident has explicitly confirmed the proposal. Execute 'confirm_pending_action' and report the real persisted result.\n`;
  } else if (state?.actionCancelled) {
    text += `Interaction Mode: CANCELLED. The resident cancelled the proposal. Confirm that no changes were made.\n`;
  }

  return text;
}

/**
 * Convenience wrapper for multi-turn conversational activity intake and execution
 */
export function handleMultiTurnConversationalActivity({
  activeTurnState = null,
  incomingQuery = '',
  userRole = 'resident',
  userPermissions = [],
  referenceDate = null,
}) {
  const normalizedState = activeTurnState
    ? {
        ...activeTurnState,
        activeIntent: activeTurnState.activeIntent || activeTurnState.targetIntent,
      }
    : null;
  const turn = analyzeConversationTurn(incomingQuery, normalizedState, [], referenceDate);
  return {
    ...turn,
    question: turn.nextQuestion || '',
  };
}
