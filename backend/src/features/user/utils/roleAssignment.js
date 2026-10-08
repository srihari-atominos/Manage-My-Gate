import HttpError from '../../../utils/httpError.utils.js';
import { checkIsAdmin, getPermissionsForUser } from '../../../middlewares/rbac.middleware.js';
import { mapPermission, expandUserPermissions } from '../../../utils/permissionMapper.js';

const permissionName = (p) => (typeof p === 'string' ? p : p?.name);

const splitRoleNames = (roleNames) => [
  ...new Set(
    (Array.isArray(roleNames) ? roleNames : [roleNames])
      .flatMap((n) => String(n || '').split(','))
      .map((n) => n.trim())
      .filter(Boolean)
  ),
];

/**
 * Role ceiling for invitations: every role being assigned must belong to this
 * community, and (unless the inviter is a full admin) must not carry any
 * permission the inviter does not hold themselves.
 *
 * @param {import('express').Request} req - authenticated request (tenantContext applied)
 * @param {string} orgId - community the invite is for (from req.tenant, never the body)
 * @param {string|string[]} roleNames - role name(s) being assigned
 */
export const assertRolesAssignable = async (req, orgId, roleNames) => {
  const names = splitRoleNames(roleNames);
  if (names.length === 0) return;

  const roleService = (await import('../../role/role.services.js')).default;
  const rolePermissionService = (await import('../../rolePermission/rolePermission.services.js')).default;

  const isFullAdmin = await checkIsAdmin(req);
  let inviterPermissions = null;
  if (!isFullAdmin) {
    const raw = req.tenantPermissions || (await getPermissionsForUser(req.user, orgId)) || [];
    inviterPermissions = new Set(expandUserPermissions(raw.map(permissionName).filter(Boolean).map(mapPermission)));
  }

  for (const name of names) {
    const role = await roleService.getRoleByName(name, orgId);
    if (!role || !role.orgId || String(role.orgId) !== String(orgId)) {
      throw new HttpError(400, `Role '${name}' not found in this community.`);
    }
    if (isFullAdmin) continue;

    const rolePermissions = await rolePermissionService.getPermissionsByRoleId(role._id);
    const missing = rolePermissions
      .map(permissionName)
      .filter(Boolean)
      .map(mapPermission)
      .filter((p) => !inviterPermissions.has(p));
    if (missing.length > 0) {
      throw new HttpError(
        403,
        `You can't assign the '${role.name}' role because it includes permissions you don't have.`,
        { code: 'ROLE_NOT_ASSIGNABLE', role: role.name }
      );
    }
  }
};

export default assertRolesAssignable;
