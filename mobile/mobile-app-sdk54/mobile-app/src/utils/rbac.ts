import { AppFeatureItem } from '../features/dashboard/dashboardCatalog';

export interface UserLike {
  id?: string;
  _id?: string;
  role?: string;
  activeRole?: string;
  roles?: any[];
  permissions?: string[];
  allowedFeatures?: string[];
  isPlatform?: boolean;
}

/**
 * Normalizes and extracts the active role name from user session object
 */
export const getUserRoleName = (user: UserLike | null | undefined): string => {
  if (!user) return '';
  if (user.role && typeof user.role === 'string') {
    return user.role.trim();
  }
  if (user.activeRole && typeof user.activeRole === 'string') {
    return user.activeRole.trim();
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const firstRole = user.roles[0];
    if (typeof firstRole === 'string') return firstRole.trim();
    if (typeof firstRole === 'object' && firstRole?.name) return String(firstRole.name).trim();
  }
  return '';
};

/**
 * Determines whether user holds administrative privileges (SuperAdmin or Community Admin)
 */
export const checkIsAdmin = (user: UserLike | null | undefined): boolean => {
  if (!user) return false;
  if (user.isPlatform === true) return true;

  const permissions = user.permissions || [];
  if (
    permissions.includes('platform:super_admin') ||
    permissions.includes('*') ||
    permissions.includes('all')
  ) {
    return true;
  }

  const roleName = getUserRoleName(user);
  const adminRoleNames = [
    'Platform Super Admin',
    'SuperAdmin',
    'Super Admin',
    'Community Admin',
    'Admin',
  ];

  return adminRoleNames.includes(roleName);
};

/**
 * Checks whether user holds Security Guard / Security role
 */
export const checkIsSecurityRole = (user: UserLike | null | undefined): boolean => {
  if (!user) return false;
  const roleName = getUserRoleName(user).toLowerCase();
  const securityRoleKeywords = ['security guard', 'security', 'guard', 'security supervisor'];
  if (securityRoleKeywords.some((keyword) => roleName.includes(keyword))) {
    return true;
  }

  const permissions = user.permissions || [];
  return (
    permissions.includes('visitor:guard') ||
    permissions.includes('amenities:scanner') ||
    permissions.includes('amenities:security_logs')
  );
};

// Permission synonyms and equivalencies mapping for Role Builder permission keys
const PERMISSION_SYNONYMS: Record<string, string[]> = {
  // Visitor & Gate Security
  'visitor:guard': ['visitor:guard', 'visitor.guard', 'visitor:admin', 'visitor', 'gate:console', 'visitor_gate_console'],
  'visitor:admin': ['visitor:admin', 'visitor.admin', 'visitor:guard', 'visitor'],
  'visitor:resident': ['visitor:resident', 'visitor.resident', 'visitor'],

  // Notice Board
  'notices:active_board': ['notices:active_board', 'notices:read', 'notices.read', 'notices:view', 'notices.view', 'notices', 'notice_board'],
  'notices:dashboard': ['notices:dashboard', 'notices:read', 'notices.read', 'notices:view', 'notices'],
  'notices:manage_notices': ['notices:manage_notices', 'notices:create', 'notices:update', 'notices.create', 'notices.update', 'notices'],
  'notices:polls': ['notices:polls', 'notices:read', 'notices.polls', 'notices'],

  // Complaints & Maintenance
  'complaints:track_requests': ['complaints:track_requests', 'complaints:raise_ticket', 'complaints:view', 'complaints.view', 'complaints:read', 'complaints.read', 'complaints:create', 'complaints'],
  'complaints:raise_ticket': ['complaints:raise_ticket', 'complaints:create', 'complaints.create', 'complaints:track_requests', 'complaints'],
  'complaints:dashboard': ['complaints:dashboard', 'complaints:view', 'complaints:reports', 'complaints'],
  'complaints:complaint_management': ['complaints:complaint_management', 'complaints:update', 'complaints:assign', 'complaints'],
  'complaints:staff': ['complaints:staff', 'complaints:update', 'complaints'],
  'complaints:assignee': ['complaints:assignee', 'complaints:update', 'complaints'],

  // Amenities & Facilities
  'amenities:scanner': ['amenities:scanner', 'amenities:security_logs', 'amenities:view', 'amenities:read', 'amenities'],
  'amenities:security_logs': ['amenities:security_logs', 'amenities:scanner', 'amenities:view', 'amenities:read', 'amenities'],
  'amenities:discover': ['amenities:discover', 'amenities:view', 'amenities:read', 'amenities'],
  'amenities:my_booking': ['amenities:my_booking', 'amenities:view', 'amenities:read', 'amenities'],
  'amenities:wallet': ['amenities:wallet', 'amenities'],
  'amenities:dashboard': ['amenities:dashboard', 'amenities'],

  // Billing & Invoices
  'billing:action_center': ['billing:action_center', 'billing:dashboard', 'billing:view', 'billing:read', 'billing'],
  'billing:assessment_manager': ['billing:assessment_manager', 'billing:dashboard', 'billing'],

  // Administration & Security
  'villas:read': ['villas:read', 'villas.read', 'villas:view', 'villas', 'units:read', 'admin_villas'],
  'users:read': ['users:read', 'users.read', 'users:view', 'users'],
  'roles:read': ['roles:read', 'roles.read', 'roles:view', 'roles'],
  'workspaces:read': ['workspaces:read', 'workspaces.read', 'workspaces:view', 'workspaces'],
  'integrations:read': ['integrations:read', 'integrations.read', 'integrations:view', 'integrations'],
};

