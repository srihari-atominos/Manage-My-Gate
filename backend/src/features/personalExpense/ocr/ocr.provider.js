/**
 * Base OCR Provider Contract and Common Types
 *
 * Defines the standard shape for all OCR provider responses and
 * common helpers for provider registration and status normalization.
 */

/**
 * @typedef {Object} ProviderOcrResult
 * @property {string} provider - Provider identifier (e.g., 'tesseract', 'oxr')
 * @property {'COMPLETED'|'FAILED'|'TIMEOUT'|'UNAVAILABLE'|'UNSUPPORTED'} status - Execution status
 * @property {string|null} error - Human-readable error message if failed
 * @property {string} rawText - Extracted text (markdown or plain text)
 * @property {number|null} confidence - 0-100 confidence if reported by provider
 * @property {Object|null} structuredData - Optional provider-specific structured tree (e.g. OXR json_structure)
 * @property {Object} extractedFields - Standardized extracted receipt fields
 * @property {number} durationMs - Processing duration in milliseconds
 */

export class BaseOcrProvider {
  /**
   * @param {string} name - Provider identifier
   * @param {Object} [config] - Provider-specific configuration
   */
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  /**
   * Checks whether the provider is currently enabled and available to run.
   * @returns {Promise<{ available: boolean, reason?: string }>}
   */
  async isAvailable() {
    throw new Error(`isAvailable() not implemented in ${this.constructor.name}`);
  }

  /**
   * Process a receipt document.
   * @param {Object} file - File descriptor with path, mimetype, size
   * @param {Object} [options] - Execution options (timeout, languages, etc.)
   * @returns {Promise<ProviderOcrResult>}
   */
  async process(file, options = {}) {
    throw new Error(`process() not implemented in ${this.constructor.name}`);
  }
}

/**
 * Creates a standardized blank extracted fields object.
 */
export function createEmptyExtractedFields() {
  return {
    merchant: null,
    merchantAddress: null,
    receiptNumber: null,
    invoiceNumber: null,
    billNumber: null,
    transactionId: null,
    orderId: null,
    documentType: 'UNKNOWN',
    receiptDate: null,
    receiptTime: null,
    currency: 'INR',
    subtotalMinor: null,
    taxMinor: null,
    discountMinor: null,
    additionalChargesMinor: null,
    totalMinor: null,
    totalAmount: null,
    items: [],
    paymentMethod: null,
    paymentStatus: null, // documentDisplayedStatus
    documentDisplayedStatus: null,
    transactionReference: null,
    isPaymentScreenshot: false,
    confidence: null,
    fieldConfidence: {},
    warnings: [],
  };
}
