import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import config from '../config/config.js';

export const loggerStorage = new AsyncLocalStorage();

// Format to inject Correlation ID automatically from context
const addCorrelationId = winston.format((info) => {
  const requestId = loggerStorage.getStore();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

const SENSITIVE_KEYS = new Set([
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
    if (SENSITIVE_KEYS.has(lowerKey)) {
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
const devFormat = winston.format.printf(({ level, message, timestamp, requestId, stack, ...metadata }) => {
  const idStr = requestId ? ` [ID: ${requestId}]` : '';
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  const errorStack = stack ? `\n${stack}` : '';
  return `${timestamp} ${level}:${idStr} ${message}${metaStr}${errorStack}`;
});

const isDevelopment = config.nodeEnv === 'development';

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // capture error stack trace
    addCorrelationId(),
    redactFormat(),
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

export default logger;
