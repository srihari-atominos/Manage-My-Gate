export async function verify(credentials) {
  const customerId = credentials?.customerId?.trim();
  const authToken = credentials?.authToken?.trim();
  const countryCode = credentials?.countryCode?.trim();

  if (!customerId || !authToken) {
    throw new Error('Message Central verification failed: Missing Customer ID or Auth Token.');
  }

  try {
    // Check if the user provided an already-generated long-lived JWT instead of a password
    if (authToken.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString('utf8'));
        
        // Ensure it's not expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          throw new Error('Message Central verification failed: The provided JWT token has expired.');
        }

        // Validate customer ID matches
        if (payload.sub !== customerId) {
          throw new Error(`Message Central verification failed: Token belongs to Customer ID ${payload.sub}, not ${customerId}.`);
        }

        return true; // JWT is valid and belongs to the customer!
      } catch (e) {
        throw new Error('Message Central verification failed: Invalid JWT format provided.');
      }
    }

    // Attempt 1: Assume the user provided a raw password, so we base64 encode it.
    const base64Key = Buffer.from(authToken).toString('base64');
    let tokenUrl = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(base64Key)}&scope=NEW`;

    let response = await fetch(tokenUrl);
    
    // Attempt 2: If the first attempt failed, maybe they provided an already base64 encoded password?
    if (!response.ok) {
      tokenUrl = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(authToken)}&scope=NEW`;
      response = await fetch(tokenUrl);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Invalid credentials';
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.error) errorMsg = errJson.error;
      } catch (e) {
        if (errorText) errorMsg = errorText;
      }
      throw new Error(`Message Central verification failed: ${errorMsg}`);
    }

    return true;
  } catch (err) {
    throw new Error(err.message || 'Message Central verification failed. Check credentials.');
  }
}
