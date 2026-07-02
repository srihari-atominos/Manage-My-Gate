import config from '../config/config.js';

/**
 * Sets the authentication JWT token cookie on the response.
 * @param {import('express').Response} res - Express response object
 * @param {string} token - JWT token string
 */
export const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
};

/**
 * Clears the authentication JWT token cookie.
 * @param {import('express').Response} res - Express response object
 */
export const clearAuthCookie = (res) => {
  res.clearCookie('token');
};

export default {
  setAuthCookie,
  clearAuthCookie,
};
