import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'react-hot-toast'

/**
 * Global API Client
 * 
 * Configured Axios instance with request and response interceptors.
 * Handles automatic inclusion of Authorization & X-Request-ID headers,
 * and intercepts 401 Unauthorized responses to perform automatic logout.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for secure cookies (Refresh Token)
})

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Inject Token and Correlation ID
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Dynamically import store to prevent circular dependency crashes during application bootstrap
    try {
      const { store } = await import('../store/store.js')
      const state = store.getState()
      if (state.workspace && state.workspace.activeOrganizationId) {
        config.headers['x-organization-id'] = state.workspace.activeOrganizationId
      }
    } catch (err) {
      console.error('Failed to inject x-organization-id in request interceptor:', err)
    }
    
    // Generate and inject a unique Request Correlation ID
    config.headers['X-Request-ID'] = uuidv4()
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Catch global errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    // Check if error is due to CORS (or network error where response is undefined)
    if (
      error.message === 'Network Error' ||
      (error.response && error.response.data && error.response.data.message === 'Not allowed by CORS')
    ) {
      toast.error('Not allowed by CORS')
    }

    // Handle 502 Bad Gateway
    if (error.response && error.response.status === 502) {
      toast.error('Request failed with status code 502')
    }

    // Handle 401 Unauthorized globally with Silent Refresh
    // Auth endpoints (login, register, refresh-token, etc.) must not trigger a silent refresh retry
    const isAuthEndpoint = originalRequest && originalRequest.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh-token') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/forgot-password') ||
      originalRequest.url.includes('/auth/reset-password') ||
      originalRequest.url.includes('/auth/verify-phone') ||
      originalRequest.url.includes('/auth/verify-email-otp')
    );

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh-token`, {}, { withCredentials: true });
        
        if (res.status === 200 || res.status === 201) {
          const newToken = res.data.token;
          localStorage.setItem('token', newToken);
          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          
          processQueue(null, newToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        try {
          const { store } = await import('../store/store.js')
          const { logout } = await import('../features/auth/store/authSlice.js')
          store.dispatch(logout())
        } catch (dispatchErr) {
          console.error('Failed to trigger automatic logout on 401', dispatchErr)
        }
        window.location.hash = '#/login'
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Extract backend error message if available to prevent raw Axios error strings
    if (error.response && error.response.data && error.response.data.message) {
      error.message = error.response.data.message;
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
