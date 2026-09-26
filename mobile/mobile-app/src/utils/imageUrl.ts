import apiClient, { PRODUCTION_API_URL } from '../services/apiClient';

/**
 * Normalizes an image path or URL into a fully-qualified absolute URL
 * compatible with React Native <Image source={{ uri }} /> on iOS/Android/Web.
 */
export function getImageUrl(uri?: string | null): string {
  if (!uri) return '';
  const trimmed = String(uri).trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const apiBaseURL = apiClient.defaults.baseURL || PRODUCTION_API_URL;
  const host = apiBaseURL.replace(/\/api(\/v\d+)?\/?$/, '');
  return `${host}${relativePath}`;
}

export default getImageUrl;
