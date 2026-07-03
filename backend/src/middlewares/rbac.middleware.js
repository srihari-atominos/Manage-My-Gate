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

      // Build canonical required permission string
      const requiredPermission = mapPermission(`${feature}:${action}`);

      // Normalise all user permissions through the mapper before comparing
      const userPermissions = (req.user.permissions || []).map(mapPermission);
      const hasPermission = userPermissions.includes(requiredPermission);

      console.log(`[RBAC DEBUG] User: ${req.user.username}, Role: ${req.user.role}`);
      console.log(`[RBAC DEBUG] Checking: ${feature}:${action} (mapped: ${requiredPermission})`);
      console.log(`[RBAC DEBUG] User Permissions (mapped):`, userPermissions);
      console.log(`[RBAC DEBUG] Result: ${hasPermission ? 'GRANTED' : 'DENIED'}`);

      if (!hasPermission) {
        throw new HttpError(
          403,
          `Forbidden. You do not have permission '${requiredPermission}' to access this resource.`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizePermission;
