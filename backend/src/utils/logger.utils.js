import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import config from '../config/config.js';

export const loggerStorage = new AsyncLocalStorage();

// Regex matching sensitive fields that should never appear in plain text in logs
const SENSITIVE_KEYS = new RegExp(
  '^(password|newPassword|currentPassword|confirmPassword|otp|code|token|idToken|id_token|accessToken|access_token|refreshToken|refresh_token|secret|clientSecret|client_secret|authorization|cookie|cvv|creditCard|cardNumber|apiKey|api_key|pin|privateKey|private_key|jwt|sessionToken|session_token)$',
  'i'
);

const sanitizeValue = (val, depth = 0) => {
  if (depth > 8 || !val) return val;
  if (typeof val === 'string') {
    // Redact Bearer tokens in headers or strings
    return val.replace(/(Bearer\s+)[A-Za-z0-9\-_=.]+/gi, '$1[REDACTED]');
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item, depth + 1));
  }
  if (val instanceof Error) {
    // Deeply sanitize Error objects, their custom properties (e.g. config, response), and message
    const sanitizedErr = Object.create(Object.getPrototypeOf(val));
    for (const [key, value] of Object.entries(val)) {
      if (SENSITIVE_KEYS.test(key)) {
        sanitizedErr[key] = '[REDACTED]';
      } else {
        sanitizedErr[key] = sanitizeValue(value, depth + 1);
      }
    }
    sanitizedErr.name = val.name;
    sanitizedErr.message = sanitizeValue(val.message, depth + 1);
    sanitizedErr.stack = val.stack;
    return sanitizedErr;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(val)) {
      if (SENSITIVE_KEYS.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(value, depth + 1);
      }
    }
    return sanitized;
  }
  return val;
};

// Winston format to sanitize passwords, tokens, secrets, and auth headers from log metadata
const sanitizeFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = info.message.replace(/(Bearer\s+)[A-Za-z0-9\-_=.]+/gi, '$1[REDACTED]');
  }
  for (const key of Object.keys(info)) {
    if (SENSITIVE_KEYS.test(key)) {
      info[key] = '[REDACTED]';
    } else if (key !== 'level' && key !== 'timestamp' && key !== 'stack') {
      info[key] = sanitizeValue(info[key]);
    }
  }
  return info;
});

// Format to inject validated Correlation ID and Tenant ID automatically from context
const addCorrelationAndTenantContext = winston.format((info) => {
  const store = loggerStorage.getStore();
  if (store) {
    if (typeof store === 'string') {
      if (!info.requestId) info.requestId = store;
    } else if (typeof store === 'object') {
      if (store.requestId && !info.requestId) {
        info.requestId = store.requestId;
      }
      if ((store.orgId || store.tenantId) && !info.orgId) {
        info.orgId = store.orgId || store.tenantId;
      }
      if (store.userId && !info.userId) {
        info.userId = store.userId;
      }
    }
  }
  return info;
});

const REDACT_KEYS = new Set([
  'password', 'newpassword', 'oldpassword', 'confirmpassword',
  'token', 'refreshtoken', 'accesstoken', 'auth_token', 'setup_token', 'setuptoken',
  'authorization', 'cookie', 'cookies', 'code', 'otp', 'secret', 'apikey', 'api_key',
  'jwt_secret', 'jwt_refresh_secret', 'session_secret', 'encryption_key',
  'creditcard', 'cardnumber', 'cvv', 'cvc',
]);

export const redactSensitive = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 5) return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        redactSensitive(obj[i], depth + 1);
      }
    }
    return obj;
  }
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (REDACT_KEYS.has(lowerKey)) {
      obj[key] = '[REDACTED]';
    } else if (obj[key] && typeof obj[key] === 'object') {
      redactSensitive(obj[key], depth + 1);
    } else if (typeof obj[key] === 'string' && /bearer\s+[a-zA-Z0-9._-]+/i.test(obj[key])) {
      obj[key] = obj[key].replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    }
  }
  return obj;
};

export const redactFormat = winston.format((info) => {
  if (typeof info.message === 'string' && /bearer\s+[a-zA-Z0-9._-]+/i.test(info.message)) {
    info.message = info.message.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
  }
  redactSensitive(info);
  return info;
});

// Custom printf format for Development
const devFormat = winston.format.printf(({ level, message, timestamp, requestId, orgId, stack, ...metadata }) => {
  const idStr = requestId ? ` [ID: ${requestId}]` : '';
  const orgStr = orgId ? ` [Org: ${orgId}]` : '';
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  const errorStack = stack ? `\n${stack}` : '';
  return `${timestamp} ${level}:${idStr}${orgStr} ${message}${metaStr}${errorStack}`;
});

const isDevelopment = config.nodeEnv === 'development';

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // capture error stack trace
    addCorrelationAndTenantContext(),
    sanitizeFormat(),
    isDevelopment
      ? winston.format.combine(
          winston.format.colorize(),
          devFormat
        )
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
});

export const runWithTenantContext = (context, fn) => {
  return loggerStorage.run(context, fn);
};

export const getLogContext = () => {
  const store = loggerStorage.getStore();
  if (!store) return {};
  if (typeof store === 'string') return { requestId: store };
  return { ...store };
};

export { sanitizeFormat, addCorrelationAndTenantContext };

export default logger;
