import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';

const isPrivateAddress = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.') || v6.startsWith('::ffff:10.') || v6.startsWith('::ffff:192.168.');
};

/**
 * The verifier opens a TCP connection to a host an admin typed in. Refuse hosts that point at the server's own
 * or internal network (127.x, 10.x, 192.168.x, cloud metadata 169.254.x ...), otherwise the hub could be used to
 * probe internal services. Set ALLOW_PRIVATE_SMTP_HOST=true for a local mail catcher in development.
 */
export async function assertPublicHost(host) {
  if (process.env.ALLOW_PRIVATE_SMTP_HOST === 'true') return;
  const name = String(host).trim();
  if (/^localhost$/i.test(name)) throw new Error('SMTP host must be a public mail server, not localhost.');
  const addresses = net.isIP(name) ? [{ address: name }] : await dns.lookup(name, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error(`SMTP host "${name}" could not be found. Check the spelling.`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error('SMTP host must be a public mail server, not an address on a private network.');
  }
}

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

  await assertPublicHost(host);

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
