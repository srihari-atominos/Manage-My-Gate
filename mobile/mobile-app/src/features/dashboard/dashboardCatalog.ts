export interface AppFeatureItem {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  iconShapeClass?: string;
  route?: string;
  categoryKey?: string;
  categoryName?: string;
  badge?: string;
  badgeColor?: string;
  permission?: string;
}

export const ALL_AVAILABLE_FEATURES: AppFeatureItem[] = [
  // Visitor & Gate Security (Circle Badge Shape - 'rounded-full')
  { id: 'visitor_resident_passes', name: 'Resident Passes', subtitle: 'Digital Verified Pass', iconName: 'BadgeCheck', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-full', route: '/(resident)/visitor', permission: 'visitor:resident', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_dashboard', name: 'Admin Console', subtitle: 'Visitor Monitoring', iconName: 'ContactRound', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-full', route: '/(resident)/visitor/admin', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_community_passes', name: 'Community Passes', subtitle: 'Pass Registry', iconName: 'TicketCheck', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-full', route: '/(resident)/visitor/admin/community-passes', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_blacklist', name: 'Visitor Blacklist', subtitle: 'Restricted Registry', iconName: 'ShieldX', colorBg: 'bg-[#FEE2E2]', colorIcon: '#DC2626', iconShapeClass: 'rounded-full', route: '/(resident)/visitor/admin/blacklist', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_logs', name: 'Admin Gate Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-full', route: '/(resident)/visitor/admin-logs', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_gate_console', name: 'Gate Console', subtitle: 'Access Control', iconName: 'DoorOpen', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-full', route: '/(resident)/visitor/gate-console', permission: 'visitor:guard', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },

  // Amenities & Booking (Architectural Luxury Squircle - 'rounded-[16px]')
  { id: 'amenities_dashboard', name: 'Amenity Dashboard', subtitle: 'Executive Analytics', iconName: 'Building2', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/dashboard', permission: 'amenities:dashboard', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_discover', name: 'Discover Amenities', subtitle: 'Explore Facilities', iconName: 'Compass', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/discover', permission: 'amenities:discover', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_my_booking', name: 'My Bookings', subtitle: 'Active Reservations', iconName: 'CalendarCheck', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/my-bookings', permission: 'amenities:my_booking', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Credits', iconName: 'Coins', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/wallet', permission: 'amenities:wallet', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_master', name: 'Amenity Master', subtitle: 'Pricing & Slots', iconName: 'SlidersHorizontal', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/admin-master', permission: 'amenities:amenities', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_admin_calendar', name: 'Admin Calendar', subtitle: 'Master Schedule', iconName: 'CalendarDays', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/admin-calendar', permission: 'amenities:admin_calander', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_ledgers', name: 'Ledgers', subtitle: 'Revenue & Refunds', iconName: 'Receipt', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/ledgers', permission: 'amenities:ledgers', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_maintenance', name: 'Maintenance', subtitle: 'Facility Downtime', iconName: 'Wrench', colorBg: 'bg-[#FEF6E8]', colorIcon: '#D97706', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/maintenance', permission: 'amenities:maintenance', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_scanner', name: 'Security Scanner', subtitle: 'Gate Scanner', iconName: 'ScanLine', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/scanner', permission: 'amenities:scanner', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_security_logs', name: 'Security Logs', subtitle: 'Audit Trails', iconName: 'ClipboardList', colorBg: 'bg-[#EEF2F6]', colorIcon: '#475569', iconShapeClass: 'rounded-[16px]', route: '/(resident)/amenities/security-logs', permission: 'amenities:security_logs', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },

  // Complaints & Helpdesk (Notched Ticket Shape - 'rounded-2xl rounded-tr-sm')
  { id: 'complaints_dashboard', name: 'Complaints Stats', subtitle: 'SLA Tracking', iconName: 'BarChart3', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:dashboard', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_raise_ticket', name: 'Raise Ticket', subtitle: 'Report Issue', iconName: 'PlusCircle', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:raise_ticket', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_track_requests', name: 'Track Tickets', subtitle: 'Live Status', iconName: 'Clock', colorBg: 'bg-[#FEF6E8]', colorIcon: '#D97706', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:track_requests', badge: '1', badgeColor: 'bg-[#FF7A00] text-white', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_complaint_management', name: 'Complaint Queue', subtitle: 'Admin Board', iconName: 'Kanban', colorBg: 'bg-[#F0EBFA]', colorIcon: '#51418F', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:complaint_management', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_staff', name: 'Staff & Vendors', subtitle: 'Roster & Contacts', iconName: 'Users2', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:staff', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_assignee', name: 'Assignee Console', subtitle: 'Work Orders', iconName: 'UserCheck', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-2xl rounded-tr-sm', permission: 'complaints:assignee', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },

  // Notice Board (Broadcast Bubble Shape - 'rounded-2xl rounded-bl-sm')
  { id: 'notices_active_board', name: 'Notice Board', subtitle: 'Circulars', iconName: 'Megaphone', colorBg: 'bg-[#FCEBF4]', colorIcon: '#A51B73', iconShapeClass: 'rounded-2xl rounded-bl-sm', permission: 'notices:active_board', badge: '8', badgeColor: 'bg-[#51418F] text-white', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_dashboard', name: 'Notice Stats', subtitle: 'Broadcasts', iconName: 'LayoutDashboard', colorBg: 'bg-[#F0EBFA]', colorIcon: '#51418F', iconShapeClass: 'rounded-2xl rounded-bl-sm', permission: 'notices:dashboard', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_manage_notices', name: 'Manage Notices', subtitle: 'Draft & Publish', iconName: 'FileEdit', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-2xl rounded-bl-sm', permission: 'notices:manage_notices', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_polls', name: 'Community Polls', subtitle: 'Resident Voting', iconName: 'Vote', colorBg: 'bg-[#FCEBF4]', colorIcon: '#A51B73', iconShapeClass: 'rounded-2xl rounded-bl-sm', permission: 'notices:polls', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },

  // Financial Suite & Billing (Card / Wallet Token Shape - 'rounded-xl')
  { id: 'billing_dashboard', name: 'Billing Dashboard', subtitle: 'Collection Overview', iconName: 'CreditCard', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-xl', route: '/(resident)/billing', permission: 'billing:action_center', badge: 'Due', badgeColor: 'bg-[#FF7A00] text-white', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_my_dues', name: 'My Personal Dues', subtitle: 'Unit Liabilities', iconName: 'Receipt', colorBg: 'bg-[#FCEBF4]', colorIcon: '#A51B73', iconShapeClass: 'rounded-xl', route: '/(resident)/billing/my-dues', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Top-Up', iconName: 'Wallet', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-xl', route: '/(resident)/billing/wallet', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_assessment_manager', name: 'Assessments', subtitle: 'Levy Generation', iconName: 'Calculator', colorBg: 'bg-[#F0EBFA]', colorIcon: '#51418F', iconShapeClass: 'rounded-xl', route: '/(resident)/admin/billing/assessments', permission: 'billing:assessment_manager', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_action_center', name: 'Billing Ledger', subtitle: 'Community Audits', iconName: 'FileSpreadsheet', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-xl', route: '/(resident)/admin/billing/ledger', permission: 'billing:dashboard', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },

  // Administration & Security (Modular Console Shape - 'rounded-[10px]')
  { id: 'admin_users', name: 'User Management', subtitle: 'Residents & Staff', iconName: 'Users', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/users', permission: 'users:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_villas', name: 'Unit Management', subtitle: 'Blocks & Villas', iconName: 'Home', colorBg: 'bg-[#E6F8F0]', colorIcon: '#16A34A', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/villas', permission: 'villas:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_role_builder', name: 'Role Builder', subtitle: 'RBAC Matrices', iconName: 'ShieldCheck', colorBg: 'bg-[#FCEBF4]', colorIcon: '#A51B73', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/role-builder', permission: 'roles:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_workspace_settings', name: 'Workspace Settings', subtitle: 'Tenant Rules', iconName: 'Settings', colorBg: 'bg-[#EEF2F6]', colorIcon: '#475569', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/workspace-settings', permission: 'workspaces:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_app_settings', name: 'App Settings', subtitle: 'Preferences & Themes', iconName: 'Sliders', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[10px]', route: '/(resident)/settings', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_integrations', name: 'Integration Hub', subtitle: 'API & Webhooks', iconName: 'Layers', colorBg: 'bg-[#FEF6E8]', colorIcon: '#D97706', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/integrations', permission: 'integrations:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_organizations', name: 'Org Manager', subtitle: 'Platform Tenancy', iconName: 'Building', colorBg: 'bg-[#F0EBFA]', colorIcon: '#51418F', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/organizations', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_audit_logs', name: 'Audit Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-[#E0EEFF]', colorIcon: '#245FA8', iconShapeClass: 'rounded-[10px]', route: '/(resident)/admin/audit-logs', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
];

export const REAL_APP_FEATURES = ALL_AVAILABLE_FEATURES;

export const DEFAULT_5_QUICK_ACTIONS = [
  'visitor_resident_passes',
  'billing_dashboard',
  'complaints_track_requests',
  'amenities_discover',
  'notices_active_board',
];

export const ROLE_DEFAULT_QUICK_ACTIONS: Record<string, string[]> = {
  admin: [
    'visitor_admin_dashboard',
    'billing_action_center',
    'admin_users',
    'amenities_dashboard',
    'notices_dashboard',
  ],
  guard: [
    'visitor_gate_console',
    'amenities_scanner',
    'notices_active_board',
    'complaints_track_requests',
    'complaints_raise_ticket',
  ],
  resident: [
    'visitor_resident_passes',
    'billing_dashboard',
    'complaints_track_requests',
    'amenities_discover',
    'notices_active_board',
  ],
};

/**
 * Returns role-appropriate default quick action feature IDs based on user persona
 */
export const getRoleDefaultQuickActions = (user: any): string[] => {
  const rawRole =
    user?.role ||
    (user as any)?.activeRole ||
    (Array.isArray((user as any)?.roles)
      ? typeof (user as any).roles[0] === 'string'
        ? (user as any).roles[0]
        : (user as any).roles[0]?.name
      : '') ||
    '';
  const roleName = String(rawRole).toLowerCase();

  if (roleName.includes('guard') || roleName.includes('security')) {
    return ROLE_DEFAULT_QUICK_ACTIONS.guard;
  }

  if (roleName.includes('admin') || user?.isPlatform === true) {
    return ROLE_DEFAULT_QUICK_ACTIONS.admin;
  }

  return ROLE_DEFAULT_QUICK_ACTIONS.resident;
};

/**
 * Validates whether a given feature is accessible to the user based on active permissions and role
 */
export const isFeatureAllowedForUser = (
  feature: { id?: string; permission?: string } | null | undefined,
  user: any
): boolean => {
  if (!feature) return false;
  // Features with no permission requirement are accessible to all authenticated personas
  if (!feature.permission) return true;

  const userPermissions: string[] = user?.permissions || [];
  const rawRole =
    user?.role ||
    (user as any)?.activeRole ||
    (Array.isArray((user as any)?.roles)
      ? typeof (user as any).roles[0] === 'string'
        ? (user as any).roles[0]
        : (user as any).roles[0]?.name
      : '') ||
    '';
  const roleName = String(rawRole).toLowerCase();

  // 1. Super Admin / Platform Admin has full access to all features
  if (
    user?.isPlatform === true ||
    userPermissions.includes('platform:super_admin') ||
    roleName.includes('super admin') ||
    roleName.includes('superadmin') ||
    roleName === 'community admin' ||
    roleName === 'admin'
  ) {
    return true;
  }

  // 2. Direct match in user permissions array
  if (userPermissions.length > 0) {
    if (userPermissions.includes(feature.permission)) return true;
    const [domain] = feature.permission.split(':');
    if (userPermissions.includes(`${domain}:*`)) return true;
  }

  // 3. Role persona fallback permissions
  if (roleName.includes('guard') || roleName.includes('security')) {
    const guardAllowed = [
      'visitor:guard',
      'notices:read',
      'notices:active_board',
      'villas:read',
      'complaints:raise_ticket',
      'complaints:track_requests',
      'amenities:scanner',
    ];
    return guardAllowed.includes(feature.permission);
  }

  if (roleName.includes('resident') || roleName.includes('owner') || roleName.includes('tenant')) {
    const residentAllowed = [
      'visitor:resident',
      'amenities:discover',
      'amenities:my_booking',
      'amenities:wallet',
      'complaints:raise_ticket',
      'complaints:track_requests',
      'complaints:view',
      'notices:read',
      'notices:active_board',
      'notices:polls',
      'billing:action_center',
      'villas:read',
    ];
    return residentAllowed.includes(feature.permission);
  }

  if (roleName.includes('facility') || roleName.includes('manager')) {
    const managerAllowed = [
      'villas:read',
      'amenities:dashboard',
      'amenities:admin_calander',
      'amenities:ledgers',
      'amenities:amenities',
      'amenities:maintenance',
      'amenities:settings',
      'amenities:scanner',
      'amenities:security_logs',
      'complaints:view',
      'complaints:create',
      'complaints:update',
      'complaints:assign',
      'complaints:dashboard',
      'complaints:reports',
      'complaints:calendar',
      'complaints:settings',
      'complaints:comments',
      'complaints:timeline',
      'complaints:staff',
      'complaints:track_requests',
      'complaints:complaint_management',
      'complaints:assignee',
      'notices:create',
      'notices:read',
      'notices:update',
      'visitor:admin',
      'billing:dashboard',
      'billing:action_center',
    ];
    return managerAllowed.includes(feature.permission);
  }

  return false;
};
