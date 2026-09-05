import axios, { InternalAxiosRequestConfig } from 'axios';
import storage from '../utils/storage';

// A pure JavaScript UUID v4 generator to prevent Expo native crypto errors
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

import { Platform } from 'react-native';

export const getApiBaseUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5002/api/v1' : 'http://localhost:5002/api/v1');
  if (Platform.OS === 'android' && url.includes('localhost')) {
    url = url.replace('localhost', '10.0.2.2');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isPrivateIpUrl = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?/i.test(url);
    if (isLocalHost && isPrivateIpUrl) {
      url = url.replace(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i, `${window.location.protocol}//localhost`);
    }
  }
  return url;
};

export const getSocketBaseUrl = () => {
  let socketUrl =
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    (process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api.*$/, '') : 'http://localhost:5002');
  if (Platform.OS === 'android' && socketUrl.includes('localhost')) {
    socketUrl = socketUrl.replace('localhost', '10.0.2.2');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isPrivateIpUrl = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?/i.test(socketUrl);
    if (isLocalHost && isPrivateIpUrl) {
      socketUrl = socketUrl.replace(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i, `${window.location.protocol}//localhost`);
    }
  }
  return socketUrl;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

console.log(`[ApiClient] Configured baseURL: ${apiClient.defaults.baseURL}`);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}> = [];

let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Helper to safely extract payload claims from JWT token
const decodeJwtPayload = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob === 'function') {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
    return null;
  } catch (e) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2 && typeof atob === 'function') {
        return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      }
    } catch (e2) {}
    return null;
  }
};

// Request Interceptor: Attach headers and correlation ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Generate and inject a unique Request Correlation ID
    config.headers['X-Request-ID'] = generateUUID();

    try {
      const state = store ? (store.getState() as any) : null;

      let token = state?.auth?.token;
      if (!token) {
        token = await storage.getItem('token');
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      let rawOrgId =
        state?.workspace?.activeOrganizationId ||
        state?.auth?.user?.orgId ||
        state?.auth?.user?.organizationId ||
        state?.auth?.user?.org?._id ||
        state?.auth?.user?.org ||
        state?.auth?.user?.activeOrgId ||
        state?.auth?.user?.activeOrganizationId ||
        (Array.isArray(state?.auth?.user?.availableWorkspaces) && state?.auth?.user?.availableWorkspaces[0]?.orgId) ||
        (Array.isArray(state?.auth?.user?.availableWorkspaces) && state?.auth?.user?.availableWorkspaces[0]?._id);

      if (!rawOrgId) {
        const userStr = await storage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            rawOrgId =
              user?.orgId ||
              user?.organizationId ||
              user?.org?._id ||
              user?.org ||
              user?.activeOrgId ||
              user?.activeOrganizationId ||
              (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?.orgId) ||
              (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?._id);
          } catch (e) {}
        }
      }

      // If orgId is still missing, extract it directly from the JWT token payload claims
      if (!rawOrgId && token) {
        const jwtData = decodeJwtPayload(token);
        rawOrgId =
          jwtData?.orgId ||
          jwtData?.organizationId ||
          jwtData?.org ||
          jwtData?.activeOrgId;
      }

      const activeOrgId =
        typeof rawOrgId === 'object' && rawOrgId !== null
          ? rawOrgId._id || rawOrgId.id || String(rawOrgId)
          : rawOrgId;

      if (activeOrgId && activeOrgId !== '[object Object]') {
        config.headers['x-organization-id'] = activeOrgId;
      }
    } catch (err) {
      console.error('Failed to inject headers in mobile request interceptor:', err);
    }

    // Handle multipart form data Content-Type override for FormData payloads
    if (config.data && config.data instanceof FormData) {
      if (Platform.OS === 'web') {
        // Let browser set the header with boundary
        delete config.headers['Content-Type'];
      } else {
        config.headers['Content-Type'] = 'multipart/form-data';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract envelope data and handle JWT refresh
apiClient.interceptors.response.use(
  (response) => {
    // Return the backend's standard { success, message, data } envelope
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.message === 'Network Error') {
      console.warn('Network Error - check backend server connectivity');
    }

    const isAuthEndpoint = originalRequest?.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh-token') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/forgot-password') ||
      originalRequest.url.includes('/auth/reset-password')
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh-token`,
          {},
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );

        if (res.status === 200 || res.status === 201) {
          const newToken = res.data.token;

          if (store) {
            try {
              // Dispatch plain action object to avoid dynamic import of authSlice
              store.dispatch({ type: 'auth/updateTokenAndUser', payload: { token: newToken } });
            } catch (dispatchErr) {
              console.error('Failed to update refreshed token in store:', dispatchErr);
            }
          }

          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

          processQueue(null, newToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (store) {
          try {
            store.dispatch({ type: 'auth/logout' });
          } catch (dispatchErr) {
            console.error('Failed to trigger mobile auto-logout on refresh failure', dispatchErr);
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 400 && error.response?.data?.message === 'Workspace context is required.') {
      console.warn('[ApiClient] Workspace context missing on request. Preserving session.');
    }

    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      error.message = 'Connection timed out. Please check backend server status.';
    } else if (error.message === 'Network Error' || (!error.response && error.request)) {
      error.message = 'Unable to connect to server. Please verify backend is running.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
