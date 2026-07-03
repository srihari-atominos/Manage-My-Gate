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
})

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

    // Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      try {
        // Dynamic import to prevent circular dependency at compile/load time
        const { store } = await import('../store/store.js')
        const { logout } = await import('../features/auth/store/authSlice.js')
        store.dispatch(logout())
      } catch (dispatchErr) {
        console.error('Failed to trigger automatic logout on 401', dispatchErr)
      }
      
      // Fallback redirect to login page
      window.location.hash = '#/login'
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
