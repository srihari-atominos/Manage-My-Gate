/**
 * Resolves whether an HTTP request originates from the Mobile App or Web Client.
 * Inspects explicit headers, payload properties, query parameters, Origin/Referer, and User-Agent.
 * 
 * @param {import('express').Request} req
 * @returns {'APP' | 'WEB'}
 */
export const resolveInvitationSource = (req) => {
  if (!req) return 'WEB';

  // 1. Explicit Headers (X-Client-Type or X-Client-Source)
  const clientType = req.get?.('x-client-type') || req.headers?.['x-client-type'] || '';
  const clientSource = req.get?.('x-client-source') || req.headers?.['x-client-source'] || '';
  const headerVal = String(clientType || clientSource).trim().toUpperCase();
  if (headerVal === 'APP' || headerVal === 'MOBILE') return 'APP';
  if (headerVal === 'WEB') return 'WEB';

  // 2. Body Payload
  const bodySource = String(req.body?.invitationSource || req.body?.source || '').trim().toUpperCase();
  if (bodySource === 'APP' || bodySource === 'MOBILE') return 'APP';
  if (bodySource === 'WEB') return 'WEB';

  // 3. Query Parameters
  const querySource = String(req.query?.invitationSource || req.query?.source || '').trim().toUpperCase();
  if (querySource === 'APP' || querySource === 'MOBILE') return 'APP';
  if (querySource === 'WEB') return 'WEB';

  // 4. Origin & Referer Inspection (Port 8081/8082/19006 = Mobile App; Port 3004/3000/5173 = Web App)
  const origin = String(req.get?.('origin') || req.headers?.origin || req.get?.('referer') || req.headers?.referer || '');
  if (origin.includes(':8081') || origin.includes(':8082') || origin.includes(':19006') || origin.includes('/invite/app')) {
    return 'APP';
  }
  if (origin.includes(':3004') || origin.includes(':3000') || origin.includes(':5173') || origin.includes('/invite/web')) {
    return 'WEB';
  }

  // 5. User-Agent Inspection (React Native / Expo / Mobile OS)
  const userAgent = String(req.get?.('user-agent') || req.headers?.['user-agent'] || '');
  if (/expo|okhttp|reactnative|cfnetwork|android|iphone|ipad/i.test(userAgent)) {
    return 'APP';
  }

  return 'WEB';
};

/**
 * Generates the canonical universal invitation link (/invite/:token).
 * 
 * @param {string} invitationToken - The generated raw invitation token
 * @param {string} [invitationSource='WEB'] - Backward-compatible source parameter
 * @returns {string} The canonical universal client-side invitation URL
 */
export const generateInviteLink = (invitationToken, invitationSource = 'WEB') => {
  const defaultProductionBaseUrl = 'https://managemygate.e3esg.com';
  const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1|::1/i.test(url);
  const source = String(invitationSource || 'WEB').toUpperCase();

  let rawUrl = (source === 'APP' || source === 'MOBILE')
    ? (process.env.APP_CLIENT_URL || process.env.CLIENT_URL || process.env.WEB_CLIENT_URL)
    : (process.env.WEB_CLIENT_URL || process.env.CLIENT_URL);

  if (!rawUrl || (process.env.NODE_ENV === 'production' && isLocalhost(rawUrl))) {
    rawUrl = defaultProductionBaseUrl;
  }

  const baseUrl = rawUrl.trim().replace(/\/+$/, '');
  return `${baseUrl}/invite/${invitationToken}`;
};

/**
 * Generates legacy invitation links for backward compatibility (/invite/web/:token, /invite/app/:token).
 * 
 * @param {string} invitationToken - The generated raw invitation token
 * @param {string} [invitationSource='WEB'] - Source ('WEB' or 'APP')
 * @returns {string} Legacy formatted invitation URL
 */
export const generateLegacyInviteLink = (invitationToken, invitationSource = 'WEB') => {
  const defaultProductionBaseUrl = 'https://managemygate.e3esg.com';
  const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1|::1/i.test(url);
  const source = String(invitationSource || 'WEB').toUpperCase();

  let rawUrl = (source === 'APP' || source === 'MOBILE')
    ? (process.env.APP_CLIENT_URL || process.env.CLIENT_URL)
    : (process.env.WEB_CLIENT_URL || process.env.CLIENT_URL);

  if (!rawUrl || (process.env.NODE_ENV === 'production' && isLocalhost(rawUrl))) {
    rawUrl = defaultProductionBaseUrl;
  }

  const baseUrl = rawUrl.trim().replace(/\/+$/, '');
  const prefix = (source === 'APP' || source === 'MOBILE') ? 'app' : 'web';
  return `${baseUrl}/invite/${prefix}/${invitationToken}`;
};

export default {
  resolveInvitationSource,
  generateInviteLink,
  generateLegacyInviteLink,
};
