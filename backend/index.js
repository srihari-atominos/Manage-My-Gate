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

// Set up CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // In development mode, allow any localhost, 127.0.0.1, [::1], or private IP subnet origins
    const isDev = config.nodeEnv === 'development';
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
    
    if (
      (isDev && isLocal) ||
      config.cors.allowedOrigins.indexOf(origin) !== -1 ||
      config.cors.allowedOrigins.includes('*')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Set up Helmet with CSP disabled for frontend integrations
app.use(helmet({
  contentSecurityPolicy: false
}));

// Standard body-parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Attach standard response helper
app.use(responseHandler);

// Static public folder
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes at /api
app.use('/api', apiRouter);

// Mount Swagger UI at root
app.use('/', swaggerRouter);

// Error handling middlewares
app.use(pageNotFound);
app.use(errorHandler);

export default app;
