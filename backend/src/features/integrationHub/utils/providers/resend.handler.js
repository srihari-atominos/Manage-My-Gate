/**
 * Verifies Resend connection credentials using a lightweight API request.
 * @param {object} credentials - Credentials object containing apiKey
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const apiKey = credentials?.apiKey;
  if (!apiKey) {
    throw new Error('API Key (apiKey) is required for Resend integration.');
  }

  // Perform a lightweight check of the API key by listing verified domains
  const response = await fetch('https://api.resend.com/domains', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || response.statusText;
      
      // If the API key is restricted to sending only, it means the key IS valid!
      // We are just blocked from listing domains, which is fine for our use case.
      if (errorDetail.toLowerCase().includes('restricted to only send emails')) {
        return true;
      }
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`Resend verification failed: ${errorDetail}`);
  }

  return true;
}

export default {
  verify,
};
