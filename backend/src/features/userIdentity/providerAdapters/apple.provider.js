import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import config from '../../../config/config.js';
import HttpError from '../../../utils/httpError.utils.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const appleKeys = jwksClient({
  jwksUri: `${APPLE_ISSUER}/auth/keys`,
  cache: true,
  rateLimit: true,
});

function getAppleSigningKey(header, callback) {
  if (!header?.kid || header.alg !== 'RS256') {
    callback(new Error('Apple token must use an RS256 key identifier.'));
    return;
  }

  appleKeys.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, key.publicKey || key.rsaPublicKey);
  });
}

function configuredAudiences() {
  return [...new Set([config.sso.appleClientId, config.sso.appleServiceId].filter(Boolean))];
}

export class AppleProvider {
  /**
   * Verifies the signature, issuer, audience, expiry, and request nonce of an
   * Apple identity token using Apple's rotating public-key set.
   */
  async verifyToken(token, { nonce } = {}) {
    if (!token || typeof token !== 'string') {
      throw new HttpError(400, 'Apple identity token is required.');
    }

    const audience = configuredAudiences();
    if (audience.length === 0) {
      throw new HttpError(500, 'Apple Sign-In is not configured on this server.');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getAppleSigningKey,
        {
          algorithms: ['RS256'],
          audience,
          issuer: APPLE_ISSUER,
          ignoreExpiration: false,
        },
        (error, decoded) => {
          if (error) {
            reject(new HttpError(401, `Invalid Apple identity token: ${error.message}`));
            return;
          }

          if (!decoded?.sub) {
            reject(new HttpError(401, 'Apple identity token does not contain a subject.'));
            return;
          }

          if (nonce && decoded.nonce !== nonce) {
            reject(new HttpError(401, 'Apple identity token nonce does not match this sign-in request.'));
            return;
          }

          resolve(decoded);
        }
      );
    });
  }

  /** Normalizes Apple's JWT payload for the shared SSO identity service. */
  normalizeIdentity(payload, { fullName } = {}) {
    const providerId = payload?.sub;
    if (!providerId) {
      throw new HttpError(400, 'Apple identity token does not include a user identifier.');
    }

    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    return {
      provider: 'apple',
      providerId,
      // Apple only supplies email/name the first time a user authorizes an app.
      // Existing identities are resolved by the stable `sub` when those fields
      // are absent on later sign-ins.
      providerEmail: email || null,
      profileData: {
        name: typeof fullName === 'string' ? fullName.trim() : '',
      },
    };
  }
}

export default new AppleProvider();
