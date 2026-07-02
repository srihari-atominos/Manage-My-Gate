import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import config from '../../../config/config.js';

const msJwksClient = jwksClient({
  jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
});

const getMsSigningKey = (header, callback) => {
  msJwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
};

/**
 * Verifies a Google ID token and returns the payload.
 * @param {string} googleToken
 * @returns {Promise<object>} Google user profile payload
 */
export const verifyGoogleIdToken = async (googleToken) => {
  if (!config.sso.googleClientId) {
    throw new Error('Google SSO is not configured on the server.');
  }
  const googleClientInstance = new OAuth2Client(config.sso.googleClientId);
  const ticket = await googleClientInstance.verifyIdToken({
    idToken: googleToken,
    audience: config.sso.googleClientId,
  });
  return ticket.getPayload();
};

/**
 * Verifies a Microsoft token against MS JWKS keys and returns decoded payload.
 * @param {string} microsoftToken
 * @returns {Promise<object>} Microsoft user profile payload
 */
export const verifyMicrosoftIdToken = async (microsoftToken) => {
  if (!config.sso.microsoftClientId) {
    throw new Error('Microsoft SSO is not configured on the server.');
  }
  return new Promise((resolve, reject) => {
    jwt.verify(
      microsoftToken,
      getMsSigningKey,
      { algorithms: ['RS256'] },
      (err, decoded) => {
        if (err) return reject(err);
        if (decoded.aud !== config.sso.microsoftClientId) {
          return reject(new Error('Invalid audience (Client ID)'));
        }
        resolve(decoded);
      }
    );
  });
};
