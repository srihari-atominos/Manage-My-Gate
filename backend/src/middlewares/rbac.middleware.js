import mongoose from 'mongoose';
import HttpError from '../utils/httpError.utils.js';
import { mapPermission, expandUserPermissions } from '../utils/permissionMapper.js';
import Workspace from '../features/workspace/workspace.model.js';

/**
 * Helper to dynamically resolve user permissions from the cache or database.
 */
export const getPermissionsForUser = async (user) => {
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
  
  // Fallback: Query database OrgMembership if roleIds is empty
  if (roleIds.length === 0 && user.id && mongoose.connection?.readyState === 1) {
    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const memberships = await OrgMembership.find({ userId: user.id, status: 'Active' }).lean();
      memberships.forEach((m) => {
        if (m.roleIds && m.roleIds.length > 0) {
          m.roleIds.forEach((rid) => {
            if (rid && !roleIds.includes(rid.toString())) roleIds.push(rid.toString());
          });
        } else if (m.roleId) {
          if (!roleIds.includes(m.roleId.toString())) roleIds.push(m.roleId.toString());
        }
      });
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful OrgMembership role lookup failed:', err.message);
    }
  }

  // Secondary Fallback: Query roleId by role name if still empty
  if (roleIds.length === 0 && user.role && user.orgId && mongoose.connection?.readyState === 1) {
    try {
      const roleService = (await import('../features/role/role.services.js')).default;
      const role = await roleService.getRoleByName(user.role, user.orgId);
      if (role) {
        roleIds.push(role._id.toString());
      }
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful fallback role lookup failed:', err.message);
    }
  }

  // Tertiary Fallback: If no roleIds found in database, provide standard default role permissions
  // based on user.role string (e.g., 'Admin', 'Resident', 'Guard')
  if (roleIds.length === 0) {
    const roleName = user.role;
    if (roleName === 'Admin' || roleName === 'Community Admin') {
      return [
        'notices:dashboard', 'notices:active_board', 'notices:manage_notices', 'notices:polls',
        'notices:read', 'notices:create', 'notices:update', 'notices:delete', 'notices:publish', 'notices:acknowledge',
        'polls:read', 'polls:create', 'polls:update', 'polls:delete', 'polls:publish', 'polls:vote', 'polls:view_voters', 'polls:close', 'polls:export'
      ];
    }
    if (roleName === 'Resident') {
      return [
        'notices:active_board', 'notices:read', 'notices:acknowledge', 'notices:polls',
        'polls:read', 'polls:vote'
      ];
    }
    if (roleName === 'Security Guard' || roleName === 'Guard') {
      return [
        'notices:active_board', 'notices:read'
      ];
    }
    return [];
  }

  if (mongoose.connection?.readyState === 1) {
    const rolePermissionService = (await import('../features/rolePermission/rolePermission.services.js')).default;
    const permissionSet = new Set();
    for (const rid of roleIds) {
      const permissionsList = await rolePermissionService.getPermissionsByRoleId(rid);
      permissionsList.forEach((p) => {
        if (p && p.name) permissionSet.add(p.name);
      });
    }
    return Array.from(permissionSet);
  }

  return [];
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
      if (orgId && mongoose.isValidObjectId(orgId) && mongoose.connection?.readyState === 1) {
        const workspace = await Workspace.findOne({ organizationId: orgId });
        if (workspace && workspace.modules) {
          const targetModule = workspace.modules.find(m => m.moduleKey === feature);
          if (targetModule && targetModule.enabled === false) {
            throw new HttpError(403, `Forbidden. The feature "${targetModule.moduleName}" is disabled in this workspace.`);
          }
        }
      }
      // Super Admin, Community Admin, and Admin roles bypass all permission checks
      const roleUpper = (req.user.role || '').toUpperCase();
      const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user.role) ||
        roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user.isPlatform;
      if (isFullAdmin) {
        return next();
      }

      // Normalise all user permissions through the mapper and expand hierarchies
      const permissions = await getPermissionsForUser(req.user);
      const userPermissions = expandUserPermissions(permissions.map(mapPermission));

      const features = Array.isArray(feature) ? feature : [feature];
      const actions = Array.isArray(action) ? action : [action];
      console.log(`[RBAC DEBUG] Checking ${features.join(',')}:${actions.join(',')} for user ${req.user.username} (Role: ${req.user.role}). Permissions count: ${userPermissions.length}`);
      
      const hasPermission = features.some(feat =>
        actions.some(act => {
          const permString = act.includes(':') ? act : `${feat}:${act}`;
          const requiredPermission = mapPermission(permString);
          return userPermissions.includes(requiredPermission);
        })
      );

      if (!hasPermission) {
        console.error(`[RBAC DEBUG] 403 Forbidden. User has: ${userPermissions.join(',')}. Required ANY of actions for features '${features.join(',')}': ${actions.join(',')}`);
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
      const roleUpper = (req.user.role || '').toUpperCase();
      const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user.role) ||
        roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user.isPlatform;
      if (isFullAdmin) {
        return next();
      }

      // Allow family members and all resident variations to access wallet operations
      const isResidentOrFamily = [
        'Resident', 'Resident Owner', 'Resident Tenant', 'Family Member', 'Family', 'Tenant', 'Owner'
      ].includes(req.user.role) || (req.user.residencyType && ['Family Member', 'Family', 'Tenant', 'Resident Owner', 'Owner'].includes(req.user.residencyType));

      const isWalletRoute = permissionsArray.some(p => typeof p === 'string' && p.includes('wallet'));
      if (isResidentOrFamily && isWalletRoute) {
        return next();
      }

      const permissions = await getPermissionsForUser(req.user);
      const userPermissions = expandUserPermissions(permissions.map(mapPermission));

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
