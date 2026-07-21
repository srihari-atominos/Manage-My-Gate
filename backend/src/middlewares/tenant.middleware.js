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

    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new HttpError(401, 'Unauthorized. Authentication required.');
        }

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
          return next();
        }

        // Logic Branch B (Tenant Context):
        const orgIdHeader = req.headers['x-organization-id'];
        if (!orgIdHeader) {
          throw new HttpError(400, 'Workspace context is required.');
        }

        // If target tenant context orgId does not match user's active token orgId, access is forbidden
        if (orgIdHeader !== req.user.orgId) {
          console.error(`[TENANT DEBUG] 403 Forbidden. Header: ${orgIdHeader}, Token: ${req.user.orgId}`);
          throw new HttpError(403, 'Forbidden. Active workspace context does not match the requested organization.');
        }

        // Attach validated context to request
        req.tenant = {
          orgId: req.user.orgId,
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
