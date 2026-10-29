import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import storage from '../utils/storage';
import { getSafeApiErrorMessage, isNetworkFailure, isTimeoutFailure, reportApiFailure, reportApiSuccess } from './networkStatus';

// A pure JavaScript UUID v4 generator to prevent Expo native crypto errors
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const PRODUCTION_API_URL = 'https://managemygate.e3esg.com/api/v1';
export const PRODUCTION_SOCKET_URL = 'https://managemygate.e3esg.com';

export const getApiBaseUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL;

  // In production builds, never allow local/LAN or emulator fallback IPs
  if (!__DEV__) {
    if (!url || /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(url)) {
      return PRODUCTION_API_URL;
    }
    return url;
  }

  // 1. Web browser development: route through Metro proxy when running locally to eliminate browser CORS blocks
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const isLocalBrowser = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i.test(window.location.hostname);
    if (isLocalBrowser) {
      if (url && (url.includes(':5006') || url.includes('localhost') || url.includes('127.0.0.1'))) {
        return url;
      }
      return `${window.location.origin}/api/v1`;
    }
    if (url) return url;
  }

  // 2. Native mobile development: if explicit remote API URL provided, prioritize it
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }

  // 3. Native mobile development (Expo Go / Dev Client): connect to developer's local machine running backend
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5006/api/v1`;
    }
  }

  // 4. Android Emulator fallback
  if (Platform.OS === 'android') {
    if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'http://10.0.2.2:5006/api/v1';
    }
  }

  // 5. Default fallback
  return url || 'http://localhost:5006/api/v1';
};

export const getDefaultBaseUrl = getApiBaseUrl;

// Authentication calls must never enter the refresh-token retry flow. In
// particular, an Apple identity-token validation error must be shown as such,
// rather than being replaced with the misleading "Session expired" message.
const AUTHENTICATION_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/refresh-token',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google',
  '/auth/microsoft',
  '/auth/apple',
  '/auth/logout',
  '/auth/invitations/accept',
  '/auth/accept-invite',
]);

export const isAuthenticationRequest = (url?: string): boolean => {
  if (!url) return false;

  // Axios may retain a relative route, a route prefixed with /api/v1, or an
  // absolute URL depending on the adapter. Normalize all of those forms.
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return [...AUTHENTICATION_ENDPOINTS].some(
    (endpoint) => normalizedPath === endpoint || normalizedPath.endsWith(endpoint)
  );
};

export const getSocketBaseUrl = () => {
  let socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;

  // In production builds, never allow local/LAN or emulator fallback socket URLs
  if (!__DEV__) {
    if (!socketUrl || /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(socketUrl)) {
      return PRODUCTION_SOCKET_URL;
    }
    return socketUrl;
  }

  // 1. Web browser development: align socket with browser's origin for Metro proxy
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const isLocalBrowser = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i.test(window.location.hostname);
    if (isLocalBrowser) {
      if (socketUrl && (socketUrl.includes(':5006') || socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1'))) {
        return socketUrl;
      }
      return window.location.origin;
    }
    if (socketUrl) return socketUrl;
  }

  // 2. Native mobile development: if explicit remote socket URL provided, prioritize it
  if (socketUrl && !socketUrl.includes('localhost') && !socketUrl.includes('127.0.0.1')) {
    return socketUrl;
  }

  // 3. Native mobile development: connect socket to developer's local machine
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5006`;
    }
  }

  // 4. Android Emulator fallback
  if (Platform.OS === 'android') {
    if (!socketUrl || socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
      return 'http://10.0.2.2:5006';
    }
  }

  // 5. Default fallback
  return socketUrl || 'http://localhost:5006';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'APP',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
  timeout: 15000,
  withCredentials: true,
  // Treat 304 as valid to prevent unhandled cross-origin XHR network errors
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});


let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}> = [];

let store: any;

const inFlightRequests = new Map<string, AbortController>();

export const cancelInFlightRequests = (reason = 'Tenant switch or session termination') => {
  inFlightRequests.forEach((controller) => {
    try {
      controller.abort(reason);
    } catch (e) {}
  });
  inFlightRequests.clear();
};

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

// Helper to safely extract payload claims from JWT token with in-memory caching
let cachedJwtToken: string | null = null;
let cachedJwtPayload: any = null;

const decodeJwtPayload = (token: string): any => {
  if (!token || typeof token !== 'string') return null;
  if (token === cachedJwtToken && cachedJwtPayload !== null) {
    return cachedJwtPayload;
  }

  let result: any = null;
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
      result = JSON.parse(jsonPayload);
    }
  } catch (e) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2 && typeof atob === 'function') {
        result = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      }
    } catch (e2) {}
  }

  if (result) {
    cachedJwtToken = token;
    cachedJwtPayload = result;
  }
  return result;
};

