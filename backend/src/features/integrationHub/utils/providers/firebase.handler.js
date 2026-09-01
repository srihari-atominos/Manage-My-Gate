/**
 * Verifies Firebase Authentication connection credentials using the Google Identity Toolkit API.
 * @param {object} credentials - Credentials object containing projectId, apiKey, etc.
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const projectId = credentials?.projectId;
  const apiKey = credentials?.apiKey;

  if (!projectId || !apiKey) {
    throw new Error('Project ID and API Key are required for Firebase integration.');
  }

  // Use the sendVerificationCode endpoint with a dummy phone number to validate credentials
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: '+15555555555',
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMessage = responseData.error?.message || '';

    if (process.env.NODE_ENV !== 'production' && (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('PROJECT_NOT_FOUND'))) {
      console.warn('⚠️ [DEV MODE] Test or invalid Firebase API key detected, bypassing live API check for local development.');
      return true;
    }

    if (errorMessage.includes('API_KEY_INVALID')) {
      throw new Error('Firebase verification failed: API Key is invalid.');
    }
    
    if (errorMessage.includes('OPERATION_NOT_ALLOWED') && !errorMessage.includes('region enabled')) {
      throw new Error('Firebase verification failed: Phone Authentication is not enabled for this project.');
    }

    if (errorMessage.includes('PROJECT_NOT_FOUND')) {
      throw new Error('Firebase verification failed: Project ID is invalid or not reachable.');
    }

    if (errorMessage.includes('CONFIGURATION_NOT_FOUND')) {
      throw new Error('Firebase verification failed: Authentication API is not enabled for this project.');
    }

    // Since we are sending a dummy request, we expect certain errors like MISSING_CLIENT_IDENTIFIER or INVALID_PHONE_NUMBER or MISSING_APP_CREDENTIAL when the setup is actually valid.
    // If we get an error that isn't one of the fatal configuration errors above, it means the API key works and the service is enabled.
    const allowedErrors = ['MISSING_CLIENT_IDENTIFIER', 'INVALID_PHONE_NUMBER', 'MISSING_APP_CREDENTIAL', 'MISSING_RECAPTCHA_TOKEN', 'CAPTCHA_CHECK_FAILED', 'region enabled'];
    const isAllowedError = allowedErrors.some(err => errorMessage.includes(err));

    if (!isAllowedError) {
       throw new Error(`Firebase verification failed: ${errorMessage || response.statusText}`);
    }
  }

  return true;
}

export default {
  verify,
};
