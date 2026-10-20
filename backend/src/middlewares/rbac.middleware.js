import mongoose from "mongoose";
import HttpError from "../utils/httpError.utils.js";
import {
  mapPermission,
  expandUserPermissions,
} from "../utils/permissionMapper.js";

const ADMINISTRATION_SECURITY_FEATURES = Object.freeze([
  "users",
  "roles",
  "villas",
  "integrations",
  "workspaces",
  "staff",
  "technician",
  "staffAttendance",
  "staffUnitAssociation",
]);

export const hasOrganizationFeature = (allowedFeatures = [], feature) =>
  allowedFeatures.includes(feature) ||
  (allowedFeatures.includes("administration_security") &&
    ADMINISTRATION_SECURITY_FEATURES.includes(feature)) ||
  (allowedFeatures.includes("visitor") &&
    ["staff", "technician", "staffAttendance", "staffUnitAssociation"].includes(feature));
import Workspace from "../features/workspace/workspace.model.js";

/**
 * req.tenantPermissions is only ever set server-side by tenantContext after it verified the caller's
 * membership. It is reusable when it belongs to the organization being authorized: if tenantContext
 * ran, its verified org must match the target org (so a mismatched x-organization-id header can never
 * borrow another community's permissions). Without a tenant context nothing verified it, so the
 * permissions are still taken from the request only when the caller has no org to cross-check.
 */
const hasVerifiedTenantPermissions = (req, targetOrgId) => {
  if (!Array.isArray(req.tenantPermissions)) return false;
  if (req.tenant?.orgId) return Boolean(targetOrgId) && String(req.tenant.orgId) === String(targetOrgId);
  return true;
};

/**
 * Helper to check if a user is an administrator via validated tenant context or live OrgMembership.
 */
export const checkIsAdmin = async (req) => {
  if (!req?.user) return false;

  // Platform super admin has global administrative access
  if (req.user.isPlatform === true || req.tenant?.isPlatform === true) return true;

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

  // A request addressed to a different community than the one the caller was verified for is never
  // an admin request: fail closed instead of letting authority in community A apply to community B.
  const requestedOrgId = req.headers?.['x-organization-id'] || req.headers?.['x-org-id'];
  if (requestedOrgId && req.tenant?.orgId && String(requestedOrgId) !== String(req.tenant.orgId)) {
    return false;
  }

  // Target organization context
  const targetOrgId = req.tenant?.orgId || req.orgId || req.headers['x-organization-id'] || req.headers['x-org-id'] || req.user?.orgId;

  // If tenantContext already ran and established a verified tenantRole for this target organization
  if (req.tenantRole && req.tenant?.orgId && targetOrgId && String(req.tenant.orgId) === String(targetOrgId)) {
    const roleClean = cleanRole(req.tenantRole);
    return adminRoles.some((ar) => cleanRole(ar) === roleClean);
  }

  // If DB is connected, verify active OrgMembership specifically in targetOrgId
  const userId = req.user.id || req.user._id;
  if (mongoose.connection?.readyState === 1) {
    if (!targetOrgId || !mongoose.isValidObjectId(targetOrgId) || !userId || !mongoose.isValidObjectId(userId)) {
      return false; // Fail closed: cannot be tenant admin without valid target org context
    }

    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({
        userId,
        orgId: targetOrgId,
        status: 'Active',
      })
        .populate('roleId')
        .populate('roleIds')
        .lean();

      if (!membership) {
        return false;
      }

      const roleNames = [
        membership.roleId?.name,
        ...(Array.isArray(membership.roleIds) ? membership.roleIds.map((r) => r?.name) : []),
      ].filter(Boolean);

      // Exact canonical role names only. Substring matching would let a custom role such as
      // "Administration Assistant" or "Superintendent" inherit full admin access.
      return roleNames.some((n) => adminRoles.some((ar) => cleanRole(ar) === cleanRole(n)));
    } catch (err) {
      return false;
    }
  }

  // Fallback for offline / test environments without DB connection
  if (req.user.role && (!targetOrgId || String(req.user.orgId) === String(targetOrgId))) {
    const userRole = cleanRole(req.user.role);
    return adminRoles.some((ar) => cleanRole(ar) === userRole);
  }

  return false;
};

