import mongoose from 'mongoose';
import HttpError from '../utils/httpError.utils.js';
import { mapPermission } from '../utils/permissionMapper.js';

/**
 * Helper to dynamically resolve user permissions from the cache or database.
 */
export const getPermissionsForUser = async (user, targetOrgId = null) => {
  if (!user) return [];
  const orgId = targetOrgId || user.orgId;
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
  
  // Fallback: Query database OrgMembership for the target organization
  if (roleIds.length === 0 && (user.id || user._id) && orgId) {
    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({ userId: user.id || user._id, orgId, status: 'Active' }).lean();
      if (membership) {
        if (membership.roleIds && membership.roleIds.length > 0) {
          membership.roleIds.forEach((rid) => {
            if (rid && !roleIds.includes(rid.toString())) roleIds.push(rid.toString());
          });
        } else if (membership.roleId) {
          if (!roleIds.includes(membership.roleId.toString())) roleIds.push(membership.roleId.toString());
        }
      }
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] Graceful OrgMembership role lookup failed:', err.message);
    }
  }

  // Secondary Fallback: Query roleId by role name if still empty
  if (roleIds.length === 0 && user.role && orgId) {
    try {
      const roleService = (await import('../features/role/role.services.js')).default;
      const role = await roleService.getRoleByName(user.role, orgId);
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

      const activeRole = req.tenantRole || req.user.role;
      if (!allowedRoles.includes(activeRole)) {
        throw new HttpError(403, `Forbidden. Role '${activeRole}' is not authorized to access this resource.`);
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
      const targetOrgId = req.headers['x-organization-id'] || req.tenant?.orgId || req.user?.orgId;
      if (targetOrgId && mongoose.isValidObjectId(targetOrgId)) {
        const Workspace = mongoose.model('Workspace');
        const workspace = await Workspace.findOne({ organizationId: targetOrgId });
        if (workspace && workspace.modules) {
          const targetModule = workspace.modules.find(m => m.moduleKey === feature);
          if (targetModule && targetModule.enabled === false) {
            throw new HttpError(403, `Forbidden. The feature "${targetModule.moduleName}" is disabled in this workspace.`);
          }
        }
      }
      
      const activeRole = req.tenantRole || req.user.role || '';
      const roleUpper = activeRole.toUpperCase();
      const isPlatformAdmin = req.user.isPlatform === true || ['Super Admin', 'Platform Super Admin'].includes(req.user.role);
      const isTenantAdmin = ['Community Admin', 'Admin', 'SuperAdmin'].includes(activeRole) || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');
      const isFullAdmin = isPlatformAdmin || isTenantAdmin;
      if (isFullAdmin) {
        return next();
      }

      // Normalise all user permissions through the mapper before comparing
      const permissions = req.tenantPermissions || await getPermissionsForUser(req.user, targetOrgId);
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
