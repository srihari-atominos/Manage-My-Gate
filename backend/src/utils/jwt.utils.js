import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Sign a payload into a JWT token.
 * @param {object} payload - The token payload
 * @param {string} [expiresIn='24h'] - Expiration duration
 * @returns {string} The signed JWT
 */
export const signToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token - The JWT token
 * @returns {object} The decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Sign a payload into a Refresh token.
 * @param {object} payload - The token payload
 * @returns {string} The signed JWT
 */
export const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

/**
 * Verify and decode a Refresh token.
 * @param {string} token - The Refresh token
 * @returns {object} The decoded token payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};
