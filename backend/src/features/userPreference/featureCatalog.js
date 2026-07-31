/**
 * System Feature Catalog
 * Central dynamic registry defining parent categories and child sub-features
 * directly mapped from the Web Application & Backend permissions.
 */
export const SYSTEM_FEATURE_CATALOG = [
  {
    categoryKey: 'visitor_management',
    categoryName: 'Visitor & Gate Security',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/visitor/resident-passes' },
    items: [
      { id: 'visitor_resident_passes', name: 'Resident Passes', permission: 'visitor:resident', iconName: 'QrCode', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/visitor/resident-passes' },
      { id: 'visitor_admin_logs', name: 'Admin Gate Logs', permission: 'visitor:admin', iconName: 'ShieldAlert', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/visitor/admin-logs' },
      { id: 'visitor_gate_console', name: 'Gate Console', permission: 'visitor:guard', iconName: 'ScanLine', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', route: '/(resident)/visitor/gate-console' }
    ]
  },
  {
    categoryKey: 'amenities_facilities',
    categoryName: 'Amenities & Facilities',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/amenities/discover' },
    items: [
      { id: 'amenities_discover', name: 'Discover Amenities', permission: 'amenities:discover', iconName: 'Search', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', route: '/(resident)/amenities/discover' },
      { id: 'amenities_my_booking', name: 'My Bookings', permission: 'amenities:my_booking', iconName: 'CalendarCheck', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/amenities/my-bookings' },
      { id: 'amenities_wallet', name: 'Digital Wallet', permission: 'amenities:wallet', iconName: 'Wallet', colorBg: 'bg-cyan-500/10', colorIcon: '#06b6d4', route: '/(resident)/amenities/wallet' },
      { id: 'amenities_master', name: 'Amenity Master', permission: 'amenities:amenities', iconName: 'Building2', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', route: '/(resident)/amenities/admin-master' },
      { id: 'amenities_admin_calendar', name: 'Admin Calendar', permission: 'amenities:admin_calander', iconName: 'CalendarDays', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/amenities/admin-calendar' },
      { id: 'amenities_ledgers', name: 'Ledgers & Accounts', permission: 'amenities:ledgers', iconName: 'Receipt', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', route: '/(resident)/amenities/ledgers' },
      { id: 'amenities_maintenance', name: 'Maintenance Schedule', permission: 'amenities:maintenance', iconName: 'Wrench', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', route: '/(resident)/amenities/maintenance' },
      { id: 'amenities_scanner', name: 'Security Gate Scanner', permission: 'amenities:scanner', iconName: 'QrCode', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', route: '/(resident)/amenities/scanner' },
      { id: 'amenities_security_logs', name: 'Security Audit Logs', permission: 'amenities:security_logs', iconName: 'ClipboardList', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', route: '/(resident)/amenities/security-logs' },
      { id: 'amenities_settings', name: 'Amenity Settings', permission: 'amenities:settings', iconName: 'SlidersHorizontal', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', route: '/(resident)/amenities/settings' }
    ]
  },
  {
    categoryKey: 'complaints_helpdesk',
    categoryName: 'Complaints & Maintenance',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/complaints/my-tickets' },
    items: [
      { id: 'complaints_dashboard', name: 'Complaints Dashboard', permission: 'complaints:dashboard', iconName: 'BarChart3', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', route: '/(resident)/complaints/dashboard' },
      { id: 'complaints_raise_ticket', name: 'Raise Ticket', permission: 'complaints:raise_ticket', iconName: 'PlusCircle', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', route: '/(resident)/complaints/raise-ticket' },
      { id: 'complaints_track_requests', name: 'Track My Tickets', permission: 'complaints:track_requests', iconName: 'ListOrdered', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/complaints/my-tickets', badge: '1', badgeColor: 'bg-rose-500 text-white' },
      { id: 'complaints_complaint_management', name: 'Complaint Management', permission: 'complaints:complaint_management', iconName: 'Kanban', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/complaints/manage' },
      { id: 'complaints_staff', name: 'Staff & Vendors', permission: 'complaints:staff', iconName: 'Users2', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', route: '/(resident)/complaints/staff' },
      { id: 'complaints_assignee', name: 'Assignee Console', permission: 'complaints:assignee', iconName: 'UserCheck', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', route: '/(resident)/complaints/assignee' }
    ]
  },
  {
    categoryKey: 'notice_board_polls',
    categoryName: 'Notice Board & Polls',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/notices/active-board' },
    items: [
      { id: 'notices_active_board', name: 'Active Notice Board', permission: 'notices:active_board', iconName: 'BellRing', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', route: '/(resident)/notices/active-board', badge: '8', badgeColor: 'bg-teal-600 text-white' },
      { id: 'notices_dashboard', name: 'Notice Dashboard', permission: 'notices:dashboard', iconName: 'LayoutDashboard', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/notices/dashboard' },
      { id: 'notices_manage_notices', name: 'Manage Notices', permission: 'notices:manage_notices', iconName: 'FileEdit', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/notices/manage' },
      { id: 'notices_polls', name: 'Community Polls', permission: 'notices:polls', iconName: 'Vote', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', route: '/(resident)/notices/polls' }
    ]
  },
  {
    categoryKey: 'financial_billing',
    categoryName: 'Financial Suite & Billing',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/billing/dashboard' },
    items: [
      { id: 'billing_dashboard', name: 'Billing & Dues', permission: 'billing:dashboard', iconName: 'CreditCard', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/billing/dashboard', badge: 'Due', badgeColor: 'bg-amber-500 text-white' },
      { id: 'billing_assessment_manager', name: 'Assessment Manager', permission: 'billing:assessment_manager', iconName: 'Calculator', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', route: '/(resident)/billing/assessments' },
      { id: 'billing_action_center', name: 'Action & Dispute Center', permission: 'billing:action_center', iconName: 'FileText', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', route: '/(resident)/billing/action-center' }
    ]
  },
  {
    categoryKey: 'administration_security',
    categoryName: 'Administration & Security',
    actionButton: { label: 'View all', type: 'link', route: '/(resident)/admin/users' },
    items: [
      { id: 'admin_users', name: 'User Management', permission: 'users:read', iconName: 'Users', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/admin/users' },
      { id: 'admin_villas', name: 'Unit & Villa Management', permission: 'villas:read', iconName: 'Home', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', route: '/(resident)/admin/villas' },
      { id: 'admin_role_builder', name: 'Role Builder & RBAC', permission: 'roles:read', iconName: 'ShieldCheck', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', route: '/(resident)/admin/role-builder' },
      { id: 'admin_workspace_settings', name: 'Workspace Settings', permission: 'workspaces:read', iconName: 'Settings', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/admin/workspace-settings' },
      { id: 'admin_integrations', name: 'Integration Hub', permission: 'integrations:read', iconName: 'Layers', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', route: '/(resident)/admin/integrations' },
      { id: 'admin_organizations', name: 'Organization Manager', permission: 'platform:super_admin', iconName: 'Building', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', route: '/(resident)/admin/organizations' },
      { id: 'admin_audit_logs', name: 'Audit Logs', permission: 'platform:super_admin', iconName: 'FileSpreadsheet', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', route: '/(resident)/admin/audit-logs' }
    ]
  }
];

export const DEFAULT_ACTIVE_QUICK_ACTIONS = [
  'billing_dashboard',
  'visitor_resident_passes',
  'complaints_track_requests',
  'notices_active_board'
];
