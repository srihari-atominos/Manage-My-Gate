/**
 * Frontend Application Configuration
 * Centralizes all parsed environment variables and configurations with clean fallbacks.
 */
export const config = {
  isDev: import.meta.env.DEV || import.meta.env.MODE === 'development',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  socketUrl:
    import.meta.env.VITE_SOCKET_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5002'),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  microsoftClientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
  microsoftTenantId: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common',
  razorpayKey: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_mockkey',
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY',
  publicUrl:
    import.meta.env.VITE_PUBLIC_URL ||
    (typeof window !== 'undefined' ? window.location.origin : ''),
  appName: import.meta.env.VITE_APP_NAME || 'Portal',
}

export default config