/**
 * Checks if user's permissions array from Role Builder matches the given item permission or feature ID
 */
const matchesUserPermissions = (
  itemPermission: string | undefined,
  itemId: string,
  userPermissions: string[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;

  // Wildcard / SuperAdmin permissions
  if (userPermissions.includes('*') || userPermissions.includes('all') || userPermissions.includes('platform:super_admin')) {
    return true;
  }

  // Exact ID match
  if (userPermissions.includes(itemId)) return true;

  // Exact permission string match
  if (itemPermission && userPermissions.includes(itemPermission)) return true;

  // Normalized dot vs colon match (e.g., 'notices.read' matches 'notices:read')
  if (itemPermission) {
    const dotPerm = itemPermission.replace(':', '.');
    const colonPerm = itemPermission.replace('.', ':');
    if (userPermissions.includes(dotPerm) || userPermissions.includes(colonPerm)) return true;

    // Check module level match (e.g. 'notices' in permissions array)
    const modulePrefix = itemPermission.split(/[:.]/)[0];
    if (userPermissions.includes(modulePrefix)) return true;

    // Check synonym map
    const synonyms = PERMISSION_SYNONYMS[itemPermission] || [];
    if (synonyms.some((syn) => userPermissions.includes(syn))) return true;
  }

  return false;
};

// Initial fallback sets (ONLY used when user.permissions is completely unpopulated/empty)
const FALLBACK_SECURITY_FEATURE_IDS = new Set([
  'visitor_gate_console',
  'visitor_admin_logs',
  'visitor_community_passes',
  'visitor_blacklist',
  'amenities_scanner',
  'amenities_security_logs',
  'notices_active_board',
  'complaints_track_requests',
  'complaints_raise_ticket',
  'admin_villas',
]);

const FALLBACK_SECURITY_PERMISSIONS = new Set([
  'visitor:guard',
  'visitor:admin',
  'amenities:scanner',
  'amenities:security_logs',
  'notices:active_board',
  'notices:read',
  'complaints:track_requests',
  'complaints:raise_ticket',
  'villas:read',
]);

const FALLBACK_RESIDENT_FEATURE_IDS = new Set([
  'visitor_resident_passes',
  'billing_dashboard',
  'billing_my_dues',
  'billing_wallet',
  'amenities_discover',
  'amenities_my_booking',
  'amenities_wallet',
  'complaints_raise_ticket',
  'complaints_track_requests',
  'notices_active_board',
  'notices_polls',
]);

const FALLBACK_RESIDENT_PERMISSIONS = new Set([
  'visitor:resident',
  'billing:action_center',
  'amenities:discover',
  'amenities:my_booking',
  'amenities:wallet',
  'complaints:raise_ticket',
  'complaints:track_requests',
  'notices:active_board',
  'notices:polls',
  'notices:read',
  'villas:read',
]);

/**
 * Primary RBAC resolver: strictly respects Role Builder permissions when assigned.
 * Hardcoded temporary data is NEVER forced when explicit permissions exist for Security or any role.
 */
export const isFeatureAllowedForUser = (
  item: { id: string; permission?: string; categoryKey?: string },
  user: UserLike | null | undefined
): boolean => {
  if (!user) return false;

  // 1. Super Admins & Community Admins have full feature access
  if (checkIsAdmin(user)) {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  // 2. Strict evaluation of permissions assigned in Role Builder (when permissions array is populated)
  if (permissions.length > 0) {
    return matchesUserPermissions(item.permission, item.id, permissions);
  }

  // 3. Fallback ONLY when user.permissions is completely unpopulated/empty:
  if (checkIsSecurityRole(user)) {
    if (FALLBACK_SECURITY_FEATURE_IDS.has(item.id)) return true;
    if (item.permission && FALLBACK_SECURITY_PERMISSIONS.has(item.permission)) return true;
    return false;
  }

  const roleName = getUserRoleName(user).toLowerCase();
  const isResidentRole =
    !roleName ||
    roleName.includes('resident') ||
    roleName.includes('tenant') ||
    roleName.includes('member') ||
    roleName.includes('owner');

  if (isResidentRole) {
    if (FALLBACK_RESIDENT_FEATURE_IDS.has(item.id)) return true;
    if (item.permission && FALLBACK_RESIDENT_PERMISSIONS.has(item.permission)) return true;
    return false;
  }

  return false;
};

/**
 * Returns role-appropriate default quick action feature IDs (5 slots)
 */
export const getDefaultQuickActionsForUser = (user: UserLike | null | undefined): string[] => {
  if (checkIsSecurityRole(user)) {
    return [
      'visitor_gate_console',
      'amenities_scanner',
      'amenities_security_logs',
      'notices_active_board',
      'complaints_track_requests',
    ];
  }

  if (checkIsAdmin(user)) {
    return [
      'admin_users',
      'admin_villas',
      'visitor_admin_dashboard',
      'billing_action_center',
      'notices_manage_notices',
    ];
  }

  // Default Resident Quick Actions
  return [
    'visitor_resident_passes',
    'billing_dashboard',
    'complaints_track_requests',
    'amenities_discover',
    'notices_active_board',
  ];
};
