import { verify as verifyOpenAI } from './openai.handler.js';
import { verify as verifyTwilio } from './twilio.handler.js';
import { verify as verifyResend } from './resend.handler.js';
import { verify as verifySMTP } from './smtp.handler.js';

const providerHandlers = {
  openai: verifyOpenAI,
  twilio: verifyTwilio,
  resend: verifyResend,
  smtp: verifySMTP,
};

/**
 * Strategy Gatekeeper mapping incoming provider requests to correct verification handler.
 * @param {string} provider - Provider key (openai, twilio, resend)
 * @param {object} credentials - Key-value pair credential payload
 * @returns {Promise<boolean>}
 */
export async function verifyProviderConnection(provider, credentials) {
  if (!provider) {
    throw new Error('Provider is required.');
  }

  const handler = providerHandlers[provider.toLowerCase()];
  if (!handler) {
    throw new Error(`Unsupported provider: ${provider}. Supported providers are: openai, twilio, resend`);
  }

  return await handler(credentials);
}

export default {
  verifyProviderConnection,
};
