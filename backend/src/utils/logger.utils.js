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