// Request Interceptor: Attach headers and correlation ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Dynamically align baseURL with the active runtime environment
    config.baseURL = getApiBaseUrl();

    // Generate and inject a unique Request Correlation ID
    const requestId = (config.headers['X-Request-ID'] as string) || generateUUID();
    config.headers['X-Request-ID'] = requestId;
    (config as any)._requestId = requestId;

    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      inFlightRequests.set(requestId, controller);
    }
    config.headers['X-Client-Type'] = 'APP';

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
        state?.auth?.user?.communityId ||
        state?.auth?.user?.organizationId ||
        state?.auth?.user?.org?._id ||
        state?.auth?.user?.org ||
        state?.auth?.user?.activeOrgId ||
        state?.auth?.user?.activeOrganizationId ||
        (Array.isArray(state?.auth?.user?.availableWorkspaces) && state?.auth?.user?.availableWorkspaces[0]?.orgId) ||
        (Array.isArray(state?.auth?.user?.availableWorkspaces) && state?.auth?.user?.availableWorkspaces[0]?._id);

      let storedUser: any = null;
      if (!rawOrgId) {
        const userStr = await storage.getItem('user');
        if (userStr) {
          try {
            storedUser = JSON.parse(userStr);
            rawOrgId =
              storedUser?.orgId ||
              storedUser?.communityId ||
              storedUser?.organizationId ||
              storedUser?.org?._id ||
              storedUser?.org ||
              storedUser?.activeOrgId ||
              storedUser?.activeOrganizationId ||
              (Array.isArray(storedUser?.availableWorkspaces) && storedUser?.availableWorkspaces[0]?.orgId) ||
              (Array.isArray(storedUser?.availableWorkspaces) && storedUser?.availableWorkspaces[0]?._id);
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

      // Extract target orgId from URL if requesting an organization-scoped endpoint (e.g., /organizations/:id/features)
      const urlOrgMatch = config.url ? config.url.match(/\/organizations\/([a-fA-F0-9]{24})/) : null;
      const targetUrlOrgId = urlOrgMatch ? urlOrgMatch[1] : null;

      let activeOrgId =
        targetUrlOrgId ||
        (typeof rawOrgId === 'object' && rawOrgId !== null
          ? rawOrgId._id || rawOrgId.id || String(rawOrgId)
          : rawOrgId);

      // Validate against availableWorkspaces so a stale or deleted workspace context is never sent
      const availableWorkspaces =
        state?.auth?.user?.availableWorkspaces ||
        (storedUser && storedUser.availableWorkspaces);
      if (
        !targetUrlOrgId &&
        Array.isArray(availableWorkspaces) &&
        availableWorkspaces.length > 0 &&
        activeOrgId
      ) {
        const isValid = availableWorkspaces.some(
          (w: any) =>
            String(w?.orgId || w?._id || w?.id || '') === String(activeOrgId)
        );
        if (!isValid) {
          const fallback =
            availableWorkspaces[0]?.orgId ||
            availableWorkspaces[0]?._id ||
            availableWorkspaces[0]?.id;
          if (fallback) {
            activeOrgId = String(fallback);
          }
        }
      }

      if (activeOrgId && activeOrgId !== '[object Object]') {
        config.headers['x-organization-id'] = activeOrgId;
        (config as any)._tenantId = activeOrgId;
      }

      let rawUserId =
        state?.auth?.user?.id ||
        state?.auth?.user?._id ||
        state?.auth?.user?.userId;

      if (!rawUserId) {
        const userStr = await storage.getItem('user');
        if (userStr) {
          try {
            const parsedUser = JSON.parse(userStr);
            rawUserId = parsedUser?.id || parsedUser?._id || parsedUser?.userId;
          } catch (e) {}
        }
      }

      if (!rawUserId && token) {
        const jwtData = decodeJwtPayload(token);
        rawUserId = jwtData?.id || jwtData?._id || jwtData?.userId || jwtData?.sub;
      }

      if (rawUserId && typeof rawUserId === 'string' && rawUserId !== '[object Object]') {
        config.headers['X-User-ID'] = rawUserId;
      }
    } catch (err) {
      console.error('Failed to inject headers in mobile request interceptor:', err);
    }

    // Handle multipart form data Content-Type override for FormData payloads
    const isFormData =
      config.data &&
      (config.data instanceof FormData ||
        typeof (config.data as any)?._parts !== 'undefined' ||
        typeof (config.data as any)?.getParts === 'function');

    if (isFormData) {
      // In both Web and React Native, deleting Content-Type allows the runtime (browser/XHR)
      // to automatically set "multipart/form-data; boundary=..." with the correct boundary string.
      delete config.headers['Content-Type'];
    }

    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract envelope data and handle JWT refresh
apiClient.interceptors.response.use(
  (response) => {
    const reqId = (response.config as any)?._requestId;
    if (reqId) inFlightRequests.delete(reqId);

    // F04: Discard response if tenant context switched while request was in-flight
    const reqTenantId = (response.config as any)?._tenantId;
    if (store && reqTenantId) {
      const currentState = store.getState() as any;
      const currentActiveOrgId =
        currentState?.workspace?.activeOrganizationId ||
        currentState?.auth?.user?.activeOrgId ||
        currentState?.auth?.user?.orgId ||
        null;

      if (!currentActiveOrgId || reqTenantId !== currentActiveOrgId) {
        console.warn(
          `[Mobile ApiClient] Stale tenant response discarded: requested for ${reqTenantId}, active is ${currentActiveOrgId || 'NONE (Logged out)'}`
        );
        return Promise.reject(
          new axios.Cancel(`Stale tenant response discarded for superseded tenant ${reqTenantId}`)
        );
      }
    }

    // If 304 Not Modified without body, safely return success envelope
    if (response.status === 304 && !response.data) {
      return { success: true, message: 'Not Modified', data: null, notModified: true };
    }
    reportApiSuccess();
    // Opt-in for binary downloads that need response headers (filename, row counts)
    if ((response.config as any)?.rawResponse) return response as any;
    // Return the backend's standard { success, message, data } envelope
    return response.data;
  },
  async (error) => {
    const reqId = (error.config as any)?._requestId;
    if (reqId) inFlightRequests.delete(reqId);

    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    const originalRequest = error.config;

    if (isTimeoutFailure(error)) reportApiFailure('timeout');
    else if (isNetworkFailure(error)) reportApiFailure('backend_unavailable');

    const isAuthEndpoint = isAuthenticationRequest(originalRequest?.url);

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
        let refreshToken = store?.getState?.()?.auth?.refreshToken || null;
        if (!refreshToken) {
          refreshToken = await storage.getItem('refreshToken');
        }

        if (!refreshToken) {
          // Stale session without refresh token: clear storage and auto-logout cleanly
          await storage.removeItem('token');
          await storage.removeItem('refreshToken');
          await storage.removeItem('user');

          if (store) {
            try {
              store.dispatch({ type: 'auth/logout' });
            } catch (dispatchErr) {}
          }
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }

        // Keep the community/role/unit the app is using; the server re-checks membership
        const activeUser: any = store?.getState?.()?.auth?.user || null;
        const res = await axios.post(
          `${getApiBaseUrl()}/auth/refresh-token`,
          {
            refreshToken,
            ...(activeUser?.orgId ? { targetOrgId: activeUser.orgId } : {}),
            ...(activeUser?.role ? { targetRole: activeUser.role } : {}),
            ...(activeUser?.villaId ? { targetVillaId: activeUser.villaId } : {}),
          },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );

        if (res.status === 200 || res.status === 201) {
          const resData = res.data?.data || res.data;
          const newToken = resData?.token || res.data?.token;
          const newRefreshToken = resData?.refreshToken || res.data?.refreshToken || refreshToken;

          if (newToken) {
            await storage.setItem('token', newToken);
            if (newRefreshToken) {
              await storage.setItem('refreshToken', newRefreshToken);
            }

            if (store) {
              try {
                store.dispatch({
                  type: 'auth/updateTokenAndUser',
                  payload: { token: newToken, refreshToken: newRefreshToken },
                });
              } catch (dispatchErr) {
                console.error('Failed to update refreshed token in store:', dispatchErr);
              }
            }

            apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
            originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

            processQueue(null, newToken);
            return apiClient(originalRequest);
          }
        }
        throw new Error('Session expired. Please log in again.');
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // A connectivity failure during token refresh is not proof that the session expired.
        // Preserve the local session and let normal recovery retry after reconnection.
        if (isNetworkFailure(refreshError) || isTimeoutFailure(refreshError)) {
          if (isTimeoutFailure(refreshError)) reportApiFailure('timeout');
          else reportApiFailure('backend_unavailable');
          return Promise.reject(Object.assign(refreshError, { message: getSafeApiErrorMessage(refreshError) }));
        }

        // Wipe local storage items so stale credentials don't persist
        try {
          await storage.removeItem('token');
          await storage.removeItem('refreshToken');
          await storage.removeItem('user');
        } catch (e) {}

        if (store) {
          try {
            store.dispatch({ type: 'auth/logout' });
          } catch (dispatchErr) {
            console.error('Failed to trigger mobile auto-logout on refresh failure', dispatchErr);
          }
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 400 && error.response?.data?.message === 'Workspace context is required.') {
      console.warn('[ApiClient] Workspace context missing on request. Preserving session.');
    }

    if (
      (error.response?.status === 403 || error.response?.status === 404) &&
      error.response?.data?.message &&
      (
        error.response.data.message.includes('do not have an active membership') ||
        error.response.data.message.includes('Organization not found') ||
        error.response.data.message.includes('Workspace not found')
      )
    ) {
      if (store) {
        try {
          const { switchWorkspaceContextThunk } = require('../features/auth/store/authSlice');
          store.dispatch(switchWorkspaceContextThunk({}));
        } catch (e) {}
      }
    }

    // Keep a single user-safe message at the API boundary. Screens can still render their own
    // domain errors, but no URL, backend implementation detail, or duplicate network banner leaks.
    error.message = getSafeApiErrorMessage(error);

    return Promise.reject(error);
  }
);

export default apiClient;




