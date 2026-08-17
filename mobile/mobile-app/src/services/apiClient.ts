import axios, { InternalAxiosRequestConfig } from 'axios';

// A pure JavaScript UUID v4 generator to prevent Expo native crypto errors
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

import { Platform } from 'react-native';

const getDefaultBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5002/api';
  }
  return 'http://localhost:5002/api';
};

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}> = [];

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

// Request Interceptor: Attach headers and correlation ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Generate and inject a unique Request Correlation ID
    config.headers['X-Request-ID'] = generateUUID();

    try {
      // Dynamic import to prevent circular dependency issues during initialization
      const { store } = await import('../store/store');
      const state = store.getState() as any;

      const token = state.auth?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Attach active organization (tenant) ID if available
      // The workspace slice does not exist; pull from the auth user context
      if (state.auth?.user?.orgId) {
        config.headers['x-organization-id'] = state.auth.user.orgId;
      } else if (state.auth?.user?.availableWorkspaces?.[0]?.orgId) {
        config.headers['x-organization-id'] = state.auth.user.availableWorkspaces[0].orgId;
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
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (res.status === 200 || res.status === 201) {
          const newToken = res.data.token;

          try {
            const { store } = await import('../store/store');
            const { updateTokenAndUser } = await import('../features/auth/store/authSlice');
            store.dispatch(updateTokenAndUser({ token: newToken }));
          } catch (dispatchErr) {
            console.error('Failed to update refreshed token in store:', dispatchErr);
          }

          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

          processQueue(null, newToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        try {
          const { store } = await import('../store/store');
          const { logout } = await import('../features/auth/store/authSlice');
          store.dispatch(logout());
        } catch (dispatchErr) {
          console.error('Failed to trigger mobile auto-logout on refresh failure', dispatchErr);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
