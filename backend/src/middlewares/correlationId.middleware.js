import { v4 as uuidv4 } from 'uuid';
import { loggerStorage } from '../utils/logger.utils.js';

/**
 * Middleware to establish a correlation ID for tracking requests.
 * Uses incoming X-Request-ID or generates a new UUID if missing.
 */
export const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.header('x-request-id') || req.header('X-Request-ID') || uuidv4();
  
  // Attach to request object for standard express access
  req.id = correlationId;
  
  // Expose on response headers for transparency/client debugging
  res.setHeader('X-Request-ID', correlationId);

  // Bind the request ID to the async call stack context
  loggerStorage.run(correlationId, () => {
    next();
  });
};

export default correlationIdMiddleware;
