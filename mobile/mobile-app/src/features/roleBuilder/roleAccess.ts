import { checkIsAdmin, getUserRoleName } from '../../utils/rbac';

export type RoleAction = 'read' | 'create' | 'update' | 'delete';

/**
 * Platform Super Admin configures the community; its Community Admin manages
 * roles inside that community. Other users need an explicit roles:* grant.
 */
export const hasRolePermission = (user: any, action: RoleAction): boolean => {
  if (!user) return false;
  if (checkIsAdmin(user)) return true;

  const normalizedRole = getUserRoleName(user).toLowerCase().replace(/[_-]/g, ' ');
  const isCommunityAdmin =
    normalizedRole === 'community admin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'super admin' ||
    normalizedRole === 'superadmin' ||
    normalizedRole === 'platform super admin' ||
    normalizedRole.includes('admin');

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return Boolean(
    user?.isPlatform ||
      isCommunityAdmin ||
      permissions.includes('*') ||
      permissions.includes('all') ||
      permissions.includes('roles:*') ||
      permissions.includes('roles:manage') ||
      permissions.includes(`roles:${action}`) ||
      permissions.includes('roles:read')
  );
};
