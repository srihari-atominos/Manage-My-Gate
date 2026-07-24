import mongoose from 'mongoose';
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

export default authorizePermission;
