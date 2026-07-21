/**
 * Base Abstract Payment Provider Interface
 * All payment strategy providers must extend this class and implement its contracts.
 */
export default class PaymentProviderInterface {
  /**
   * Create an order with the gateway
   * @param {object} params - { amount (in Rupees), currency, receipt, notes }
   * @param {object} credentials - Tenant decrypted credentials { keyId, keySecret }
   * @returns {Promise<object>} Order payload from payment provider
   */
  async createOrder(params, credentials) {
    throw new Error('Method createOrder() must be implemented.');
  }

  /**
   * Verify signature returned by the gateway after payment completion
   * @param {object} params - { orderId, paymentId, signature }
   * @param {object} credentials - Tenant decrypted credentials { keyId, keySecret }
   * @returns {Promise<object>} Validation result { isValid, paymentId, orderId }
   */
  async verifySignature(params, credentials) {
    throw new Error('Method verifySignature() must be implemented.');
  }

  /**
   * Refund a payment with the gateway
   * @param {object} params - { paymentId, amount (optional, in Rupees), notes }
   * @param {object} credentials - Tenant decrypted credentials { keyId, keySecret }
   * @returns {Promise<object>} Refund payload from payment provider
   */
  async refund(params, credentials) {
    throw new Error('Method refund() must be implemented.');
  }
}
