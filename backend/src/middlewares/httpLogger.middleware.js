import morgan from 'morgan';
import logger from '../utils/logger.utils.js';

// Create a custom token for the request Correlation ID
morgan.token('id', (req) => req.id || 'N/A');

// Custom token for validated tenant organization ID
morgan.token('org', (req) => req.tenant?.orgId || req.user?.orgId || '-');

// Custom token for sanitized request URL that strips sensitive query parameters (tokens, secrets, codes)
morgan.token('sanitized-url', (req) => {
  const rawUrl = req.originalUrl || req.url || '';
  if (!rawUrl) return '';
  const sensitiveRegex = /([?&](?:token|idToken|id_token|accessToken|access_token|refreshToken|refresh_token|code|otp|secret|clientSecret|client_secret|password|key|apiKey|api_key|pin|cvv)=)[^&]*/gi;
  let sanitized = rawUrl.replace(sensitiveRegex, '$1[REDACTED]');
  if (sanitized.includes('%')) {
    try {
      const decoded = decodeURIComponent(rawUrl);
      if (sensitiveRegex.test(decoded)) {
        sanitized = decoded.replace(sensitiveRegex, '$1[REDACTED]');
      }
    } catch (e) {
      sanitized = sanitized.replace(/(%(?:25)?(?:[0-9a-fA-F]{2})[a-zA-Z0-9_]*=)[^&]*/gi, '$1[REDACTED]');
    }
  }
  return sanitized;
});

// Custom format string logging the request ID, tenant context, method, sanitized url, status code, and response time
const morganFormat = ':id [:org] :method :sanitized-url :status :res[content-length] - :response-time ms';

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
