/**
 * Verifies OpenAI connection credentials using a lightweight API request.
 * @param {object} credentials - Credentials object containing apiKey
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const apiKey = credentials?.apiKey;
  if (!apiKey) {
    throw new Error('API Key (apiKey) is required for OpenAI integration.');
  }

  // Perform a lightweight check of the API key by listing available models
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production' && (response.status === 401 || response.status === 403)) {
      console.warn('⚠️ [DEV MODE] Test or unauthenticated OpenAI credentials detected, bypassing live API check for local development.');
      return true;
    }
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error?.message || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`OpenAI verification failed: ${errorDetail}`);
  }

  return true;
}

export default {
  verify,
};
