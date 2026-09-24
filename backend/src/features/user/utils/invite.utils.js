/**
 * Resolves whether an HTTP request originates from the Mobile App or Web Client.
 * Inspects explicit headers, payload properties, query parameters, Origin/Referer, and User-Agent.
 *
 * NOTE: URL path strings (e.g. '/invite/app') are intentionally excluded from the
 * Origin/Referer check — they are not a reliable signal for the caller's platform and
 * were causing false APP-classification for web-admin requests whose browser Referer
 * happened to contain an /invite/app/* path visited in a prior session.
 *
 * @param {import('express').Request} req
 * @returns {'APP' | 'WEB'}
 */
export const resolveInvitationSource = (req) => {
  if (!req) return 'WEB';

  // 1. Explicit Headers (X-Client-Type or X-Client-Source) — most reliable signal
  const clientType = req.get?.('x-client-type') || req.headers?.['x-client-type'] || '';
  const clientSource = req.get?.('x-client-source') || req.headers?.['x-client-source'] || '';
  const headerVal = String(clientType || clientSource).trim().toUpperCase();
  if (headerVal === 'APP' || headerVal === 'MOBILE') return 'APP';
  if (headerVal === 'WEB') return 'WEB';

  // 2. Body Payload (mobile SDK may include invitationSource in body)
  const bodySource = String(req.body?.invitationSource || req.body?.source || '').trim().toUpperCase();
  if (bodySource === 'APP' || bodySource === 'MOBILE') return 'APP';
  if (bodySource === 'WEB') return 'WEB';

  // 3. Query Parameters
  const querySource = String(req.query?.invitationSource || req.query?.source || '').trim().toUpperCase();
  if (querySource === 'APP' || querySource === 'MOBILE') return 'APP';
  if (querySource === 'WEB') return 'WEB';

  // 4. Origin/Referer — detect by dev-server port ONLY (not by URL path strings)
  //    Port 8081/8082/19006 = React Native / Expo Metro bundler
  //    Port 3004/3000/5173 = Vite/CRA web dev server
  const origin = String(
    req.get?.('origin') || req.headers?.origin ||
    req.get?.('referer') || req.headers?.referer || ''
  );
  if (origin.includes(':8081') || origin.includes(':8082') || origin.includes(':19006')) {
    return 'APP';
  }
  if (origin.includes(':3004') || origin.includes(':3000') || origin.includes(':5173')) {
    return 'WEB';
  }

  // 5. User-Agent inspection (React Native / Expo / OkHttp / Mobile OS identifiers)
  const userAgent = String(req.get?.('user-agent') || req.headers?.['user-agent'] || '');
  if (/expo|okhttp|reactnative|cfnetwork|android|iphone|ipad/i.test(userAgent)) {
    return 'APP';
  }

  // Default: treat as WEB (web admin panel is by far the most common caller)
  return 'WEB';
};

/**
 * Generates the canonical universal invitation link: /invite/:token
 *
 * This is the ONLY link format that should ever appear in invitation emails.
 * It lands on the smart web landing page which detects the device and handles
 * routing to web dashboard, Play Store, or App Store automatically.
 *
 * @param {string} invitationToken - The raw invitation token
 * @param {string} [invitationSource='WEB'] - Reserved for future use (kept for signature compat)
 * @returns {string} Canonical invitation URL
 */
export const generateInviteLink = (invitationToken, invitationSource = 'WEB') => {
  const defaultProductionBaseUrl = 'https://managemygate.e3esg.com';
  const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1|::1/i.test(url);

  let rawUrl =
    process.env.WEB_APP_URL ||
    process.env.WEB_CLIENT_URL ||
    process.env.CLIENT_URL;

  if (!rawUrl || (process.env.NODE_ENV === 'production' && isLocalhost(rawUrl))) {
    rawUrl = defaultProductionBaseUrl;
  }

  const baseUrl = rawUrl.trim().replace(/\/+$/, '');
  // Canonical universal invitation link: /invite/:token
  // Matches Android App Links and iOS Universal Links configured with pathPrefix "/invite",
  // allowing installed mobile apps to open directly, while BrowserRouter on web routes to InviteHandler.
  return `${baseUrl}/invite/${invitationToken}`;
};

/**
 * Generates legacy-format invitation links for backward compatibility.
 * NOT used for emails — kept only for admin UI "Copy Link" button responses.
 *
 * @param {string} invitationToken - The raw invitation token
 * @param {string} [invitationSource='WEB'] - Source ('WEB' or 'APP')
 * @returns {string} Legacy formatted URL (/invite/web/:token or /invite/app/:token)
 */
export const generateLegacyInviteLink = (invitationToken, invitationSource = 'WEB') => {
  const defaultProductionBaseUrl = 'https://managemygate.e3esg.com';
  const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1|::1/i.test(url);
  const source = String(invitationSource || 'WEB').toUpperCase();

  let rawUrl =
    source === 'APP' || source === 'MOBILE'
      ? process.env.APP_CLIENT_URL || process.env.CLIENT_URL
      : process.env.WEB_APP_URL || process.env.WEB_CLIENT_URL || process.env.CLIENT_URL;

  if (!rawUrl || (process.env.NODE_ENV === 'production' && isLocalhost(rawUrl))) {
    rawUrl = defaultProductionBaseUrl;
  }

  const baseUrl = rawUrl.trim().replace(/\/+$/, '');
  const prefix = source === 'APP' || source === 'MOBILE' ? 'app' : 'web';
  return `${baseUrl}/invite/${prefix}/${invitationToken}`;
};

export default {
  resolveInvitationSource,
  generateInviteLink,
  generateLegacyInviteLink,
};
