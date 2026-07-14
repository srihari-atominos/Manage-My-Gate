import HttpError from '../utils/httpError.utils.js';
import config from '../config/config.js';
import logger from '../utils/logger.utils.js';

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

  // Handle Multer errors
  if (err.name === 'MulterError' || err.code?.startsWith('LIMIT_')) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum is 5 images.';
    } else {
      message = err.message;
    }
  }

  // Handle CORS errors specifically
  else if (err.message === 'Not allowed by CORS') {
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

  const response = {
    success: false,
    message,
    ...(details && { details }),
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
