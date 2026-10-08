/**
 * Validates the shape of MSG91 OTP credentials without sending an SMS or
 * invoking an SMS-template endpoint (OTP templates are a separate MSG91 API).
 */
export async function verify(credentials) {
  const authKey = credentials?.authKey?.trim();
  if (!authKey) throw new Error('MSG91 Auth Key is required.');
  return true;
}
export default { verify };