import HttpError from '../utils/httpError.utils.js';
import { mapPermission } from '../utils/permissionMapper.js';

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
 * Backward-compatible: normalises both the required permission and the user's stored
 * permissions through mapPermission so that legacy dot-format names (e.g. amenities.read)
 * stored in role documents are equivalent to the canonical colon-format (amenities:read).
 *
 * @param {string} feature - The resource feature (e.g., 'users', 'roles', 'amenities')
 * @param {string} action - The action type (e.g., 'create', 'read', 'manage_bookings')
 */
export const authorizePermission = (feature, action) => {
  return (req, res, next) => {
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
      const userPermissions = (req.user.permissions || []).map(mapPermission);

      const actions = Array.isArray(action) ? action : [action];
      console.log(`[RBAC DEBUG] Checking ${feature}:${actions.join(',')} for user ${req.user.username} (Role: ${req.user.role}). Permissions count: ${userPermissions.length}`);
      if (userPermissions.length < 50) {
          console.log(`[RBAC DEBUG] User permissions: ${userPermissions.join(', ')}`);
      }
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
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized. Authentication required.');
      }
      if (req.user.role === 'Super Admin' || req.user.role === 'Platform Super Admin') {
        return next();
      }

      const userPermissions = (req.user.permissions || []).map(mapPermission);

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

