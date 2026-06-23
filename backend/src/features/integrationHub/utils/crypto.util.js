import crypto from 'crypto';
import config from '../../../config/config.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Derives a consistent 32-byte key from the configured encryption key.
 * @returns {Buffer} 32-byte key buffer
 */
const getEncryptionKey = () => {
  if (!config.encryptionKey) {
    throw new Error('Encryption key is not configured in config.js');
  }
  // Standardize key size to 32 bytes (256 bits) for AES-256
  return crypto.createHash('sha256').update(config.encryptionKey).digest();
};

/**
 * Encrypt a plain-text string.
 * @param {string} text - Plain text to encrypt
 * @returns {object} Object containing encryptedApiKey and iv as hex strings
 */
export const encrypt = (text) => {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex')
  };
};

/**
 * Decrypt an encrypted string.
 * @param {string} encryptedText - Hex-encoded encrypted text
 * @param {string} ivHex - Hex-encoded initialization vector
 * @returns {string} Plain text decrypted string
 */
export const decrypt = (encryptedText, ivHex) => {
  if (!encryptedText || !ivHex) {
    throw new Error('Encrypted text and IV are required for decryption');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export default {
  encrypt,
  decrypt
};
