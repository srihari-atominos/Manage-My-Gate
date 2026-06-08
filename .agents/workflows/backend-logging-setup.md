---
description: backend logging setup
---

System Task: You are an expert backend architect. This is Phase 4. We are implementing an environment-aware, structured logging system using Winston and Morgan, tied together with a Correlation ID (X-Request-ID).

0. Rule Enforcement:
Before proceeding, read and permanently apply the rules defined in backend-rules.md and global-rules.md. All generated code must strictly comply with these architectural boundaries.

1. Dependency Installation:

Install winston, morgan, and uuid.

2. Core Logging Utilities:

Create src/utils/logger.utils.js. Configure a Winston logger that explicitly checks process.env.NODE_ENV.

Development: Use winston.format.combine, colorize, and a custom printf to output readable text to the console.

Production: Use winston.format.json() to output raw, structured JSON for log aggregators.

3. Middleware Integration:

Create src/middlewares/correlationId.middleware.js. This middleware must check for an incoming X-Request-ID header. If missing, generate a new UUID. Attach this ID to the request object (req.id) and set it in the response headers.

Create src/middlewares/httpLogger.middleware.js using Morgan. Configure Morgan to pipe its output stream to the Winston logger. Ensure Morgan logs the req.id alongside standard HTTP metrics.

4. Application Wiring:

Update index.js: Mount the correlationId middleware BEFORE any other routing or logging. Mount the Morgan HTTP logger immediately after.

Update src/middlewares/errorHandler/errorHandler.middleware.js: Replace standard console.error with the new Winston logger. Ensure it explicitly logs the req.id, the full error stack trace, and the HTTP status code.

Execution Output:
Output a summary of the modified files. Provide a sample of what a Winston log looks like in development vs. production. Acknowledge that the architectural rules remain actively enforced.