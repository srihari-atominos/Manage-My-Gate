import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import HttpError from '../../utils/httpError.utils.js';
import Token from '../token/token.model.js';

/**
 * Single-use account-setup links sent in the platform provisioning email.
 *
 * Signed with a secret derived from the JWT secret so a setup token can never be
 * accepted as an access token (and vice versa). Single use is enforced by
 * recording the token's jti as an ACCOUNT_SETUP Token document once consumed.
 */
const SETUP_TOKEN_TTL = '72h';
const PURPOSE = 'account_setup';

const setupSecret = () => `${config.jwt.secret}:${PURPOSE}`;
const hashJti = (jti) => crypto.createHash('sha256').update(String(jti)).digest('hex');

export const issueAccountSetupToken = (email, orgId = null) =>
  jwt.sign(
    {
      purpose: PURPOSE,
      email: String(email).trim().toLowerCase(),
      orgId: orgId ? String(orgId) : null,
      jti: crypto.randomUUID(),
    },
    setupSecret(),
    { expiresIn: SETUP_TOKEN_TTL, algorithm: 'HS256' }
  );

/**
 * Verifies signature, expiry, purpose and that the link has not been used yet.
 * @returns {{ email: string, orgId: string|null, jti: string, exp: number }}
 */
export const verifyAccountSetupToken = async (rawToken) => {
  let decoded;
  try {
    decoded = jwt.verify(String(rawToken || ''), setupSecret(), { algorithms: ['HS256'] });
  } catch (err) {
    throw new HttpError(400, 'This account setup link is invalid or has expired.');
  }
  if (decoded?.purpose !== PURPOSE || !decoded.email || !decoded.jti) {
    throw new HttpError(400, 'This account setup link is invalid or has expired.');
  }
  const used = await Token.exists({ type: 'ACCOUNT_SETUP', token: hashJti(decoded.jti) });
  if (used) {
    throw new HttpError(400, 'This account setup link has already been used. Please sign in instead.');
  }
  return decoded;
};

export const markAccountSetupTokenUsed = async (decoded, userId) => {
  await Token.create({
    userId,
    token: hashJti(decoded.jti),
    type: 'ACCOUNT_SETUP',
    status: 'ACCEPTED',
    used: true,
    usedAt: new Date(),
    expiresAt: new Date(decoded.exp * 1000),
  });
};
