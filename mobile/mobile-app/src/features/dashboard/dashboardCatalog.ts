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
  // 1. Visitor & Gate Security
  { id: 'visitor_resident_passes', name: 'Resident Passes', subtitle: 'Digital Verified Pass', iconName: 'TicketCheck', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor', permission: 'visitor:resident', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_dashboard', name: 'Admin Console', subtitle: 'Visitor Monitoring', iconName: 'MonitorCog', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor/admin', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_community_passes', name: 'Community Passes', subtitle: 'Pass Registry', iconName: 'TicketCheck', colorBg: 'bg-indigo-50 dark:bg-indigo-950/40', colorIcon: '#6366F1', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor/admin/community-passes', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_blacklist', name: 'Visitor Blacklist', subtitle: 'Restricted Registry', iconName: 'ShieldBan', colorBg: 'bg-rose-50 dark:bg-rose-950/40', colorIcon: '#DC2626', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor/admin/blacklist', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_logs', name: 'Admin Gate Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-slate-100 dark:bg-slate-800/40', colorIcon: '#475569', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor/admin-logs', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_gate_console', name: 'Gate Console', subtitle: 'Access Control', iconName: 'DoorOpen', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/visitor/gate-console', permission: 'visitor:guard', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },

  // 2. Amenities & Booking
  { id: 'amenities_dashboard', name: 'Amenity Dashboard', subtitle: 'Executive Analytics', iconName: 'LayoutDashboard', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/dashboard', permission: 'amenities:dashboard', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_discover', name: 'Discover Amenities', subtitle: 'Explore Facilities', iconName: 'Compass', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/discover', permission: 'amenities:discover', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_my_booking', name: 'My Bookings', subtitle: 'Active Reservations', iconName: 'CalendarCheck', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/my-bookings', permission: 'amenities:my_booking', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Credits', iconName: 'WalletCards', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/wallet', permission: 'amenities:wallet', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_master', name: 'Amenity Master', subtitle: 'Pricing & Slots', iconName: 'SlidersHorizontal', colorBg: 'bg-orange-50 dark:bg-orange-950/40', colorIcon: '#EA580C', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/admin-master', permission: 'amenities:amenities', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_admin_calendar', name: 'Admin Calendar', subtitle: 'Master Schedule', iconName: 'CalendarCog', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/admin-calendar', permission: 'amenities:admin_calander', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_ledgers', name: 'Ledgers', subtitle: 'Revenue & Refunds', iconName: 'BookOpenCheck', colorBg: 'bg-teal-50 dark:bg-teal-950/40', colorIcon: '#0D9488', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/ledgers', permission: 'amenities:ledgers', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_maintenance', name: 'Maintenance', subtitle: 'Facility Downtime', iconName: 'Wrench', colorBg: 'bg-orange-50 dark:bg-orange-950/40', colorIcon: '#EA580C', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/maintenance', permission: 'amenities:maintenance', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_scanner', name: 'Security Scanner', subtitle: 'Gate Scanner', iconName: 'ScanQrCode', colorBg: 'bg-teal-50 dark:bg-teal-950/40', colorIcon: '#0D9488', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/scanner', permission: 'amenities:scanner', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_security_logs', name: 'Security Logs', subtitle: 'Audit Trails', iconName: 'ClipboardList', colorBg: 'bg-slate-100 dark:bg-slate-800/40', colorIcon: '#475569', iconShapeClass: 'rounded-[18px]', route: '/(resident)/amenities/security-logs', permission: 'amenities:security_logs', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },

  // 3. Complaints & Maintenance
  { id: 'complaints_dashboard', name: 'Complaints Stats', subtitle: 'SLA Tracking', iconName: 'ChartBar', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', permission: 'complaints:dashboard', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_raise_ticket', name: 'Raise Ticket', subtitle: 'Report Issue', iconName: 'TicketPlus', colorBg: 'bg-orange-50 dark:bg-orange-950/40', colorIcon: '#EA580C', iconShapeClass: 'rounded-[18px]', permission: 'complaints:raise_ticket', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_track_requests', name: 'Track Tickets', subtitle: 'Live Status', iconName: 'Route', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', permission: 'complaints:track_requests', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_complaint_management', name: 'Complaint Queue', subtitle: 'Admin Board', iconName: 'ListTodo', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', permission: 'complaints:complaint_management', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_staff', name: 'Staff & Vendors', subtitle: 'Roster & Contacts', iconName: 'UsersRound', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', permission: 'complaints:staff', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_assignee', name: 'Assignee Console', subtitle: 'Work Orders', iconName: 'UserCheck', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', permission: 'complaints:assignee', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },

  // 4. Notice Board & Polls
  { id: 'notices_active_board', name: 'Notice Board', subtitle: 'Circulars', iconName: 'Megaphone', colorBg: 'bg-pink-50 dark:bg-pink-950/40', colorIcon: '#DB2777', iconShapeClass: 'rounded-[18px]', permission: 'notices:active_board', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_dashboard', name: 'Notice Stats', subtitle: 'Broadcasts', iconName: 'ChartBar', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', permission: 'notices:dashboard', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_manage_notices', name: 'Manage Notices', subtitle: 'Draft & Publish', iconName: 'FilePenLine', colorBg: 'bg-pink-50 dark:bg-pink-950/40', colorIcon: '#DB2777', iconShapeClass: 'rounded-[18px]', permission: 'notices:manage_notices', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_polls', name: 'Community Polls', subtitle: 'Resident Voting', iconName: 'Vote', colorBg: 'bg-pink-50 dark:bg-pink-950/40', colorIcon: '#DB2777', iconShapeClass: 'rounded-[18px]', permission: 'notices:polls', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },

  // 5. Financial Suite & Billing
  { id: 'billing_dashboard', name: 'Billing Dashboard', subtitle: 'Collection Overview', iconName: 'ChartPie', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', route: '/(resident)/billing', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_my_dues', name: 'My Personal Dues', subtitle: 'Unit Liabilities', iconName: 'ReceiptIndianRupee', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/billing/my-dues', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Top-Up', iconName: 'WalletCards', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/billing/wallet', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_assessment_manager', name: 'Assessments', subtitle: 'Levy Generation', iconName: 'Calculator', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/billing/assessments', permission: 'billing:assessment_manager', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_action_center', name: 'Billing Ledger', subtitle: 'Community Audits', iconName: 'BookOpenCheck', colorBg: 'bg-teal-50 dark:bg-teal-950/40', colorIcon: '#0D9488', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/billing/ledger', permission: 'billing:dashboard', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },

  // 6. Administration & Security
  { id: 'admin_users', name: 'User Management', subtitle: 'Residents & Staff', iconName: 'UserRoundCog', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/users', permission: 'users:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_villas', name: 'Unit Management', subtitle: 'Blocks & Villas', iconName: 'House', colorBg: 'bg-emerald-50 dark:bg-emerald-950/40', colorIcon: '#16A34A', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/villas', permission: 'villas:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_role_builder', name: 'Role Builder', subtitle: 'RBAC Matrices', iconName: 'ShieldCheck', colorBg: 'bg-purple-50 dark:bg-purple-950/40', colorIcon: '#7C3AED', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/role-builder', permission: 'roles:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_workspace_settings', name: 'Workspace Settings', subtitle: 'Tenant Rules', iconName: 'Settings2', colorBg: 'bg-slate-100 dark:bg-slate-800/40', colorIcon: '#475569', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/workspace-settings', permission: 'workspaces:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_app_settings', name: 'App Settings', subtitle: 'Preferences & Themes', iconName: 'SlidersHorizontal', colorBg: 'bg-slate-100 dark:bg-slate-800/40', colorIcon: '#475569', iconShapeClass: 'rounded-[18px]', route: '/(resident)/settings', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_integrations', name: 'Integration Hub', subtitle: 'API & Webhooks', iconName: 'Workflow', colorBg: 'bg-teal-50 dark:bg-teal-950/40', colorIcon: '#0D9488', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/integrations', permission: 'integrations:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_organizations', name: 'Org Manager', subtitle: 'Platform Tenancy', iconName: 'Building', colorBg: 'bg-blue-50 dark:bg-blue-950/40', colorIcon: '#2563EB', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/organizations', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_audit_logs', name: 'Audit Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-slate-100 dark:bg-slate-800/40', colorIcon: '#475569', iconShapeClass: 'rounded-[18px]', route: '/(resident)/admin/audit-logs', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
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
