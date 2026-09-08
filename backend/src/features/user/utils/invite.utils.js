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
 * Generates the user invitation activation link.
 * 
 * @param {string} invitationToken - The generated invitation token
 * @param {string} [invitationSource='WEB'] - Source of invitation ('WEB' or 'APP')
 * @returns {string} The full client-side registration URL
 */
export const generateInviteLink = (invitationToken, invitationSource = 'WEB') => {
  const source = String(invitationSource || 'WEB').toUpperCase();

  if (source === 'APP' || source === 'MOBILE') {
    const rawAppUrl =
      process.env.APP_CLIENT_URL ||
      (process.env.CLIENT_URL && process.env.CLIENT_URL.includes('8081') ? process.env.CLIENT_URL : null) ||
      'http://localhost:8081';
    const baseUrl = rawAppUrl.replace(/\/+$/, '');
    return `${baseUrl}/invite/app/${invitationToken}`;
  }

  const rawWebUrl =
    process.env.WEB_CLIENT_URL ||
    (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('8081') ? process.env.CLIENT_URL : null) ||
    'http://localhost:3004';
  const baseUrl = rawWebUrl.replace(/\/+$/, '');
  return `${baseUrl}/invite/web/${invitationToken}`;
};

export default {
  resolveInvitationSource,
  generateInviteLink,
};
