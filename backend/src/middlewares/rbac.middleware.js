import mongoose from 'mongoose';
import HttpError from '../utils/httpError.utils.js';
import { mapPermission } from '../utils/permissionMapper.js';

/**
 * Helper to dynamically resolve user permissions from the cache or database.
 */
/**
 * Helper to check if a user is an administrator via token role or live OrgMembership.
 */
export const checkIsAdmin = async (req) => {
  if (!req?.user) return false;
  const adminRoles = [
    'super admin',
    'platform super admin',
    'community admin',
    'admin',
    'superadmin',
    'facility manager',
    'super_admin',
    'platform_super_admin',
    'platform_admin',
    'community_admin',
    'facility_manager',
  ];
  const cleanRole = (r) => (r || '').toLowerCase().trim().replace(/[_-]/g, ' ');
  const userRole = cleanRole(req.user.role);
  const userRoles = Array.isArray(req.user.roles) ? req.user.roles.map(cleanRole) : [];
  if (
    adminRoles.some((ar) => cleanRole(ar) === userRole) ||
    userRoles.some((r) => adminRoles.some((ar) => cleanRole(ar) === r))
  ) {
    return true;
  }

  // Live Database OrgMembership verification for active workspace context
  const userId = req.user.id || req.user._id;
  const currentOrgId = req.headers['x-organization-id'] || req.tenant?.orgId || req.user.orgId;
  if (userId) {
    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const filter = { userId, status: 'Active' };
      if (currentOrgId && mongoose.isValidObjectId(currentOrgId)) {
        filter.orgId = currentOrgId;
      }
      const memberships = await OrgMembership.find(filter)
        .populate('roleId')
        .populate('roleIds')
        .lean();
      for (const m of memberships) {
        const names = [
          m.roleId?.name,
          ...(Array.isArray(m.roleIds) ? m.roleIds.map((r) => r?.name) : []),
        ].filter(Boolean);
        if (names.some((n) => adminRoles.some((ar) => cleanRole(ar) === cleanRole(n)))) {
          return true;
        }
      }
    } catch (memErr) {
      // Graceful fallback
    }
  }

  return false;
};

/**
 * Helper to dynamically resolve user permissions from the cache or database.
 */
export const getPermissionsForUser = async (user, targetOrgId = null) => {
  if (!user) return [];
  
  const roleIds = [];
  if (user.roleId) {
    roleIds.push(user.roleId.toString());
  }
  if (Array.isArray(user.roleIds)) {
    user.roleIds.forEach((id) => {
      if (id && !roleIds.includes(id.toString())) {
        roleIds.push(id.toString());
      }
    });
  }
  if (Array.isArray(user.roles)) {
    user.roles.forEach((id) => {
      if (id && mongoose.isValidObjectId(id) && !roleIds.includes(id.toString())) {
        roleIds.push(id.toString());
      }
    });
  }
  
  // Also query live database OrgMembership to dynamically include all user roles
  const userId = user.id || user._id;
  if (userId && mongoose.isValidObjectId(userId)) {
    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const filter = { userId, status: 'Active' };
      if (targetOrgId && mongoose.isValidObjectId(targetOrgId)) {
        filter.orgId = targetOrgId;
      }
      const memberships = await OrgMembership.find(filter).lean();
      memberships.forEach((m) => {
        if (m.roleIds && m.roleIds.length > 0) {
          m.roleIds.forEach((rid) => {
            const s = rid?.toString();
            if (s && !roleIds.includes(s)) roleIds.push(s);
          });
        } else if (m.roleId) {
          const s = m.roleId.toString();
          if (s && !roleIds.includes(s)) roleIds.push(s);
        }
      });
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful OrgMembership role lookup failed:', err.message);
    }
  }

  // Secondary Fallback: Query roleId by role name if still empty
  if (roleIds.length === 0 && user.role && (targetOrgId || user.orgId)) {
    try {
      const roleService = (await import('../features/role/role.services.js')).default;
      const role = await roleService.getRoleByName(user.role, targetOrgId || user.orgId);
      if (role) {
        roleIds.push(role._id.toString());
      }
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful fallback role lookup failed:', err.message);
    }
  }

  if (roleIds.length === 0) return [];

  const rolePermissionService = (await import('../features/rolePermission/rolePermission.services.js')).default;
  const permissionSet = new Set();
  for (const rid of roleIds) {
    const permissionsList = await rolePermissionService.getPermissionsByRoleId(rid);
    permissionsList.forEach((p) => {
      if (p && p.name) permissionSet.add(p.name);
    });
  }

  return Array.from(permissionSet);
};

/**
 * Role-Based Access Control middleware.
 * @param {string[]} allowedRoles - Roles allowed to access the route
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized. Authentication required.');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new HttpError(403, `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-Based Access Control middleware.
 * Checks if the user has 'Super Admin' role or has the specified feature-action permission.
 *
 * @param {string} feature - The resource feature (e.g., 'users', 'roles', 'amenities')
 * @param {string} action - The action type (e.g., 'create', 'read', 'manage_bookings')
 */
export const authorizePermission = (feature, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized. Authentication required.');
      }
      // Check if this feature is a dynamic module in the workspace and if it is disabled
      const orgId = req.headers['x-organization-id'] || req.user?.orgId;
      if (orgId && mongoose.isValidObjectId(orgId)) {
        const Workspace = mongoose.model('Workspace');
        const workspace = await Workspace.findOne({ organizationId: orgId });
        if (workspace && workspace.modules) {
          const targetModule = workspace.modules.find(m => m.moduleKey === feature);
          if (targetModule && targetModule.enabled === false) {
            throw new HttpError(403, `Forbidden. The feature "${targetModule.moduleName}" is disabled in this workspace.`);
          }
        }
      }
      // Super Admin and Community Admin bypass all permission checks
      const isFullAdmin = await checkIsAdmin(req);
      if (isFullAdmin) {
        return next();
      }

      // Normalise all user permissions through the mapper before comparing
      const permissions = await getPermissionsForUser(req.user, orgId);
      const userPermissions = permissions.map(mapPermission);

      const actions = Array.isArray(action) ? action : [action];
      
      const hasPermission = actions.some(act => {
        const requiredPermission = mapPermission(`${feature}:${act}`);
        return userPermissions.includes(requiredPermission);
      });

      if (!hasPermission) {
        throw new HttpError(
          403,
          `Forbidden. You do not have permission to access this resource.`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-Based Access Control middleware for multiple distinct permissions.
 * Checks if the user has AT LEAST ONE of the specified full permissions (e.g., ['users:create', 'villas:read']).
 */
export const authorizeAnyPermission = (permissionsArray) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized. Authentication required.');
      }
      const isFullAdmin = await checkIsAdmin(req);
      if (isFullAdmin) {
        return next();
      }

      const orgId = req.headers['x-organization-id'] || req.tenant?.orgId || req.user?.orgId;
      const permissions = await getPermissionsForUser(req.user, orgId);
      const userPermissions = permissions.map(mapPermission);

      const hasPermission = permissionsArray.some(p => {
        return userPermissions.includes(mapPermission(p));
      });

      if (!hasPermission) {
        throw new HttpError(403, `Forbidden. You do not have permission to access this resource.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizePermission;
