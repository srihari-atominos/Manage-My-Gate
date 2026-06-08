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
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.details || null;

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
