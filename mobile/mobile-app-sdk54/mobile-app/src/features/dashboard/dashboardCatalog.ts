export interface AppFeatureItem {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  route?: string;
  categoryKey?: string;
  categoryName?: string;
  badge?: string;
  badgeColor?: string;
  permission?: string;
}

export const ALL_AVAILABLE_FEATURES: AppFeatureItem[] = [
  // Visitor & Gate Security
  { id: 'visitor_resident_passes', name: 'Resident Passes', subtitle: 'Digital Verified Pass', iconName: 'BadgeCheck', colorBg: 'bg-sky-500/15', colorIcon: '#0284c7', route: '/(resident)/visitor', permission: 'visitor:resident', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_dashboard', name: 'Admin Console', subtitle: 'Visitor Monitoring', iconName: 'ContactRound', colorBg: 'bg-purple-500/15', colorIcon: '#8b5cf6', route: '/(resident)/visitor/admin', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_community_passes', name: 'Community Passes', subtitle: 'Pass Registry', iconName: 'TicketCheck', colorBg: 'bg-cyan-500/15', colorIcon: '#06b6d4', route: '/(resident)/visitor/admin/community-passes', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_blacklist', name: 'Visitor Blacklist', subtitle: 'Restricted Registry', iconName: 'ShieldX', colorBg: 'bg-rose-500/15', colorIcon: '#f43f5e', route: '/(resident)/visitor/admin/blacklist', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_logs', name: 'Admin Gate Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-amber-500/15', colorIcon: '#d97706', route: '/(resident)/visitor/admin-logs', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_gate_console', name: 'Gate Console', subtitle: 'Access Control', iconName: 'DoorOpen', colorBg: 'bg-emerald-500/15', colorIcon: '#10b981', route: '/(resident)/visitor/gate-console', permission: 'visitor:guard', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },

  // Amenities & Booking
  { id: 'amenities_dashboard', name: 'Amenity Dashboard', subtitle: 'Executive Analytics', iconName: 'Building2', colorBg: 'bg-indigo-500/15', colorIcon: '#6366f1', route: '/(resident)/amenities/dashboard', permission: 'amenities:dashboard', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_discover', name: 'Discover Amenities', subtitle: 'Explore Facilities', iconName: 'Compass', colorBg: 'bg-orange-500/15', colorIcon: '#f97316', route: '/(resident)/amenities/discover', permission: 'amenities:discover', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_my_booking', name: 'My Bookings', subtitle: 'Active Reservations', iconName: 'CalendarCheck', colorBg: 'bg-blue-500/15', colorIcon: '#2563eb', route: '/(resident)/amenities/my-bookings', permission: 'amenities:my_booking', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Credits', iconName: 'Coins', colorBg: 'bg-amber-500/15', colorIcon: '#eab308', route: '/(resident)/amenities/wallet', permission: 'amenities:wallet', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_master', name: 'Amenity Master', subtitle: 'Pricing & Slots', iconName: 'SlidersHorizontal', colorBg: 'bg-teal-500/15', colorIcon: '#0d9488', route: '/(resident)/amenities/admin-master', permission: 'amenities:amenities', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_admin_calendar', name: 'Admin Calendar', subtitle: 'Master Schedule', iconName: 'CalendarDays', colorBg: 'bg-pink-500/15', colorIcon: '#ec4899', route: '/(resident)/amenities/admin-calendar', permission: 'amenities:admin_calander', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_ledgers', name: 'Ledgers', subtitle: 'Revenue & Refunds', iconName: 'Receipt', colorBg: 'bg-emerald-500/15', colorIcon: '#059669', route: '/(resident)/amenities/ledgers', permission: 'amenities:ledgers', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_maintenance', name: 'Maintenance', subtitle: 'Facility Downtime', iconName: 'Wrench', colorBg: 'bg-orange-600/15', colorIcon: '#ea580c', route: '/(resident)/amenities/maintenance', permission: 'amenities:maintenance', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_scanner', name: 'Security Scanner', subtitle: 'Gate Scanner', iconName: 'ScanLine', colorBg: 'bg-sky-500/15', colorIcon: '#0284c7', route: '/(resident)/amenities/scanner', permission: 'amenities:scanner', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },
  { id: 'amenities_security_logs', name: 'Security Logs', subtitle: 'Audit Trails', iconName: 'ClipboardList', colorBg: 'bg-slate-500/15', colorIcon: '#64748b', route: '/(resident)/amenities/security-logs', permission: 'amenities:security_logs', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Booking' },

  // Complaints & Helpdesk
  { id: 'complaints_dashboard', name: 'Complaints Stats', subtitle: 'SLA Tracking', iconName: 'BarChart3', colorBg: 'bg-purple-500/15', colorIcon: '#a855f7', permission: 'complaints:dashboard', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_raise_ticket', name: 'Raise Ticket', subtitle: 'Report Issue', iconName: 'PlusCircle', colorBg: 'bg-red-500/15', colorIcon: '#ef4444', permission: 'complaints:raise_ticket', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_track_requests', name: 'Track Tickets', subtitle: 'Live Status', iconName: 'Clock', colorBg: 'bg-amber-500/15', colorIcon: '#f59e0b', permission: 'complaints:track_requests', badge: '1', badgeColor: 'bg-destructive text-white', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_complaint_management', name: 'Complaint Queue', subtitle: 'Admin Board', iconName: 'Kanban', colorBg: 'bg-blue-500/15', colorIcon: '#3b82f6', permission: 'complaints:complaint_management', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_staff', name: 'Staff & Vendors', subtitle: 'Roster & Contacts', iconName: 'Users2', colorBg: 'bg-emerald-500/15', colorIcon: '#10b981', permission: 'complaints:staff', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_assignee', name: 'Assignee Console', subtitle: 'Work Orders', iconName: 'UserCheck', colorBg: 'bg-teal-500/15', colorIcon: '#14b8a6', permission: 'complaints:assignee', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },

  // Notice Board
  { id: 'notices_active_board', name: 'Notice Board', subtitle: 'Circulars', iconName: 'Megaphone', colorBg: 'bg-orange-500/15', colorIcon: '#f97316', permission: 'notices:active_board', badge: '8', badgeColor: 'bg-accent text-white', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_dashboard', name: 'Notice Stats', subtitle: 'Broadcasts', iconName: 'LayoutDashboard', colorBg: 'bg-indigo-500/15', colorIcon: '#6366f1', permission: 'notices:dashboard', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_manage_notices', name: 'Manage Notices', subtitle: 'Draft & Publish', iconName: 'FileEdit', colorBg: 'bg-sky-500/15', colorIcon: '#0ea5e9', permission: 'notices:manage_notices', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_polls', name: 'Community Polls', subtitle: 'Resident Voting', iconName: 'Vote', colorBg: 'bg-fuchsia-500/15', colorIcon: '#d946ef', permission: 'notices:polls', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },

  // Financial Suite & Billing
  { id: 'billing_dashboard', name: 'Billing Dashboard', subtitle: 'Collection Overview', iconName: 'CreditCard', colorBg: 'bg-emerald-500/15', colorIcon: '#10b981', route: '/(resident)/billing', permission: 'billing:action_center', badge: 'Due', badgeColor: 'bg-amber-500 text-white', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_my_dues', name: 'My Personal Dues', subtitle: 'Unit Liabilities', iconName: 'Receipt', colorBg: 'bg-rose-500/15', colorIcon: '#f43f5e', route: '/(resident)/billing/my-dues', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Top-Up', iconName: 'Wallet', colorBg: 'bg-emerald-600/15', colorIcon: '#059669', route: '/(resident)/billing/wallet', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_assessment_manager', name: 'Assessments', subtitle: 'Levy Generation', iconName: 'Calculator', colorBg: 'bg-indigo-500/15', colorIcon: '#6366f1', route: '/(resident)/admin/billing/assessments', permission: 'billing:assessment_manager', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_action_center', name: 'Billing Ledger', subtitle: 'Community Audits', iconName: 'FileSpreadsheet', colorBg: 'bg-cyan-600/15', colorIcon: '#0891b2', route: '/(resident)/admin/billing/ledger', permission: 'billing:dashboard', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },

  // Administration & Security
  { id: 'admin_users', name: 'User Management', subtitle: 'Residents & Staff', iconName: 'Users', colorBg: 'bg-blue-500/15', colorIcon: '#2563eb', permission: 'users:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_villas', name: 'Unit Management', subtitle: 'Blocks & Villas', iconName: 'Home', colorBg: 'bg-teal-500/15', colorIcon: '#0d9488', permission: 'villas:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_role_builder', name: 'Role Builder', subtitle: 'RBAC Matrices', iconName: 'ShieldCheck', colorBg: 'bg-rose-500/15', colorIcon: '#e11d48', permission: 'roles:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_workspace_settings', name: 'Workspace Settings', subtitle: 'Tenant Rules', iconName: 'Settings', colorBg: 'bg-slate-500/15', colorIcon: '#475569', permission: 'workspaces:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_integrations', name: 'Integration Hub', subtitle: 'API & Webhooks', iconName: 'Layers', colorBg: 'bg-amber-500/15', colorIcon: '#f59e0b', permission: 'integrations:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_organizations', name: 'Org Manager', subtitle: 'Platform Tenancy', iconName: 'Building', colorBg: 'bg-purple-500/15', colorIcon: '#8b5cf6', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_audit_logs', name: 'Audit Logs', subtitle: 'Security Activity', iconName: 'History', colorBg: 'bg-cyan-500/15', colorIcon: '#06b6d4', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
];

export const REAL_APP_FEATURES = ALL_AVAILABLE_FEATURES;

export const DEFAULT_5_QUICK_ACTIONS = [
  'visitor_resident_passes',
  'billing_dashboard',
  'complaints_track_requests',
  'amenities_discover',
  'notices_active_board',
];
