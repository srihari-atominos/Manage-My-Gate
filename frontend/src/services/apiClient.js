import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

/**
 * Global API Client
 * 
 * Configured Axios instance with request and response interceptors.
 * Handles automatic inclusion of Authorization & X-Request-ID headers,
 * and intercepts 401 Unauthorized responses to perform automatic logout.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Inject Token and Correlation ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    // Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      try {
        // Dynamic import to prevent circular dependency at compile/load time
        const { store } = await import('../store/store.js')
        const { logout } = await import('../features/auth/authSlice.js')
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
