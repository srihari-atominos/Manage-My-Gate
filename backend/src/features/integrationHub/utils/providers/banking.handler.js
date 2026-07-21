/**
 * Verifies Banking Vault credentials (Account Name, Account Number, IFSC Code).
 * @param {object} credentials - Credentials object containing accountName, accountNumber, ifscCode
 * @returns {Promise<boolean>} Resolves true if valid, throws error otherwise
 */
export async function verify(credentials) {
  const { accountName, accountNumber, ifscCode } = credentials || {};

  if (!accountName || typeof accountName !== 'string' || !accountName.trim()) {
    throw new Error('Account Name (accountName) is required for Banking Vault integration.');
  }

  if (!accountNumber || typeof accountNumber !== 'string' || !/^\d{9,18}$/.test(accountNumber.trim())) {
    throw new Error('Account Number (accountNumber) must be a numeric string between 9 and 18 digits.');
  }

  const cleanIfsc = (ifscCode || '').trim().toUpperCase();
  if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    throw new Error('IFSC Code (ifscCode) must be a valid 11-character Indian Financial System Code format (e.g. SBIN0001234).');
  }

  return true;
}

export default {
  verify,
};
