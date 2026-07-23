import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import config from '../../../config/config.js';
import HttpError from '../../../utils/httpError.utils.js';

const client = jwksClient({
  jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

export class MicrosoftProvider {
  /**
   * Verifies the Microsoft ID token and returns the raw payload.
   * @param {string} token - Microsoft ID token
   */
  async verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: config.sso.microsoftClientId,
          ignoreExpiration: false,
        },
        (err, decoded) => {
          if (err) {
            reject(new HttpError(401, `Invalid Microsoft Token: ${err.message}`));
          } else {
            const iss = decoded?.iss;
            const tenantId = config.sso.microsoftTenantId;
            let isValidIssuer = false;

            if (tenantId && tenantId !== 'common' && tenantId !== 'organizations' && tenantId !== 'consumers') {
              isValidIssuer = (
                iss === `https://login.microsoftonline.com/${tenantId}/v2.0` ||
                iss === `https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0`
              );
            } else {
              const match = iss ? iss.match(/^https:\/\/login\.microsoftonline\.com\/([^/]+)\/v2\.0$/) : null;
              isValidIssuer = !!match;
            }

            if (!isValidIssuer) {
              reject(new HttpError(401, `Invalid Microsoft Token: Issuer '${iss}' is not allowed.`));
            } else {
              resolve(decoded);
            }
          }
        }
      );
    });
  }

  /**
   * Normalizes the provider payload into a standard identity object.
   * @param {object} payload - Raw provider payload
   */
  normalizeIdentity(payload) {
    const { sub: providerId, email, preferred_username, name } = payload;
    
    const resolvedEmail = email || preferred_username;
    if (!resolvedEmail) {
      throw new HttpError(400, 'Email is required from Microsoft profile but was not provided.');
    }

    return {
      provider: 'microsoft',
      providerId,
      providerEmail: resolvedEmail.trim().toLowerCase(),
      profileData: {
        name: name || '',
      }
    };
  }
}

export default new MicrosoftProvider();
