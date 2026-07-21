/**
 * Currency Utility for INR (₹) and Paisa conversions
 */

/**
 * Convert Rupees to Paisa for gateway API payloads (1 Rupee = 100 Paisa)
 * @param {number} rupees - Amount in Rupees
 * @returns {number} Amount in Paisa
 */
export function toPaisa(rupees) {
  if (typeof rupees !== 'number' || isNaN(rupees) || rupees < 0) {
    throw new Error(`Invalid rupee amount for paisa conversion: ${rupees}`);
  }
  return Math.round(rupees * 100);
}

/**
 * Convert Paisa to Rupees
 * @param {number} paisa - Amount in Paisa
 * @returns {number} Amount in Paisa
 */
export function toRupees(paisa) {
  if (typeof paisa !== 'number' || isNaN(paisa) || paisa < 0) {
    throw new Error(`Invalid paisa amount for rupee conversion: ${paisa}`);
  }
  return Number((paisa / 100).toFixed(2));
}

/**
 * Format numeric amount to Indian Rupee (INR ₹) standard representation
 * @param {number} amount - Amount in Rupees
 * @returns {string} Formatted INR currency string
 */
export function formatINR(amount) {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

export default {
  toPaisa,
  toRupees,
  formatINR
};
