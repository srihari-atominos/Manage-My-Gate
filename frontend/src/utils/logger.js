import config from '../config/config.js';

const isDev = config.isDev;

/**
 * Sends a structured error report to a mock monitoring service (e.g., Sentry, Datadog).
 * @param {...*} args - The log arguments
 */
const sendToMockMonitoringService = (...args) => {
  const structuredLogs = args.map((arg) => {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return String(arg);
  });

  // In production, you would upload structuredLogs to your APM endpoint:
  // fetch('https://monitoring.api.example.com/log', { method: 'POST', body: JSON.stringify(structuredLogs) })
  // For demonstration, we simply format the payload locally.
};

/**
 * Environment-aware logger utility.
 * Suppresses debug/info logs in production to avoid leaking sensitive information.
 */
export const logger = {
  debug: (...args) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },
  
  warn: (...args) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args) => {
    if (!isDev) {
      sendToMockMonitoringService(...args);
    }
    console.error('[ERROR]', ...args);
  },
};

export default logger;
