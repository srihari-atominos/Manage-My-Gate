import HttpError from '../utils/httpError.utils.js';
import logger, { loggerStorage } from '../utils/logger.utils.js';

/**
 * Tenant Context middleware to verify organization membership and attach tenant context.
 * Can be called as a middleware directly, e.g. tenantContext(req, res, next)
 * or as a configured factory, e.g. tenantContext({ requirePlatformContext: true })
 *
 * @param {object|import('express').Request} optionsOrReq - Options object or Express Request
 * @param {import('express').Response} [res]
 * @param {import('express').NextFunction} [next]
 */
export const tenantContext = (optionsOrReq, res, next) => {
  // Check if optionsOrReq is actually req (express request object)
  const isMiddlewareDirectCall = optionsOrReq && optionsOrReq.headers && typeof next === 'function';

  const makeMiddleware = (options = {}) => {
    const { requirePlatformContext = false } = options;

    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw new HttpError(401, 'Unauthorized. Authentication required.');
        }

        // Platform access derives only from the organisation's isPlatform flag (carried in the signed
        // token). Role names are tenant-controlled and must never grant platform privileges.
        const userIsPlatform = req.user.isPlatform === true;

        // Logic Branch A (Platform Context):
        if (requirePlatformContext) {
          if (!userIsPlatform) {
            throw new HttpError(403, 'Forbidden. Platform administrator access required.');
          }
          // Attach validated context to request
          req.tenant = {
            orgId: req.user.orgId,
            role: req.user.role,
            permissions: req.user.permissions,
            isPlatform: true,
          };
          const store = loggerStorage.getStore();
          if (store && typeof store === 'object') {
            store.orgId = req.user.orgId ? String(req.user.orgId) : undefined;
            store.userId = req.user.id || req.user._id;
            store.isPlatform = true;
          }
          return next();
        }

        // Logic Branch B (Tenant Context):
        const orgIdHeader = req.headers['x-organization-id'] || req.query?.orgId || req.user?.orgId;
        if (!orgIdHeader) {
          throw new HttpError(400, 'Workspace context is required.');
        }

        let requestedOrgIdStr = String(orgIdHeader);
        let targetRoleName = req.user.role;
        let targetPermissions = req.user.permissions || [];
        let targetMembership = null;

        if (!userIsPlatform) {
          const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
          const userId = req.user.id || req.user._id;
          targetMembership = await OrgMembership.findOne({
            userId,
            orgId: requestedOrgIdStr,
          }).lean();

          if (!targetMembership || (targetMembership.status && targetMembership.status !== 'Active')) {
            const fallbackMembership = await OrgMembership.findOne({
              userId,
              status: 'Active',
            }).sort({ createdAt: -1 }).lean();

            if (fallbackMembership && fallbackMembership.orgId) {
              logger.info(`Self-healing stale workspace context: user ${userId} routed from stale [${requestedOrgIdStr}] to active [${fallbackMembership.orgId}]`, {
                userId,
                staleOrgId: requestedOrgIdStr,
                fallbackOrgId: fallbackMembership.orgId,
                requestId: req.id,
              });
              targetMembership = fallbackMembership;
              requestedOrgIdStr = String(fallbackMembership.orgId);
              req.headers['x-organization-id'] = requestedOrgIdStr;
              req.headers['x-org-id'] = requestedOrgIdStr;
            } else {
              logger.warn(`Tenant access rejected: User ${userId} has no active membership in target organization ${requestedOrgIdStr}`, {
                userId,
                targetOrgId: requestedOrgIdStr,
                requestId: req.id,
              });
              throw new HttpError(403, 'Forbidden. Active workspace context does not match the requested community.');
            }
          }

          // Resolve target organization role name and permissions
          const targetRoleIds = [];
          if (targetMembership.roleIds && targetMembership.roleIds.length > 0) {
            targetMembership.roleIds.forEach((rid) => { if (rid) targetRoleIds.push(rid.toString()); });
          } else if (targetMembership.roleId) {
            targetRoleIds.push(targetMembership.roleId.toString());
          }

          if (targetRoleIds.length > 0) {
            const Role = (await import('../features/role/role.model.js')).default;
            const roles = await Role.find({ _id: { $in: targetRoleIds } }).lean();
            if (roles.length > 0) {
              const matchingRole = roles.find((r) => r.name === req.user?.role);
              if (matchingRole) {
                targetRoleName = matchingRole.name;
              } else {
                targetRoleName = roles[0].name;
              }
            }

            const { getPermissionsForUser } = await import('./rbac.middleware.js');
            targetPermissions = await getPermissionsForUser(
              { id: userId, roleId: targetMembership.roleId, roleIds: targetRoleIds },
              requestedOrgIdStr
            );
          }
        }

        // Phase 6 Expiry Lockout
        const PlatformSubscription = (await import('../features/platformSubscription/platformSubscription.model.js')).default;
        
        const subscription = await PlatformSubscription.findOne({ organisationId: requestedOrgIdStr })
          .select('status')
          .lean();

        if (subscription && subscription.status === 'EXPIRED') {
          const isExempt = req.originalUrl.match(/\/(platform-invoices|platform-payments|platform-quotes|billing)/i);
          if (!isExempt) {
            throw new HttpError(403, 'SUBSCRIPTION_EXPIRED');
          }
        }

        // Attach validated context to request
        req.tenantMembership = targetMembership;
        req.tenantRole = targetRoleName;
        req.tenantPermissions = targetPermissions;
        req.organization = requestedOrgIdStr;
        req.orgId = requestedOrgIdStr;
        req.assignment = req.user?.activeAssignment || null;
        req.tenant = {
          orgId: requestedOrgIdStr,
          role: targetRoleName,
          permissions: targetPermissions,
          isPlatform: userIsPlatform,
          assignment: req.user?.activeAssignment || null,
        };

        // Synchronize request-scoped user context for downstream handlers expecting req.user
        if (!userIsPlatform) {
          req.user.orgId = requestedOrgIdStr;
          req.user.role = targetRoleName;
          req.user.permissions = targetPermissions;
        }

        // Enrich loggerStorage context with validated tenant details
        const store = loggerStorage.getStore();
        if (store && typeof store === 'object') {
          store.orgId = requestedOrgIdStr;
          store.userId = req.user?.id || req.user?._id;
          store.isPlatform = userIsPlatform;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  if (isMiddlewareDirectCall) {
    // Called directly as: tenantContext(req, res, next)
    return makeMiddleware({})(optionsOrReq, res, next);
  }

  // Called as: tenantContext(options) or tenantContext()
  return makeMiddleware(optionsOrReq);
};

export default tenantContext;
