import { OAuth2Client } from 'google-auth-library';
import config from '../../../config/config.js';
import HttpError from '../../../utils/httpError.utils.js';

const googleClient = new OAuth2Client(config.sso.googleClientId);

export class GoogleProvider {
  /**
   * Verifies the Google ID token and returns the raw payload.
   * @param {string} token - Google ID token
   */
  async verifyToken(token) {
    try {
      // Extract unverified payload claims to inspect token audience
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
      } catch (err) {
        // Continue to standard verification
      }

      const configuredAudiences = [
        config.sso.googleClientId,
        config.sso.googleAndroidClientId,
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ].filter(Boolean);

      const projectPrefix = (config.sso.googleClientId || '').split('-')[0] || '610778456829';

      const validAudiences = [...new Set([
        ...configuredAudiences,
        ...(tokenAud && tokenAud.startsWith(projectPrefix) ? [tokenAud] : []),
        ...(tokenAzp && tokenAzp.startsWith(projectPrefix) ? [tokenAzp] : []),
      ])];

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: validAudiences.length > 0 ? validAudiences : undefined,
      });

      const payload = ticket.getPayload();
      const verifiedAud = payload?.aud;
      const verifiedAzp = payload?.azp;

      const isAuthorizedProject =
        validAudiences.includes(verifiedAud) ||
        (verifiedAud && verifiedAud.startsWith(projectPrefix)) ||
        validAudiences.includes(verifiedAzp) ||
        (verifiedAzp && verifiedAzp.startsWith(projectPrefix));

      if (!isAuthorizedProject) {
        throw new HttpError(401, `Google token audience (${verifiedAud}) does not belong to this project.`);
      }

      return payload;
    } catch (error) {
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
      }
    };
  }
}

export default new GoogleProvider();
