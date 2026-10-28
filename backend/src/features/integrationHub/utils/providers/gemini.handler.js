/**
 * Verifies Google Gemini connection credentials using a lightweight API request
 * to the Google Generative Language API.
 *
 * Runs strictly backend-side. Never logs or leaks the API key.
 * Does not create an audio stream or billable voice session.
 */

// Known verified models supporting Gemini Live bidirectional streaming
export const VERIFIED_LIVE_MODELS = Object.freeze([
  'gemini-3.8-live',
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
]);

let injectedFetch = null;

/**
 * Optional dependency injection for testing.
 */
export function _setInjectedFetch(fn) {
  injectedFetch = fn;
}

/**
 * Validates Gemini API key and model compatibility.
 *
 * @param {object} credentials - Credentials object containing apiKey and optional model
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const apiKey = credentials?.apiKey?.trim();
  if (!apiKey) {
    throw new Error('API Key (apiKey) is required for Google Gemini integration.');
  }

  // Sanitize model identifier
  const rawModel = credentials?.model?.trim() || 'gemini-3.8-live';
  const cleanModel = rawModel.replace(/^models\//, '');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutMs = 6000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const activeFetch = injectedFetch || globalThis.fetch;

  let response;
  try {
    response = await activeFetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Google Gemini API verification timed out after 6 seconds.');
    }
    throw new Error(`Google Gemini network connection failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        // Sanitize: ensure no accidental echo of query string / API key
        errorMessage = errorJson.error.message.replace(/key=[^&\s]+/gi, 'key=REDACTED');
      }
    } catch (_) {
      // Body not JSON; fallback to status text
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error(`Invalid Gemini API credentials: ${errorMessage}`);
    }
    if (response.status === 404) {
      throw new Error(`Gemini model '${cleanModel}' not found: ${errorMessage}`);
    }

    throw new Error(`Google Gemini verification failed: ${errorMessage}`);
  }

  let modelData = null;
  try {
    modelData = await response.json();
  } catch (err) {
    throw new Error('Invalid JSON response received from Google Gemini API.');
  }

  // Verify Live API compatibility if supportedGenerationMethods is present
  if (modelData?.supportedGenerationMethods && Array.isArray(modelData.supportedGenerationMethods)) {
    const methods = modelData.supportedGenerationMethods;
    const supportsLive = methods.includes('bidiGenerateContent');
    const isKnownLive = VERIFIED_LIVE_MODELS.includes(cleanModel);

    if (!supportsLive && !isKnownLive) {
      throw new Error(
        `Model '${cleanModel}' does not advertise Live bidirectional audio capability (bidiGenerateContent).`
      );
    }
  }

  return true;
}

export default {
  verify,
  _setInjectedFetch,
  VERIFIED_LIVE_MODELS,
};
