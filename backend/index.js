import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './src/config/config.js';
import swaggerRouter from './src/routes/swagger.routes.js';
import apiRouter from './src/routes/api.routes.js';
import { pageNotFound, errorHandler } from './src/middlewares/error.middleware.js';
import responseHandler from './src/middlewares/responseHandler.middleware.js';
import correlationIdMiddleware from './src/middlewares/correlationId.middleware.js';
import httpLoggerMiddleware from './src/middlewares/httpLogger.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set up Correlation ID tracking and HTTP logging first
app.use(correlationIdMiddleware);
app.use(httpLoggerMiddleware);

const defaultAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'x-request-id',
  'X-Client-Type',
  'x-client-type',
  'X-Client-Source',
  'x-client-source',
  'x-organization-id',
  'X-Organization-ID',
  'x-org-id',
  'X-Org-ID',
  'x-role',
  'X-Role',
  'x-villa-id',
  'X-Villa-ID',
  'X-User-ID',
  'x-user-id',
  'x-idempotency-key',
  'X-Idempotency-Key',
  'x-gateway-event-id',
  'X-Gateway-Event-ID',
  'Accept',
  'Origin',
  'X-Requested-With',
  'x-requested-with'
];

// Set up CORS
app.use(cors((req, callback) => {
  const reqHeaders = req.headers['access-control-request-headers'];
  const extraHeaders = reqHeaders ? reqHeaders.split(',').map((h) => h.trim()) : [];

  callback(null, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return cb(null, true);
      
      // In development mode, allow any localhost, 127.0.0.1, [::1], or private IP subnet origins
      const isDev = config.nodeEnv === 'development';
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(origin);
      
      if (
        isLocal ||
        (isDev && isLocal) ||
        config.cors.allowedOrigins.indexOf(origin) !== -1 ||
        config.cors.allowedOrigins.includes('*')
      ) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [...new Set([...defaultAllowedHeaders, ...extraHeaders])],
    exposedHeaders: ['X-Request-ID', 'x-request-id']
  });
}));

// Set up Helmet with CSP disabled for frontend integrations and allow popups for Google OAuth
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Standard body-parsers with rawBody capture for webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Attach standard response helper
app.use(responseHandler);

// Static public folder
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes at /api and /api/v1
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

// Health check routes
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend API is healthy',
    data: {
      status: 'UP',
      service: 'ManageMyGate API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

// Privacy policy public route
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

// Mount Swagger UI at root
app.use('/', swaggerRouter);

// Error handling middlewares
app.use(pageNotFound);
app.use(errorHandler);

export default app;
