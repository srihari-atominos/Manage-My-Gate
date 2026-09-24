import { OAuth2Client } from 'google-auth-library';
import config from '../../../config/config.js';
import HttpError from '../../../utils/httpError.utils.js';

// Instantiate the OAuth2Client WITHOUT binding a specific clientId.
// Binding a clientId causes google-auth-library to implicitly validate the token
// audience against ONLY that single client ID before our multi-audience array check
// runs — breaking native Android/iOS tokens whose audience is a platform-specific
// client ID (e.g. GOOGLE_ANDROID_CLIENT_ID) rather than the web client ID.
const googleClient = new OAuth2Client();

export class GoogleProvider {
  /**
   * Verifies the Google ID token and returns the raw payload.
   * Accepts tokens issued to any of the configured Google client IDs
   * (web, Android, iOS) belonging to the same GCP project.
   * @param {string} token - Google ID token
   */
  async verifyToken(token) {
    try {
      // Decode unverified header/payload to inspect the token audience before
      // calling verifyIdToken so we can build an accurate allowed-audience list.
      let tokenAud = null;
      let tokenAzp = null;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const raw = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          tokenAud = raw.aud;
          tokenAzp = raw.azp;
          console.log(`[GoogleProvider] Incoming token claims - aud: ${raw.aud}, azp: ${raw.azp}, email: ${raw.email}`);
        }
      } catch (_decodeErr) {
        // Non-blocking — proceed to standard verification even if decoding fails.
      }

      // Build the full set of trusted audiences from env + config + project defaults.
      // This covers: web client, Android client, and iOS client IDs.
      const defaultProjectPrefix = '610778456829';
      const defaultWebClientId = '610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com';
      const defaultAndroidClientId = '610778456829-6g1bvqtplfrgva93sbdsvgbuqmkpr203.apps.googleusercontent.com';
      const defaultIosClientId = '512495714957-ppgtahfr70hmjclhmq7n3c7822aacd41.apps.googleusercontent.com';

      const configuredAudiences = [
        config.sso.googleClientId,
        config.sso.googleAndroidClientId,
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        defaultWebClientId,
        defaultAndroidClientId,
        defaultIosClientId,
      ].filter(Boolean);

      // Derive the trusted GCP project prefixes so we can also accept tokens
      // from any configured client ID belonging to either GCP project.
      const projectPrefixes = [
        defaultProjectPrefix,
        '512495714957',
        (config.sso.googleClientId || '').split('-')[0],
        (config.sso.googleAndroidClientId || '').split('-')[0],
        (process.env.GOOGLE_CLIENT_ID || '').split('-')[0],
        (process.env.GOOGLE_ANDROID_CLIENT_ID || '').split('-')[0],
        (process.env.GOOGLE_IOS_CLIENT_ID || '').split('-')[0],
      ].filter(Boolean);

      const validAudiences = [...new Set([
        ...configuredAudiences,
        // If the token itself carries a same-project audience not yet in our list, trust it.
        ...(tokenAud && projectPrefixes.some((p) => tokenAud.startsWith(p)) ? [tokenAud] : []),
        ...(tokenAzp && projectPrefixes.some((p) => tokenAzp.startsWith(p)) ? [tokenAzp] : []),
      ])];

      // verifyIdToken checks the token's signature, expiry, and whether the token
      // audience matches one of the values in the `audience` array.
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: validAudiences.length > 0 ? validAudiences : undefined,
      });

      const payload = ticket.getPayload();
      const verifiedAud = payload?.aud;
      const verifiedAzp = payload?.azp;

      // Secondary project-membership guard: even after verifyIdToken passes,
      // confirm the audience belongs to OUR GCP project.
      const isAuthorizedProject =
        validAudiences.includes(verifiedAud) ||
        projectPrefixes.some((p) => verifiedAud && verifiedAud.startsWith(p)) ||
        validAudiences.includes(verifiedAzp) ||
        projectPrefixes.some((p) => verifiedAzp && verifiedAzp.startsWith(p));

      if (!isAuthorizedProject) {
        throw new HttpError(401, `Google token audience (${verifiedAud}) does not belong to this project.`);
      }

      return payload;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(401, `Invalid Google Token: ${error.message}`);
    }
  }

  /**
   * Normalizes the provider payload into a standard identity object.
   * @param {object} payload - Raw provider payload
   */
  normalizeIdentity(payload) {
    const { sub: providerId, email, name, picture } = payload;

    if (!email) {
      throw new HttpError(400, 'Email is required from Google profile but was not provided.');
    }

    return {
      provider: 'google',
      providerId,
      providerEmail: email.trim().toLowerCase(),
      profileData: {
        name: name || '',
        avatar: picture || '',
      },
    };
  }
}

export default new GoogleProvider();
