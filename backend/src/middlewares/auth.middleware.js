import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import HttpError from '../utils/httpError.utils.js';
import userService from '../features/user/user.services.js';

/**
 * Authentication middleware to verify JWT token.
 */
export const isAuthenticated = async (req, res, next) => {
  try {
    let token = null;

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check query params (for file downloads like export, pdf)
    else if (req.query && req.query.auth_token) {
      token = req.query.auth_token;
    }

    if (!token) {
      throw new HttpError(401, 'Access denied. No authentication token provided.');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verify that the user still exists in the database and is Active
    let user;
    try {
      user = await userService.getUserById(decoded.id);
    } catch (err) {
      throw new HttpError(401, 'User account no longer exists.');
    }

    if (!user || user.status !== 'Active') {
      throw new HttpError(401, 'User account is inactive.');
    }

    req.user = decoded; // Contains user ID, email, role, permissions, etc.
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      return next(error);
    }
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid authentication token';
    next(new HttpError(401, message));
  }
};

/**
 * Optional authentication middleware that attaches req.user if a valid token is present,
 * but does NOT throw 401 if token is missing or expired (useful for public payment links/checkouts).
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && req.query.auth_token) {
      token = req.query.auth_token;
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await userService.getUserById(decoded.id).catch(() => null);
      if (user && user.status === 'Active') {
        req.user = decoded;
      }
    }
  } catch (err) {
    // Ignore invalid/expired token on optional auth routes
  }
  next();
};

export default isAuthenticated;
