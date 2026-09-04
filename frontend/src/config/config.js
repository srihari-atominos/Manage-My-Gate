export const isMockRazorpayKey = (key) => {
  if (!key) return true;
  const str = String(key).trim();
  if (
    !str ||
    str.includes('mock') ||
    str.includes('dummy') ||
    str.includes('TG9RGkcF') ||
    str === 'rzp_test_12345' ||
    str === 'rzp_test_mockkey' ||
    str === 'test_key' ||
    str.length < 15
  ) {
    return true;
  }
  return false;
};

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
  razorpayKey: import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mockkey',
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_mockkey',
  publicUrl:
    import.meta.env.VITE_PUBLIC_URL ||
    (typeof window !== 'undefined' ? window.location.origin : ''),
  appName: import.meta.env.VITE_APP_NAME || 'Portal',
}

export default config
