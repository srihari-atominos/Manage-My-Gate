/**
 * Pricing Domain Service for Amenity Management.
 * Computes an immutable pricing snapshot for reservations.
 */
export class PricingService {
  /**
   * Calculates commercial breakdown and produces an immutable pricing snapshot.
   *
   * @param {Object} params
   * @param {Object} params.pricingConfig - Pricing configuration from AmenityFacility
   * @param {Date} params.startDateTime - UTC start instant
   * @param {Date} params.endDateTime - UTC end instant
   * @param {number} [params.headcount=1] - Number of participants
   * @param {number} [params.quantity=1] - Number of inventory units
   * @returns {{
   *   baseAmount: number,
   *   taxAmount: number,
   *   depositAmount: number,
   *   totalAmount: number,
   *   currency: string
   * }}
   */
  calculatePricingSnapshot({
    pricingConfig = {},
    startDateTime,
    endDateTime,
    headcount = 1,
    quantity = 1,
  }) {
    const pricingType = pricingConfig.pricingType || 'FREE';
    const baseRate = Number(pricingConfig.baseRate) || 0;
    const taxPercentage = Number(pricingConfig.taxPercentage) || 0;
    const securityDeposit = Number(pricingConfig.securityDeposit) || 0;
    const currency = pricingConfig.currency || 'INR';

    let baseAmount = 0;

    const durationMs = Math.max(0, new Date(endDateTime).getTime() - new Date(startDateTime).getTime());
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = Math.max(1, Math.ceil(durationHours / 24));

    switch (pricingType) {
      case 'FREE':
        baseAmount = 0;
        break;

      case 'HOURLY':
        baseAmount = Math.round(durationHours * baseRate * quantity * 100) / 100;
        break;

      case 'DAILY':
        baseAmount = Math.round(durationDays * baseRate * quantity * 100) / 100;
        break;

      case 'FIXED_EVENT':
        baseAmount = baseRate;
        break;

      case 'TIERED':
        baseAmount = Math.round(durationHours * baseRate * 100) / 100;
        break;

      default:
        baseAmount = baseRate;
        break;
    }

    const taxAmount = Math.round(((baseAmount * taxPercentage) / 100) * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
    const depositAmount = Math.round(securityDeposit * 100) / 100;

    return {
      baseAmount,
      taxAmount,
      depositAmount,
      totalAmount,
      currency,
    };
  }

  /**
   * Alias for calculatePricingSnapshot supporting alternative parameter shapes.
   *
   * @param {Object} params
   * @returns {Object}
   */
  calculateReservationPrice(params = {}) {
    return this.calculatePricingSnapshot({
      pricingConfig: params.pricingConfig || params.pricing || {},
      startDateTime: params.startDateTime || params.requestedStartDateTime,
      endDateTime: params.endDateTime || params.requestedEndDateTime,
      headcount: params.headcount,
      quantity: params.quantity,
    });
  }
}

export const pricingService = new PricingService();
export default pricingService;
