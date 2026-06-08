---
description: frontend logging setup
---

System Task: You are an expert frontend architect. This is Phase 5. We are implementing environment-aware frontend logging, API interception, and React Error Boundaries.

0. Rule Enforcement:
Before proceeding, read and permanently apply the rules defined in frontend-rules.md and global-rules.md. All generated code must strictly comply with these architectural boundaries.

1. Custom Logger Utility:

Create src/utils/logger.js. Create a wrapper around standard console methods (info, warn, error).

Implement environment checks (e.g., checking import.meta.env.MODE or process.env.NODE_ENV).

Development: Allow all logs to pass through to the browser console.

Production: Suppress info and debug logs entirely. Format error logs to be easily captured by a monitoring service.

2. API Interceptor & Correlation ID:

Install uuid.

Update src/utils/apiClient.js (your Axios/Fetch wrapper).

Request Interceptor: Generate a UUID and inject it into the X-Request-ID header for every outgoing API request.

Response Interceptor: Catch any API errors (4xx, 5xx). Use the new custom logger.error() to log the failure, explicitly including the endpoint, the status code, and the X-Request-ID that was sent.

3. Redux State Logging:

Update src/store/store.js. Configure the middleware array to include a state logger ONLY if the application is running in development mode.

4. React Error Boundaries:

Create src/components/ErrorBoundary/ErrorBoundary.jsx (a class component).

Implement componentDidCatch. Use the custom logger.error() to log component crashes and render a clean, user-friendly fallback UI instead of a white screen.

Wrap the root application provider with this <ErrorBoundary>.

Execution Output:
Output the modified directory structure. Provide a brief explanation of how the frontend ensures it doesn't leak sensitive logs to the client console in production.