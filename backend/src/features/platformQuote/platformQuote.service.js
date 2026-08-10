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
  getCycleMultiplier(billingCycle) {
    switch (billingCycle) {
      case 'MONTHLY': return 1 / 12;
      case 'QUARTERLY': return 0.25;
      case 'HALF_YEARLY': return 0.5;
      case 'YEARLY':
      default: return 1;
    }
  }

  calculatePricingBreakdown({
    basePrice = 0,
    perUnitRate = 0,
    unitCount = 1,
    selectedAddOns = [],
    setupFee = 0,
    appliedDiscountPercent = 0,
    taxRatePercent = 15,
    cycleMultiplier = 1,
  }) {
    const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    const addOnsTotal = (selectedAddOns || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const baseSubtotal = (Number(basePrice) + (Number(unitCount) * Number(perUnitRate)) + addOnsTotal) * Number(cycleMultiplier);

    const preDiscountTotal = baseSubtotal + Number(setupFee);
    const discountAmount = preDiscountTotal * (Number(appliedDiscountPercent) / 100);
    const taxableAmount = Math.max(0, preDiscountTotal - discountAmount);

    const taxAmount = taxableAmount * (Number(taxRatePercent) / 100);
    const totalAmount = taxableAmount + taxAmount;

    return {
      subtotal: round2(taxableAmount),
      discountAmount: round2(discountAmount),
      taxAmount: round2(taxAmount),
      totalAmount: round2(totalAmount),
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
    billingCycle = 'YEARLY',
    trialDays = 0,
    createdBy,
  }) {
    const masterPricing = await masterPricingService.getPricingById(masterPricingId);
    if (!masterPricing) {
      throw new HttpError(404, `Master pricing plan with ID '${masterPricingId}' not found.`);
    }

    if (!masterPricing.isActive) {
      throw new HttpError(400, `Master pricing plan '${masterPricing.planName}' is inactive.`);
    }

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
      validityInMonths: masterPricing.validityInMonths || 12,
      maxAgentDiscountPercent: masterPricing.maxAgentDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
    };

    const cycleMultiplier = this.getCycleMultiplier(billingCycle);

    const calculatedAmounts = this.calculatePricingBreakdown({
      basePrice: masterPricing.basePrice,
      perUnitRate: masterPricing.perUnitRate,
      unitCount,
      selectedAddOns,
      setupFee: masterPricing.setupFee,
      appliedDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
      cycleMultiplier,
    });

    const status = 'DRAFT';
    const quoteNumber = generateQuoteNumber();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let finalOrgId = organisationId;

      if (!finalOrgId && inquiryId) {
        const CrmInquiry = mongoose.model('CrmInquiry');
        const inquiry = await CrmInquiry.findById(inquiryId).session(session);
        if (!inquiry) throw new HttpError(404, `Inquiry with ID '${inquiryId}' not found.`);

        const Organization = mongoose.model('Organization');
        // Check if an organization already exists for this inquiry's email to avoid duplicates
        let org = await Organization.findOne({ contactEmail: inquiry.contactEmail }).session(session);
        
        if (!org) {
          const [newOrg] = await Organization.create([{
            name: inquiry.organizationName,
            status: 'Pending',
            organizationType: 'Residential',
            contactEmail: inquiry.contactEmail,
            contactPhone: inquiry.contactPhone,
            expectedMemberCount: inquiry.unitCount,
            timezone: 'Asia/Kolkata',
            allowedFeatures: ['users', 'roles', 'integrations', 'villas', 'amenities', 'notices', 'complaints', 'visitor', 'billing']
          }], { session });
          org = newOrg;
        }
        finalOrgId = org._id;
      }

      if (!finalOrgId) {
        throw new HttpError(400, 'Organisation ID is required to create a quote.');
      }

      // Idempotency: Check if quote already exists for this inquiry
      let createdQuote;
      if (inquiryId) {
        const QuoteModel = mongoose.model('PlatformQuote'); // Use model since we are in session
        const existingQuotes = await QuoteModel.find({ inquiryId }).session(session);
        
        const acceptedQuote = existingQuotes.find(q => q.status === 'ACCEPTED');
        if (acceptedQuote) {
          throw new HttpError(409, 'An order has already been generated for this inquiry.');
        }
        
        const draftQuote = existingQuotes.find(q => q.status === 'DRAFT');
        if (draftQuote) {
          // Update the existing draft instead of creating a new one
          createdQuote = await platformQuoteRepository.updateById(draftQuote._id, {
            masterPricingId,
            pricingSnapshot,
            unitCount,
            appliedDiscountPercent,
            billingCycle,
            trialDays,
            cycleMultiplier,
            calculatedAmounts,
            expiresAt
          }, session);
        }
      }

      if (!createdQuote) {
        createdQuote = await platformQuoteRepository.create(
          {
            quoteNumber,
            inquiryId: inquiryId || null,
            organisationId: finalOrgId,
            masterPricingId,
            pricingSnapshot,
            unitCount,
            appliedDiscountPercent,
            billingCycle,
            trialDays,
            cycleMultiplier,
            calculatedAmounts,
            status,
            expiresAt,
            createdBy: createdBy || null,
          },
          session
        );
      }

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
   * Instantly generate an order from a DRAFT quote.
   * @param {string} quoteId
   */
  async generateInstantOrder(quoteId) {
    const existingQuote = await platformQuoteRepository.findById(quoteId);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }

    if (existingQuote.status !== 'DRAFT') {
      throw new HttpError(400, `Only quotes in DRAFT status can generate an order.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Mark quote as ACCEPTED
      const updatedQuote = await platformQuoteRepository.updateById(
        quoteId,
        { status: 'ACCEPTED' },
        session
      );

      // Create PlatformOrder
      const platformOrderService = (await import('../platformOrder/platformOrder.service.js')).default;
      const platformInvoiceService = (await import('../platformInvoice/platformInvoice.service.js')).default;
      const platformPaymentService = (await import('../platformPayment/platformPayment.service.js')).default;
      const Organization = mongoose.model('Organization');
      
      const orderStatus = (existingQuote.trialDays || 0) > 0 ? 'PROVISIONING' : 'PAYMENT_PENDING';
      
      const orderPayload = {
        organisationId: existingQuote.organisationId,
        quoteId: existingQuote._id,
        masterPricingId: existingQuote.masterPricingId,
        pricingSnapshot: existingQuote.pricingSnapshot,
        unitCount: existingQuote.unitCount,
        billingCycle: existingQuote.billingCycle || 'YEARLY',
        trialDays: existingQuote.trialDays || 0,
        cycleMultiplier: existingQuote.cycleMultiplier || 1,
        calculatedAmounts: existingQuote.calculatedAmounts,
        status: orderStatus,
      };

      const newOrder = await platformOrderService.createOrder(orderPayload, session);

      // Generate invoice
      const newInvoice = await platformInvoiceService.generateInvoiceFromOrder(newOrder._id.toString(), session);

      await session.commitTransaction();

      // Emit quote event
      platformQuoteEvents.emit('platform_quote_status_updated', {
        quote: updatedQuote,
        previousStatus: 'DRAFT',
        newStatus: 'ACCEPTED',
      });
      
      // Emit order created event for listeners
      const platformOrderEvents = (await import('../platformOrder/platformOrder.events.js')).default;
      platformOrderEvents.emit('order.created', newOrder);
      
      if (orderStatus === 'PROVISIONING') {
        platformOrderEvents.emit('platform_order_status_updated', {
          order: newOrder,
          previousStatus: 'ACCEPTED',
          newStatus: 'PROVISIONING'
        });
      }

      // Automatically advance upstream CRM Inquiry status to CLOSED_WON
      try {
        if (existingQuote.inquiryId) {
          const crmInquiryService = (await import('../crmInquiry/crmInquiry.service.js')).default;
          await crmInquiryService.updateInquiry(existingQuote.inquiryId.toString(), { status: 'CLOSED_WON' });
        }
      } catch (err) {
        console.error('Failed to update upstream CRM inquiry status:', err);
      }

      // Generate Razorpay Payment Link (outside transaction, external API call)
      try {
        const orgData = await Organization.findById(existingQuote.organisationId);
        await platformPaymentService.generateRazorpayPaymentLink(newInvoice._id.toString(), {
          name: orgData?.name || 'Customer',
          email: orgData?.contactEmail || 'admin@example.com',
          contact: orgData?.contactPhone || ''
        });
      } catch (err) {
        // We catch here so the order/quote generation doesn't fail if Razorpay fails
        console.error('Failed to generate razorpay link during instant order:', err);
      }

      return newOrder;
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

  /**
   * Save a quote draft (create or update strictly in DRAFT status).
   * @param {Object} payload
   */
  async saveQuoteDraft({
    quoteId,
    organisationId,
    masterPricingId,
    inquiryId,
    unitCount = 1,
    selectedAddOnKeys = [],
    appliedDiscountPercent = 0,
    billingCycle = 'YEARLY',
    trialDays = 0,
    createdBy,
  }) {
    let existingQuote = null;
    if (quoteId) {
      existingQuote = await platformQuoteRepository.findById(quoteId);
      if (!existingQuote) {
        throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
      }
      if (existingQuote.status !== 'DRAFT') {
        throw new HttpError(400, `Cannot edit quote draft. Current status is '${existingQuote.status}'.`);
      }
    }

    const targetMasterPricingId = masterPricingId || existingQuote?.masterPricingId;
    const masterPricing = await masterPricingService.getPricingById(targetMasterPricingId);
    if (!masterPricing) {
      throw new HttpError(404, `Master pricing plan not found.`);
    }

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
      validityInMonths: masterPricing.validityInMonths || 12,
      maxAgentDiscountPercent: masterPricing.maxAgentDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
    };

    const cycleMultiplier = this.getCycleMultiplier(billingCycle);

    const calculatedAmounts = this.calculatePricingBreakdown({
      basePrice: masterPricing.basePrice,
      perUnitRate: masterPricing.perUnitRate,
      unitCount,
      selectedAddOns,
      setupFee: masterPricing.setupFee,
      appliedDiscountPercent,
      taxRatePercent: masterPricing.taxRatePercent,
      cycleMultiplier,
    });

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let quote;
      if (existingQuote) {
        quote = await platformQuoteRepository.updateById(
          existingQuote._id,
          {
            masterPricingId: masterPricing._id,
            pricingSnapshot,
            unitCount,
            appliedDiscountPercent,
            billingCycle,
            trialDays,
            cycleMultiplier,
            calculatedAmounts,
            status: 'DRAFT',
          },
          session
        );
      } else {
        const quoteNumber = generateQuoteNumber();
        quote = await platformQuoteRepository.create(
          {
            quoteNumber,
            inquiryId: inquiryId || null,
            organisationId,
            masterPricingId: masterPricing._id,
            pricingSnapshot,
            unitCount,
            appliedDiscountPercent,
            billingCycle,
            trialDays,
            cycleMultiplier,
            calculatedAmounts,
            status: 'DRAFT',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdBy: createdBy || null,
          },
          session
        );
      }

      await session.commitTransaction();
      platformQuoteEvents.emit(existingQuote ? 'quote.updated' : 'quote.created', quote);
      return quote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Extend the expiration date of a quote.
   * Protection: Rejects attempt to extend ACCEPTED or REJECTED quotes.
   * @param {string} quoteId
   * @param {Date|string} [newExpiryDate=null]
   * @param {number} [extensionDays=30]
   */
  async extendQuoteValidity(quoteId, newExpiryDate = null, extensionDays = 30) {
    const existingQuote = await platformQuoteRepository.findById(quoteId);
    if (!existingQuote) {
      throw new HttpError(404, `Platform quote with ID '${quoteId}' not found.`);
    }

    if (['ACCEPTED', 'REJECTED'].includes(existingQuote.status)) {
      throw new HttpError(
        400,
        `Cannot extend validity of a quote in '${existingQuote.status}' status.`
      );
    }

    const expiresAt = newExpiryDate
      ? new Date(newExpiryDate)
      : new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);

    const updatePayload = { expiresAt };

    if (existingQuote.status === 'EXPIRED') {
      updatePayload.status = 'DRAFT';
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedQuote = await platformQuoteRepository.updateById(quoteId, updatePayload, session);

      await session.commitTransaction();

      platformQuoteEvents.emit('platform_quote_validity_extended', updatedQuote);

      return updatedQuote;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PlatformQuoteService();
