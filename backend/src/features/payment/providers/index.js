import razorpayProvider from './razorpay.provider.js';
import mockProvider from './mock.provider.js';
import logger from '../../../utils/logger.utils.js';

/**
 * Payment Provider Factory
 * Dynamically selects and returns the active payment provider strategy.
 * @param {string} [providerName] - Name of provider ('razorpay', 'mock')
 * @returns {import('./PaymentProviderInterface.js').default} Payment Provider Strategy Instance
 */
export function getPaymentProvider(providerName) {
  const selectedProvider = (providerName || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();

  switch (selectedProvider) {
    case 'razorpay':
      return razorpayProvider;
    case 'mock':
      return mockProvider;
    default:
      logger.warn(`Unknown payment provider strategy '${selectedProvider}'. Falling back to mock provider.`);
      return mockProvider;
  }
}

export default {
  getPaymentProvider,
  razorpayProvider,
  mockProvider,
};
