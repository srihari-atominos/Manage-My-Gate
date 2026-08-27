import HttpError from '../utils/httpError.utils.js';

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

        const isPlatformRole = ['Super Admin', 'Platform Admin', 'Platform Super Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);
        const userIsPlatform = req.user.isPlatform === true || isPlatformRole;

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
          return next();
        }

        // Logic Branch B (Tenant Context):
        const orgIdHeader = req.headers['x-organization-id'] || req.user?.orgId;
        if (!orgIdHeader) {
          throw new HttpError(400, 'Workspace context is required.');
        }

        const userOrgIdStr = req.user?.orgId ? String(req.user.orgId) : '';
        const requestedOrgIdStr = orgIdHeader ? String(orgIdHeader) : '';

        // If target tenant context orgId does not match user's active token orgId, verify membership
        if (userOrgIdStr && requestedOrgIdStr && userOrgIdStr !== requestedOrgIdStr) {
          const isAdminRole = ['Super Admin', 'Platform Admin', 'Platform Super Admin', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user.role);
          if (isAdminRole || userIsPlatform) {
            console.log(`[TENANT DEBUG] Admin operating across workspace. Header: ${requestedOrgIdStr}, Token: ${userOrgIdStr}`);
          } else {
            const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
            const userId = req.user.id || req.user._id;
            const membership = await OrgMembership.findOne({
              userId,
              orgId: requestedOrgIdStr,
            }).lean();

            if (!membership || (membership.status && membership.status !== 'Active')) {
              console.error(`[TENANT DEBUG] 403 Forbidden. User ${userId} has no valid membership in ${requestedOrgIdStr}. Token orgId: ${userOrgIdStr}`);
              throw new HttpError(403, 'Forbidden. Active workspace context does not match the requested organization.');
            }
          }
        }

        // Phase 6 Expiry Lockout
        const PlatformSubscription = (await import('../features/platformSubscription/platformSubscription.model.js')).default;
        
        // Optimize with lean(), index is already on organisationId
        // Caching Note: Can be cached in Redis in the future for high performance
        const subscription = await PlatformSubscription.findOne({ organisationId: req.user.orgId })
          .select('status')
          .lean();

        if (subscription && subscription.status === 'EXPIRED') {
          // Exempt billing/payment routes so users can pay
          const isExempt = req.originalUrl.match(/\/(platform-invoices|platform-payments|platform-quotes|billing)/i);
          if (!isExempt) {
            throw new HttpError(403, 'SUBSCRIPTION_EXPIRED');
          }
        }

        // Attach validated context to request
        const activeTenantOrgId = orgIdHeader || req.user.orgId;
        req.tenant = {
          orgId: activeTenantOrgId,
          role: req.user.role,
          permissions: req.user.permissions,
          isPlatform: userIsPlatform,
        };

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
