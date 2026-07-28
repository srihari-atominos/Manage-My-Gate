import mongoose from 'mongoose';
import platformQuoteRepository from './platformQuote.repository.js';
import platformQuoteEvents from './platformQuote.events.js';
import masterPricingService from '../masterPricing/masterPricing.service.js';
import HttpError from '../../utils/httpError.utils.js';

/**
 * Generate a standard quote number in format QT-YYYYMMDD-XXXX
 */
const generateQuoteNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QT-${dateStr}-${randomSuffix}`;
};

class PlatformQuoteService {
  /**
   * Helper function to calculate pricing breakdown.
   * Formula: Final Price = (Base Plan + (Units * Per-Unit Rate) + Add-ons + Setup Fees - Discount) + Tax
   */
  calculatePricingBreakdown({
    basePrice = 0,
    perUnitRate = 0,
    unitCount = 1,
    selectedAddOns = [],
    setupFee = 0,
    appliedDiscountPercent = 0,
    taxRatePercent = 15,
  }) {
    const addOnsTotal = (selectedAddOns || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const baseCost = Number(basePrice) + (Number(unitCount) * Number(perUnitRate)) + addOnsTotal + Number(setupFee);

    const discountAmount = baseCost * (Number(appliedDiscountPercent) / 100);
    const subtotal = Math.max(0, baseCost - discountAmount);

    const taxAmount = subtotal * (Number(taxRatePercent) / 100);
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  }

  /**
   * Create a platform quote within a transaction.
   * @param {Object} payload
   */
  async createQuote({
    organisationId,
    masterPricingId,
    inquiryId,
    unitCount = 1,
    selectedAddOnKeys = [],
    appliedDiscountPercent = 0,
    expiresInDays = 30,
    createdBy,
  }) {
    // 1. Cross-feature call to masterPricingService (DO NOT import repository directly)
    const masterPricing = await masterPricingService.getPricingById(masterPricingId);
    if (!masterPricing) {
      throw new HttpError(404, `Master pricing plan with ID '${masterPricingId}' not found.`);
    }

    if (!masterPricing.isActive) {
      throw new HttpError(400, `Master pricing plan '${masterPricing.planName}' is inactive.`);
    }

    // Filter selected add-ons based on keys from masterPricing
    const selectedAddOns = (masterPricing.addOns || []).filter((item) =>
      selectedAddOnKeys.includes(item.key)
    );

    const pricingSnapshot = {
      planName: masterPricing.planName,
      tier: masterPricing.tier,
      basePrice: masterPricing.basePrice,
      perUnitRate: masterPricing.perUnitRate,
      selectedAddOns,
      setupFee: masterPricing.setupFee,
      maxAgentDiscountPercent: masterPricing.maxAgentDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
    };

    // Calculate amounts
    const calculatedAmounts = this.calculatePricingBreakdown({
      basePrice: masterPricing.basePrice,
      perUnitRate: masterPricing.perUnitRate,
      unitCount,
      selectedAddOns,
      setupFee: masterPricing.setupFee,
      appliedDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
    });

    // Approval Threshold Check:
    // If appliedDiscountPercent > masterPricing.maxAgentDiscountPercent -> PENDING_APPROVAL else APPROVED
    const status =
      appliedDiscountPercent > masterPricing.maxAgentDiscountPercent
        ? 'PENDING_APPROVAL'
        : 'APPROVED';

    const quoteNumber = generateQuoteNumber();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const createdQuote = await platformQuoteRepository.create(
        {
          quoteNumber,
          inquiryId: inquiryId || null,
          organisationId,
          masterPricingId,
          pricingSnapshot,
          unitCount,
          appliedDiscountPercent,
          calculatedAmounts,
          status,
          expiresAt,
          createdBy: createdBy || null,
        },
        session
      );

      await session.commitTransaction();

      platformQuoteEvents.emit('quote.created', createdQuote);

      return createdQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Manager Approval for Quote.
   * @param {string} quoteId
   * @param {string} managerUserId
   */
  async approveQuote(quoteId, managerUserId) {
    const existingQuote = await platformQuoteRepository.findById(quoteId);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }

    if (existingQuote.status === 'APPROVED') {
      return existingQuote;
    }

    if (!['PENDING_APPROVAL', 'DRAFT'].includes(existingQuote.status)) {
      throw new HttpError(
        400,
        `Quote status '${existingQuote.status}' cannot be approved.`
      );
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedQuote = await platformQuoteRepository.updateById(
        quoteId,
        {
          status: 'APPROVED',
          approvalDetails: {
            approvedBy: managerUserId,
            approvedAt: new Date(),
            rejectionReason: null,
          },
        },
        session
      );

      await session.commitTransaction();

      platformQuoteEvents.emit('platform_quote_approved', updatedQuote);

      return updatedQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Manager Rejection for Quote.
   * @param {string} quoteId
   * @param {string} managerUserId
   * @param {string} rejectionReason
   */
  async rejectQuote(quoteId, managerUserId, rejectionReason) {
    const existingQuote = await platformQuoteRepository.findById(quoteId);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedQuote = await platformQuoteRepository.updateById(
        quoteId,
        {
          status: 'REJECTED',
          approvalDetails: {
            approvedBy: managerUserId,
            approvedAt: new Date(),
            rejectionReason: rejectionReason || 'Discount exceeded authorized threshold',
          },
        },
        session
      );

      await session.commitTransaction();

      platformQuoteEvents.emit('platform_quote_rejected', updatedQuote);

      return updatedQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update quote status (used by platformOrderService during order conversion).
   * @param {string} quoteId
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateQuoteStatus(quoteId, status, session = null) {
    const existingQuote = await platformQuoteRepository.findById(quoteId, session);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }

    const previousStatus = existingQuote.status;
    const updatedQuote = await platformQuoteRepository.updateStatus(quoteId, status, session);

    platformQuoteEvents.emit('platform_quote_status_updated', {
      quote: updatedQuote,
      previousStatus,
      newStatus: status,
    });

    return updatedQuote;
  }

  /**
   * Get quote by ID.
   * @param {string} quoteId
   */
  async getQuoteById(quoteId) {
    const quote = await platformQuoteRepository.findById(quoteId);
    if (!quote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }
    return quote;
  }

  /**
   * Get quote by quote number.
   * @param {string} quoteNumber
   */
  async getQuoteByNumber(quoteNumber) {
    const quote = await platformQuoteRepository.findByQuoteNumber(quoteNumber);
    if (!quote) {
      throw new HttpError(404, `Platform quote number '${quoteNumber}' not found.`);
    }
    return quote;
  }

  /**
   * Get all quotes paginated.
   * @param {Object} queryParams
   */
  async getAllQuotes(queryParams) {
    return await platformQuoteRepository.findAllPaginated(queryParams);
  }

  /**
   * Update quote.
   * @param {string} id
   * @param {Object} updateData
   */
  async updateQuote(id, updateData) {
    const existingQuote = await platformQuoteRepository.findById(id);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedQuote = await platformQuoteRepository.updateById(id, updateData, session);

      await session.commitTransaction();

      return updatedQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete quote.
   * @param {string} id
   */
  async deleteQuote(id) {
    const existingQuote = await platformQuoteRepository.findById(id);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deletedQuote = await platformQuoteRepository.deleteById(id, session);

      await session.commitTransaction();

      platformQuoteEvents.emit('platform_quote_deleted', deletedQuote);

      return deletedQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PlatformQuoteService();
