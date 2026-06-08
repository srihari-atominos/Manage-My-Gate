import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import HttpError from '../utils/httpError.utils.js';

/**
 * Authentication middleware to verify JWT token.
 */
export const isAuthenticated = (req, res, next) => {
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

    if (!token) {
      throw new HttpError(401, 'Access denied. No authentication token provided.');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
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

export default isAuthenticated;
