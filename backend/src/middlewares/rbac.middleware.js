import HttpError from '../utils/httpError.utils.js';
import { mapPermission } from '../utils/permissionMapper.js';

/**
 * Helper to dynamically resolve user permissions from the cache or database.
 */
const getPermissionsForUser = async (user) => {
  if (!user) return [];
  
  let roleId = user.roleId;
  
  // Fallback to query roleId if not present in token
  if (!roleId && user.role && user.orgId) {
    try {
      const roleService = (await import('../features/role/role.services.js')).default;
      const role = await roleService.getRoleByName(user.role, user.orgId);
      if (role) {
        roleId = role._id.toString();
      }
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful fallback role lookup failed:', err.message);
    }
  }

  if (!roleId) return [];

  const rolePermissionService = (await import('../features/rolePermission/rolePermission.services.js')).default;
  const permissionsList = await rolePermissionService.getPermissionsByRoleId(roleId);
  return permissionsList.map((p) => p.name);
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
      
      // Super Admin bypasses all permission checks
      if (req.user.role === 'Super Admin' || req.user.role === 'Platform Super Admin') {
        console.log(`[RBAC DEBUG] User ${req.user.username} is ${req.user.role}. Bypassing check.`);
        return next();
      }

      // Normalise all user permissions through the mapper before comparing
      const permissions = await getPermissionsForUser(req.user);
      const userPermissions = permissions.map(mapPermission);

      const actions = Array.isArray(action) ? action : [action];
      console.log(`[RBAC DEBUG] Checking ${feature}:${actions.join(',')} for user ${req.user.username} (Role: ${req.user.role}). Permissions count: ${userPermissions.length}`);
      
      const hasPermission = actions.some(act => {
        const requiredPermission = mapPermission(`${feature}:${act}`);
        return userPermissions.includes(requiredPermission);
      });

      if (!hasPermission) {
        console.error(`[RBAC DEBUG] 403 Forbidden. User has: ${userPermissions.join(',')}. Required ANY of actions for feature '${feature}': ${actions.join(',')}`);
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
      if (req.user.role === 'Super Admin' || req.user.role === 'Platform Super Admin') {
        return next();
      }

      const permissions = await getPermissionsForUser(req.user);
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