/**
 * Helper to dynamically resolve user permissions exclusively from verified membership
 * and organization-scoped roles. Unscoped user.roles fallback is eliminated to prevent
 * cross-tenant privilege escalation (SEC-05.1-F01).
 */
export const getPermissionsForUser = async (user, targetOrgId = null) => {
  if (!user) return [];

  // Global platform administrators retain full access
  if (user.isPlatform === true || user.role === 'Platform Super Admin') {
    return ['*'];
  }

  // Check if user is an active member of a platform organization
  if (mongoose.connection?.readyState === 1) {
    const userId = user.id || user._id;
    if (userId && mongoose.isValidObjectId(userId)) {
      try {
        const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
        const memberships = await OrgMembership.find({
          userId,
          status: 'Active',
        }).populate('orgId').lean();
        if (memberships.some((m) => m.orgId?.isPlatform === true)) {
          return ['*'];
        }
      } catch (e) {
        // Fall through to standard tenant resolution
      }
    }
  }

  const orgId = targetOrgId || user.orgId;

  // Live Database OrgMembership verification for active organization context
  if (mongoose.connection?.readyState === 1) {
    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      return []; // Fail closed: tenant permissions require a valid target organization
    }

    const userId = user.id || user._id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return [];
    }

    try {
      const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({
        userId,
        orgId,
        status: 'Active',
      }).lean();

      // Fails closed if user has no active membership in the target organization
      if (!membership) {
        return [];
      }

      const candidateRoleIds = new Set();
      if (membership.roleId && mongoose.isValidObjectId(membership.roleId)) {
        candidateRoleIds.add(membership.roleId.toString());
      }
      if (Array.isArray(membership.roleIds)) {
        membership.roleIds.forEach((rid) => {
          if (rid && mongoose.isValidObjectId(rid)) {
            candidateRoleIds.add(rid.toString());
          }
        });
      }
      if (Array.isArray(membership.assignments)) {
        membership.assignments.forEach((a) => {
          if (a.roleId && mongoose.isValidObjectId(a.roleId)) {
            candidateRoleIds.add(a.roleId.toString());
          }
        });
      }

      // If membership exists but has no explicit roleIds, check fallback by role name in this org
      if (candidateRoleIds.size === 0 && user.role) {
        const roleService = (await import('../features/role/role.services.js')).default;
        const role = await roleService.getRoleByName(user.role, orgId);
        if (role && (!role.orgId || role.orgId.toString() === orgId.toString())) {
          candidateRoleIds.add(role._id.toString());
        }
      }

      if (candidateRoleIds.size === 0) {
        return [];
      }

      // Strict role validation: Ensure roles belong to targetOrgId or are system template roles
      const Role = (await import('../features/role/role.model.js')).default;
      const safeRoles = await Role.find({
        _id: { $in: Array.from(candidateRoleIds) },
        $or: [
          { orgId: orgId },
          { orgId: null, isTenantRole: false },
        ],
      }).select('_id').lean();

      const safeRoleIds = safeRoles.map((r) => r._id.toString());
      if (safeRoleIds.length === 0) {
        return [];
      }

      const rolePermissionService = (await import('../features/rolePermission/rolePermission.services.js')).default;
      const permissionSet = new Set();
      for (const rid of safeRoleIds) {
        const permissionsList = await rolePermissionService.getPermissionsByRoleId(rid, orgId);
        if (Array.isArray(permissionsList)) {
          permissionsList.forEach((p) => {
            if (p && p.name) permissionSet.add(p.name);
          });
        }
      }
      return Array.from(permissionSet);
    } catch (err) {
      console.error('[RBAC MIDDLEWARE] OrgMembership role lookup error:', err.message);
      return [];
    }
  }

  // Fallback for offline/test environments when DB is disconnected
  const roleName = user.role;
  if (roleName === 'Admin' || roleName === 'Community Admin' || roleName === 'Super Admin') {
    return [
      'notices:dashboard', 'notices:active_board', 'notices:manage_notices', 'notices:polls',
      'notices:read', 'notices:create', 'notices:update', 'notices:delete', 'notices:publish', 'notices:acknowledge',
      'polls:read', 'polls:create', 'polls:update', 'polls:delete', 'polls:publish', 'polls:vote', 'polls:view_voters', 'polls:close', 'polls:export',
    ];
  }
  if (roleName === 'Resident') {
    return [
      'notices:active_board', 'notices:read', 'notices:acknowledge', 'notices:polls',
      'polls:read', 'polls:vote',
    ];
  }
  if (roleName === 'Security Guard' || roleName === 'Guard') {
    return [
      'notices:active_board', 'notices:read',
    ];
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
        throw new HttpError(401, "Unauthorized. Authentication required.");
      }

      if (req.user.isPlatform === true || req.tenant?.isPlatform === true) {
        return next();
      }

      const targetOrgId = req.tenant?.orgId || req.orgId || req.headers['x-organization-id'] || req.headers['x-org-id'] || req.user?.orgId;
      let activeRole = null;
      if (req.tenantRole && req.tenant?.orgId && targetOrgId && String(req.tenant.orgId) === String(targetOrgId)) {
        activeRole = req.tenantRole;
      } else {
        const headerOrg = req.headers['x-organization-id'] || req.headers['x-org-id'];
        if (headerOrg && req.user.orgId && String(headerOrg) !== String(req.user.orgId)) {
          throw new HttpError(403, 'Forbidden. Active workspace context does not match the requested community.');
        }
        activeRole = req.tenantRole || req.user.role;
      }

      if (!activeRole || !allowedRoles.includes(activeRole)) {
        throw new HttpError(403, `Forbidden. Role '${activeRole || 'Unknown'}' is not authorized to access this resource.`);
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
        throw new HttpError(401, "Unauthorized. Authentication required.");
      }
      // Check if this feature is disabled via Organization allowedFeatures or Workspace modules
      const targetOrgId =
        req.headers["x-organization-id"] ||
        req.tenant?.orgId ||
        req.user?.orgId;
      if (
        targetOrgId &&
        mongoose.isValidObjectId(targetOrgId) &&
        mongoose.connection?.readyState === 1
      ) {
        // First check modern Organization allowedFeatures
        const Organization = (
          await import("../features/organization/organization.model.js")
        ).default;
        const org = await Organization.findById(targetOrgId).lean();

        const features = Array.isArray(feature) ? feature : [feature];

        if (org && Array.isArray(org.allowedFeatures)) {
          // If the feature being accessed is NOT in the organization's allowedFeatures, block it!
          // Note: Some core modules like 'users', 'roles', 'workspaces' might be implicitly allowed
          // but if it's a domain feature like 'visitor', 'amenities', it must be explicitly allowed.
          const isCoreFeature = features.some((f) =>
            ["users", "roles", "workspaces", "dashboard"].includes(f),
          );

          if (!isCoreFeature) {
            const hasAllowedFeature = features.some(
              (f) =>
                hasOrganizationFeature(org.allowedFeatures, f) ||
                hasOrganizationFeature(org.allowedFeatures, f.split(":")[0]),
            );
            if (!hasAllowedFeature) {
              throw new HttpError(
                403,
                `Forbidden. The feature "${features.join(", ")}" is disabled for this community.`,
              );
            }
          }
        }

        // Legacy fallback: check workspace.modules
        const workspace = await Workspace.findOne({
          organizationId: targetOrgId,
        }).lean();
        if (workspace && workspace.modules) {
          const targetModule = workspace.modules.find((m) =>
            features.includes(m.moduleKey),
          );
          if (targetModule && targetModule.enabled === false) {
            throw new HttpError(
              403,
              `Forbidden. The feature "${targetModule.moduleName}" is disabled in this workspace.`,
            );
          }
        }
      }

      // Only platform administrators bypass RBAC. Community Admin is a tenant
      // role, so permissions removed in Role Builder take effect immediately.
      const isPlatformAdmin = req.user?.isPlatform === true || req.tenant?.isPlatform === true;
      if (isPlatformAdmin) {
        return next();
      }

      // Normalise all user permissions through the mapper and expand hierarchies
      let permissions;
      if (hasVerifiedTenantPermissions(req, targetOrgId)) {
        permissions = req.tenantPermissions;
      } else {
        permissions = await getPermissionsForUser(req.user, targetOrgId);
      }
      const userPermissions = expandUserPermissions(permissions.map(mapPermission));

      const features = Array.isArray(feature) ? feature : [feature];
      const actions = Array.isArray(action) ? action : [action];

      const hasPermission = features.some((feat) =>
        actions.some((act) => {
          const permString = act.includes(":") ? act : `${feat}:${act}`;
          const requiredPermission = mapPermission(permString);
          return userPermissions.includes(requiredPermission);
        }),
      );

      if (!hasPermission) {
        throw new HttpError(
          403,
          `Forbidden. You do not have permission to access this resource.`,
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
        throw new HttpError(401, "Unauthorized. Authentication required.");
      }

      // Check if this feature is disabled via Organization allowedFeatures or Workspace modules
      const targetOrgId =
        req.headers["x-organization-id"] ||
        req.tenant?.orgId ||
        req.user?.orgId;
      if (
        targetOrgId &&
        mongoose.isValidObjectId(targetOrgId) &&
        mongoose.connection?.readyState === 1
      ) {
        const Organization = (
          await import("../features/organization/organization.model.js")
        ).default;
        const org = await Organization.findById(targetOrgId).lean();

        // Extract feature names from permissions array (e.g., 'visitor:read' -> 'visitor')
        const features = permissionsArray.map((p) =>
          typeof p === "string" ? p.split(":")[0] : p,
        );

        if (org && Array.isArray(org.allowedFeatures)) {
          const isCoreFeature = features.some((f) =>
            ["users", "roles", "workspaces", "dashboard", "billing"].includes(
              f,
            ),
          );

          if (!isCoreFeature) {
            const hasAllowedFeature = features.some((f) =>
              hasOrganizationFeature(org.allowedFeatures, f),
            );
            if (!hasAllowedFeature) {
              throw new HttpError(
                403,
                `Forbidden. Required features are disabled for this community.`,
              );
            }
          }
        }

        const workspace = await Workspace.findOne({
          organizationId: targetOrgId,
        }).lean();
        if (workspace && workspace.modules) {
          const targetModule = workspace.modules.find((m) =>
            features.includes(m.moduleKey),
          );
          if (targetModule && targetModule.enabled === false) {
            throw new HttpError(
              403,
              `Forbidden. The feature "${targetModule.moduleName}" is disabled in this workspace.`,
            );
          }
        }
      }

      // Tenant administrators are governed by their assigned permissions.
      const isPlatformAdmin = req.user?.isPlatform === true || req.tenant?.isPlatform === true;
      if (isPlatformAdmin) {
        return next();
      }

      // Allow family members and all resident variations to access wallet operations
      const isResidentOrFamily = [
        'Resident', 'Resident Owner', 'Resident Tenant', 'Family Member', 'Family', 'Tenant', 'Owner'
      ].includes(req.tenantRole || req.user.role) || (req.user.residencyType && ['Family Member', 'Family', 'Tenant', 'Resident Owner', 'Owner'].includes(req.user.residencyType));

      const isWalletRoute = permissionsArray.some(
        (p) => typeof p === "string" && p.includes("wallet"),
      );
      if (isResidentOrFamily && isWalletRoute) {
        return next();
      }

      const orgId = req.headers['x-organization-id'] || req.tenant?.orgId || req.user?.orgId;
      let permissions;
      if (hasVerifiedTenantPermissions(req, orgId)) {
        permissions = req.tenantPermissions;
      } else {
        permissions = await getPermissionsForUser(req.user, orgId);
      }
      const userPermissions = expandUserPermissions(permissions.map(mapPermission));

      const hasPermission = permissionsArray.some((p) => {
        return userPermissions.includes(mapPermission(p));
      });

      if (!hasPermission) {
        throw new HttpError(
          403,
          `Forbidden. You do not have permission to access this resource.`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizePermission;
