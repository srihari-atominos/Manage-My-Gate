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

  // Handle Multer errors
  if (err.name === 'MulterError' || (typeof err.code === 'string' && err.code.startsWith('LIMIT_'))) {
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

  // Handle MongoDB Duplicate Key Errors
  else if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 409; // Conflict
    if (err.keyValue) {
      const keys = Object.keys(err.keyValue);
      const tenantKeys = ['orgId', 'organisationId', 'communityId', 'tenantId', 'workspaceId'];
      const nonTenantKeys = keys.filter(k => !tenantKeys.includes(k));

      if (nonTenantKeys.length === 1) {
        const field = nonTenantKeys[0];
        const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
        message = `${formattedField} is already registered or in use.`;
      } else if (nonTenantKeys.length > 1) {
        const fieldNames = nonTenantKeys.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
        message = `A record with duplicate ${fieldNames} already exists.`;
      } else {
        message = 'A duplicate record already exists.';
      }
    } else {
      message = 'A duplicate record already exists.';
    }
  }

  // Handle Mongoose Validation Errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message || 'Validation failed. Please correct the invalid fields.';
  }

  // Handle Mongoose Cast Errors (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format provided for ${err.path || 'resource'}.`;
  }

  // Log error using Winston logger: 5xx server errors get error level with stack; 4xx client errors get warn level
  const errorMeta = {
    statusCode,
    requestId: req.id,
    method: req.method,
    path: req.originalUrl || req.path,
    orgId: req.tenant?.orgId || req.user?.orgId,
    userId: req.user?._id || req.user?.id,
  };

  try {
    if (statusCode >= 500) {
      logger.error(`HTTP ${statusCode} - ${err.message || message}`, {
        ...errorMeta,
        stack: err.stack,
      });
    } else {
      logger.warn(`HTTP ${statusCode} - ${message}`, errorMeta);
    }
  } catch (logErr) {
    // Fail-safe: logging error must never break error response dispatch
  }

  // Local debugging aid only; never persist request bodies (credentials, OTPs) outside development.
  if (config.nodeEnv === 'development') {
    try {
      const SENSITIVE_KEYS = /^(password|newPassword|currentPassword|confirmPassword|otp|code|token|secret|authorization|creditCard|cvv)$/i;
      const sanitizeObj = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        const res = {};
        for (const [k, v] of Object.entries(obj)) {
          if (SENSITIVE_KEYS.test(k)) {
            res[k] = '[REDACTED]';
          } else if (typeof v === 'object') {
            res[k] = sanitizeObj(v);
          } else {
            res[k] = v;
          }
        }
        return res;
      };
      const safeBody = sanitizeObj(req.body);
      fs.writeFileSync('last_error.json', JSON.stringify({ statusCode, message, stack: err.stack, details, body: safeBody }), 'utf-8');
    } catch (e) {
      // ignore
    }
  }

  // Do not leak internals of unexpected server errors to clients in production
  if (statusCode >= 500 && config.nodeEnv === 'production') {
    message = 'Internal Server Error';
  } else if (typeof message === 'string') {
    // Strip raw database URIs or filesystem paths (Windows and POSIX/Linux) from any error response
    message = message
      .replace(/(?:mongodb(?:\+srv)?|postgres|mysql|redis):\/\/[^\s]+/gi, '[DATABASE_URI_REDACTED]')
      .replace(/(?:[A-Za-z]:\\[^\s]+|\/(?:app|var|home|usr|etc|tmp)\/[^\s]+|\/[^\s]+\.(?:js|mjs|cjs|json|html|env|ts|yaml|yml))/gi, '[PATH_REDACTED]');
  }

  const code = err.code || (details && details.code) || undefined;
  const reason = err.reason || (details && details.reason) || undefined;

  const response = {
    success: false,
    requestId: req.id,
    ...(code && typeof code === 'string' && { code }),
    ...(reason && typeof reason === 'string' && { reason }),
    message,
    ...(details && (statusCode < 500 || config.nodeEnv !== 'production') && { details }),
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
