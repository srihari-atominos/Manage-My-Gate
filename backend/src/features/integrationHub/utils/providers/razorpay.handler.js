/**
 * Verifies Razorpay API credentials (keyId, keySecret).
 * Performs validation of credential fields and optional lightweight API ping.
 * @param {object} credentials - Credentials object containing keyId and keySecret
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const { keyId, keySecret } = credentials || {};

  if (!keyId || typeof keyId !== 'string' || !keyId.trim()) {
    throw new Error('Key ID (keyId) is required for Razorpay integration.');
  }

  if (!keySecret || typeof keySecret !== 'string' || !keySecret.trim()) {
    throw new Error('Key Secret (keySecret) is required for Razorpay integration.');
  }

  // Attempt lightweight basic auth ping against Razorpay API if accessible
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok && response.status === 401) {
      throw new Error('Invalid Razorpay Key ID or Key Secret credentials.');
    }
  } catch (error) {
    if (error.message.includes('Invalid Razorpay')) {
      throw error;
    }
    // Network/offline fallback — structure validation passed
  }

  return true;
}

export default {
  verify,
};
