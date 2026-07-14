import HttpError from '../utils/httpError.utils.js';
import config from '../config/config.js';
import logger from '../utils/logger.utils.js';
import fs from 'fs';
/**
 * Middleware to handle routes that are not found (404).
 */
export const pageNotFound = (req, res, next) => {
  const error = new HttpError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  const details = err.details || null;

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'Not allowed by CORS';
    
    // Set CORS headers so browser lets the client read the 403 response
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Log error using Winston logger
  logger.error(`HTTP ${statusCode} - ${message}`, {
    statusCode,
    stack: err.stack,
    requestId: req.id
  });

  try {
    fs.writeFileSync('last_error.json', JSON.stringify({ statusCode, message, stack: err.stack, details, body: req.body }), 'utf-8');
  } catch (e) {
    // ignore
  }

  const response = {
    success: false,
    message,
    ...(details && { details }),
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
