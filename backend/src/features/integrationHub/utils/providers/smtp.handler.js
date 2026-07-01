import nodemailer from 'nodemailer';

/**
 * Verifies SMTP connection credentials using nodemailer verification.
 * @param {object} credentials - Credentials object containing host, port, authUsername, and authPassword
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const host = credentials?.host;
  const portStr = credentials?.port;
  const authUsername = credentials?.authUsername;
  const authPassword = credentials?.authPassword;

  if (!host) {
    throw new Error('SMTP Host (host) is required.');
  }
  if (!portStr) {
    throw new Error('SMTP Port (port) is required.');
  }
  if (!authUsername) {
    throw new Error('SMTP Username (authUsername) is required.');
  }
  if (!authPassword) {
    throw new Error('SMTP Password (authPassword) is required.');
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    throw new Error('SMTP Port must be a valid number.');
  }

  // 465 is the standard implicit TLS port
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: authUsername,
      pass: authPassword,
    },
    connectionTimeout: 5000, // 5 second timeout to avoid blocking requests
  });

  try {
    await transporter.verify();
    return true;
  } catch (err) {
    throw new Error(`SMTP verification failed: ${err.message}`);
  }
}

export default {
  verify,
};
