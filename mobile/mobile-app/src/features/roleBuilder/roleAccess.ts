export type RoleAction = 'read' | 'create' | 'update' | 'delete';

/**
 * Platform Super Admin configures the community; its Community Admin manages
 * roles inside that community. Other users need an explicit roles:* grant.
 */
export const hasRolePermission = (user: any, action: RoleAction): boolean => {
  const normalizedRole = String(user?.role || '').trim().toLowerCase().replace(/[_-]/g, ' ');
  const isCommunityAdmin = normalizedRole === 'community admin' || normalizedRole === 'admin';
  return Boolean(
    user?.isPlatform ||
      isCommunityAdmin ||
      user?.permissions?.includes('*') ||
      user?.permissions?.includes(`roles:${action}`)
  );
};
