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

  /**
   * Create a Payment Link
   * @param {object} params - { amount, currency, description, customer (email, contact), expireBy }
   * @param {object} credentials - Tenant decrypted credentials
   * @returns {Promise<object>} Link payload { id, short_url, status }
   */
  async createPaymentLink(params, credentials) {
    throw new Error('Method createPaymentLink() must be implemented.');
  }

  /**
   * Cancel an active Payment Link
   * @param {object} params - { linkId }
   * @param {object} credentials - Tenant decrypted credentials
   * @returns {Promise<object>} Cancellation status
   */
  async cancelPaymentLink(params, credentials) {
    throw new Error('Method cancelPaymentLink() must be implemented.');
  }

  /**
   * Get Payment Status directly from gateway
   * @param {object} params - { paymentId }
   * @param {object} credentials - Tenant decrypted credentials
   * @returns {Promise<object>} Status info { status, amount, method }
   */
  async getPaymentStatus(params, credentials) {
    throw new Error('Method getPaymentStatus() must be implemented.');
  }
}
