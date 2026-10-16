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

let storeInstance = null

export const injectStore = (_store) => {
  storeInstance = _store
}

const inFlightAbortControllers = new Map()

export const cancelInFlightRequests = (reason = 'Tenant switch or session termination') => {
  inFlightAbortControllers.forEach((controller) => {
    try {
      controller.abort(reason)
    } catch (e) {}
  })
  inFlightAbortControllers.clear()
}

// Request Interceptor: Inject Token and Correlation ID
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Generate and inject a unique Request Correlation ID
    const requestId = uuidv4()
    config.headers['X-Request-ID'] = requestId

    // Attach AbortController for in-flight request cancellation if not already provided
    if (!config.signal) {
      const controller = new AbortController()
      config.signal = controller.signal
      inFlightAbortControllers.set(requestId, controller)
      config._requestId = requestId
    }
    
    // Resolve store state to get active organization
    try {
      let store = storeInstance
      if (!store) {
        const storeModule = await import('../store/store.js')
        store = storeModule.store
      }
      const state = store ? store.getState() : {}
      const rawOrgId =
        state.workspace?.activeOrganizationId ||
        state.auth?.user?.orgId ||
        state.auth?.user?.organizationId ||
        state.auth?.user?.org?._id ||
        state.auth?.user?.org

      const activeOrgId =
        typeof rawOrgId === 'object' && rawOrgId !== null
          ? rawOrgId._id || rawOrgId.id || String(rawOrgId)
          : rawOrgId

      if (activeOrgId && activeOrgId !== '[object Object]') {
        config.headers['x-organization-id'] = activeOrgId
        config._tenantId = activeOrgId
      }
    } catch (err) {
      console.error('Failed to inject x-organization-id in request interceptor:', err)
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Catch global errors
apiClient.interceptors.response.use(
  async (response) => {
    if (response.config?._requestId) {
      inFlightAbortControllers.delete(response.config._requestId)
    }

    // F04: Discard response if tenant context switched while request was in-flight
    try {
      let store = storeInstance
      if (!store) {
        const storeModule = await import('../store/store.js')
        store = storeModule.store
      }
      if (store && response.config?._tenantId) {
        const state = store.getState()
        const currentActiveOrgId =
          state.workspace?.activeOrganizationId ||
          state.auth?.user?.orgId ||
          state.auth?.user?.organizationId ||
          null

        if (!currentActiveOrgId || response.config._tenantId !== currentActiveOrgId) {
          console.warn(
            `[ApiClient] Stale tenant response discarded: requested for ${response.config._tenantId}, but active tenant is now ${currentActiveOrgId || 'NONE (Logged out)'}`,
          )
          const staleError = new axios.Cancel(
            `Stale tenant response discarded for superseded tenant ${response.config._tenantId}`,
          )
          return Promise.reject(staleError)
        }
      }
    } catch (err) {}

    return response.data
  },
  async (error) => {
    if (error.config?._requestId) {
      inFlightAbortControllers.delete(error.config._requestId)
    }

    // Pass through canceled requests cleanly
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

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
      cancelInFlightRequests('Session expired')
      try {
        let store = storeInstance
        if (!store) {
          const storeModule = await import('../store/store.js')
          store = storeModule.store
        }
        const { logout } = await import('../features/auth/store/authSlice.js')
        if (store) store.dispatch(logout())
      } catch (dispatchErr) {
        console.error('Failed to trigger automatic logout on 401', dispatchErr)
      }
      
      // Fallback redirect to login page
      window.location.pathname = '/login'
    }
    
    if (error.response?.status === 400 && error.response?.data?.message === 'Workspace context is required.') {
      console.warn('Workspace context lost. Forcing auto-logout to recover corrupted local state.');
      cancelInFlightRequests('Workspace context lost')
      try {
        let store = storeInstance
        if (!store) {
          const storeModule = await import('../store/store.js')
          store = storeModule.store
        }
        const { logout } = await import('../features/auth/store/authSlice.js')
        if (store) store.dispatch(logout())
      } catch (dispatchErr) {
        console.error('Failed to trigger automatic logout on 400 Bad Request', dispatchErr)
      }
      window.location.pathname = '/login'
    }

    // Extract backend error message if available to prevent raw Axios error strings
    if (error.response && error.response.data && error.response.data.message) {
      error.message = error.response.data.message;
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
