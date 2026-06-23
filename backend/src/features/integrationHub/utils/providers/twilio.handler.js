/**
 * Verifies Twilio connection credentials using a lightweight API request.
 * @param {object} credentials - Credentials object containing accountSid and authToken
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const accountSid = credentials?.accountSid;
  const authToken = credentials?.authToken;

  if (!accountSid || !authToken) {
    throw new Error('Both Account SID (accountSid) and Auth Token (authToken) are required for Twilio integration.');
  }

  // Encode credentials for HTTP Basic Authentication
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // Perform a lightweight check of the credentials by fetching the account details
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`Twilio verification failed: ${errorDetail}`);
  }

  return true;
}

export default {
  verify,
};
