import morgan from 'morgan';
import logger from '../utils/logger.utils.js';

// Create a custom token for the request Correlation ID
morgan.token('id', (req) => req.id || 'N/A');

// Custom format string logging the request ID, method, url, status code, and response time
const morganFormat = ':id :method :url :status :res[content-length] - :response-time ms';

/**
 * Middleware using Morgan to log HTTP requests.
 * Pipes stdout stream to Winston logger.
 */
export const httpLoggerMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Trim newlines added by Morgan before passing to Winston
      logger.info(message.trim());
    }
  }
});

export default httpLoggerMiddleware;
