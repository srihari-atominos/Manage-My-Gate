/**
 * Runtime-only credentials for media URLs. React Native's Image and Linking
 * APIs cannot use the Axios interceptor, so protected upload URLs need the
 * same authenticated download contract as other GET requests.
 */
let mediaAuth: { token: string | null } = {
  token: null,
};

/** Store only the short-lived server-issued media capability, never an API JWT. */
export const setProtectedMediaAuth = (token?: string | null) => {
  mediaAuth = {
    token: token || null,
  };
};

export const clearProtectedMediaAuth = () => {
  mediaAuth = { token: null };
};

const isProtectedUploadUrl = (url: string) => /\/(?:public\/)?uploads\//i.test(url);

/**
 * Adds the backend's five-minute, tenant-bound media capability to an upload
 * URL. The API session JWT is never placed into a URL.
 */
export const getAuthenticatedMediaUrl = (url: string): string => {
  if (!url || !isProtectedUploadUrl(url) || !mediaAuth.token) return url;

  try {
    const separator = url.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    params.set('media_token', mediaAuth.token);
    return `${url}${separator}${params.toString()}`;
  } catch {
    return url;
  }
};

export default getAuthenticatedMediaUrl;
