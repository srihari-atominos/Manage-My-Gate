import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token and correlation ID (X-Request-ID)
apiClient.interceptors.request.use(
  (config) => {
    // Attach authorization token if stored in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Generate and inject request Correlation ID
    const requestId = uuidv4();
    config.headers['X-Request-ID'] = requestId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for standardized backend response envelopes and logging
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns { success: true, message: '...', data: ... }
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'API request failed';
    const details = error.response?.data?.details || null;
    const statusCode = error.response?.status || 500;

    // Retrieve correlation ID from request configuration
    const requestId = error.config?.headers?.['X-Request-ID'] || 'N/A';
    const endpoint = error.config?.url || 'Unknown';
    const method = error.config?.method?.toUpperCase() || 'HTTP';

    // Log the API failure using the custom environment-aware logger
    logger.error(`API Request [${method} ${endpoint}] failed with status ${statusCode}. Request ID: ${requestId}. Message: ${message}`);

    return Promise.reject({
      message,
      details,
      statusCode,
      requestId,
      originalError: error,
    });
  }
);

export default apiClient;
