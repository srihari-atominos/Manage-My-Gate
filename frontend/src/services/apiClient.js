import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'react-hot-toast'
import config from '../config/config.js'

/**
 * Global API Client
 *
 * Configured Axios instance with request and response interceptors.
 * Handles automatic inclusion of Authorization & X-Request-ID headers,
 * and intercepts 401 Unauthorized responses to perform automatic logout.
 */
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for secure cookies (Refresh Token)
})

let store
let refreshPromise = null

const inFlightAbortControllers = new Map()

export const cancelInFlightRequests = (reason = 'Tenant switch or session termination') => {
  inFlightAbortControllers.forEach((controller) => {
    try {
      controller.abort(reason)
    } catch (e) {}
  })
  inFlightAbortControllers.clear()
}

export const injectStore = (_store) => {
  store = _store
}

const isAuthUrl = (url = '') =>
  [
    '/auth/login',
    '/auth/refresh-token',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-phone',
    '/auth/verify-email-otp',
    '/auth/accept-invite',
    '/auth/accept_invite',
  ].some((fragment) => url.includes(fragment))

// True when the JWT is expired or about to expire (30s margin). Unreadable tokens count as fresh so the
// server stays the judge.
const isTokenExpiring = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 30000
  } catch {
    return false
  }
}

/**
 * Gets a new access token using the refresh cookie. Single-flight: refresh tokens are single-use, so
 * concurrent callers (many requests failing at once, or a proactive refresh racing a 401) must share
 * one request, otherwise the second use of a rotated token would sign the user out.
 */
const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshBody = {}
    if (store) {
      const state = store.getState()
      const rawOrgId =
        state.workspace?.activeWorkspace?.orgId ||
        state.workspace?.activeWorkspace?.id ||
        state.workspace?.activeWorkspace?._id ||
        state.auth?.user?.orgId ||
        state.auth?.user?.org?._id ||
        state.auth?.user?.org

      const activeOrgId =
        typeof rawOrgId === 'object' && rawOrgId !== null
          ? rawOrgId._id || rawOrgId.id || String(rawOrgId)
          : rawOrgId

      if (activeOrgId && activeOrgId !== '[object Object]') {
        refreshBody.targetOrgId = activeOrgId
      }
      if (state.auth?.user?.role) {
        refreshBody.targetRole = state.auth.user.role
      }
      // Keep the unit the user is acting for; without it a multi-unit resident falls back to a default unit
      if (state.auth?.user?.villaId) {
        refreshBody.targetVillaId = state.auth.user.villaId
      }
    }

    const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh-token`, refreshBody, {
      withCredentials: true,
    })
    const newToken = res.data?.token || res.data?.data?.token
    if (!newToken) throw new Error('Refresh response did not include a token')

    if (store) {
      store.dispatch({ type: 'auth/updateTokenAndUser', payload: { token: newToken } })
    }
    apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken
    return newToken
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

// Request Interceptor: Inject Token and Correlation ID
apiClient.interceptors.request.use(
  async (config) => {
    // Sanitize config.url to avoid duplicate '/api/api/' prefixes
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.substring(4)
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

    // Use injected store to get state
    try {
      if (store) {
        const state = store.getState()

        let token = state.auth?.token || localStorage.getItem('token')
        // A token that is already expired would just earn a 401 (and a red console error) before the silent
        // refresh retries it, so renew it first. Failures fall through to the normal 401 handling.
        if (token && !isAuthUrl(config.url) && isTokenExpiring(token)) {
          try {
            token = await refreshAccessToken()
          } catch {
            /* handled by the 401 path */
          }
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

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

        if (
          activeOrgId &&
          activeOrgId !== '[object Object]' &&
          !config.headers['x-organization-id']
        ) {
          config.headers['x-organization-id'] = activeOrgId
          config._tenantId = activeOrgId
        }
      }
    } catch (err) {
      console.error('Failed to inject headers in request interceptor:', err)
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Response Interceptor: Catch global errors
apiClient.interceptors.response.use(
  (response) => {
    if (response.config?._requestId) {
      inFlightAbortControllers.delete(response.config._requestId)
    }

    // F04: Discard response if tenant context switched while request was in-flight
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
    const originalRequest = error.config
    // Check if error is due to CORS (or network error where response is undefined)
    if (
      error.message === 'Network Error' ||
      (error.response &&
        error.response.data &&
        error.response.data.message === 'Not allowed by CORS')
    ) {
      toast.error('Not allowed by CORS')
    }

    // Handle 502 Bad Gateway
    if (error.response && error.response.status === 502) {
      toast.error('Request failed with status code 502')
    }

    // Handle 401 Unauthorized globally with Silent Refresh
    // Auth endpoints (login, register, refresh-token, etc.) must not trigger a silent refresh retry
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthUrl(originalRequest.url)
    ) {
      originalRequest._retry = true
      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken
        return apiClient(originalRequest)
      } catch (refreshError) {
        cancelInFlightRequests('Session expired')
        if (store) {
          store.dispatch({ type: 'auth/logout' })
        }
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Extract backend error message if available to prevent raw Axios error strings
    if (
      error.response?.status === 400 &&
      error.response?.data?.message === 'Workspace context is required.'
    ) {
      console.warn('Workspace context lost. Forcing auto-logout to recover corrupted local state.')
      cancelInFlightRequests('Workspace context lost')
      if (store) {
        try {
          store.dispatch({ type: 'auth/logout' })
        } catch (dispatchErr) {
          console.error('Failed to trigger auto-logout on 400 Bad Request', dispatchErr)
        }
      }
      window.location.href = '/login'
    }

    if (error.response && error.response.data && error.response.data.message) {
      error.message = error.response.data.message
    }

    // Phase 7.1: Intercept 403 SUBSCRIPTION_EXPIRED globally
    if (
      error.response &&
      error.response.status === 403 &&
      error.message === 'SUBSCRIPTION_EXPIRED'
    ) {
      if (store) {
        store.dispatch({ type: 'auth/setLockedOut', payload: true })
      }
      // Force redirect strictly to renewal page
      window.location.href = '/dashboard'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

export default apiClient
