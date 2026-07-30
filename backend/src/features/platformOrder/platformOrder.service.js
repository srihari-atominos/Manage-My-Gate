import mongoose from 'mongoose';
import platformOrderRepository from './platformOrder.repository.js';
import platformOrderEvents from './platformOrder.events.js';
import platformQuoteService from '../platformQuote/platformQuote.service.js';
import HttpError from '../../utils/httpError.utils.js';

/**
 * Generate a standard order number in format ORD-YYYYMMDD-XXXX
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
};

class PlatformOrderService {
  /**
   * Create an order from an approved quote within a transaction.
   * @param {Object} payload - { quoteId, acceptedBy, organisationId }
   */
  async createOrderFromQuote({ quoteId, acceptedBy, organisationId }) {
    const quote = await platformQuoteService.getQuoteById(quoteId);

    if (!quote) {
      throw new HttpError(404, `Quote with ID '${quoteId}' not found.`);
    }

    if (quote.status !== 'APPROVED') {
      throw new HttpError(
        400,
        `Quote must be in APPROVED status to create an order. Current status: ${quote.status}`
      );
    }

    if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
      throw new HttpError(400, 'Quote has expired and cannot be converted to an order.');
    }

    const existingOrder = await platformOrderRepository.findByQuoteId(quoteId);
    if (existingOrder) {
      throw new HttpError(409, `An order has already been created for quote ID '${quoteId}'.`);
    }

    const targetOrgId = organisationId || quote.organisationId || quote.organizationId;
    if (!targetOrgId) {
      throw new HttpError(400, 'Organisation ID is required to create a platform order.');
    }

    const orderNumber = generateOrderNumber();

    const orderSnapshot = {
      quoteNumber: quote.quoteNumber || '',
      planName: quote.pricingSnapshot?.planName || quote.planName || 'Custom Plan',
      tier: quote.pricingSnapshot?.tier || quote.tier || 'ENTERPRISE',
      unitCount: quote.unitCount || 1,
      basePrice: quote.basePrice || 0,
      perUnitRate: quote.perUnitRate || 0,
      addOns: quote.addOns || [],
      setupFee: quote.setupFee || 0,
      validityInMonths: quote.pricingSnapshot?.validityInMonths || quote.validityInMonths || 12,
      discountPercent: quote.discountPercent || 0,
      discountAmount: quote.discountAmount || 0,
      subtotal: quote.subtotal || 0,
      taxRatePercent: quote.taxRatePercent || 15,
      taxAmount: quote.taxAmount || 0,
      totalAmount: quote.totalAmount || 0,
      currency: quote.currency || 'SAR',
      snapshotAt: new Date(),
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const newOrder = await platformOrderRepository.create(
        {
          orderNumber,
          quoteId,
          organisationId: targetOrgId,
          orderSnapshot,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedBy: acceptedBy || null,
        },
        session
      );

      // Update quote status to ACCEPTED
      await platformQuoteService.updateQuoteStatus(quoteId, 'ACCEPTED', session);

      await session.commitTransaction();

      platformOrderEvents.emit('order.created', newOrder);

      return newOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Transition order status safely within a transaction.
   * @param {string} orderId
   * @param {string} targetStatus
   */
  async updateOrderStatus(orderId, targetStatus) {
    const validStatuses = [
      'DRAFT',
      'PENDING_ACCEPTANCE',
      'ACCEPTED',
      'PAYMENT_PENDING',
      'PAID',
      'PROVISIONING',
      'ACTIVE',
      'CANCELLED',
      'EXPIRED',
    ];

    if (!validStatuses.includes(targetStatus)) {
      throw new HttpError(
        400,
        `Invalid status '${targetStatus}'. Allowed: ${validStatuses.join(', ')}`
      );
    }

    const existingOrder = await platformOrderRepository.findById(orderId);
    if (!existingOrder) {
      throw new HttpError(404, `Platform order with ID '${orderId}' not found.`);
    }

    const previousStatus = existingOrder.status;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedOrder = await platformOrderRepository.updateStatus(
        orderId,
        targetStatus,
        session
      );

      await session.commitTransaction();

      platformOrderEvents.emit('platform_order_status_updated', {
        order: updatedOrder,
        previousStatus,
        newStatus: targetStatus,
      });

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve paginated list of platform orders.
   * @param {Object} queryParams
   */
  async getAllOrders(queryParams) {
    return await platformOrderRepository.findAllPaginated(queryParams);
  }

  /**
   * Get platform order by ID.
   * @param {string} orderId
   */
  async getOrderById(orderId) {
    const order = await platformOrderRepository.findById(orderId);
    if (!order) {
      throw new HttpError(404, `Platform order with ID '${orderId}' not found.`);
    }
    return order;
  }

  /**
   * Get platform order by order number.
   * @param {string} orderNumber
   */
  async getOrderByNumber(orderNumber) {
    const order = await platformOrderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new HttpError(404, `Platform order number '${orderNumber}' not found.`);
    }
    return order;
  }

  /**
   * Update order details within a transaction.
   * @param {string} id
   * @param {Object} updateData
   */
  async updateOrder(id, updateData) {
    const existingOrder = await platformOrderRepository.findById(id);
    if (!existingOrder) {
      throw new HttpError(404, `Platform order with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedOrder = await platformOrderRepository.updateById(id, updateData, session);

      await session.commitTransaction();

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete order within a transaction.
   * @param {string} id
   */
  async deleteOrder(id) {
    const existingOrder = await platformOrderRepository.findById(id);
    if (!existingOrder) {
      throw new HttpError(404, `Platform order with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deletedOrder = await platformOrderRepository.deleteById(id, session);

      await session.commitTransaction();

      platformOrderEvents.emit('platform_order_deleted', deletedOrder);

      return deletedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PlatformOrderService();
