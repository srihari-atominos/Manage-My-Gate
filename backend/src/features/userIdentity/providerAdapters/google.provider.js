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
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: config.sso.googleClientId,
      });
      return ticket.getPayload();
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
