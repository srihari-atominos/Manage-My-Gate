import HttpError from '../utils/httpError.utils.js';

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
 * @param {string} feature - The resource feature (e.g., 'users', 'roles')
 * @param {string} action - The action type (e.g., 'create', 'read')
 */
export const authorizePermission = (feature, action) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized. Authentication required.');
      }

      // Super Admin bypasses all checks
      if (req.user.role === 'Super Admin') {
        return next();
      }

      const requiredPermission = `${feature}:${action}`;
      const hasPermission = req.user.permissions && req.user.permissions.includes(requiredPermission);

      if (!hasPermission) {
        throw new HttpError(403, `Forbidden. You do not have permission '${requiredPermission}' to access this resource.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizePermission;
